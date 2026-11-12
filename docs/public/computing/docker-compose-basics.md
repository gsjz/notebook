# Docker 与 Docker Compose 基础

## Docker 的作用

传统部署经常依赖机器上已经安装好的运行时、系统库、配置文件和环境变量。换一台机器后，应用可能因为 Python、Node.js、OpenSSL、系统包版本或启动命令不同而表现异常。

镜像记录应用文件系统与默认运行配置，容器把镜像、运行时参数、挂载和网络配置组合成一次运行实例。密钥和环境专属配置应在运行时提供。Linux 容器的进程由同一个 Linux 内核调度，namespace 提供资源视图隔离，cgroup 提供资源计量与控制；在 Docker Desktop 上，这个内核通常位于其管理的 Linux 虚拟机中。

常见对象可以这样理解：

| 对象 | 含义 |
| --- | --- |
| Image | 镜像，类似应用运行环境的只读模板 |
| Container | 容器，从镜像启动出来的运行实例 |
| Dockerfile | 构建镜像的步骤文件 |
| Registry | 镜像仓库，例如 Docker Hub 或私有镜像仓库 |
| Volume | Docker 管理的数据卷，常用于持久化数据库数据 |
| Network | 容器间通信使用的虚拟网络 |

同一个镜像可以创建多个容器，每个容器有自己的可写层和运行状态。容器停止后仍可存在；删除容器会移除其可写层，但命名卷有独立生命周期。镜像、容器和卷需要分别检查。

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
  -p 127.0.0.1:8080:80 \
  nginx:alpine
```

这条命令的含义是：

| 参数 | 含义 |
| --- | --- |
| `-d` | 后台运行容器 |
| `--name demo-nginx` | 给容器命名 |
| `-p 127.0.0.1:8080:80` | 将宿主机回环地址的 `8080` 端口发布到容器内 `80` 端口 |
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

端口语法为 `[宿主机地址:]宿主机端口:容器端口`。省略宿主机地址通常意味着发布到所有接口；本地试验显式绑定回环地址更便于控制入口。Docker 的端口发布可能经过其维护的防火墙规则，不能仅凭主机某个前端防火墙的显示状态判断实际可达性。

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
docker run --rm -p 127.0.0.1:8080:80 demo-site:local
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

`docker build -t demo .` 末尾的 `.` 是构建上下文。这里普通 `COPY` 的本地源路径相对于构建上下文；多阶段构建的 `COPY --from` 还可读取指定阶段或镜像。应使用 `.dockerignore` 排除 `.git/`、缓存目录、虚拟环境、构建产物和本地密钥。

## Compose 的作用

单个 `docker run` 适合快速试验。真实应用往往包含 Web 服务、数据库、缓存、反向代理和后台任务，如果全部写成命令，端口、环境变量、卷和网络关系会很难维护。

Docker Compose 把这些内容写进一个 YAML 文件，通常命名为 `compose.yaml`：

```yaml title="compose.yaml"
services:
  web:
    image: nginx:alpine
    ports:
      - "127.0.0.1:8080:80"
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

`change-me` 仅是示例占位值。`.env` 和 `env_file` 都是明文文件，不提供秘密管理系统的保护；环境变量还可能出现在容器检查结果和进程诊断中。真实凭据应根据部署环境通过权限受控文件、Compose secrets 或平台密钥系统提供，并确认应用支持相应读取方式。

### `version` 字段

很多旧文章会在文件顶部写：

```yaml
version: "3.8"
```

现代 Compose 使用 Compose Specification，通常不再需要顶层 `version` 字段。新文件可以直接从 `services:` 开始，让当前 Compose 工具按规范解析。

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
| `restart` | 重启已有容器，不重新应用 Compose 环境变量、挂载和端口配置 |
| `down` | 停止并删除当前项目创建的容器和网络 |

!!! danger "`down -v` 会删除命名卷"
    `docker compose down -v` 会删除该项目中声明的非 external 命名卷以及附属匿名卷；external 卷不会被 Compose 删除。数据库数据通常位于卷中，这项操作需要可恢复的备份或可丢弃的数据前提。

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

`exec` 在现有运行容器中执行命令；`run --rm` 按服务配置创建一次性容器，默认不发布该服务的端口。迁移命令会修改数据库，实际执行前仍需确认连接目标、版本兼容与备份。

### 校验配置

```bash
docker compose config
```

`config` 会合并配置、执行变量插值并输出规范化结果；只检查是否合法可用 `docker compose config --quiet`。完整输出可能包含展开后的凭据，不宜直接贴入公开日志。

### 变量插值与容器环境

项目目录中的 `.env` 默认用于 Compose 文件的 `${NAME}` 插值，不会自动把每个变量注入容器。`environment` 和服务级 `env_file` 才定义容器收到的环境；两者同时定义同名变量时，`environment` 优先。需要强制提供变量时可写 `${APP_IMAGE:?set APP_IMAGE}`，避免空值静默形成错误配置。

修改 `ports`、`environment`、`command` 或挂载后，执行 `docker compose up -d` 让 Compose 比较配置并按需重建容器。单纯 `restart` 只重新启动原容器进程。绑定挂载的文件内容变化则已反映在容器文件系统中，应用是否重新读取由其自身决定。

## 网络：服务名就是内部域名

Compose 默认会为项目创建一个网络，同一个网络里的服务可以通过服务名互相访问。例如 `app` 访问 PostgreSQL 时，主机名应写 `db`：

```text
postgresql://example:change-me@db:5432/example
```

在默认隔离网络的容器中，`localhost` 指向该容器网络命名空间的回环接口。使用 host 网络或显式共享网络命名空间时，需要按共享范围重新判断。

如果 `app` 容器连接 `localhost:5432`，它会尝试连接 `app` 容器内部的 `5432` 端口。连接 Compose 里的数据库服务，通常应该使用 `db:5432` 这样的服务名。

端口发布有几种常见写法：

```yaml
ports:
  - "8080:80"              # 所有网卡监听 8080
  - "127.0.0.1:8080:80"    # 只允许本机访问 8080
```

若 Nginx 或 Caddy 运行在宿主机，可让应用只发布到 `127.0.0.1`。若代理也在容器里，通常让代理与应用加入同一网络并使用服务名，无须额外发布应用端口。容器内应用一般要监听容器的 `0.0.0.0` 或指定接口；仅监听容器回环地址时，端口发布无法自动让它接受其他接口的连接。

## 卷：区分命名卷和绑定挂载

Compose 里常见两种挂载方式：

```yaml
services:
  app:
    image: example/app:1.0.0
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

对已经停止写入的普通数据卷，可用临时容器打包：

```bash
docker run --rm \
  -v project_db-data:/data:ro \
  -v "$PWD":/backup \
  alpine \
  tar czf /backup/db-data.tar.gz -C /data .
```

这个命令只是文件复制。对正在运行的数据库直接打包数据目录，可能得到不一致且无法恢复的副本；应优先使用数据库的逻辑备份或受支持的物理备份流程。离线复制也需确保服务已正常停止，并验证恢复结果。

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

健康检查可以减少启动竞态，但 `pg_isready` 只说明服务已能响应连接检查，不证明迁移完成、用户权限正确或业务查询可用。启动后依赖失效，Compose 不会据此自动建立完整的故障恢复流程；`unhealthy` 状态本身也不会触发普通重启策略。应用仍需超时、重试退避和重连能力。

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
| 镜像标签 | 用明确版本便于追踪；需要精确复现时固定 digest，版本标签仍可能被更新 |
| `restart` | 小型服务常用 `unless-stopped` |
| `ports` | 内部服务优先绑定到 `127.0.0.1` |
| `.env` | 用于配置插值；若包含敏感值，控制文件权限并排除提交 |
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

先确认 `COPY` 路径、构建上下文和 `.dockerignore`，再判断是否需要排除缓存：

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

在容器里确认连接地址是否使用了服务名，例如 `db:5432`；同时检查双方是否加入同一网络、数据库是否监听容器接口。

### 容器反复退出

检查状态、退出原因和日志：

```bash
docker compose ps -a
docker compose logs --tail 200 app
docker inspect --format '{{json .State}}' <container>
```

检查退出码、`OOMKilled`、错误消息和退出时间，再与日志对应。常见原因包括启动命令错误、环境变量缺失、配置文件挂载路径不对、数据库未初始化、文件权限不匹配等。

### 数据库初始化脚本没有再次执行

很多数据库镜像只会在数据目录为空时执行初始化脚本。命名卷已经存在时，修改初始化 SQL 不会自动重新执行。

!!! danger "重建数据库前先备份"
    删除数据库卷会删除其中所有数据。测试环境可以用 `docker compose down -v` 重建；真实环境应先备份，再按数据库迁移流程处理。

## 资源限制与运行证据

容器隔离进程视图，不会自动为每个应用提供独占 CPU 或内存。可按工作负载设置限制：

```yaml
services:
  app:
    image: example/app:1.0.0
    cpus: "1.0"
    mem_limit: 512m
    pids_limit: 256
    init: true
```

CPU 限额约束一定时间窗口内的配额，并非把应用固定到某个核心。内存限额包含受控制组计量的内存，触及上限可能导致回收或 OOM；`init: true` 增加轻量 init 来辅助信号转发和子进程回收，不会把容器变成完整虚拟机。

```bash
docker stats --no-stream
docker inspect --format '{{json .State}}' <container>
docker compose logs --since 10m app
```

持续重启可能掩盖首次失败。应先确定进程退出、健康检查失败还是业务请求失败，再检查对应证据。宿主机还有空闲内存而单个容器 OOM，是控制组限额与全机内存总量不同的常见表现。

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
- [Compose 环境变量插值](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/)
- [Compose restart 的配置边界](https://docs.docker.com/reference/cli/docker/compose/restart/)
- [Docker 资源约束](https://docs.docker.com/engine/containers/resource_constraints/)
- [Docker 卷与备份](https://docs.docker.com/engine/storage/volumes/)
