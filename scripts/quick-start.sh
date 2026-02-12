#!/bin/bash
# GRT智能系统 快速启动脚本
# 版本: v3.1.7

set -e

echo "=========================================="
echo "  GRT智能系统 快速启动脚本"
echo "  版本: v3.1.7"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查Docker是否安装
check_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}错误: Docker未安装${NC}"
        echo "请先安装Docker: https://docs.docker.com/get-docker/"
        exit 1
    fi
    echo -e "${GREEN}✓ Docker已安装${NC}"
}

# 检查Docker Compose是否安装
check_docker_compose() {
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        echo -e "${RED}错误: Docker Compose未安装${NC}"
        echo "请先安装Docker Compose: https://docs.docker.com/compose/install/"
        exit 1
    fi
    echo -e "${GREEN}✓ Docker Compose已安装${NC}"
}

# 检查环境变量文件
check_env_file() {
    if [ ! -f ".env" ]; then
        echo -e "${YELLOW}警告: .env文件不存在，正在创建默认配置...${NC}"
        cat > .env << EOF
DATABASE_URL=mysql://grt:grt_password@mysql:3306/grt_db
JWT_SECRET=grt-development-jwt-secret-change-in-production
MYSQL_ROOT_PASSWORD=root_password
MYSQL_PASSWORD=grt_password
VITE_APP_ID=grt-system
VITE_APP_TITLE=GRT智能系统
EOF
        echo -e "${GREEN}✓ 已创建默认.env文件${NC}"
    else
        echo -e "${GREEN}✓ .env文件已存在${NC}"
    fi
}

# 启动服务
start_services() {
    echo ""
    echo "正在启动服务..."
    
    # 检查是否需要开发模式
    if [ "$1" == "--dev" ]; then
        echo "启动开发环境（包含Adminer）..."
        docker-compose --profile dev up -d
    else
        docker-compose up -d
    fi
    
    echo ""
    echo -e "${GREEN}✓ 服务启动完成${NC}"
}

# 等待服务就绪
wait_for_services() {
    echo ""
    echo "等待服务就绪..."
    
    # 等待MySQL
    echo -n "等待MySQL..."
    for i in {1..30}; do
        if docker-compose exec -T mysql mysqladmin ping -h localhost -u root -p${MYSQL_ROOT_PASSWORD:-root_password} &> /dev/null; then
            echo -e " ${GREEN}就绪${NC}"
            break
        fi
        echo -n "."
        sleep 2
    done
    
    # 等待应用
    echo -n "等待应用服务..."
    for i in {1..30}; do
        if curl -s http://localhost:3000/api/health &> /dev/null; then
            echo -e " ${GREEN}就绪${NC}"
            break
        fi
        echo -n "."
        sleep 2
    done
}

# 显示访问信息
show_info() {
    echo ""
    echo "=========================================="
    echo -e "${GREEN}  GRT智能系统已成功启动！${NC}"
    echo "=========================================="
    echo ""
    echo "访问地址:"
    echo "  - 应用: http://localhost:3000"
    if [ "$1" == "--dev" ]; then
        echo "  - 数据库管理: http://localhost:8080"
    fi
    echo ""
    echo "常用命令:"
    echo "  - 查看日志: docker-compose logs -f grt-app"
    echo "  - 停止服务: docker-compose down"
    echo "  - 重启服务: docker-compose restart"
    echo ""
}

# 主流程
main() {
    echo "检查环境..."
    check_docker
    check_docker_compose
    check_env_file
    
    start_services $1
    wait_for_services
    show_info $1
}

# 运行主流程
main $@
