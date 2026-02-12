# GRT智能系统安装和部署指南 v2.6.0

## 目录

1. [环境准备](#环境准备)
2. [本地开发环境安装](#本地开发环境安装)
3. [测试环境部署](#测试环境部署)
4. [生产环境部署](#生产环境部署)
5. [国际化配置](#国际化配置)
6. [故障排查](#故障排查)

---

## 环境准备

### 系统要求

| 组件 | 最低版本 | 推荐版本 |
|------|---------|---------|
| Node.js | 18.0.0 | 22.13.0 |
| npm | 9.0.0 | 10.0.0 |
| MySQL | 5.7 | 8.0 |
| Redis | 6.0 | 7.0 |
| Docker | 20.0 | 24.0 |

### 硬件要求

| 环境 | CPU | 内存 | 存储 |
|------|-----|------|------|
| 本地开发 | 4核 | 8GB | 50GB |
| 测试环境 | 8核 | 16GB | 100GB |
| 生产环境 | 16核 | 32GB | 500GB |

---

## 本地开发环境安装

### 第一步：克隆项目

```bash
# 克隆项目
git clone https://github.com/your-org/grt-system.git
cd grt-system

# 检查分支
git branch -a
git checkout develop
```

### 第二步：安装依赖

```bash
# 使用pnpm安装依赖
pnpm install

# 或使用npm
npm install

# 验证安装
pnpm --version
node --version
npm --version
```

### 第三步：配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env.local

# 编辑环境变量
nano .env.local
```

**本地开发环境变量示例：**

```env
# 数据库配置
DATABASE_URL=mysql://root:password@localhost:3306/grt_dev

# Redis配置
REDIS_URL=redis://localhost:6379

# JWT配置
JWT_SECRET=your-secret-key-here

# API配置
API_PORT=3000
API_HOST=localhost

# OAuth配置
OAUTH_CLIENT_ID=your-client-id
OAUTH_CLIENT_SECRET=your-client-secret
OAUTH_REDIRECT_URI=http://localhost:3000/auth/callback

# 邮件配置
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-password

# 日志配置
LOG_LEVEL=debug
LOG_FORMAT=json
```

### 第四步：初始化数据库

```bash
# 运行数据库迁移
pnpm db:migrate

# 生成Prisma客户端
pnpm db:generate

# 导入种子数据
pnpm db:seed
```

### 第五步：启动开发服务器

```bash
# 启动前端和后端
pnpm dev

# 或分别启动
pnpm dev:frontend   # 启动前端（Vite）
pnpm dev:backend    # 启动后端（Express）

# 访问应用
# 前端: http://localhost:3000
# 后端: http://localhost:3001
# API文档: http://localhost:3001/api/docs
```

### 第六步：验证安装

```bash
# 检查前端
curl http://localhost:3000

# 检查后端
curl http://localhost:3001/health

# 检查数据库连接
pnpm db:check

# 运行测试
pnpm test
```

---

## 测试环境部署

### 测试环境架构

```
┌─────────────────────────────────────────┐
│         负载均衡器 (Nginx)              │
└────────────────┬────────────────────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
┌───▼──┐    ┌───▼──┐    ┌───▼──┐
│ App1 │    │ App2 │    │ App3 │
└───┬──┘    └───┬──┘    └───┬──┘
    │           │           │
    └───────────┼───────────┘
                │
        ┌───────┴────────┐
        │                │
    ┌───▼──┐        ┌───▼──┐
    │MySQL │        │Redis │
    └──────┘        └──────┘
```

### 使用Docker Compose部署

```bash
# 创建docker-compose文件
cat > docker-compose.test.yml << 'EOF'
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: test_password
      MYSQL_DATABASE: grt_test
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

  redis:
    image: redis:7.0
    ports:
      - "6379:6379"

  app:
    build: .
    environment:
      DATABASE_URL: mysql://root:test_password@mysql:3306/grt_test
      REDIS_URL: redis://redis:6379
      NODE_ENV: test
    ports:
      - "3000:3000"
    depends_on:
      - mysql
      - redis

volumes:
  mysql_data:
EOF

# 启动容器
docker-compose -f docker-compose.test.yml up -d

# 查看日志
docker-compose -f docker-compose.test.yml logs -f

# 停止容器
docker-compose -f docker-compose.test.yml down
```

### 测试环境配置

**测试环境变量：**

```env
# 数据库配置
DATABASE_URL=mysql://root:test_password@mysql:3306/grt_test

# Redis配置
REDIS_URL=redis://redis:6379

# 环境标识
NODE_ENV=test
ENVIRONMENT=test

# API配置
API_PORT=3000
API_HOST=0.0.0.0

# 日志配置
LOG_LEVEL=info
LOG_FORMAT=json

# 邮件配置（使用测试邮箱）
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=587
MAIL_USER=test@mailtrap.io
MAIL_PASSWORD=test_password
```

### 测试环境验证

```bash
# 运行集成测试
pnpm test:integration

# 运行性能测试
pnpm test:performance

# 运行安全扫描
pnpm test:security

# 生成测试报告
pnpm test:coverage
```

---

## 生产环境部署

### 生产环境架构

```
┌──────────────────────────────────────────────────┐
│              CDN (Cloudflare)                    │
└────────────────────┬─────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────┐
│         负载均衡器 (AWS ELB / Nginx)             │
└────────────────────┬─────────────────────────────┘
                     │
    ┌────────────────┼────────────────┐
    │                │                │
┌───▼──┐        ┌───▼──┐        ┌───▼──┐
│ App1 │        │ App2 │        │ App3 │
└───┬──┘        └───┬──┘        └───┬──┘
    │                │                │
    └────────────────┼────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
    ┌───▼──────┐          ┌──────▼──┐
    │MySQL集群 │          │Redis集群│
    └──────────┘          └─────────┘
```

### 生产环境部署步骤

#### 1. 准备服务器

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装必要工具
sudo apt install -y curl wget git docker.io docker-compose

# 创建应用用户
sudo useradd -m -s /bin/bash grt
sudo usermod -aG docker grt

# 配置SSH密钥
mkdir -p ~/.ssh
chmod 700 ~/.ssh
```

#### 2. 配置数据库

```bash
# 创建MySQL数据库
mysql -u root -p << EOF
CREATE DATABASE grt_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'grt_user'@'%' IDENTIFIED BY 'strong_password';
GRANT ALL PRIVILEGES ON grt_prod.* TO 'grt_user'@'%';
FLUSH PRIVILEGES;
EOF

# 运行迁移
pnpm db:migrate --env production

# 导入初始数据
pnpm db:seed --env production
```

#### 3. 配置应用

```bash
# 克隆项目
git clone https://github.com/your-org/grt-system.git /opt/grt
cd /opt/grt

# 创建生产环境变量文件
cat > .env.production << 'EOF'
# 数据库配置
DATABASE_URL=mysql://grt_user:strong_password@db.example.com:3306/grt_prod

# Redis配置
REDIS_URL=redis://redis.example.com:6379

# 环境标识
NODE_ENV=production
ENVIRONMENT=production

# API配置
API_PORT=3000
API_HOST=0.0.0.0

# OAuth配置
OAUTH_CLIENT_ID=prod_client_id
OAUTH_CLIENT_SECRET=prod_client_secret
OAUTH_REDIRECT_URI=https://grt.example.com/auth/callback

# 邮件配置
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USER=noreply@example.com
MAIL_PASSWORD=mail_password

# 日志配置
LOG_LEVEL=warn
LOG_FORMAT=json

# 监控配置
SENTRY_DSN=https://your-sentry-dsn
DATADOG_API_KEY=your-datadog-key
EOF

# 安装依赖
pnpm install --prod

# 构建应用
pnpm build
```

#### 4. 配置Nginx反向代理

```nginx
# /etc/nginx/sites-available/grt

upstream grt_backend {
    server localhost:3000 weight=1;
    server localhost:3001 weight=1;
    server localhost:3002 weight=1;
    keepalive 32;
}

server {
    listen 80;
    server_name grt.example.com;
    
    # 重定向到HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name grt.example.com;
    
    # SSL证书配置
    ssl_certificate /etc/letsencrypt/live/grt.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/grt.example.com/privkey.pem;
    
    # SSL安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # 日志配置
    access_log /var/log/nginx/grt_access.log;
    error_log /var/log/nginx/grt_error.log;
    
    # 代理配置
    location / {
        proxy_pass http://grt_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 超时配置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # 健康检查
    location /health {
        proxy_pass http://grt_backend;
        access_log off;
    }
}
```

#### 5. 配置PM2进程管理

```bash
# 安装PM2
npm install -g pm2

# 创建PM2配置文件
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'grt-app',
      script: './dist/server.js',
      instances: 3,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '1G',
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
EOF

# 启动应用
pm2 start ecosystem.config.js

# 设置开机自启
pm2 startup
pm2 save

# 查看状态
pm2 status
pm2 logs
```

#### 6. 配置监控和告警

```bash
# 安装Datadog Agent
DD_AGENT_MAJOR_VERSION=7 DD_API_KEY=your-api-key \
DD_SITE="datadoghq.com" bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_agent.sh)"

# 配置Datadog监控
cat > /etc/datadog-agent/conf.d/app.d/conf.yaml << 'EOF'
init_config:

instances:
  - host: localhost
    port: 3000
    tags:
      - env:production
      - service:grt-app
EOF

# 重启Datadog Agent
sudo systemctl restart datadog-agent
```

---

## 国际化配置

### 中国（China）部署

```env
# 中国特定配置
COUNTRY=CN
TIMEZONE=Asia/Shanghai
LANGUAGE=zh_CN

# 数据库配置（中国服务器）
DATABASE_URL=mysql://user:pass@db.cn.example.com:3306/grt_prod

# 邮件配置（使用国内邮箱服务）
MAIL_HOST=smtp.qq.com
MAIL_PORT=587
MAIL_USER=noreply@example.cn
MAIL_PASSWORD=mail_password

# CDN配置（使用国内CDN）
CDN_URL=https://cdn.cn.example.com

# 合规配置
COMPLIANCE_MODE=china
PRIVACY_POLICY_URL=https://grt.example.cn/privacy
```

### 美国（United States）部署

```env
# 美国特定配置
COUNTRY=US
TIMEZONE=America/New_York
LANGUAGE=en_US

# 数据库配置（美国服务器）
DATABASE_URL=mysql://user:pass@db.us.example.com:3306/grt_prod

# 邮件配置
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USER=apikey
MAIL_PASSWORD=sendgrid_key

# CDN配置
CDN_URL=https://cdn.us.example.com

# 合规配置
COMPLIANCE_MODE=us
PRIVACY_POLICY_URL=https://grt.example.com/privacy
SOC2_COMPLIANCE=true
```

### 欧洲（Europe）部署

```env
# 欧洲特定配置
COUNTRY=EU
TIMEZONE=Europe/Berlin
LANGUAGE=en_EU

# 数据库配置（欧洲服务器）
DATABASE_URL=mysql://user:pass@db.eu.example.com:3306/grt_prod

# 邮件配置
MAIL_HOST=smtp.eu.example.com
MAIL_PORT=587
MAIL_USER=noreply@example.eu
MAIL_PASSWORD=mail_password

# CDN配置
CDN_URL=https://cdn.eu.example.com

# 合规配置
COMPLIANCE_MODE=eu
PRIVACY_POLICY_URL=https://grt.example.eu/privacy
GDPR_COMPLIANCE=true
DATA_RESIDENCY=EU
```

---

## 故障排查

### 常见问题

#### 1. 数据库连接失败

```bash
# 检查数据库连接
mysql -h db.example.com -u grt_user -p -e "SELECT 1"

# 检查环境变量
echo $DATABASE_URL

# 查看应用日志
pm2 logs grt-app

# 重启应用
pm2 restart grt-app
```

#### 2. 内存溢出

```bash
# 检查内存使用
pm2 monit

# 增加Node.js堆大小
NODE_OPTIONS="--max-old-space-size=4096" pm2 start app.js

# 启用垃圾回收日志
NODE_OPTIONS="--trace-gc" pm2 start app.js
```

#### 3. 高CPU占用

```bash
# 分析CPU使用
pm2 profile start
sleep 30
pm2 profile stop

# 查看进程信息
ps aux | grep node

# 使用top命令监控
top -p $(pgrep -f "node")
```

### 日志分析

```bash
# 查看应用日志
tail -f /var/log/pm2/grt-app-error.log
tail -f /var/log/pm2/grt-app-out.log

# 查看Nginx日志
tail -f /var/log/nginx/grt_access.log
tail -f /var/log/nginx/grt_error.log

# 查看系统日志
journalctl -u grt-app -f
```

---

**版本历史：**
- v2.6.0 - 初始版本（2026-01-30）
