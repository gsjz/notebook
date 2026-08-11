# Docker 与 Docker Compose 基础

!!! abstract "本文要点"
    Docker 用镜像描述运行环境，用容器运行具体进程；Docker Compose 用一个 `compose.yaml` 描述一组服务、网络和卷，适合本地开发、小型服务部署和可复现环境管理。

    本文重点整理：

    - Docker 的镜像、容器、卷、网络和端口映射。
    - `docker run` 与 Dockerfile 的基本使用。
    - Compose 文件结构、常用命令、服务互联和数据持久化。
    - 常见排障思路和容易误解的地方。

## Docker 解决什么问题

传统部署经常依赖机器上已经安装好的运行时、系统库、配置文件和环境变量。换一台机器后，应用可能因为 Python、Node.js、OpenSSL、系统包版本或启动命令不同而表现异常。

Docker 的核心做法是把应用运行所需的文件系统、依赖、环境变量和启动命令封装成镜像，再从镜像启动容器。容器本质上仍然是宿主机上的进程，但它运行在相对隔离的文件系统、网络和进程环境中。

常见对象可以这样理解：

| 对象 | 含义 |
| --- | --- |
| Image | 镜像，类似应用运行环境的只读模板 |
| Container | 容器，从镜像启动出来的运行实例 |
| Dockerfile | 构建镜像的步骤文件 |
| Registry | 镜像仓库，例如 Docker Hub 或私有镜像仓库 |
| Volume | Docker 管理的数据卷，常用于持久化数据库数据 |
| Network | 容器间通信使用的虚拟网络 |

!!! note "镜像与容器的关系"
    镜像像“模板”，容器像“运行中的实例”。同一个镜像可以启动多个容器；删除容器不等于删除镜像，删除镜像也要求没有容器正在依赖它。

## Docker 常用命令

### 查看环境

```bash
docker version
docker info
```

`docker version` 用来确认客户端和服务端版本，`docker info` 用来查看 Docker Engine、存储驱动、默认网络、镜像数量和容器数量等信息。

### 运行一个容器

```bash
docker run --rm hello-world
```

`docker run` 会在本地没有镜像时先拉取镜像，再创建并启动容器。`--rm` 表示容器退出后自动删除，适合一次性命令。

运行一个 Nginx 示例：

```bash
docker run -d \
  --name demo-nginx \
  -p 8080:80 \
  nginx:alpine
```

这条命令的含义是：

| 参数 | 含义 |
| --- | --- |
| `-d` | 后台运行容器 |
| `--name demo-nginx` | 给容器命名 |
| `-p 8080:80` | 把宿主机 `8080` 端口映射到容器内 `80` 端口 |
| `nginx:alpine` | 使用的镜像 |

访问测试：

```bash
curl http://127.0.0.1:8080/
```

查看、进入、停止和删除容器：

```bash
docker ps
docker logs demo-nginx
docker exec -it demo-nginx sh
docker stop demo-nginx
docker rm demo-nginx
```

!!! warning "端口映射方向"
    `-p 8080:80` 的左边是宿主机端口，右边是容器内端口。公网服务器上暴露端口前，要确认防火墙、安全组和应用权限，不要把数据库、缓存或管理面板直接暴露到公网。

### 查看镜像和清理资源

```bash
docker images
docker pull nginx:alpine
docker image rm nginx:alpine
docker container prune
docker image prune
```

`prune` 类命令会清理未使用资源。执行前应确认不会删掉仍需要的调试容器、临时镜像或缓存层。

## Dockerfile：把环境写成文件

Dockerfile 用来描述如何构建镜像。一个最小静态站点镜像可以这样写：

```dockerfile title="Dockerfile"
FROM nginx:alpine

COPY site/ /usr/share/nginx/html/
```

构建和运行：

```bash
docker build -t demo-site:local .
docker run --rm -p 8080:80 demo-site:local
```

更常见的应用镜像会包含工作目录、依赖安装、源码复制和启动命令：

```dockerfile title="Dockerfile"
FROM python:3.13-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "app.py"]
```

!!! tip "构建上下文"
    `docker build -t demo .` 末尾的 `.` 是构建上下文。Dockerfile 里的 `COPY` 只能复制构建上下文内的文件。应使用 `.dockerignore` 排除 `.git/`、缓存目录、虚拟环境、构建产物和本地密钥。

## Compose 解决什么问题

单个 `docker run` 适合快速试验。真实应用往往包含 Web 服务、数据库、缓存、反向代理和后台任务，如果全部写成命令，端口、环境变量、卷和网络关系会很难维护。

Docker Compose 把这些内容写进一个 YAML 文件，通常命名为 `compose.yaml`：

```yaml title="compose.yaml"
services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./html:/usr/share/nginx/html:ro
```

启动、查看和停止：

```bash
docker compose up -d
docker compose ps
docker compose logs -f web
docker compose exec web sh
docker compose down
```

!!! note "现代 Compose 命令"
    现在优先使用 `docker compose`，它是 Docker CLI 的 Compose 子命令。旧教程里的 `docker-compose` 是早期独立命令，很多环境仍可见，但新项目建议按 `docker compose` 书写。

### Compose 文件的基本结构

一个较完整的 Compose 文件通常包含 `services`、`volumes` 和 `networks`：

```yaml title="compose.yaml"
services:
  app:
    build: .
    ports:
      - "127.0.0.1:8000:8000"
    environment:
      DATABASE_URL: postgresql://example:change-me@db:5432/example
    depends_on:
      db:
        condition: service_healthy
    networks:
      - frontend
      - backend

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: example
      POSTGRES_USER: example
      POSTGRES_PASSWORD: change-me
    volumes:
      - db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U example -d example"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - backend

volumes:
  db-data:

networks:
  frontend:
  backend:
```

这个例子里：

| 字段 | 作用 |
| --- | --- |
| `services` | 定义应用里的服务，每个服务通常对应一类容器 |
| `build` | 从本地 Dockerfile 构建镜像 |
| `image` | 直接使用已有镜像 |
| `ports` | 把容器端口发布到宿主机 |
| `environment` | 注入环境变量 |
| `volumes` | 挂载目录或命名卷 |
| `networks` | 控制服务加入哪些网络 |
| `depends_on` | 表达服务间的启动依赖 |
| `healthcheck` | 定义健康检查命令 |

!!! warning "不要把示例密码用于真实环境"
    `change-me` 只适合示例。真实服务应使用 `.env`、`env_file`、密钥管理工具或部署平台提供的 secret 能力，并避免把生产密码提交到公开仓库。

### `version` 字段

很多旧文章会在文件顶部写：

```yaml
version: "3.8"
```

现代 Compose 使用 Compose Specification，通常不再需要顶层 `version` 字段。新文件可以直接从 `services:` 开始，让当前 Compose 工具按规范解析。

!!! tip "文件名"
    推荐使用 `compose.yaml`。`docker-compose.yml` 仍然常见，Compose 也能识别，但新项目用 `compose.yaml` 更贴近当前文档。

## Compose 常用命令

### 启动与停止

```bash
docker compose up
docker compose up -d
docker compose up --build -d
docker compose stop
docker compose start
docker compose restart
docker compose down
```

| 命令 | 用途 |
| --- | --- |
| `up` | 创建并启动服务，前台显示日志 |
| `up -d` | 后台启动服务 |
| `up --build` | 启动前重新构建镜像 |
| `stop` | 停止容器，但保留容器、网络和卷 |
| `start` | 启动已存在的容器 |
| `restart` | 重启服务 |
| `down` | 停止并删除当前项目创建的容器和网络 |

!!! danger "`down -v` 会删除命名卷"
    `docker compose down -v` 会删除 Compose 文件中声明的命名卷和匿名卷。数据库数据通常放在卷里，执行前要确认已经备份，或者数据确实可以丢弃。

### 查看状态和日志

```bash
docker compose ps
docker compose logs
docker compose logs -f app
docker compose top
docker compose events
```

排障时最常用的是：

```bash
docker compose ps
docker compose logs --tail 200 app
```

### 进入容器和执行命令

```bash
docker compose exec app sh
docker compose exec db psql -U example -d example
docker compose run --rm app python manage.py migrate
```

`exec` 面向已经运行的服务容器；`run --rm` 会为某个服务临时启动一个一次性容器，适合执行迁移、初始化、测试等任务。

### 校验配置

```bash
docker compose config
```

`config` 会合并环境变量和多个 Compose 文件，并输出规范化后的配置。改动较多时，先运行它可以发现 YAML 缩进、变量替换和字段拼写问题。

## 网络：服务名就是内部域名

Compose 默认会为项目创建一个网络，同一个网络里的服务可以通过服务名互相访问。例如 `app` 访问 PostgreSQL 时，主机名应写 `db`：

```text
postgresql://example:change-me@db:5432/example
```

在容器内部，`localhost` 指的是容器自己，不是宿主机，也不是另一个服务容器。

!!! warning "容器内的 localhost"
    如果 `app` 容器连接 `localhost:5432`，它会尝试连接 `app` 容器内部的 `5432` 端口。连接 Compose 里的数据库服务，通常应该使用 `db:5432` 这样的服务名。

端口发布有几种常见写法：

```yaml
ports:
  - "8080:80"              # 所有网卡监听 8080
  - "127.0.0.1:8080:80"    # 只允许本机访问 8080
```

个人服务器上，如果前面还有 Nginx 或 Caddy 反向代理，应用容器常只发布到 `127.0.0.1`，再由反向代理对公网提供 HTTPS。

## 卷：区分命名卷和绑定挂载

Compose 里常见两种挂载方式：

```yaml
services:
  app:
    volumes:
      - ./config:/app/config:ro
      - app-cache:/app/cache

volumes:
  app-cache:
```

| 写法 | 类型 | 适合场景 |
| --- | --- | --- |
| `./config:/app/config:ro` | 绑定挂载 | 把宿主机上的源码、配置或静态文件挂进容器 |
| `app-cache:/app/cache` | 命名卷 | 持久化数据库、缓存、上传文件等由容器产生的数据 |

绑定挂载依赖宿主机目录结构，迁移机器时要一起迁移对应目录。命名卷由 Docker 管理，适合交给 Docker 做生命周期管理和备份迁移。

查看卷：

```bash
docker volume ls
docker volume inspect project_db-data
```

备份命名卷的一种常见方式是启动临时容器，把卷内容打包到当前目录：

```bash
docker run --rm \
  -v project_db-data:/data:ro \
  -v "$PWD":/backup \
  alpine \
  tar czf /backup/db-data.tar.gz -C /data .
```

## 启动顺序与健康检查

`depends_on` 可以表达服务启动依赖，但要让 Compose 等待数据库真正可用，需要配合 `healthcheck` 和 `condition: service_healthy`：

```yaml title="compose.yaml"
services:
  app:
    build: .
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U example -d example"]
      interval: 10s
      timeout: 5s
      retries: 5
```

!!! tip "应用也要能重试"
    健康检查可以减少启动竞态，但应用仍应具备连接失败后重试的能力。数据库重启、网络抖动或镜像更新时，服务依赖关系不会替代应用自身的容错逻辑。

## 开发与部署建议

### 本地开发

本地开发常用绑定挂载把源码挂进容器：

```yaml title="compose.yaml"
services:
  app:
    build: .
    command: npm run dev
    ports:
      - "127.0.0.1:3000:3000"
    volumes:
      - .:/app
      - node-modules:/app/node_modules

volumes:
  node-modules:
```

这种写法可以保留容器内依赖目录，同时让源码修改能被开发服务器热重载捕获。

### 小型服务器部署

部署长期运行服务时，常见配置包括：

```yaml title="compose.yaml"
services:
  app:
    image: example/app:1.0.0
    restart: unless-stopped
    ports:
      - "127.0.0.1:18080:8080"
    env_file:
      - .env
```

要点：

| 配置 | 建议 |
| --- | --- |
| 镜像标签 | 尽量使用明确版本，不要长期依赖 `latest` |
| `restart` | 小型服务常用 `unless-stopped` |
| `ports` | 内部服务优先绑定到 `127.0.0.1` |
| `.env` | 存放非公开环境变量，并加入 `.gitignore` |
| 日志 | 用 `docker compose logs`、日志驱动或宿主机日志系统集中查看 |

## 常见问题

### 修改 Dockerfile 后没有生效

重新构建：

```bash
docker compose build app
docker compose up -d app
```

或者：

```bash
docker compose up --build -d
```

如果怀疑缓存层干扰：

```bash
docker compose build --no-cache app
```

### 端口被占用

查看监听：

```bash
ss -lntup | grep ':8080'
```

解决方式通常是换宿主机端口，例如把 `"8080:80"` 改成 `"18080:80"`。

### 服务之间连不上

进入容器检查 DNS 和端口：

```bash
docker compose exec app getent hosts db
docker compose exec app sh
```

在容器里确认连接地址是否使用了服务名，例如 `db:5432`，而不是 `localhost:5432`。

### 容器反复退出

先看状态和日志：

```bash
docker compose ps
docker compose logs --tail 200 app
```

常见原因包括启动命令错误、环境变量缺失、配置文件挂载路径不对、数据库未初始化、文件权限不匹配等。

### 数据库初始化脚本没有再次执行

很多数据库镜像只会在数据目录为空时执行初始化脚本。命名卷已经存在时，修改初始化 SQL 不会自动重新执行。

!!! danger "重建数据库前先备份"
    删除数据库卷会删除其中所有数据。测试环境可以用 `docker compose down -v` 重建；真实环境应先备份，再按数据库迁移流程处理。

## 常用排障命令清单

```bash
docker compose config
docker compose ps
docker compose logs --tail 200 -f app
docker compose exec app sh
docker inspect <container>
docker network ls
docker network inspect <network>
docker volume ls
docker volume inspect <volume>
docker system df
```

## 参考

- [Docker Compose 概览](https://docs.docker.com/compose/)
- [Compose file reference](https://docs.docker.com/reference/compose-file/)
- [Compose services](https://docs.docker.com/reference/compose-file/services/)
- [Compose networks](https://docs.docker.com/reference/compose-file/networks/)
- [Compose volumes](https://docs.docker.com/reference/compose-file/volumes/)
- [docker compose CLI](https://docs.docker.com/reference/cli/docker/compose/)
- [Control startup and shutdown order in Compose](https://docs.docker.com/compose/how-tos/startup-order/)
