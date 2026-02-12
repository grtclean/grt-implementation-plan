# GRT智能系统生产部署配置

## 版本信息

- **系统版本**: v4.4.0
- **构建日期**: 2026-01-30
- **文档版本**: 1.0

---

## 环境要求

### 服务器配置

| 组件 | 最低配置 | 推荐配置 |
|------|----------|----------|
| CPU | 2核 | 4核+ |
| 内存 | 4GB | 8GB+ |
| 存储 | 50GB SSD | 100GB SSD |
| 网络 | 100Mbps | 1Gbps |

### 软件依赖

| 软件 | 版本要求 | 用途 |
|------|----------|------|
| Node.js | 22.x | 运行时环境 |
| MySQL/TiDB | 8.0+ | 数据库 |
| Redis | 7.x | 缓存（可选） |
| Nginx | 1.24+ | 反向代理 |

---

## 环境变量配置

### 必需环境变量

```bash
# 数据库连接
DATABASE_URL=mysql://user:password@host:3306/grt_system

# JWT密钥（生产环境必须使用强密钥）
JWT_SECRET=your-super-secure-jwt-secret-key-here

# OAuth配置
VITE_APP_ID=your-app-id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://oauth.manus.im

# 应用配置
NODE_ENV=production
PORT=3000
```

### 可选环境变量

```bash
# Redis缓存（推荐）
REDIS_URL=redis://localhost:6379

# 日志级别
LOG_LEVEL=info

# 性能监控
ENABLE_METRICS=true
METRICS_PORT=9090
```

---

## 部署步骤

### 1. 准备工作

```bash
# 克隆代码
git clone <repository-url>
cd grt-implementation-plan

# 安装依赖
pnpm install --frozen-lockfile
```

### 2. 构建应用

```bash
# 构建生产版本
pnpm build

# 验证构建结果
ls -la dist/
```

### 3. 数据库初始化

```bash
# 运行数据库迁移
pnpm db:push

# 创建索引（可选，提升性能）
mysql -u user -p database < scripts/create-indexes.sql

# 导入种子数据（首次部署）
node scripts/seed-database.mjs
```

### 4. 启动服务

```bash
# 使用PM2管理进程
pm2 start dist/index.js --name grt-system

# 或直接启动
NODE_ENV=production node dist/index.js
```

---

## Nginx配置示例

```nginx
server {
    listen 80;
    server_name grt.example.com;
    
    # 强制HTTPS重定向
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name grt.example.com;
    
    # SSL证书配置
    ssl_certificate /etc/nginx/ssl/grt.crt;
    ssl_certificate_key /etc/nginx/ssl/grt.key;
    
    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # 代理配置
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
    }
    
    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        proxy_pass http://127.0.0.1:3000;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # API路由
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

---

## PM2配置示例

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'grt-system',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    max_memory_restart: '1G',
    error_file: 'logs/error.log',
    out_file: 'logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    autorestart: true,
    watch: false,
  }]
};
```

---

## 健康检查

### 应用健康检查

```bash
# 检查服务状态
curl -s http://localhost:3000/api/health | jq

# 预期响应
{
  "status": "ok",
  "version": "4.4.0",
  "timestamp": "2026-01-30T00:00:00.000Z"
}
```

### 数据库健康检查

```bash
# 检查数据库连接
mysql -u user -p -e "SELECT 1 AS health_check;"
```

### Redis健康检查

```bash
# 检查Redis连接
redis-cli ping
# 预期响应: PONG
```

---

## 监控告警

### 关键指标

| 指标 | 告警阈值 | 说明 |
|------|----------|------|
| CPU使用率 | > 80% | 持续5分钟 |
| 内存使用率 | > 85% | 持续5分钟 |
| 磁盘使用率 | > 90% | 立即告警 |
| 响应时间 | > 2s | P95延迟 |
| 错误率 | > 1% | 5分钟窗口 |

### 日志监控

```bash
# 查看应用日志
pm2 logs grt-system

# 查看错误日志
tail -f logs/error.log

# 搜索特定错误
grep -i "error" logs/out.log | tail -100
```

---

## 备份策略

### 数据库备份

```bash
# 每日全量备份
mysqldump -u user -p grt_system > backup_$(date +%Y%m%d).sql

# 压缩备份
gzip backup_$(date +%Y%m%d).sql

# 上传到远程存储
aws s3 cp backup_$(date +%Y%m%d).sql.gz s3://backup-bucket/
```

### 自动备份脚本

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/var/backups/grt"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# 创建备份
mysqldump -u $DB_USER -p$DB_PASS $DB_NAME | gzip > $BACKUP_DIR/grt_$DATE.sql.gz

# 清理旧备份
find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: grt_$DATE.sql.gz"
```

---

## 故障恢复

### 应用故障

```bash
# 重启应用
pm2 restart grt-system

# 查看崩溃原因
pm2 logs grt-system --err --lines 100
```

### 数据库故障

```bash
# 检查数据库状态
systemctl status mysql

# 重启数据库
systemctl restart mysql

# 从备份恢复
gunzip < backup_20260130.sql.gz | mysql -u user -p grt_system
```

---

## 安全检查清单

- [ ] 所有环境变量已正确配置
- [ ] JWT密钥使用强随机字符串
- [ ] 数据库密码符合复杂度要求
- [ ] HTTPS证书已正确配置
- [ ] 防火墙规则已配置
- [ ] 日志文件权限已限制
- [ ] 定期备份已启用
- [ ] 监控告警已配置

---

## 联系支持

如遇到部署问题，请联系：
- 技术支持邮箱：support@grt.com
- 紧急热线：400-xxx-xxxx
