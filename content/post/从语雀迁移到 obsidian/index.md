+++
title= "从语雀迁移到 Obsidian"
slug= "yuque-to-obsidian-migration"
date= "2026-04-30T16:55:51+08:00"
lastmod= "2026-04-30T16:55:51+08:00"
categories= ["talk"]
tags= []

+++

我尝试过直接利用 API 导出转换但是很遗憾，一个 API 一小时的次数实际上迁移这 200 多篇文档居然不够用，直接坠机，然后看到可以导出`.lakebook`，再转成 Markdown。`yuque2markdown` 这个工具就是干这个的

```sh
git clone https://github.com/alswl/yuque2markdown.git

cd yuque2markdown && \
pip3 install -r requirements.txt
```

把所有`.lakebook`下载到 download 目录下之后直接处理，

```sh
find .. -maxdepth 1 -type f -name "*.lakebook" -print0 | while IFS= read -r -d $'\0' f; do name="$(basename "$f" .lakebook)"; mkdir -p "$HOME/My_Vault/$name"; python3 ./yuque2markdown.py "$f" "$HOME/My_Vault/$name" --download-image || echo "[WARN] 失败: $f"; done
```

有一点小 bug 进行一下修复，比如图片无法下载，有一些情况作者没考虑到，还有就是我想要把所有图片用作 png 来管理，所以还加了一个强转，最后的脚本如下

```python
# coding=utf-8
import json
import os
import random
import shutil
import sys
import argparse
import tarfile
from base64 import b64decode
from binascii import Error as BinasciiError
from io import BytesIO
from urllib.parse import unquote, unquote_to_bytes, urlparse
from markdownify import markdownify as md
from bs4 import BeautifulSoup
from PIL import Image, UnidentifiedImageError
from requests import get
from requests.exceptions import RequestException

import yaml
import tempfile


TYPE_TITLE = "TITLE"
TYPE_DOC = "DOC"
META_JSON = "$meta.json"
TMP_DIR = tempfile.gettempdir()

DEFAULT_HEADING_STYLE = "ATX"

CONTENT_TYPE_TO_EXTENSION = {
    "image/gif": ".gif",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/svg+xml": ".svg",
    "image/png": ".png",
    "image/webp": ".webp",
}

CONVERT_TO_PNG_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def sanitizer_file_name(name):
    name = name.replace("/", "_")
    name = name.replace("\\", "_")
    name = name.replace(" ", "_")
    name = name.replace("?", "_")
    name = name.replace("*", "_")
    name = name.replace("<", "_")
    name = name.replace(">", "_")
    name = name.replace("|", "_")
    name = name.replace('"', "_")
    name = name.replace(":", "_")
    return name


def read_toc(random_tmp_dir):
    # open meta json
    f = open(os.path.join(random_tmp_dir, META_JSON), "r", encoding="utf-8")
    meta_file_str = json.loads(f.read())
    meta_str = meta_file_str.get("meta", "")
    meta = json.loads(meta_str)
    toc_str = meta.get("book", {}).get("tocYml", "")
    toc = yaml.unsafe_load(toc_str)
    f.close()
    return toc


def extract_repos(repo_dir, output, toc, download_image):
    last_level = 0
    last_sanitized_title = ""
    path_prefixed = []
    for item in toc:
        t = item["type"]
        url = str(item.get("url", ""))
        current_level = item.get("level", 0)
        title = str(item.get("title", ""))
        sanitized_title = sanitizer_file_name(str(title))
        if not title:
            continue
        while True:
            if os.path.exists(os.path.join(output, sanitized_title)):
                sanitized_title = sanitizer_file_name(str(title)) + str(
                    random.randint(0, 1000)
                )
            break

        if current_level > last_level:
            path_prefixed = path_prefixed + [last_sanitized_title]
        elif current_level < last_level:
            diff = last_level - current_level
            path_prefixed = path_prefixed[0:-diff]

        # else:
        if t == TYPE_DOC:
            output_dir_path = os.path.join(output, *path_prefixed)
            if not os.path.exists(output_dir_path):
                os.makedirs(output_dir_path)
            article_dir_path = os.path.join(output_dir_path, sanitized_title)
            if not os.path.exists(article_dir_path):
                os.makedirs(article_dir_path)
            raw_path = os.path.join(repo_dir, url + ".json")
            raw_file = open(raw_path, "r", encoding="utf-8")
            doc_str = json.loads(raw_file.read())
            html = doc_str["doc"]["body"] or doc_str["doc"]["body_asl"]

            if download_image:
                html = download_images_and_patch_html(
                    repo_dir, article_dir_path, html
                )

            output_path = os.path.join(article_dir_path, sanitized_title + ".md")
            f = open(output_path, "w", encoding="utf-8")
            f.write(pretty_md(md(html, heading_style=DEFAULT_HEADING_STYLE)))

        last_sanitized_title = sanitized_title
        last_level = current_level


def download_images_and_patch_html(repo_dir, output_dir_path, html):
    bs = BeautifulSoup(html, "html.parser")
    if len(bs.find_all("img")) > 0:
        attachments_dir_path = os.path.join(output_dir_path, "assets")
        if not os.path.exists(attachments_dir_path):
            os.mkdir(attachments_dir_path)
        no = 1
        for image in bs.find_all("img"):
            src = image.get("src", "")
            if not src:
                continue

            parsed_src = urlparse(src)
            png_file_name = "%03d.png" % no
            attachments_file_path = os.path.join(attachments_dir_path, png_file_name)

            if parsed_src.scheme in ("http", "https") or src.startswith("//"):
                url = "https:" + src if src.startswith("//") else src
                print("Download %s" % src)
                try:
                    resp = get(url, timeout=30)
                    resp.raise_for_status()
                except RequestException as e:
                    print("Skip image %s: %s" % (src, e))
                    continue

                content_type = resp.headers.get("Content-Type", "")
                if should_convert_to_png(src, content_type) and save_image_as_png(
                    BytesIO(resp.content), attachments_file_path
                ):
                    file_name = png_file_name
                else:
                    file_name = save_original_image(
                        resp.content, attachments_dir_path, no, src, content_type
                    )
            elif parsed_src.scheme == "data":
                data_uri = parse_data_uri(src)
                if not data_uri:
                    print("Skip image %s: invalid data URI" % src[:80])
                    continue

                content_type, image_data = data_uri
                if should_convert_to_png(src, content_type) and save_image_as_png(
                    BytesIO(image_data), attachments_file_path
                ):
                    file_name = png_file_name
                else:
                    file_name = save_original_image(
                        image_data, attachments_dir_path, no, src, content_type
                    )
            elif parsed_src.scheme:
                print("Skip image %s: unsupported scheme" % src)
                continue
            else:
                src_path = unquote(parsed_src.path).lstrip("/")
                local_image_path = os.path.abspath(os.path.join(repo_dir, src_path))
                repo_dir_abs = os.path.abspath(repo_dir)
                if not local_image_path.startswith(repo_dir_abs + os.sep) or not os.path.isfile(
                    local_image_path
                ):
                    print("Remove image %s: local file not found" % src)
                    image.decompose()
                    continue

                if should_convert_to_png(src) and save_image_as_png(
                    local_image_path, attachments_file_path
                ):
                    file_name = png_file_name
                else:
                    file_name = save_original_file(
                        local_image_path, attachments_dir_path, no, src
                    )

            no = no + 1
            image["src"] = "./assets/" + file_name
        html = str(bs)
        return html
    else:
        return html


def should_convert_to_png(src, content_type=""):
    extension = image_extension(src, content_type, "")
    return extension == "" or extension in CONVERT_TO_PNG_EXTENSIONS


def image_extension(src, content_type="", default=".img"):
    content_type = content_type.split(";", 1)[0].strip().lower()
    if content_type in CONTENT_TYPE_TO_EXTENSION:
        return CONTENT_TYPE_TO_EXTENSION[content_type]

    extension = os.path.splitext(unquote(urlparse(src).path))[1].lower()
    if extension:
        return extension

    return default


def save_original_image(image_data, attachments_dir_path, no, src, content_type=""):
    file_name = "%03d%s" % (no, image_extension(src, content_type))
    attachments_file_path = os.path.join(attachments_dir_path, file_name)
    with open(attachments_file_path, "wb") as f:
        f.write(image_data)
    return file_name


def save_original_file(local_image_path, attachments_dir_path, no, src):
    file_name = "%03d%s" % (no, image_extension(src))
    attachments_file_path = os.path.join(attachments_dir_path, file_name)
    shutil.copyfile(local_image_path, attachments_file_path)
    return file_name


def parse_data_uri(src):
    try:
        header, image_data = src.split(",", 1)
    except ValueError:
        return None
    if not header.startswith("data:"):
        return None

    parts = header[5:].split(";")
    content_type = parts[0] or "text/plain"
    try:
        if "base64" in parts[1:]:
            image_data = b64decode(image_data)
        else:
            image_data = unquote_to_bytes(image_data)
    except (BinasciiError, ValueError):
        return None

    return content_type, image_data


def save_image_as_png(image_file, output_path):
    try:
        with Image.open(image_file) as image:
            if image.mode in ("RGBA", "LA"):
                output = image
            elif image.mode == "P" and "transparency" in image.info:
                output = image.convert("RGBA")
            else:
                output = image.convert("RGB")
            output.save(output_path, "PNG")
    except (OSError, UnidentifiedImageError):
        return False
    return True


def pretty_md(text: str) -> str:
    output = text

    lines = output.split("\n")
    for i in range(len(lines)):
        lines[i] = lines[i].rstrip()
    output = "\n".join(lines)

    for i in range(50):
        output = output.replace("\n\n\n", "\n\n")
        if "\n\n\n" not in output:
            break

    return output


def main():
    parser = argparse.ArgumentParser(description="Convert Yuque doc to markdown")
    parser.add_argument("lakebook", help="Lakebook file")
    parser.add_argument("output", help="Output directory")
    parser.add_argument(
        "--download-image", help="Download images to local", action="store_true"
    )
    args = parser.parse_args()
    if not os.path.exists(args.lakebook):
        print("Lakebook file not found: " + args.lakebook)
        sys.exit(1)
    if not os.path.exists(args.output):
        os.mkdir(args.output)

    # extract lakebook file
    random_tmp_dir = os.path.join(TMP_DIR, "lakebook_" + str(os.getpid()))
    extract_tar(args.lakebook, random_tmp_dir)
    # detect only one directory in random_tmp_dir
    repo_dir = ""
    for root, dirs, files in os.walk(random_tmp_dir):
        for d in dirs:
            repo_dir = os.path.join(random_tmp_dir, d)
            break
        break
    if not repo_dir:
        print(".lakebook file is invalid")
        sys.exit(1)

    toc = read_toc(repo_dir)
    # print len of toc
    print("Total " + str(len(toc)) + " files")

    extract_repos(repo_dir, args.output, toc, args.download_image)

    # remove tmp dir
    shutil.rmtree(random_tmp_dir)


# extract tar file in tar.gz
def extract_tar(tar_file, target_dir):
    if not os.path.exists(target_dir):
        os.mkdir(target_dir)
    tar = tarfile.open(tar_file)
    names = tar.getnames()
    for name in names:
        tar.extract(name, target_dir)
    tar.close()


if __name__ == "__main__":
    main()
```

ps: 粘贴脚本必须使用 **Cmd + Shift + V** 粘贴纯文本
