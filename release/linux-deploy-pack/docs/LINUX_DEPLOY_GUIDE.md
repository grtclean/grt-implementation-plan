# GRT 智能系统 — Linux 服务器部署教程

## 一、服务器最低配置

| 项目 | 最低要求 | 推荐配置 |
|------|---------|---------|
| CPU | 2核 | 4核+ |
| 内存 | 4GB | 8GB+ |
| 硬盘 | 40GB SSD | 100GB SSD |
| 操作系统 | Ubuntu 22.04 / CentOS 8+ / Debian 12 | Ubuntu 22.04 LTS |
| 网络 | 开放 3000(应用) / 5432(PostgreSQL) 端口 | 80/443(Nginx反向代理) |

---

## 二、部署方式选择

### 方式A：Docker 一键部署（推荐，5分钟完成）
### 方式B：裸机手动部署（完全控制，15分钟完成）

---

## 方式A：Docker 部署（推荐）

### 步骤 1：安装 Docker

```bash
# Ubuntu / Debian
sudo apt update && sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable docker && sudo systemctl start docker
sudo usermod -aG docker $USER  # 当前用户加入docker组（需重新登录生效）

# CentOS / RHEL
sudo yum install -y docker docker-compose
sudo systemctl enable docker && sudo systemctl start docker
```

### 步骤 2：上传并解压项目

```bash
# 将 grt-linux-deploy-full.rar 上传到服务器（用 scp/sftp/rsync）
scp grt-linux-deploy-full.rar user@your-server:/opt/

# 安装 unrar（如未安装）
sudo apt install -y unrar    # Ubuntu/Debian
# sudo yum install -y unrar  # CentOS

# 解压
cd /opt
unrar x grt-linux-deploy-full.rar
mv grt-implementation-plan grt-system   # 重命名为简洁目录名
cd /opt/grt-system
```

### 步骤 3：配置环境变量

```bash
cd /opt/grt-system/docker
cp config.env.template config.env
```

**编辑 `config.env`，必须修改以下项：**

```bash
vi config.env
```

```ini
# === 必须修改 ===
NODE_ENV=production
DATABASE_URL=postgresql://grt:你的密码@grt-db:5432/grt_system
JWT_SECRET=你的随机密钥（至少32位）      # 生成方法: openssl rand -hex 32
POSTGRES_PASSWORD=你的数据库密码

# === 按需修改 ===
API_PORT=3000                            # 应用端口
AI_PROVIDER=ollama                       # AI提供商: ollama / openai / deepseek
OPENAI_API_KEY=                          # 如用OpenAI则填入
```

**快速生成密钥：**
```bash
echo "JWT_SECRET=$(openssl rand -hex 32)"
echo "POSTGRES_PASSWORD=$(openssl rand -hex 16)"
```

### 步骤 4：启动服务

```bash
cd /opt/grt-system/docker

# 核心服务（应用 + PostgreSQL + Redis）
docker compose --env-file config.env up -d grt-db grt-redis grt-api

# 查看启动日志
docker compose logs -f grt-api

# 等待看到 "Server running on port 3000" 即成功
```

### 步骤 5：验证

```bash
# 健康检查
curl http://localhost:3000/api/health

# 浏览器访问
# http://你的服务器IP:3000
# 默认管理员账号: admin / Gerry123
```

### Docker 常用运维命令

```bash
cd /opt/grt-system/docker

# 查看状态
docker compose ps

# 查看日志
docker compose logs -f grt-api --tail 100

# 重启应用
docker compose restart grt-api

# 停止所有服务
docker compose down

# 更新代码后重新构建
docker compose build grt-api && docker compose up -d grt-api

# 数据库备份
docker exec grt-postgres pg_dump -U grt grt_system > backup_$(date +%Y%m%d).sql
```

---

## 方式B：裸机手动部署

### 步骤 1：安装系统依赖

```bash
# Ubuntu / Debian
sudo apt update
sudo apt install -y curl git build-essential

# 安装 Node.js 22 (LTS)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# 安装 pnpm
corepack enable
corepack prepare pnpm@latest --activate

# 验证
node -v    # 应显示 v22.x
pnpm -v    # 应显示 9.x+
```

### 步骤 2：安装 PostgreSQL 16

```bash
# Ubuntu
sudo apt install -y postgresql-16 postgresql-client-16

# 启动并设为开机自启
sudo systemctl enable postgresql && sudo systemctl start postgresql

# 创建数据库和用户
sudo -u postgres psql <<EOF
CREATE USER grt WITH PASSWORD '你的数据库密码';
CREATE DATABASE grt_system OWNER grt;
GRANT ALL PRIVILEGES ON DATABASE grt_system TO grt;
-- 确保 UTF-8 编码
ALTER DATABASE grt_system SET client_encoding TO 'UTF8';
EOF
```

### 步骤 3：上传并解压项目

```bash
# 上传 RAR 到服务器
scp grt-linux-deploy-full.rar user@your-server:/opt/

# 解压
cd /opt
sudo apt install -y unrar
unrar x grt-linux-deploy-full.rar
mv grt-implementation-plan grt-system
cd /opt/grt-system
```

### 步骤 4：安装依赖（如 node_modules 不完整）

```bash
cd /opt/grt-system

# 因为包里已含 node_modules，通常可跳过此步
# 如遇到原生模块报错（如 pg-native），重新安装：
pnpm install --frozen-lockfile
```

### 步骤 5：配置环境变量

```bash
cd /opt/grt-system

cat > .env.production <<'EOF'
NODE_ENV=production
DATABASE_URL=postgresql://grt:你的数据库密码@localhost:5432/grt_system
JWT_SECRET=这里填openssl_rand_hex_32的结果
PORT=3000
EOF
```

### 步骤 6：构建前端 + 后端

```bash
cd /opt/grt-system

# 构建（前端Vite + 后端esbuild）
NODE_OPTIONS=--max-old-space-size=4096 pnpm build

# 构建成功后 dist/ 目录包含：
# dist/public/  — 前端静态文件
# dist/index.js — 后端入口
```

### 步骤 7：启动服务

```bash
# 直接启动（前台，用于测试）
NODE_ENV=production node dist/index.js

# 看到 "Server running on port 3000" 即成功
```

### 步骤 8：使用 PM2 守护进程（推荐）

```bash
# 安装 PM2
npm install -g pm2

# 启动
cd /opt/grt-system
pm2 start dist/index.js --name grt-system \
  --env production \
  --max-memory-restart 2G \
  --log-date-format "YYYY-MM-DD HH:mm:ss"

# 设为开机自启
pm2 startup
pm2 save

# 常用命令
pm2 status           # 查看状态
pm2 logs grt-system  # 查看日志
pm2 restart grt-system  # 重启
pm2 monit            # 实时监控
```

### 步骤 9：配置 Nginx 反向代理（可选，生产推荐）

```bash
sudo apt install -y nginx

sudo tee /etc/nginx/sites-available/grt-system <<'EOF'
server {
    listen 80;
    server_name your-domain.com;    # 替换为你的域名或IP

    client_max_body_size 100M;

    # 前端静态文件 + API 统一入口
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
    }

    # 静态资源缓存
    location /assets/ {
        proxy_pass http://127.0.0.1:3000;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/grt-system /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 步骤 10：配置 HTTPS（可选）

```bash
# 使用 Let's Encrypt 免费证书
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
# 按提示操作即可，证书自动续期
```

---

## 三、验证清单

部署完成后，依次验证：

```bash
# 1. 健康检查
curl -s http://localhost:3000/api/health | head

# 2. 浏览器访问首页
# http://服务器IP:3000  （或 http://your-domain.com）

# 3. 登录测试
# 账号: admin  密码: Gerry123

# 4. 验证战略指挥中心
# http://服务器IP:3000/ceo/strategy-2026
# - 年份选择器可切换
# - 5个Tab均可加载
# - "同步实时数据"按钮可点击

# 5. 验证数据库连接
curl -s http://localhost:3000/api/trpc/strategyGoals.getDashboard?input=%7B%22year%22:2026%7D
```

---

## 四、常见问题

### Q1: 启动报错 "Database connection not available"
```bash
# 检查 PostgreSQL 是否运行
sudo systemctl status postgresql

# 检查 DATABASE_URL 格式
echo $DATABASE_URL
# 正确格式: postgresql://用户名:密码@主机:5432/数据库名

# 测试连接
psql "postgresql://grt:密码@localhost:5432/grt_system" -c "SELECT 1"
```

### Q2: 前端页面空白
```bash
# 确认构建产物存在
ls -la dist/public/index.html

# 如不存在，重新构建
NODE_OPTIONS=--max-old-space-size=4096 pnpm build
```

### Q3: node_modules 报错 (原生模块不兼容)
```bash
# Windows 打包的 node_modules 在 Linux 下原生模块需重编译
rm -rf node_modules
pnpm install --frozen-lockfile
pnpm build
```

### Q4: 端口被占用
```bash
# 查看端口占用
sudo lsof -i :3000
# 杀掉占用进程或修改 PORT 环境变量
```

### Q5: 内存不足导致构建失败
```bash
# 增大 Node.js 内存
NODE_OPTIONS=--max-old-space-size=4096 pnpm build

# 或添加 swap（2GB）
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab
```

---

## 五、架构总览

```
用户浏览器
    │
    ▼
[Nginx:80/443] ──反向代理──→ [Node.js:3000] ──ORM──→ [PostgreSQL:5432]
                                  │                         │
                                  ├── tRPC API (200+ routers)
                                  ├── 前端 SPA (React 19 + Vite)
                                  └── AI Copilot ──→ [Ollama/OpenAI]
```

| 技术栈 | 版本 |
|--------|------|
| Node.js | 22.x |
| pnpm | 9.x |
| React | 19 |
| Vite | 6.x |
| PostgreSQL | 16 |
| Drizzle ORM | latest |
| tRPC | v11 |
| Tailwind CSS | 4.x |
| shadcn/ui | latest |
