+++
title = "docker学习以及基础web题目部署"
slug = "docker-learning-and-basic-web-deployment"
description = ""
date = "2024-08-15T21:23:03"
lastmod = "2024-08-15T21:23:03"
image = ""
license = ""
categories = ["talk"]
tags = ["docker"]
+++

# 0x01 前言

docker必须要会啊，虽然折磨了我好久好久

这里使用的是抽奖得到的DK盾Ubuntu22

# 0x02 action

## 安装

```
sudo apt update
sudo apt install apt-transport-https curl

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

## 启动＋拉取最简单的镜像

```
systemctl start docker
systemctl status docker
```

## 配置

换源即可

```
sudo rm /etc/docker/daemon.json
sudo vim /etc/docker/daemon.json


{
  "registry-mirrors": [
    "https://docker.1ms.run"
  ]
}

sudo systemctl daemon-reload
sudo systemctl restart docker
```

随便搞个镜像看看行不行，这里是一个php的RCE题目，代码在

```
https://q1anchen.com/2023/CTF/Web-docker/41683085.html
```

这位师傅写的

```
sudo docker build -t webx:latest .

sudo docker run -d -p 8080:80 --name webx_container webx:latest

sudo docker ps
进入当前容器
sudo docker exec -it webx_container /bin/bash
退出当前容器

exit
停止容器
sudo docker stop webx_container
删除容器
sudo docker rm webx_container
删除镜像
sudo docker rmi webx:latest
```

终于成功了，谢谢两位师傅**kong**和**tianguyin**

## 安装nginx

这里我是台新机器所以顺便安装一个

```
sudo apt update
如果这里之后有一个选项直接enter就行
sudo apt install nginx

开机自启动nginx，方便使用
sudo systemctl start nginx
sudo systemctl enable nginx

sudo apt install php-fpm php-mysql

自己按需求更改，这里我就改了个端口
sudo vim /etc/nginx/sites-available/default

sudo nginx -t
sudo systemctl restart nginx
sudo systemctl status nginx


```

```
root@dkcjbRCL8kgaNGz:/mysite/mysite# python3 app.py
 * Serving Flask app 'app'
 * Debug mode: on
WARNING: This is a development server. Do not use it in a production deployment. Use a production WSGI server instead. * Running on all addresses (0.0.0.0)
 * Running on http://127.0.0.1:5000
 * Running on http://27.25.151.48:5000
Press CTRL+C to quit
 * Restarting with stat
 * Debugger is active!
 * Debugger PIN: 925-107-116
 
 root@dknbqF4vOoSucynS:/mysite/mysite# python3 app.py
 * Serving Flask app 'app'
 * Debug mode: on
WARNING: This is a development server. Do not use it in a production deployment. Use a production WSGI server instead. * Running on all addresses (0.0.0.0)
 * Running on http://127.0.0.1:5000
 * Running on http://10.0.7.2:5000
Press CTRL+C to quit
 * Restarting with stat
 * Debugger is active!
 * Debugger PIN: 329-014-986
```

然后我这里是搭建了一个flask的题目

```
unzip /mysite.zip -d /mysite

创建镜像
sudo docker build -t my_site:latest .

docker images

sudo docker run -d -p 5000:5000 --name my_site_container my_site:latest

sudo docker ps
停止容器
sudo docker stop my_site_container
删除容器
sudo docker rm my_site_container
删除镜像
sudo docker rmi my_site:latest
删除悬空镜像
sudo docker image prune
进容器内部
sudo docker exec -it my_site_container /bin/sh
```

我自己遇到的一些问题

```
Dockerfile写成dockerfile

mv dockerfile Dockerfile

格式不对Windows的文件格式和Linux不一样
file /mysite/mysite/start.sh
sudo apt-get install dos2unix
dos2unix /mysite/mysite/start.sh

ID问题，ID就是容器最前面那串数字
581cddd65fa6   my_site                               "/var/www/html/start…"   2 minutes ago   Up 2 minutes   5000/tcp, 0.0.0.0:8000->80/tcp, [::]:8000->80/tcp   inspiring_yonath

这里ID就是581cddd65fa6
```

## 打包

最后也是最重要的将Docker打包

```
sudo docker save -o my_site_image.tar my_site:latest
```

导出为镜像

```
sudo docker load -i /mysite/mysite/my_site_image.tar
直接做一个新镜像
sudo docker import my_site_image.tar my_site:latest

docker run -d -p 5000:5000 --name my_site_container my_site:latest /start.sh
```

或者是这种方式

```
sudo docker ps

sudo docker export 容器ID -o my_site.tar

sudo docker export 8e1bc2456012 -o my_site.tar
导出镜像为
sudo docker import my_site.tar my_site_exported:latest

docker run -d -p 5000:5000 my_site /start.sh
```

有时候可能会像我一样找不到路径emm没事

```
sudo find / -name my_site_image.tar
```

还有就是把所有代码打包成一个`all.tar.gz`并且不包含`all.tar.gz`

```
tar -czvf all.tar.gz --exclude='all.tar.gz' .
```

# 0x03 小结

写的比较乱，但是基础的命令是基本都有了，将就看看吧

谢谢中途对我有帮助的师傅！！
