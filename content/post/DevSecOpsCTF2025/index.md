+++
title = "DevSecOpsCTF2025"
slug = "devsecopsctf2025"
description = "AI使我弱小"
date = "2025-05-04T17:54:59"
lastmod = "2025-05-04T17:54:59"
image = ""
license = ""
categories = ["赛题"]
tags = []
+++

## Password Cracking - 2

> The flag is the password for this vault.

给了一个文件，说flag是保险箱密码，问AI，安装工具提取hash出来之后

```
sudo apt-get install john keepass2

sudo apt-get install build-essential libssl-dev
git clone https://github.com/magnumripper/JohnTheRipper.git
cd JohnTheRipper/src
./configure && make
cd ../run
./keepass2john ~/Desktop/Passwords.kdb > ~/Desktop/hash.txt
```

再利用外国人最喜欢的`rockyou.txt`进行爆破，处理一下格式，使用`hashcat`爆破

```
cat hash.txt | cut -d ':' -f 2 > hash_for_hashcat.txt
.\hashcat -m 13400 hash_for_hashcat.txt rockyou.txt
```

得到flag为`zebralicious`

## Password Cracking - 4

> The flag is the password corresponding with this hash.

```
$6$Q9/shQzQf6xlQyKr$bfHWQDlkwfvrJTBU0itN6kJeyEwQKfvviQ3buIDDNG1S/77a52unKnEssSw340AOMoGzUiyQ.l60wfho28Ay41
```

```
.\hashcat -m 1800 hash.txt rockyou.txt
```

得到flag为`pinkzebra`

## Password Cracking - 5

> The flag is the password corresponding with this hash.

```
92d7dcb3b27551277307d46856325798
```

```
.\hashcat -m 0 hash.txt rockyou.txt
```

得到`flag`为`3greenzebras`

## Password Cracking - 1

> The flag is the password for this vault.

```
baozongw1@ubuntu:~/Desktop/JohnTheRipper/run$ find . -name "ansible2john*"
./ansible2john.py

python3 ~/Desktop/JohnTheRipper/run/ansible2john.py ~/Desktop/vault > ~/Desktop/vault.hash

baozongw1@ubuntu:~/Desktop$ cat vault.hash
vault:$ansible$0*0*ad39411b97c98664588c52d1f51b40457db281146d76730942ea10d6a0127e7b*e4cadee9493ef5593a5c77d8c8d7d16dc35c0619e804ba2b913ccd1fa95997cd*53bd6d54ccc8e80e6d45efd8e2f5d537764e5443fdbd648174c46777599c2ef6
```

把头去掉保存hash文件`$ansible$0*0*ad39411b97c98664588c52d1f51b40457db281146d76730942ea10d6a0127e7b*e4cadee9493ef5593a5c77d8c8d7d16dc35c0619e804ba2b913ccd1fa95997cd*53bd6d54ccc8e80e6d45efd8e2f5d537764e5443fdbd648174c46777599c2ef6`

```
.\hashcat -m 16900 fixed_vault.hash rockyou.txt
```

得到flag为`zebracakes`

## Password Cracking - 3

> d8e5d901a23c7d3023eedf501b626bfdc4a3b243635491e6d2abd39c0ec7cf9dff0c677383a7558e066d1417b08a3311d0ebcdc5f8b9f219477839dcb0ebfbfe
>
> Salt: `PunkCTF2025`
>
> The flag is the password.

新建一个`hash.txt`，

```
d8e5d901a23c7d3023eedf501b626bfdc4a3b243635491e6d2abd39c0ec7cf9dff0c677383a7558e066d1417b08a3311d0ebcdc5f8b9f219477839dcb0ebfbfe:PunkCTF2025
```

```
.\hashcat -m 1760 hash.txt rockyou.txt
```

挨着试的，因为不知道这个hash是多少的，我从1710一直搞到60，得到`zanyzebra9`

## 小结

全程用AI当脚本小子，本来想把web打打，即使环境很垃圾，但是一早醒来发现比赛原来是6:00结束，不是12:00结束
