#!/bin/bash
# GRT智能系统 - 菜单驱动安装脚本
# 版本: v1.6.0
# 支持: Windows 11 (WSL 2) / Linux / Cloud

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示横幅
show_banner() {
    clear
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║           GRT 智能系统 - 安装向导 v1.6.0                     ║"
    echo "║                                                              ║"
    echo "║     支持环境: Windows 11 (WSL 2) / Linux / Cloud             ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
}

# 检查系统要求
check_requirements() {
    print_info "检查系统要求..."
    
    # 检查 Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装。请先安装 Docker。"
        exit 1
    fi
    print_success "Docker 已安装: $(docker --version)"
    
    # 检查 Docker Compose
    if ! command -v docker &> /dev/null || ! docker compose version &> /dev/null; then
        print_error "Docker Compose 未安装。请先安装 Docker Compose。"
        exit 1
    fi
    print_success "Docker Compose 已安装: $(docker compose version --short)"
    
    # 检查 Git
    if ! command -v git &> /dev/null; then
        print_warning "Git 未安装。某些功能可能不可用。"
    else
        print_success "Git 已安装: $(git --version)"
    fi
    
    echo ""
}

# 选择部署环境
select_environment() {
    echo "请选择部署环境:"
    echo ""
    echo "  1) Windows 11 本地服务器 (WSL 2)"
    echo "  2) Linux 服务器 (Ubuntu/Debian)"
    echo "  3) 云服务器 (AWS/Azure/GCP)"
    echo "  4) 开发环境 (带 Adminer)"
    echo "  5) 退出"
    echo ""
    read -p "请输入选项 [1-5]: " env_choice
    
    case $env_choice in
        1)
            DEPLOY_ENV="windows"
            print_info "已选择: Windows 11 本地服务器"
            ;;
        2)
            DEPLOY_ENV="linux"
            print_info "已选择: Linux 服务器"
            ;;
        3)
            DEPLOY_ENV="cloud"
            print_info "已选择: 云服务器"
            ;;
        4)
            DEPLOY_ENV="dev"
            print_info "已选择: 开发环境"
            ;;
        5)
            print_info "退出安装程序"
            exit 0
            ;;
        *)
            print_error "无效选项"
            select_environment
            ;;
    esac
}

# 配置环境变量
configure_env() {
    print_info "配置环境变量..."
    
    if [ -f ".env" ]; then
        read -p ".env 文件已存在，是否覆盖? [y/N]: " overwrite
        if [ "$overwrite" != "y" ] && [ "$overwrite" != "Y" ]; then
            print_info "保留现有 .env 文件"
            return
        fi
    fi
    
    # 复制模板
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_success "已从模板创建 .env 文件"
    else
        touch .env
    fi
    
    # 生成随机 JWT Secret
    JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
    
    # 生成随机数据库密码
    DB_PASSWORD=$(openssl rand -base64 16 2>/dev/null || head -c 16 /dev/urandom | base64)
    
    # 写入基本配置
    cat > .env << EOF
# GRT智能系统环境配置
# 生成时间: $(date)
# 部署环境: $DEPLOY_ENV

# ============================================
# 数据库配置
# ============================================
DATABASE_URL=mysql://grt:${DB_PASSWORD}@mysql:3306/grt_db
MYSQL_ROOT_PASSWORD=root_${DB_PASSWORD}
MYSQL_PASSWORD=${DB_PASSWORD}

# ============================================
# 认证配置
# ============================================
JWT_SECRET=${JWT_SECRET}
VITE_APP_ID=
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im/login
OWNER_OPEN_ID=
OWNER_NAME=

# ============================================
# 应用配置
# ============================================
VITE_APP_TITLE=GRT智能系统
NODE_ENV=production

# ============================================
# AI 服务配置 (可选)
# ============================================
BUILT_IN_FORGE_API_URL=
BUILT_IN_FORGE_API_KEY=
GEMINI_API_KEY=
EOF

    print_success "环境变量配置完成"
    print_warning "请编辑 .env 文件填写必要的 API 密钥"
}

# 启动服务
start_services() {
    print_info "启动服务..."
    
    case $DEPLOY_ENV in
        "dev")
            docker compose --profile dev up -d --build
            ;;
        *)
            docker compose up -d --build
            ;;
    esac
    
    print_success "服务启动完成"
}

# 初始化数据库
init_database() {
    print_info "等待数据库就绪..."
    sleep 10
    
    print_info "执行数据库迁移..."
    docker compose exec -T grt-app sh -c "pnpm db:push" || true
    
    print_success "数据库初始化完成"
}

# 显示访问信息
show_access_info() {
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    安装完成!                                 ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "访问地址:"
    echo "  - GRT 应用:     http://localhost:3000"
    
    if [ "$DEPLOY_ENV" == "dev" ]; then
        echo "  - 数据库管理:   http://localhost:8080"
    fi
    
    echo ""
    echo "常用命令:"
    echo "  - 查看日志:     docker compose logs -f"
    echo "  - 停止服务:     docker compose down"
    echo "  - 重启服务:     docker compose restart"
    echo ""
    
    if [ "$DEPLOY_ENV" == "windows" ]; then
        echo -e "${YELLOW}Windows 用户注意:${NC}"
        echo "  如需从局域网访问，请以管理员身份运行 PowerShell 执行:"
        echo "  netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=\$(wsl hostname -I)"
        echo ""
    fi
}

# 主菜单
main_menu() {
    show_banner
    
    echo "请选择操作:"
    echo ""
    echo "  1) 完整安装 (推荐)"
    echo "  2) 仅检查系统要求"
    echo "  3) 仅配置环境变量"
    echo "  4) 仅启动服务"
    echo "  5) 停止所有服务"
    echo "  6) 查看服务状态"
    echo "  7) 查看日志"
    echo "  8) 卸载 (删除所有数据)"
    echo "  9) 退出"
    echo ""
    read -p "请输入选项 [1-9]: " main_choice
    
    case $main_choice in
        1)
            check_requirements
            select_environment
            configure_env
            start_services
            init_database
            show_access_info
            ;;
        2)
            check_requirements
            ;;
        3)
            select_environment
            configure_env
            ;;
        4)
            select_environment
            start_services
            show_access_info
            ;;
        5)
            print_info "停止所有服务..."
            docker compose down
            print_success "服务已停止"
            ;;
        6)
            docker compose ps
            ;;
        7)
            docker compose logs -f
            ;;
        8)
            read -p "确定要删除所有数据吗? 此操作不可恢复! [y/N]: " confirm
            if [ "$confirm" == "y" ] || [ "$confirm" == "Y" ]; then
                docker compose down -v --rmi all
                rm -f .env
                print_success "卸载完成"
            else
                print_info "取消卸载"
            fi
            ;;
        9)
            print_info "退出"
            exit 0
            ;;
        *)
            print_error "无效选项"
            main_menu
            ;;
    esac
}

# 运行主菜单
main_menu
