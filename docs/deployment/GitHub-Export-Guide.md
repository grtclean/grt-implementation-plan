# GitHub 代码导出指南

## 概述

本指南说明如何将GRT智能系统v1.3.24从Manus平台导出到GitHub，然后在Windows 11本地服务器上克隆和部署。

## 方法一：通过Manus Management UI导出（推荐）

### 步骤1：打开Management UI
1. 在Manus聊天界面，点击项目卡片上的"Dashboard"按钮
2. 或点击聊天框右上角的管理图标

### 步骤2：进入GitHub设置
1. 在Management UI左侧导航栏，点击"Settings"
2. 选择"GitHub"子面板

### 步骤3：连接GitHub账户
1. 点击"Connect GitHub"按钮
2. 授权Manus访问您的GitHub账户
3. 选择目标组织或个人账户

### 步骤4：导出代码
1. 输入新仓库名称（如：`grt-intelligent-system`）
2. 选择仓库可见性（Public/Private）
3. 点击"Export"按钮
4. 等待导出完成

### 步骤5：在Windows 11服务器克隆
```powershell
# 打开PowerShell
cd C:\Projects

# 克隆仓库
git clone https://github.com/YOUR_USERNAME/grt-intelligent-system.git

# 进入项目目录
cd grt-intelligent-system
```

## 方法二：手动下载代码

### 步骤1：下载代码包
1. 在Management UI的"Code"面板
2. 点击"Download All Files"按钮
3. 保存ZIP文件到本地

### 步骤2：解压到Windows服务器
```powershell
# 解压文件
Expand-Archive -Path "grt-implementation-plan.zip" -DestinationPath "C:\Projects\grt-intelligent-system"

# 初始化Git仓库（可选）
cd C:\Projects\grt-intelligent-system
git init
git add .
git commit -m "Initial commit from Manus v1.3.24"
```

## 方法三：使用Git Remote同步

如果您已有GitHub仓库，可以添加为远程仓库：

```bash
# 在Manus sandbox中执行
cd /home/ubuntu/grt-implementation-plan

# 添加远程仓库
git remote add github https://github.com/YOUR_USERNAME/grt-intelligent-system.git

# 推送代码
git push -u github main
```

## 后续步骤

代码导出后，请参考以下文档继续部署：

1. **环境配置**：`docs/deployment/GRT-System-Windows11-Deployment-Guide-v1.3.22.md`
2. **依赖安装**：运行 `scripts/install-windows.ps1`
3. **数据库配置**：配置MySQL/TiDB连接
4. **环境变量**：配置 `.env` 文件

## 注意事项

- 导出前请确保已保存最新检查点
- 敏感信息（API密钥、数据库密码）不会包含在导出中
- 需要在本地重新配置环境变量
- 建议使用Private仓库保护代码安全

## 常见问题

### Q: 导出后缺少node_modules目录？
A: 这是正常的，node_modules不应该提交到Git。在本地运行 `pnpm install` 安装依赖。

### Q: 环境变量如何配置？
A: 复制 `.env.example` 为 `.env`，然后填入实际值。参考部署指南获取详细说明。

### Q: 数据库数据如何迁移？
A: 数据库数据需要单独导出。可以使用MySQL Workbench或命令行工具导出SQL文件。
