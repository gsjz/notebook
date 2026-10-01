# Nginx 基础

示例域名使用 `example.com` 下的保留名称，后端端口仅用于说明配置关系；部署时需替换域名、端口和证书路径。

## 服务模型

Nginx 的名字来自 **engine x**，常见英文读法就是 `engine x`。

Nginx 常作为静态 Web 服务器、反向代理和 TLS 入口，也可承担负载均衡、缓存及四层代理。它以事件驱动方式让 worker 管理多个连接，网络等待期间可以处理其他就绪事件；这一模型减少了为每个连接配置独占线程的需求，但文件描述符、CPU、内存和后端能力仍会限制吞吐量。

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

此处假定 Nginx 与应用位于同一网络命名空间。回环监听限制直接连接的来源；若 Nginx 在容器中，`127.0.0.1` 指向代理容器自己，应使用同一容器网络中的服务名或可达的宿主机地址。

### 基于域名的虚拟主机

多个域名可以解析到同一个公网 IP。Nginx 先按监听地址和端口确定候选配置，TLS 握手阶段可按 SNI 选择证书，HTTP 阶段再按请求主机名选择处理规则。SNI 与 `Host` 出现在不同协议阶段；不能只改 HTTP 请求头就认为 TLS 证书也随之切换。

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

直接访问服务器 IP 时，请求主机名通常为 IP 字面量，未匹配时会进入该监听地址的默认 server。返回默认页、业务页或拒绝连接取决于这份配置；HTTPS 还可能因证书未覆盖 IP 地址而验证失败。

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
    listen 443 ssl;
    http2 on;
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

`http2 on;` 自 Nginx 1.25.1 起提供；旧发行版配置可能仍需 `listen 443 ssl http2;`，应根据 `nginx -v` 与已编译模块选择语法。TLS 连接在 Nginx 处解密，后端链路具有独立的安全边界：回环 HTTP 不经过外网，跨主机通信则需按网络信任关系配置加密和身份验证。

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

默认采用加权轮询。开源 Nginx 的上游模块提供基于请求失败的被动故障判断，主动健康检查等能力需区分版本与产品，不能从“支持 upstream”推断已自动探测所有后端。超时和重试还需考虑请求是否可安全重放；后端已经执行写操作但响应丢失时，重试可能重复产生副作用。

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

`map` 需要放在 `http` 上下文。`proxy_read_timeout` 约束相邻两次从后端读取之间的等待时间，并非整个连接的总寿命；WebSocket 心跳可以避免长期无数据导致断开。日志流或 SSE 使用普通 HTTP 流式响应，不能仅因“长连接”就添加 Upgrade 头，其重点常是响应缓冲与超时。

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

`sites-available`/`sites-enabled` 是常见发行版约定，是否生效取决于实际 `include`。容器镜像或其他安装方式可使用不同布局；用 `nginx -T` 确认正在加载的配置。


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

日常可以说 `location` 按 URL 路径匹配；更精确地说，它匹配的是 URL 里的路径部分。在 Nginx 变量里，`$uri` 表示规范化后的路径，通常不包含查询字符串；`$request_uri` 保留原始请求 URI，通常包含 `?v=1` 这类查询字符串。

在没有其他竞争规则时，请求 `/static/logo.png` 进入 `/static/`，而 `/about` 落到 `/`。`root /var/www/app` 将完整 URI 拼到根目录后，因此前者读取 `/var/www/app/static/logo.png`；`alias` 的路径替换语义与此不同。

常见写法：

| 写法 | 含义 |
| --- | --- |
| `location /` | 匹配所有路径，常作为兜底 |
| `location /api/` | 匹配 `/api/` 前缀 |
| `location = /health` | 精确匹配 `/health` |
| `location ~ \.php$` | 正则匹配，区分大小写 |
| `location ~* \.jpg$` | 正则匹配，不区分大小写 |
| `location ^~ /assets/` | 该前缀成为最长匹配时，跳过同层正则匹配 |

对同一层的简单规则集，精确匹配优先；否则记住最长前缀，再按配置顺序寻找第一个匹配的正则，除非该最长前缀带 `^~`。嵌套 location 和内部重定向会使路径更复杂，因此“最长前缀总是胜出”只适用于没有相关正则覆盖的情况。


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

这些头部供后端恢复入口信息，但后端必须限定可信代理来源：

| 头部 | 作用 |
| --- | --- |
| `Host` | 保留用户访问的域名 |
| `X-Real-IP` | 传递客户端 IP |
| `X-Forwarded-For` | 在已有头部后追加直接对端地址，既有部分可能来自客户端输入 |
| `X-Forwarded-Proto` | 告诉后端原始请求是 HTTP 还是 HTTPS |

`$proxy_add_x_forwarded_for` 不会自动验证客户端提交的旧头部。应用应只接受可信代理添加的转发信息，并按可信代理链解析地址；把列表第一项直接用作身份或限流依据，会允许伪造。Nginx 前面还有 CDN 或负载均衡时，应明确 `real_ip` 的可信地址范围。

### URI 转发与尾部斜杠

在普通前缀 location 中，`proxy_pass` 是否带 URI 会改变后端看到的路径：

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:8000/;
}
```

请求 `/api/users?id=7` 通常变为后端的 `/users?id=7`。若改为 `proxy_pass http://127.0.0.1:8000;`，则保留 `/api/users?id=7`。前一种配置用指令中的 `/` 替换匹配到的 `/api/` 前缀。

这条规则以无变量、无额外 rewrite 的普通前缀匹配为前提。正则 location、命名 location、变量形式和内部重写需要按官方规则分别判断。排查前端返回 404 时，应核对后端实际收到的路径，而不只检查端口连通性。

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

## 多服务代理配置

假设一台服务器上有四个本机服务：

```text
日志服务:   127.0.0.1:18080
待办服务:   127.0.0.1:18082
文件服务:   127.0.0.1:18084
笔记服务:   127.0.0.1:18086
```

以下展示其中两个服务的 HTTP 路由，文件应被包含在 `http` 上下文。HTTPS 证书配置与重定向需按前面的 TLS 示例另行补齐：

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
8.  这两项分别限制相邻读取、写入操作间的等待时间；提高它们并不能修复后端停止响应。

访问 IP 地址且主机名未匹配时，请求落到相应监听地址和端口的默认 server。默认项可以显式指定 `default_server`；没有显式指定时通常为该监听地址的第一个 server，因此也可能碰巧进入某个业务站点。

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
| `sudo systemctl reload nginx` | 启动使用新配置的 worker，让旧 worker 尽量完成现有连接后退出 |
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

排查应把 DNS、TLS、虚拟主机选择和后端响应分别验证。先从 Nginx 所在网络环境访问后端，再使用正确域名经过入口：

```bash
dig notes.example.com
curl -sv http://127.0.0.1:18086/
curl -sv -H 'Host: notes.example.com' http://127.0.0.1/
curl -sv --resolve notes.example.com:443:203.0.113.10 https://notes.example.com/
sudo nginx -T | grep -n "notes.example.com"
sudo tail -n 100 /var/log/nginx/error.log
```

`--resolve` 让连接走指定 IP，同时保留 URL 中的主机名用于 SNI、证书验证和 HTTP 请求。`-I` 只发送 HEAD，可能与 GET 的应用路径不同；错误页也可能返回 200，因此需要查看实际正文。诊断输出可能包含 Cookie 或认证头，分享前应删去敏感信息。

错误日志中的 `connect() failed` 常指向后端连接失败，`upstream timed out` 指向对应阶段超时，`upstream prematurely closed connection` 表示后端提前关闭连接。结合应用日志和同一时间窗口再定位原因，单凭 502 无法区分配置、崩溃和协议错误。

可在 `http` 上下文增加上游耗时日志：

```nginx
log_format upstream_timing '$remote_addr $request_method $uri $status '
                           'rt=$request_time uct=$upstream_connect_time '
                           'uht=$upstream_header_time urt=$upstream_response_time';
access_log /var/log/nginx/access.log upstream_timing;
```

总请求耗时包含客户端交互等阶段，上游连接、响应头和响应耗时用于进一步定位；发生多次上游尝试时变量可能包含多组值。事件驱动架构不能消除慢后端，增加 worker 数也不会直接提高数据库吞吐量。

## 参考

- [Nginx 请求处理与 server 选择](https://nginx.org/en/docs/http/request_processing.html)
- [HTTP 核心模块：location、root、alias](https://nginx.org/en/docs/http/ngx_http_core_module.html)
- [代理模块：URI、超时与转发头](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [HTTP/2 模块](https://nginx.org/en/docs/http/ngx_http_v2_module.html)
- [WebSocket 代理](https://nginx.org/en/docs/http/websocket.html)
- [上游模块](https://nginx.org/en/docs/http/ngx_http_upstream_module.html)
