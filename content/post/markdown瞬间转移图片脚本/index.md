+++
title= "Markdown瞬间转移图片脚本"
slug= "markdown-image-teleport-script"
description= ""
date= "2025-11-18T00:43:17+08:00"
lastmod= "2025-11-18T00:43:17+08:00"
image= ""
license= ""
categories= ["talk"]
tags= [""]

+++

自用的，一般誊抄 SU 的 Writeup 总是会消耗很久时间，主要就是从飞书下载图片到博客文件夹内，然后再在markdown 文章中让其生效，虽然下载图片的过程我省略不了，但是转移的话可以省下不少时间。

与此同时我也已经变成了懒人，也不说是懒，因为有两个电脑，所以我通常使用语雀作为他们的媒介，也是誊抄到本地博客，所以这个脚本也会让我方便很多😜

首先直接从语雀或者飞书复制到md文档，然后使用脚本

```python
import re
import argparse
from pathlib import Path

def find_max_used_index(text, folder, ext):
    no_prefix = folder.strip() in (".", "./")
    if no_prefix:
        pat = re.compile(r"!\[[^\]]*\]\((?:\./)?([0-9]+)\." + re.escape(ext) + r"\)")
    else:
        pat = re.compile(r"!\[[^\]]*\]\(" + re.escape(folder.rstrip('/')) + r"/([0-9]+)\." + re.escape(ext) + r"\)")
    max_idx = -1
    for m in pat.finditer(text):
        i = int(m.group(1))
        if i > max_idx:
            max_idx = i
    return max_idx

def replace_feishu_images(text, folder, start, end, alt, ext):
    remote_img_pat = re.compile(r"!\[[^\]]*\]\((https://[^)]*)\)")
    idx = start
    limit = end if end is not None else None
    no_prefix = folder.strip() in (".", "./")

    def repl(_):
        nonlocal idx
        if limit is not None and idx > limit:
            return _.group(0)
        if no_prefix:
            s = f"![{alt}]({idx}.{ext})"
        else:
            s = f"![{alt}]({folder.rstrip('/')}/{idx}.{ext})"
        idx += 1
        return s

    return remote_img_pat.sub(repl, text)

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--md', required=True)
    p.add_argument('--folder', required=True)
    p.add_argument('--start', type=int)
    p.add_argument('--end', type=int)
    p.add_argument('--alt', default='img')
    p.add_argument('--ext', default='png')
    p.add_argument('--dry', action='store_true')
    args = p.parse_args()

    md_path = Path(args.md)
    text = md_path.read_text(encoding='utf-8')

    start = args.start
    if start is None:
        max_used = find_max_used_index(text, args.folder, args.ext)
        start = max_used + 1 if max_used >= 0 else 0

    new_text = replace_feishu_images(text, args.folder, start, args.end, args.alt, args.ext)

    if args.dry:
        print(new_text)
    else:
        md_path.write_text(new_text, encoding='utf-8')

if __name__ == '__main__':
    main()
    
    
# python replace_feishu_images.py --md index.md --folder . --start 1 --end 14 --ext png
    
# python replace_feishu_images.py --md 2025-RCTF.md --folder ../images/2025-RCTF --start 0 --end 76 --ext png
```

RCTF 总共有 0-76,77 张 png，然后可以识别到再瞬间转换，就不用一步步的来誊抄了。

还有我自己写的 Hession反序列化有14张png，也是直接就转移过来了。
