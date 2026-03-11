+++
title = "php伪协议"
slug = "php-pseudo-protocols"
description = ""
date = "2024-09-16T09:31:51"
lastmod = "2024-09-16T09:31:51"
image = ""
license = ""
categories = ["talk"]
tags = ["php", "姿势"]
+++

# 0x01 前言

本来是想看看`xxe`的，但是发现其中使用协议非常的频繁，刚好我协议也没有总结过，那么来弄完这个弄`xxe`

# 0x02 question

## 概念

### 数据流

> PHP伪协议是一种用于处理各种文件流和资源的机制。通过伪协议，PHP可以访问各种数据源（不仅限于文件），并执行特定任务。这些伪协议常用于文件系统操作、数据流处理以及与网络和数据库的交互。

那么既然提到了是数据流，让我想起来之前有一位师傅问我的问题

```php
<?php
file_put_contents('php://filter/w=convert.base64-decode/resource=shell.php','eHl6');
```

这里我们可以利用伪协议来代替文件，进行写入恶意代码，但是为什么呢

**数据流的抽象**：PHP 的文件处理函数（如 `fopen`、`file_get_contents` 等）能够操作的数据并不局限于硬盘上的文件，它们可以操作任意数据流。伪协议让这些函数通过统一的接口来处理各种数据源，比如网络数据、内存数据、压缩数据等等。**也就是说我们的伪协议其实并不是文件，只不过在抽象的机制下，可以达到文件的效果**，所以细心的师傅发现我们使用伪协议的路径并不是像物理文件一样使用**绝对路径**

### 伪协议

```php
file:// — 访问本地文件系统
http:// — 访问 HTTP(s) 网址
ftp:// — 访问 FTP(s) URLs
php:// — 访问各个输入/输出流（I/O streams）
zlib:// — 压缩流
data:// — 数据（RFC 2397）
glob:// — 查找匹配的文件路径模式
phar:// — PHP 归档
ssh2:// — Secure Shell 2
rar:// — RAR
ogg:// — 音频流
expect:// — 处理交互式的流
```

### php.ini

在php.ini里有两个重要的参数`allow_url_fopen`、`allow_url_include`。

- `allow_url_fopen`:默认值是ON。允许url里的封装协议访问文件；
- `allow_url_include`:默认值是OFF。不允许包含url里的封装协议包含文件；

## test

demo.php

```php
<?php
file_get_contents($_GET['a']);
```

写好Demo之后我们挨个把常用的测试一下

### php://filter

这个协议应该是最常用的

| 参数                        | 是否必须 | 描述                                                         |
| --------------------------- | -------- | ------------------------------------------------------------ |
| `resource=<要过滤的数据流>` | 必须     | 指定要筛选过滤的数据流。                                     |
| `read=<读链的筛选列表>`     | 可选     | 设置一个或多个读取时使用的过滤器，以管道符（`|`）分隔。      |
| `write=<写链的筛选列表>`    | 可选     | 设置一个或多个写入时使用的过滤器，以管道符（`|`）分隔。      |
| `<两个链的筛选列表>`        | 可选     | 任何没有以 `read=` 或 `write=` 作为前缀的筛选器列表，会根据情况应用于读或写链。 |

这中间这个过滤列表也就涉及到了过滤器的问题

#### 过滤器

仔细一查发现原来这么复杂，算了再水一篇博客

```
# 字符串过滤器
string.rot13       //rot13转换
string.toupper     //将字符大写
string.tolower     //将字符小写
string.strip_tags  //去除空字符、HTML和PHP标记后的结果

# 转换过滤器
convert.base64-encode       //base64编码
convert.base64-decode       //base64解码
convert.quoted-printable-encode //quoted-printable编码
convert.quoted-printable-decode //quoted-printable解码
convert.iconv                   //实现任意两种编码之间的转换

# 压缩过滤器
zlib.deflate       //压缩过滤器
zlib.inflate       //解压过滤器
bzip2.compress     //压缩过滤器
bzip2.decompress   //解压过滤器

# 加密过滤器
mcrypt.*    //加密过滤器
mdecrypt.*  //解密过滤器
```

这里只给个大纲

```php
php://filter/read=convert.base64-encode/resource=index.php
```

这里倘若不进行编码的话，是拿不到源码的，因为会将文件当成是`php`文件执行

### php://input

可以访问请求的原始数据的只读流, 将post请求中的数据作为PHP代码执行。在POST请求中访问POST的data部分，在`enctype="multipart/form-data"`的时候php://input 是无效的。

所以说我们在使用`hackbar`进行发包的时候起不到作用

### others

`php://stdin`、`php://stdout` 和 `php://stderr` 允许直接访问 PHP 进程相应的输入或者输出流,这三种并不常用，但是可以了解一下

#### php://stdin

`php://stdin` 伪协议用于访问 PHP 进程的标准输入流，通常用于读取用户输入或从其他程序的输出中获取数据。

```php
<?php
// 从标准输入读取数据，直到读取完毕
$input = file_get_contents('php://stdin');
echo "You entered: " . $input;
?>
```

从终端中读取信息，并且结束的时候返回回显，相当于传音海螺？

#### php://stdout

`php://stdout` 伪协议用于向标准输出流写入数据，通常用于将数据输出到控制台、终端或重定向到文件等。相当于`echo`

```php
<?php
// 将数据写入标准输出
$output = fopen('php://stdout', 'w');
fwrite($output, "This is output to stdout.\n");
fclose($output);
?>
```

#### php://stderr

`php://stderr` 伪协议用于写入标准错误流，通常用于输出错误信息或调试信息到终端。

### data://

数据流封装器，以传递相应格式的数据。可以让用户来控制输入流，当它与包含函数结合时，用户输入的`data://`流会被当作`php`文件执行。

```
data://text/plain,hello

data://text/plain;base64,PD89ZXZhbCgkX0dFVFthXSk7Pz4=
```

就这个简单的用法，尝尝用来绕过特殊限定

### file://

这个就是`xxe`中常常用到的了，用于访问本地文件系统，
`file://`协议主要用于访问文件(绝对路径、相对路径以及网络路径)

```
file:///etc/passwd
进行文件的读取
```

### zip://

访问压缩包里面的文件。当它与包含函数结合时，`zip://`流会被当作php文件执行。从而实现任意代码执行。相同类型的还有**zlib://**和**bzip2://**。

这里有个注意的点就是写法

```
zip:// + zip路径 + %23 + php文件名 (由于#在get请求中会将后面的参数忽略所以使用get请求时候应进行url编码为%23)

zip://./assets/img/upload/c4e7a1d34acc3e120a6deddca316898ab8be210b.jpg%23shell
```

demo就是**[极客大挑战 2020]Roamphp2-Myblog**

其中我们本身是不是要将马包含进压缩文件，但是为了能够正确解析，我们在第一步并不能直接修改文件后缀，而是保留为`shell.php`如果是`jsp马`的话,就要保留`jsp`

再者进行压缩之后，已经是一个压缩文件了，所以我们修改后缀为`jpg`也不影响解析，最后成功包含恶意文件

> 但是关于这个后缀的问题的话，本人测试过，其实是要加的，但是这个demo没有加可能就是因为自带了后缀吧

给大家看看我本地的测试吧

include.php

```php
<?php
// 包含并执行 zip 文件中的 shell.php 文件
include('zip://./shell.zip#shell.php');
?>
```

shell.php

```php
echo "Including shell.php successfully";
```

然后将`shell.php`进行压缩之后再包含是成功了的

```cmd
C:\Users\baozongwi\Desktop\test>php include.php
echo "Including shell.php successfully";
```

### phar://

这个协议在`phar`反序列化中也是非常的常用，用于解析`phar`文件

```
phar://phar.phar/test.txt
```

并且也是可以进行文件上传包含恶意文件的,也是用于解析`zip`文件

```
?page=phar://./assets/img/upload/33da2a32454ed5f8bfe0f1c37c4c4ff0fa8f90bc.jpg/shell
```

同样的这里的后缀还是要带的只不过[极客大挑战 2020]Roamphp2-Myblog中自己有后缀

```php
<?php
// 包含并执行 PHAR 文件中的 shell.php 文件
include('phar://./shell.zip/shell.php');
?>
```

```cmd
C:\Users\baozongwi\Desktop\test>php include.php
echo "Including shell.php successfully";
```

### http:// & https://

用于远程包含，比如本地服务器载一个恶意代码，或者是写一个`dtd`,进行利用的时候来使用的

## Demo

这个Demo不太好做，其实利用的点太多了，比如我们扒源码的时候就要用到，又或者是

```php
<?php
// 将数据写入标准输出
if(file_get_contents($_GET['a'])=="hello world"){
	echo $flag;
}
```

就用`data`绕过，上传文件的解析，phar反序列化，xxe等等都需要协议的辅助

# 0x03 小结

为了更好的理解`xxe`来看了看这个，没想到还是挺有收获的(之前不知道用`phar`来包含`zip`文件)，还欠下一篇过滤器的文章(nepctf)中的一个姿势有涉及,如有不对的地方，还望各位师傅斧正
