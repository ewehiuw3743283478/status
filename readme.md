# Server Status Panel

**项目地址**: [https://github.com/ewehiuw3743283478/status](https://github.com/ewehiuw3743283478/status)

Material Design 风格的多服务器监控面板。

- 默认端口: **5555**
- 默认密码: `nekonekostatus`（**部署后请立即修改**）

## 架构

| 组件 | 说明 |
|------|------|
| **面板** | Node.js + Express，Web UI 与管理后台 |
| **探针 (status-agent)** | Go 二进制，部署在每台被监控服务器 |
| **通讯** | 探针 **主动推送** 指标至 `POST /stats/update` |
| **数据库** | Docker 使用 PostgreSQL；本地开发可用 SQLite |

```
被监控服务器 (status-agent)  ──HTTP/HTTPS POST──►  面板 (status-panel) ──► PostgreSQL / SQLite
```

## 功能

### 服务器监控

- 探针主动推送 CPU、内存、带宽、流量
- 每台服务器独立 API 密钥（自动生成 / 查看 / 复制 / 重新生成）
- 一键复制安装脚本、SSH 一键部署探针（SSH 可选，仅用于一键安装）
- 负载 / 带宽 / 流量历史图表
- **按服务器隐藏指标**（CPU、内存、带宽、流量、主机信息、网卡明细、图表等）
- Telegram 掉线 / 恢复通知
- 卡片 / 列表主题、Material You 风格 UI、夜间模式


### 服务监控（UptimeFlare 模式）

除节点探针外，面板可独立监控 TCP / HTTP 服务可用性：

| 能力 | 说明 |
|------|------|
| **检测类型** | TCP 端口连通、HTTP(S) 请求（状态码 / 响应片段） |
| **公开状态页** | `/services`（卡片）或 `/services?theme=list`（列表） |
| **隐私** | 公开页 **不显示** 真实探测地址，仅展示名称、备注、可选外链 |
| **图表** | 可用性条始终显示；延迟折线图可逐项关闭 |
| **管理** | 管理后台 → **服务监控**：新增 / 编辑、拖拽排序、立即检测 |

服务监控状态：`正常` / `对外隐藏` / `停用`。

---

## 安全

面板内置以下前端与请求层防护（`lib/security.js`）：

| 措施 | 说明 |
|------|------|
| **CSRF** | 管理端所有 `POST` 须携带 `X-CSRF-Token`（页面 `<meta name="csrf-token">` 或 `csrf` Cookie） |
| **管理密码** | 服务端 scrypt 强哈希存储；登录提交明文密码，仅在服务端校验（请使用 HTTPS） |
| **会话 Cookie** | `httpOnly`、`SameSite=Lax`；HTTPS 或 `FORCE_SECURE_COOKIE=1` 时启用 `Secure` |
| **安全响应头** | CSP、`X-Frame-Options`、`X-Content-Type-Options`、`Referrer-Policy` 等 |
| **CDN 完整性** | MDUI、Chart.js、SortableJS 等外链脚本带 SRI |
| **链接校验** | 服务监控对外链接仅允许 `http://` / `https://` |
| **反向代理** | 已启用 `trust proxy`；Nginx 须传递 `X-Forwarded-Proto` |

管理操作若提示「请求验证失败」，请 **硬刷新页面** 后重试。HTTPS 反代部署请参考下方 Nginx 示例中的 `X-Forwarded-Proto`。

可选环境变量：

```env
NODE_ENV=production          # 生产环境启用 Secure Cookie
FORCE_SECURE_COOKIE=1        # 强制 Secure Cookie（即使未设 NODE_ENV）
```

---

## 部署指南

### 前置要求

| 场景 | 要求 |
|------|------|
| **Docker 部署（推荐）** | [Docker](https://docs.docker.com/get-docker/) + [Docker Compose](https://docs.docker.com/compose/) v2 |
| **手动部署** | Node.js ≥ 12、`gcc` / `g++`（编译 `better-sqlite3`）、`git` |
| **被监控服务器** | 能 **出站** 访问面板地址（HTTP/HTTPS）；无需开放入站端口给面板 |

生产环境建议：

- 使用 HTTPS（反向代理或 TLS 终止）
- 修改默认数据库密码与面板管理密码
- 定期备份 PostgreSQL 数据

---

### 方式一：Docker Compose（推荐）

**1. 获取项目文件**

```bash
git clone https://github.com/ewehiuw3743283478/status.git
cd status
```

**2. 创建环境配置**

```bash
cp .env.example .env
```

编辑 `.env`，至少修改数据库密码，并填写 GitHub 仓库：

```env
POSTGRES_PASSWORD=<强密码>
PORT=5555
GITHUB_REPO=ewehiuw3743283478/status
APP_IMAGE=ghcr.io/ewehiuw3743283478/status:latest
PULL_POLICY=always
```

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `POSTGRES_USER` | `status` | 数据库用户 |
| `POSTGRES_PASSWORD` | `nekonekostatus` | **务必修改** |
| `POSTGRES_DB` | `status` | 数据库名 |
| `PORT` | `5555` | 宿主机映射端口 |
| `GITHUB_REPO` | `ewehiuw3743283478/status` | GitHub 仓库；探针从 **GitHub Releases** 拉取 |
| `APP_IMAGE` | `ghcr.io/ewehiuw3743283478/status:latest` | 面板镜像，来自 **GitHub Container Registry** (`ghcr.io`) |
| `PULL_POLICY` | `missing` | 设为 `always` 时每次启动拉取最新 ghcr 镜像 |

CI 推送面板镜像到 `ghcr.io/ewehiuw3743283478/status`（与 GitHub 仓库同名）。首次部署前请确保该包为 **Public**（仓库 → Packages → Package settings → Change visibility）。

**3. 拉取并启动（推荐，使用 ghcr 预构建镜像）**

```bash
docker compose pull
docker compose up -d
```

本地自行构建（不设置 `APP_IMAGE`）：

```bash
docker compose up -d --build
```

**4. 确认服务正常**

```bash
docker compose ps
docker compose logs -f app
```

应看到 `db` 为 healthy、`app` 为 running，日志无报错。

**5. 首次访问**

浏览器打开 `http://<服务器IP>:5555`，使用默认密码 `nekonekostatus` 登录。

**6. 部署后必做配置**（见 [部署后配置](#部署后配置)）

---

### 方式二：手动安装（无 Docker）

**1. 安装依赖并启动**

```bash
git clone https://github.com/ewehiuw3743283478/status.git
cd status
npm install
node status-panel.js
```

未设置 `DATABASE_URL` 时使用 SQLite，数据文件为 `database/db.db`。

**2. 使用外部 PostgreSQL（推荐生产）**

```bash
export DATABASE_URL=postgres://user:password@host:5432/status
export HOST=0.0.0.0
export PORT=5555
export GITHUB_REPO=ewehiuw3743283478/status
node status-panel.js
```

**3. systemd 常驻**

```bash
sudo tee /etc/systemd/system/status-dashboard.service <<'EOF'
[Unit]
Description=status-dashboard
After=network.target

[Service]
Type=simple
Restart=always
RestartSec=5
WorkingDirectory=/opt/status
Environment=DATABASE_URL=postgres://user:pass@localhost:5432/status
Environment=HOST=0.0.0.0
Environment=PORT=5555
ExecStart=/usr/bin/node status-panel.js

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now status-dashboard
```

将项目复制到 `/opt/status` 并按实际数据库连接串修改 `Environment`。

---

### 部署后配置

登录 **管理后台** → **系统设置**，完成以下项后再添加服务器：

| 设置项 | 说明 |
|--------|------|
| **站点网址** | 探针推送目标，须为被控机可访问的完整 URL，如 `https://status.example.com` |
| **站点名称** | 面板标题 |
| **管理密码** | 修改默认密码 `nekonekostatus` |
| **status-agent 下载地址** | 可选；留空则从 GitHub Releases 下载（需配置 `GITHUB_REPO` 环境变量） |
| **默认主题** | 卡片或列表 |
| **Telegram Bot** | 掉线 / 恢复通知（可选） |

> **重要**：`站点网址` 必须是每台被监控服务器能访问到的地址。若仅填写 `http://localhost:5555`，远程探针无法推送数据。

---

### 添加被监控服务器

**1. 在面板中创建节点**

管理后台 → **管理服务器** → **新增服务器**，填写名称与 SSH 信息（用于一键安装），保存后自动生成 **通讯秘钥**。

**2. 安装探针（任选其一）**

| 方式 | 操作 |
|------|------|
| **SSH 一键安装** | 编辑页点击 **安装** |
| **复制脚本** | 编辑页 **复制安装脚本**，在目标机以 root 执行 |
| **手动安装** | 见下方命令 |

探针从 GitHub Releases 下载（由 CI 自动构建发布）：

```
https://github.com/ewehiuw3743283478/status/releases/latest/download/status-agent_linux_amd64
https://github.com/ewehiuw3743283478/status/releases/latest/download/status-agent_linux_arm64
```

手动安装示例（amd64）：

```bash
wget --version||yum install wget -y||apt-get install wget -y
ARCH=$(uname -m)
case "$ARCH" in
x86_64|amd64) AGENT_ARCH=amd64 ;;
aarch64|arm64) AGENT_ARCH=arm64 ;;
*) echo "unsupported architecture: $ARCH"; exit 1 ;;
esac
wget "https://github.com/ewehiuw3743283478/status/releases/latest/download/status-agent_linux_${AGENT_ARCH}" -O /usr/bin/status-agent
chmod +x /usr/bin/status-agent
mkdir -p /etc/status-agent/
cat > /etc/status-agent/config.yaml <<EOF
sid: <服务器sid>
key: <通讯秘钥>
url: <面板站点网址>
debug: false
EOF
cat > /etc/systemd/system/status-agent.service <<EOF
[Unit]
Description=status-agent

[Service]
Restart=always
RestartSec=5
ExecStart=/usr/bin/status-agent -c /etc/status-agent/config.yaml

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now status-agent
```

探针配置 (`/etc/status-agent/config.yaml`)：

```yaml
sid: <服务器sid>
key: <通讯秘钥>
url: https://your-panel.example.com
debug: false
```

**3. 验证**

返回面板首页，对应节点应在约 15 秒内显示为在线。若长时间离线，检查 `站点网址`、防火墙出站规则及探针日志：`journalctl -u status-agent -f`。

重新生成 API 密钥后，须在目标机上重新 **安装** 或 **更新** 探针。

---

### 添加服务监控（可选）

用于监控网站、API、内网端口等，与节点探针无关：

1. 管理后台 → **服务监控** → **添加监控**
2. 填写 **名称**、**检测类型**（TCP / HTTP）、**检测目标**（仅后台保存，不公开展示）
3. 可选：**展示链接**、**备注**、检测间隔、超时、是否隐藏延迟图表
4. 保存后打开 **服务**（`/services`）预览公开状态页

公开页每 5 秒轮询 `/services/data` 更新状态、可用率与图表。

---

### HTTPS 反向代理（Nginx 示例）

生产环境建议在面板前加反向代理并启用 TLS。面板容器仍监听 `5555`，由 Nginx 对外提供 443。

```nginx
server {
    listen 443 ssl http2;
    server_name status.example.com;

    ssl_certificate     /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:5555;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

配置完成后，将 **系统设置 → 站点网址** 改为 `https://status.example.com`。

---

### 更新

**Docker Compose（ghcr 镜像）**

```bash
git pull
docker compose pull
docker compose up -d
```

**Docker Compose（本地构建）**

```bash
git pull
docker compose up -d --build
```

**手动安装**

```bash
git pull
npm install
sudo systemctl restart status-dashboard
```

更新前请先备份数据库。

---

### 备份与恢复

**管理后台**：管理后台 → **下载数据库备份**。

**PostgreSQL（Docker）**

```bash
# 备份
docker compose exec db pg_dump -U status status > backup.sql

# 恢复
cat backup.sql | docker compose exec -T db psql -U status status
```

**SQLite（手动安装）**

```bash
cp database/db.db database/db.db.bak
```

---

### 常用运维命令

```bash
docker compose up -d --build    # 启动（本地构建）
docker compose logs -f app        # 查看面板日志
docker compose logs -f db         # 查看数据库日志
docker compose restart app        # 重启面板
docker compose down               # 停止服务
docker compose down -v            # 停止并清空数据库卷（慎用）
```

---

### 故障排查

| 现象 | 可能原因 | 处理 |
|------|----------|------|
| 节点一直离线 | `站点网址` 错误或探针无法访问面板 | 检查 URL、DNS、出站防火墙；确认探针 `config.yaml` 中 `url` 与面板一致 |
| 探针推送 401 | 通讯秘钥不匹配 | 在编辑页核对秘钥，或重新生成后重装探针 |
| 管理保存失败 / CSRF | 页面 Token 过期或反代未传 `X-Forwarded-Proto` | 硬刷新页面；检查 Nginx `proxy_set_header X-Forwarded-Proto` |
| 服务监控页模板错误 | 旧镜像或缓存 | `docker compose pull && docker compose up -d` 后重试 |
| Docker 启动失败 | 数据库未就绪或端口占用 | `docker compose logs db app`；更换 `.env` 中 `PORT` |
| `npm install` 失败 | 缺少编译工具 | 安装 `python3`、`make`、`g++`，或使用 Docker 部署 |
---

## API

### 探针推送

```
POST /stats/update
Header: key: <通讯秘钥>
Body: { "sid": "<服务器ID>", "stat": { ... } }
```

> 探针推送 **无需** CSRF Token。

### 公开只读

| 路由 | 说明 |
|------|------|
| `GET /stats/data` | 节点实时指标（受 `hide_stats` 过滤） |
| `GET /services/data` | 服务监控公开快照（不含探测地址） |

### 管理接口

所有 `/admin/*` 路由需登录（Cookie `token`）。未登录访问将跳转登录页；JSON 请求返回 `401`。

管理端 `POST` 请求须额外携带：

```
Header: X-CSRF-Token: <与页面 csrf-token 或 csrf Cookie 一致>
```

常用管理路由：

| 路由 | 说明 |
|------|------|
| `POST /admin/service_monitors/add` | 新增服务监控 |
| `POST /admin/service_monitors/upd` | 更新服务监控 |
| `POST /admin/service_monitors/del` | 删除服务监控 |
| `POST /admin/service_monitors/test` | 立即检测（使用表单数据） |
| `GET /admin/service_monitors/data` | 管理列表实时状态 |

---

## 构建与发布

### GitHub Actions（自动构建）

`.github/workflows/docker.yml` 在推送到 `main`/`master`、推送 `v*` 标签或手动触发时执行：

| Job | 产物 | 说明 |
|-----|------|------|
| `build-agent` | `status-agent_linux_amd64`、`status-agent_linux_arm64` | 编译探针 |
| `build-server` | 面板 Docker 镜像 → **ghcr.io** | `ghcr.io/ewehiuw3743283478/status:latest` 等标签；linux/amd64 + arm64 |
| `release-agent` | 探针二进制 → **GitHub Releases** | `main`/`master` 更新 `latest` 标签；`v*` 为正式版本 |

全部使用 GitHub 基础设施，仅需内置 `GITHUB_TOKEN`（`packages: write` 用于 ghcr，`contents: write` 用于 Releases），**无需 Docker Hub**。

| 产物 | 地址 |
|------|------|
| 面板镜像 | `ghcr.io/ewehiuw3743283478/status:latest` |
| 探针二进制 | `https://github.com/ewehiuw3743283478/status/releases/latest/download/status-agent_linux_{amd64\|arm64}` |

**客户端安装探针时**，一键安装脚本与 SSH 安装均从 GitHub 拉取：

```
https://github.com/ewehiuw3743283478/status/releases/latest/download/status-agent_linux_{amd64|arm64}
```

默认 `GITHUB_REPO=ewehiuw3743283478/status`（见 `.env.example`）；若 fork 到其他仓库，请在 `.env` 中修改。

### 本地构建

```bash
# 仅构建探针（linux amd64 + arm64，本地测试用）
bash build-client.sh

# 本地构建多架构面板镜像（不推送；正式发布走 ghcr.io CI）
bash build-docker.sh
```

`status-agent/build.sh` 默认同样只构建 linux amd64/arm64；`BUILD_ALL=1 ./status-agent/build.sh` 可构建更多历史平台。探针正式发布请依赖 GitHub Actions。

---

## 项目结构（简要）

| 路径 | 说明 |
|------|------|
| `status-panel.js` | 面板入口、认证、安全中间件 |
| `modules/stats/` | 节点状态页与 `/stats/data` |
| `modules/service_monitors/` | 服务监控与 `/services` |
| `modules/servers/` | 服务器 CRUD、安装脚本 |
| `lib/security.js` | CSRF、CSP、URL 校验 |
| `lib/monitor-data.js` | 服务监控数据规范化与公开视图 |
| `views/services/` | 服务状态公开页（卡片 / 列表） |
| `static/js/services.js` | 服务页轮询与图表 |
| `status-agent/` | Go 探针源码 |

## 待办

- 硬盘监控

## 注意

- 生产环境请修改默认数据库密码与面板密码
- **站点网址** 必须是被控服务器能访问到的面板公网地址
- 被监控服务器需能访问 **GitHub Releases**（拉取探针）和 **面板站点网址**（推送指标）
- 面板不再主动连接被控机端口；仅需被控机 outbound 访问面板与 GitHub
- HTTPS 反代后务必配置 `X-Forwarded-Proto`，否则 Secure Cookie 与 CSRF 可能异常
- 大版本升级前请备份数据库