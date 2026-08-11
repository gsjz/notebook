# Nginx 基础

!!! note "示例脱敏说明"
    本文示例使用 `notes.example.com`、`app.example.com` 和 `127.0.0.1:18xxx` 代表真实域名与本机服务端口。实际部署时，应替换为自己的域名、端口、证书路径和访问控制策略。

## 简介

Nginx 的名字来自 **engine x**，常见英文读法就是 `engine x`。

Nginx 是一个高性能的网络服务器软件。它最初以 Web 服务器和反向代理闻名，现在也常用于负载均衡、TLS 入口、缓存、压缩、访问日志和四层代理等场景。

在个人服务器或小型 Web 服务里，Nginx 常站在公网入口处：

```text
Browser
  -> DNS 解析 notes.example.com
  -> Server Public IP:80/443
  -> Nginx
  -> 127.0.0.1:18086
  -> 应用服务
```

## Nginx 的常见作用

### 静态 Web 服务器

静态 Web 服务器负责把磁盘上的文件按 URL 路径返回给浏览器。浏览器请求 `/index.html`、`/style.css` 或图片资源时，Nginx 会根据配置里的 `root` 目录去查找对应文件。

Nginx 可以直接把服务器上的 HTML、CSS、JavaScript、图片等静态文件返回给浏览器：

```nginx title="static-site.conf"
server {
    listen 80;
    server_name notes.example.com;

    root /var/www/notes;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

这种模式下，Nginx 自己就是 Web 服务进程，不需要再转发给后端应用。

### 反向代理

反向代理是最常见的实践场景之一。应用服务只监听本机端口，例如 `127.0.0.1:18086`；Nginx 对公网监听 `80/tcp` 或 `443/tcp`，再把请求转发给内部服务：

```nginx title="reverse-proxy.conf"
server {
    listen 80;
    listen [::]:80;
    server_name notes.example.com;

    location / {
        proxy_pass http://127.0.0.1:18086;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }
}
```

这个配置可以读成：

```text
如果请求的 Host 是 notes.example.com，
并且路径匹配 /，
就把请求代理到 http://127.0.0.1:18086。
```

!!! tip "为什么应用监听 127.0.0.1"
    应用只监听 `127.0.0.1` 时，外部用户不能直接访问应用端口，只能通过 Nginx 进入。这样可以把公网入口、HTTPS、日志、压缩、访问控制和转发规则集中放在 Nginx 管理。

### 基于域名的虚拟主机

多个域名可以解析到同一个公网 IP。Nginx 根据 HTTP 请求中的 `Host` 头，或者 HTTPS 握手中的 SNI，选择不同的 `server` 块。

```nginx title="multi-sites.conf"
server {
    listen 80;
    server_name notes.example.com;

    location / {
        proxy_pass http://127.0.0.1:18086;
    }
}

server {
    listen 80;
    server_name todo.example.com;

    location / {
        proxy_pass http://127.0.0.1:18082;
    }
}
```

因此，直接访问服务器 IP 时，请求里的 `Host` 往往是 IP 地址，而不是 `notes.example.com`。如果 Nginx 没有配置对应的默认站点，就可能返回默认页、`404`、`403`、`444`，或在 HTTPS 场景中出现证书不匹配。

!!! warning "DNS 只负责找到入口"
    DNS 只把域名解析为 IP。至于同一个 IP 上哪个域名对应哪个内部服务，是 Nginx、负载均衡器或应用网关根据请求内容决定的。

### HTTPS 入口与 TLS 终止

生产环境通常让 Nginx 监听 `443/tcp`，持有证书和私钥，完成 TLS 握手，再把解密后的 HTTP 请求转发给本机或内网后端。

```text
Browser
  -> HTTPS
  -> Nginx:443  处理证书和 TLS
  -> HTTP
  -> 127.0.0.1:18086
```

```nginx title="https-proxy.conf"
server {
    listen 443 ssl http2;
    server_name notes.example.com;

    ssl_certificate /etc/letsencrypt/live/notes.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/notes.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:18086;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

!!! note "TLS 终止"
    “TLS 终止”不是说安全性到这里就消失，而是说客户端到 Nginx 的 HTTPS 连接在 Nginx 处完成解密。若 Nginx 和后端在同一台机器上，后端使用 `127.0.0.1` 明文 HTTP 通常只在本机内部传递；若跨机器转发，则应重新考虑内网加密和访问控制。

### 负载均衡

当一个服务有多个后端实例时，可以用 `upstream` 定义后端池：

```nginx title="upstream.conf"
upstream app_backend {
    server 127.0.0.1:18081;
    server 127.0.0.1:18082;
}

server {
    listen 80;
    server_name app.example.com;

    location / {
        proxy_pass http://app_backend;
    }
}
```

默认情况下，Nginx 会在多个后端之间分发请求。实际生产中还可以配置权重、健康检查、超时、重试和会话保持等策略。

### WebSocket 与长连接代理

一些开发服务器、实时通信服务和在线编辑器会使用 WebSocket。代理这类服务时，通常要转发 `Upgrade` 和 `Connection` 头，并适当拉长超时时间：

```nginx title="websocket-proxy.conf"
map $http_upgrade $connection_upgrade {
    default upgrade;
    "" close;
}

server {
    listen 80;
    server_name ide.example.com;

    location / {
        proxy_pass http://127.0.0.1:18086;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_read_timeout 1h;
        proxy_send_timeout 1h;
    }
}
```

这类配置常见于热重载预览、在线 IDE、日志流、聊天服务等场景。

### 访问日志、压缩与限流

Nginx 还常用于做入口层的通用能力：

| 能力 | 作用 |
| --- | --- |
| 访问日志 | 记录请求来源、路径、状态码、耗时等信息 |
| 错误日志 | 记录配置错误、后端连接失败、权限错误等问题 |
| Gzip 压缩 | 减少文本资源传输体积 |
| 缓存 | 缓存静态资源或反向代理响应 |
| 限流 | 限制请求频率，减轻暴力请求或突发流量 |
| 访问控制 | 按 IP、路径、认证结果控制访问 |

!!! tip "入口层统一处理"
    把日志、压缩、证书、跳转和基础访问控制放到 Nginx 统一管理，可以减少每个应用重复实现这些能力的成本。

## Nginx 配置文件的通常位置

Ubuntu 包安装的 Nginx 常见目录结构如下：

```text
/etc/nginx/nginx.conf                # 主配置入口
/etc/nginx/conf.d/*.conf             # 通用附加配置
/etc/nginx/sites-available/          # 可用站点配置
/etc/nginx/sites-enabled/            # 已启用站点配置，通常是软链接
/etc/nginx/snippets/                 # 可复用片段
/var/log/nginx/access.log            # 访问日志
/var/log/nginx/error.log             # 错误日志
```

主配置里常见 include 方式：

```nginx title="/etc/nginx/nginx.conf"
http {
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
```

也就是说，真正写站点规则的文件经常不在 `nginx.conf` 里，而是在 `sites-available` 和 `sites-enabled` 里。


## Nginx 配置语法

### 指令、块与分号

Nginx 配置由指令组成。简单指令以分号结尾：

```nginx
worker_processes auto;
include /etc/nginx/mime.types;
```

块指令使用大括号包住子配置：

```nginx
events {
    worker_connections 768;
}

http {
    server {
        listen 80;
        server_name notes.example.com;
    }
}
```

### 上下文层级

Nginx 配置有明显的上下文层级：

```text
main
├── events
└── http
    ├── upstream
    └── server
        └── location
```

常见上下文含义如下：

| 上下文 | 作用 |
| --- | --- |
| `main` | 全局配置，例如用户、worker 数量、pid、日志 |
| `events` | 连接处理相关配置 |
| `http` | HTTP 服务的全局配置 |
| `server` | 一个虚拟主机，通常对应某些域名和监听端口 |
| `location` | 某个路径匹配规则 |
| `upstream` | 后端服务组 |

### `server`：按端口和域名匹配站点

`server` 块描述一个虚拟主机：

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name notes.example.com;

    location / {
        proxy_pass http://127.0.0.1:18086;
    }
}
```

关键指令：

| 指令 | 含义 |
| --- | --- |
| `listen` | 监听哪个地址和端口 |
| `server_name` | 匹配哪些域名 |
| `root` | 静态文件根目录 |
| `index` | 默认首页文件 |
| `location` | 路径匹配规则 |

### `location`：按路径匹配请求

`location` 决定 URL 中某个路径如何处理：

```nginx
location / {
    proxy_pass http://127.0.0.1:18086;
}

location /static/ {
    root /var/www/app;
}
```

!!! note "URL 和 URI"
    日常可以说 `location` 按 URL 路径匹配；更精确地说，它匹配的是 URL 里的路径部分。在 Nginx 变量里，`$uri` 表示规范化后的路径，通常不包含查询字符串；`$request_uri` 保留原始请求 URI，通常包含 `?v=1` 这类查询字符串。

在普通前缀匹配里，Nginx 会选择更长、更具体的前缀。所以上面这个例子中，请求 `/static/logo.png` 会进入 `location /static/`，而请求 `/about` 会落到 `location /`。

常见写法：

| 写法 | 含义 |
| --- | --- |
| `location /` | 匹配所有路径，常作为兜底 |
| `location /api/` | 匹配 `/api/` 前缀 |
| `location = /health` | 精确匹配 `/health` |
| `location ~ \.php$` | 正则匹配，区分大小写 |
| `location ~* \.jpg$` | 正则匹配，不区分大小写 |


### `proxy_pass`：转发到后端

`proxy_pass` 是反向代理的核心：

```nginx
location / {
    proxy_pass http://127.0.0.1:18086;
}
```

常配合这些头部一起使用：

```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

这些头部的作用是把原始请求信息传给后端应用：

| 头部 | 作用 |
| --- | --- |
| `Host` | 保留用户访问的域名 |
| `X-Real-IP` | 传递客户端 IP |
| `X-Forwarded-For` | 追加代理链路上的客户端 IP |
| `X-Forwarded-Proto` | 告诉后端原始请求是 HTTP 还是 HTTPS |

### 变量

Nginx 内置许多变量，常用的有：

| 变量 | 含义 | 示例 |
| --- | --- | --- |
| `$host` | 请求中的主机名 | `notes.example.com` |
| `$remote_addr` | 直接连接 Nginx 的客户端地址 | `203.0.113.10` |
| `$scheme` | 当前请求协议，通常是 `http` 或 `https` | `https` |
| `$uri` | 规范化后的请求 URI | `/static/logo.png` |
| `$request_uri` | 原始请求 URI，包含查询字符串 | `/static/logo.png?v=1` |
| `$http_upgrade` | 请求头 `Upgrade` 的值 | `websocket` |

变量常用于日志、代理头、条件映射和路径拼接。

### `map`：按变量生成新变量

`map` 常放在 `http` 上下文里，用于根据一个变量生成另一个变量。例如 WebSocket 代理常用：

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    "" close;
}
```

含义是：

```text
如果请求带 Upgrade 头，Connection 使用 upgrade；
如果 Upgrade 为空，Connection 使用 close。
```

## 一个贴近实践的完整例子

假设一台服务器上有四个本机服务：

```text
日志服务:   127.0.0.1:18080
待办服务:   127.0.0.1:18082
文件服务:   127.0.0.1:18084
笔记服务:   127.0.0.1:18086
```

公网只开放 `80/tcp` 和 `443/tcp`，由 Nginx 根据域名转发：

```nginx title="apps.example.conf"
map $http_upgrade $connection_upgrade {  # (1)!
    default upgrade;
    "" close;
}

server {
    listen 80;  # (2)!
    listen [::]:80;
    server_name logs.example.com;  # (3)!

    client_max_body_size 1024m;  # (4)!

    location / {
        proxy_pass http://127.0.0.1:18080;  # (5)!
        proxy_http_version 1.1;
        proxy_set_header Host $host;  # (6)!
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name notes.example.com;

    client_max_body_size 64m;

    location / {
        proxy_pass http://127.0.0.1:18086;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;  # (7)!
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 1h;  # (8)!
        proxy_send_timeout 1h;
        proxy_redirect off;
    }
}
```

1.  `map` 根据请求头 `$http_upgrade` 生成 `$connection_upgrade`，常用于 WebSocket 连接升级。
2.  `listen 80` 表示监听 IPv4 的 HTTP 端口；下一行 `listen [::]:80` 对应 IPv6。
3.  `server_name` 用域名区分不同站点，请求 `logs.example.com` 时会进入这个 `server` 块。
4.  `client_max_body_size` 限制请求体大小，文件上传、日志上传这类服务通常需要调大。
5.  `proxy_pass` 指定后端地址，这里把请求转发给本机的 `127.0.0.1:18080`。
6.  `proxy_set_header` 把原始请求信息传给后端，避免后端只看到 Nginx 自己的信息。
7.  `Upgrade` 和下面的 `Connection` 用于 WebSocket 或其它需要协议升级的长连接。
8.  `proxy_read_timeout` 和下面的 `proxy_send_timeout` 拉长代理超时时间，避免长连接过早断开。

!!! note "直接访问 IP 为什么可能打不开"
    直接访问服务器 IP 时，请求的 `Host` 不是 `notes.example.com`。如果 Nginx 没有匹配到对应 `server_name`，就不会进入这条反向代理规则，而是落到默认站点或返回错误。

## 常用运维命令

修改 Nginx 配置后，一般按下面顺序操作：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

常用命令如下：

| 命令 | 作用 |
| --- | --- |
| `sudo nginx -t` | 测试配置语法和引用文件是否有效 |
| `sudo nginx -T` | 输出完整合并后的配置，适合排查 include 后的真实配置 |
| `sudo systemctl reload nginx` | 平滑重载配置，不中断已有连接 |
| `sudo systemctl restart nginx` | 重启 Nginx，排障时才优先考虑 |
| `sudo systemctl status nginx` | 查看服务状态 |
| `sudo journalctl -u nginx -n 100` | 查看 systemd 日志 |
| `sudo tail -f /var/log/nginx/error.log` | 实时查看错误日志 |
| `sudo tail -f /var/log/nginx/access.log` | 实时查看访问日志 |


## 常见故障排查

| 现象 | 优先检查 |
| --- | --- |
| 域名打不开 | DNS 是否解析到正确 IP，安全组和防火墙是否放行 |
| 直接访问 IP 不是目标站点 | `server_name` 是否依赖正确域名，默认站点如何配置 |
| 返回 `502 Bad Gateway` | 后端服务是否启动，`proxy_pass` 端口是否正确 |
| 返回 `413 Request Entity Too Large` | `client_max_body_size` 是否过小 |
| WebSocket 连接失败 | 是否设置 `Upgrade` 和 `Connection` 头 |
| 后端拿不到真实 IP | 是否传递并正确解析 `X-Forwarded-For` |
| HTTPS 证书错误 | 证书是否覆盖当前域名，SNI 是否匹配 |
| 修改后没效果 | 是否改了启用文件，是否 reload，是否有多个 include |

排查时可以从入口到后端逐层确认：

```bash
dig notes.example.com
curl -I http://notes.example.com/
curl -I http://127.0.0.1:18086/
sudo nginx -T | grep -n "notes.example.com"
sudo tail -n 100 /var/log/nginx/error.log
```
