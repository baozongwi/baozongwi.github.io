+++
title = "certbot配置https"
slug = "certbot-https-configuration"
description = "让你不用担心https"
date = "2025-04-16T21:57:48"
lastmod = "2025-04-16T21:57:48"
image = ""
license = ""
categories = ["talk"]
tags = ["工具"]
+++

## 说在前面

首先声明一下，这并不是水文，起因是今天下午突然想起来，dice2024的时候有一道题因为自己的域名不够短，而没能攻击成功，想来就气，于是去阿里云淘到了一个非常不错的域名，`rb3.top`十年188，简直拉满了，我也是用了一个小时才找到的，想用来专门给一台服务器当做测试的攻击机，但是https这是不能少的，不然后面就会很麻烦

不过经历了几次手动配置，虽然觉得非常的熟练的写出了`conf`文件

```
server {
    listen 443 ssl;
    server_name a.baozongwi.xyz;

    # SSL 证书和私钥的路径
    ssl_certificate /etc/nginx/a.baozongwi.xyz_bundle.crt;
    ssl_certificate_key /etc/nginx/a.baozongwi.xyz.key;

    # 支持的 SSL 协议
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;   # 配置安全的加密算法

    # 设置文件路径
    root /var/www/html;  # 确保这里指向你的网页根目录
    index index.html index.htm;

    location / {
        try_files $uri $uri/ =404;  # 如果找不到文件则返回 404
    }

    # 强制 HTTP 到 HTTPS 的重定向
    error_page 497 https://$host$request_uri;

    # 可选：配置日志
    access_log /var/log/nginx/a.baozongwi.xyz.access.log;
    error_log /var/log/nginx/a.baozongwi.xyz.error.log;
}
```

，正打算去阿里云申请一个一年的免费证书，什么?!你要我68？诶然后就去问了问，突然想起之前Pazuris师傅的博客过期，我去催他上https的事情，于是去问问他，有没有什么绕过的方法， 他给我安利了一个好工具**certbot**

## certbot配置https

这里的操作非常之简单，干就完事了，[官方操作文档](https://certbot.eff.org/instructions?ws=nginx&os=snap) 

首先安装一下`snapd`

```
sudo apt update
sudo apt install snapd
sudo systemctl start snapd
sudo systemctl enable snapd

snap version
```

如果有回显版本，那就是安装并且启动成功了，接着我们就可以使用这个包来安装

`certbot`，我这里使用的是debian，所以需要去运行`sudo apt-get remove certbot`，即使可能之前自己没有安装过这个工具，但是还是运行一下为妙

安装

```
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
```

我们是使用的nginx，

```
sudo certbot --nginx
```

直接一键部署，中途会问几个问题，但是都无关紧要，类似于

```
root@dkhkdZNfqWuIjxnYiAla:/var/www/html# sudo certbot --nginx
Saving debug log to /var/log/letsencrypt/letsencrypt.log
Enter email address or hit Enter to skip.
 (Enter 'c' to cancel): 2xxxxxxxxxxxxxxxxx5@qq.com

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Please read the Terms of Service at:
https://letsencrypt.org/documents/LE-SA-v1.5-February-24-2025.pdf
You must agree in order to register with the ACME server. Do you agree?
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
(Y)es/(N)o: Y

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Would you be willing, once your first certificate is successfully issued, to
share your email address with the Electronic Frontier Foundation, a founding
partner of the Let's Encrypt project and the non-profit organization that
develops Certbot? We'd like to send you email about our work encrypting the web,
EFF news, campaigns, and ways to support digital freedom.
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
(Y)es/(N)o: Y
Account registered.
Please enter the domain name(s) you would like on your certificate (comma and/or
space separated) (Enter 'c' to cancel): rb3.top
Requesting a certificate for rb3.top

Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/rb3.top/fullchain.pem
Key is saved at:         /etc/letsencrypt/live/rb3.top/privkey.pem
This certificate expires on 2025-07-15.
These files will be updated when the certificate renews.
Certbot has set up a scheduled task to automatically renew this certificate in the background.

Deploying certificate
Successfully deployed certificate for rb3.top to /etc/nginx/sites-enabled/default
Congratulations! You have successfully enabled HTTPS on https://rb3.top

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
If you like Certbot, please consider supporting our work by:
 * Donating to ISRG / Let's Encrypt:   https://letsencrypt.org/donate
 * Donating to EFF:                    https://eff.org/donate-le
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
```

我们就部署成功啦，现在去访问一下，发现确实是https，再写个定时任务来设置检查，这里设置一个月的，反正不影响

```
sudo crontab -e

# 写入
0 0 */30 * * /usr/bin/certbot renew --dry-run --quiet
```

保存退出之后查看是否生效

```
sudo crontab -l
```

发现确实有这个了，避免因为权限问题不能运行成功，自己手动运行`sudo certbot renew --dry-run`，发现也成功了，这样就OK了啊

## 小结

特别好用的工具，谢谢Pazuris师傅的推荐😄
