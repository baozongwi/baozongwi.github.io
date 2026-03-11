+++
title= "不出网compose编写"
slug= "docker-compose-no-egress"
description= ""
date= "2025-09-24T01:02:13+08:00"
lastmod= "2025-09-24T01:02:13+08:00"
image= ""
license= ""
categories= ["talk"]
tags= ["docker"]

+++

之前年初SUCTF的时候，毕师傅因为余神写的Docker不够权威，导致了DNS出网，直接可以把flag给leak出来，后来我也没解决DNS出网的问题，直到有一次让infer出题的时候他知道怎么弄

一般我是直接把DNS设置为空，但是这样子还是能出网，而要不出网的话，需要设置为`127.0.0.1`

```yaml
services:
  test:
    image: test:latest
    build: 
      context: .
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
    environment:
      - PYTHONUNBUFFERED=1
    tmpfs:
      - /tmp:size=100M,noexec,nosuid,nodev
    dns:
      - 127.0.0.1
    cap_drop:
      - ALL
    cap_add:
      - SETUID
      - SETGID
      - CHOWN
    networks:
      - private

networks:
  private:
    driver: bridge
    driver_opts:
      com.docker.network.bridge.enable_ip_masquerade: 'false'
```

只要用这个compose启动的容器，那确实是不出网的，但是我给image导出为tar再导入使用的时候发现tar导入的镜像直接启动的容器依旧是出网的，使用命令为

```bash
docker run -d -p 8000:8000 --name test_container test:latest
```

那我们已经知道了如何设置不出网，所以我们只需要在启动命令里面加两项即可

```bash
docker network inspect private_net >/dev/null 2>&1 || docker network create --driver bridge --opt "com.docker.network.bridge.enable_ip_masquerade=false" private_net; docker run -d --name test_container --network private_net --dns=127.0.0.1 -p 8000:8000 test:latest
```

复杂不少，所以也就有个问题，如果主办方不能很理解出题人的想法的话，那就可能赛题出网（可以捡漏）

