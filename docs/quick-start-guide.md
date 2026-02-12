# GRT智能系统开发快速启动指南

**版本**: 1.0  
**日期**: 2026年1月17日  
**适用对象**: 新加入的开发人员

---

## 快速开始（15分钟）

### 第一步：环境检查

```bash
# 检查Node.js版本（需要 >= 20）
node -v

# 检查pnpm版本（需要 >= 8）
pnpm -v

# 检查Git版本
git -v
```

如果未安装，请参考 [完整部署指南](./aliyun-deployment-implementation.md#2-开发环境搭建)。

### 第二步：克隆项目

```bash
# 克隆代码仓库
git clone https://github.com/your-org/grt-system.git
cd grt-system
```

### 第三步：安装依赖

```bash
# 安装项目依赖
pnpm install
```

### 第四步：配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑配置（使用你喜欢的编辑器）
code .env  # VS Code
# 或
vim .env
```

**最小配置**（本地开发）:

```bash
DATABASE_URL="mysql://root:password@localhost:3306/grt_dev"
JWT_SECRET="dev-secret-key-change-in-production"
NODE_ENV="development"
```

### 第五步：启动数据库

```bash
# 使用Docker启动MySQL和Redis
docker-compose -f docker-compose.dev.yml up -d

# 等待数据库启动（约10秒）
sleep 10

# 初始化数据库表
pnpm db:push
```

### 第六步：启动开发服务器

```bash
# 启动开发服务器
pnpm dev

# 访问应用
# 浏览器打开 http://localhost:3000
```

---

## 项目结构速览

```
grt-system/
├── client/                 # 前端代码
│   ├── src/
│   │   ├── pages/         # 页面组件
│   │   ├── components/    # 可复用组件
│   │   └── lib/           # 工具函数
│   └── index.html
├── server/                 # 后端代码
│   ├── routers.ts         # API路由定义
│   ├── db.ts              # 数据库操作
│   └── _core/             # 框架核心（勿修改）
├── drizzle/               # 数据库Schema
│   └── schema.ts          # 表定义
├── docs/                  # 文档
│   └── dev-specs/         # 开发规范文档
└── todo.md                # 任务清单
```

---

## 常用开发命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 构建生产版本 |
| `pnpm test` | 运行单元测试 |
| `pnpm db:push` | 同步数据库Schema |
| `pnpm lint` | 代码检查 |
| `pnpm format` | 代码格式化 |

---

## 开发工作流

### 1. 创建功能分支

```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```

### 2. 开发功能

按照 `docs/dev-specs/` 中的规划文档进行开发。

### 3. 提交代码

```bash
git add .
git commit -m "feat: add your feature description"
```

### 4. 推送并创建PR

```bash
git push origin feature/your-feature-name
# 在GitHub创建Pull Request
```

---

## 获取帮助

- **技术文档**: `docs/` 目录
- **API文档**: 启动服务后访问 `/api/docs`
- **任务清单**: `todo.md`
- **团队沟通**: 钉钉群/企业微信

---

**祝开发顺利！**
