# GRT System Linux 部署包

## 包含内容

```
├── deploy/                    # 部署脚本集
│   ├── install.sh            # 一键安装
│   ├── start.sh              # 启动服务
│   ├── stop.sh               # 停止服务
│   ├── restart.sh            # 重启服务
│   ├── status.sh             # 查看状态
│   ├── healthcheck.sh        # 健康检查
│   ├── upgrade.sh            # 升级
│   ├── backup.sh             # 备份
│   ├── restore.sh            # 恢复
│   ├── build_release.sh      # 构建发布包
│   ├── nginx/                # Nginx 配置
│   └── systemd/              # systemd 服务文件
├── docker/                    # Docker 配置
├── docs/                      # 中文文档
│   ├── linux-deployment-guide.zh-CN.md
│   ├── nemoclaw-agent-deployment.zh-CN.md
│   ├── model-provider-interface.zh-CN.md
│   ├── model-switching-guide.zh-CN.md
│   ├── operations-runbook.zh-CN.md
│   ├── assumptions.zh-CN.md
│   └── model-providers/       # 各 Provider 文档
├── server/llm/                # 统一模型 Provider 层
├── drizzle/                   # 数据库 Schema
├── Dockerfile                 # Docker 镜像
├── docker-compose.yml         # Docker Compose
├── .env.example               # 环境变量模板
├── .env.{openai,ollama,gemini,deepseek}.example
└── package.json
```

## 快速部署

```bash
# 1. 上传到服务器
scp grt-linux-deploy-pack.tar.gz user@server:/opt/

# 2. 解压
cd /opt && tar xzf grt-linux-deploy-pack.tar.gz

# 3. 阅读部署文档
cat docs/linux-deployment-guide.zh-CN.md

# 4. 安装
bash deploy/install.sh

# 5. 配置
cp .env.example .env
vim .env

# 6. 启动
bash deploy/start.sh

# 7. 验证
bash deploy/healthcheck.sh
```

## 切换 AI 模型

只需修改 `.env` 中的 `AI_PROVIDER` 变量，无需改业务代码：

```bash
# OpenAI
AI_PROVIDER=openai

# Ollama (本地部署)
AI_PROVIDER=ollama

# DeepSeek (中国区推荐)
AI_PROVIDER=deepseek

# Gemini
AI_PROVIDER=gemini
```

详见 `docs/model-switching-guide.zh-CN.md`
