#!/bin/bash
# NocoBase 一键部署脚本
# GRT智能系统 - AI助手任务管理平台
#
# 使用方法: ./deploy.sh [start|stop|restart|status|logs]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"

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

# 检查Docker是否安装
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装，请先安装 Docker"
        echo "安装指南: https://docs.docker.com/engine/install/"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
    
    print_success "Docker 环境检查通过"
}

# 获取docker compose命令
get_compose_cmd() {
    if docker compose version &> /dev/null; then
        echo "docker compose"
    else
        echo "docker-compose"
    fi
}

# 启动服务
start_services() {
    print_info "正在启动 NocoBase 服务..."
    
    check_docker
    
    COMPOSE_CMD=$(get_compose_cmd)
    cd "$SCRIPT_DIR"
    
    $COMPOSE_CMD -f "$COMPOSE_FILE" up -d
    
    print_info "等待服务启动..."
    sleep 10
    
    # 检查服务状态
    if $COMPOSE_CMD -f "$COMPOSE_FILE" ps | grep -q "Up"; then
        print_success "NocoBase 服务启动成功！"
        echo ""
        echo "=========================================="
        echo "  访问地址: http://localhost:13000"
        echo "  管理员账号: admin@nocobase.com"
        echo "  管理员密码: admin123"
        echo "=========================================="
        echo ""
        print_warning "首次启动可能需要1-2分钟初始化，请稍候..."
    else
        print_error "服务启动失败，请检查日志"
        $COMPOSE_CMD -f "$COMPOSE_FILE" logs --tail=50
        exit 1
    fi
}

# 停止服务
stop_services() {
    print_info "正在停止 NocoBase 服务..."
    
    COMPOSE_CMD=$(get_compose_cmd)
    cd "$SCRIPT_DIR"
    
    $COMPOSE_CMD -f "$COMPOSE_FILE" down
    
    print_success "NocoBase 服务已停止"
}

# 重启服务
restart_services() {
    print_info "正在重启 NocoBase 服务..."
    stop_services
    sleep 3
    start_services
}

# 查看状态
show_status() {
    print_info "NocoBase 服务状态:"
    
    COMPOSE_CMD=$(get_compose_cmd)
    cd "$SCRIPT_DIR"
    
    $COMPOSE_CMD -f "$COMPOSE_FILE" ps
}

# 查看日志
show_logs() {
    print_info "NocoBase 服务日志:"
    
    COMPOSE_CMD=$(get_compose_cmd)
    cd "$SCRIPT_DIR"
    
    $COMPOSE_CMD -f "$COMPOSE_FILE" logs -f --tail=100
}

# 导入任务数据
import_tasks() {
    print_info "准备导入AI助手任务数据..."
    
    TASKS_FILE="$SCRIPT_DIR/ai-assistant-tasks.json"
    
    if [ ! -f "$TASKS_FILE" ]; then
        print_error "任务数据文件不存在: $TASKS_FILE"
        exit 1
    fi
    
    print_info "任务数据文件: $TASKS_FILE"
    print_warning "请在NocoBase管理界面中手动导入任务数据"
    echo ""
    echo "导入步骤:"
    echo "1. 登录 NocoBase (http://localhost:13000)"
    echo "2. 创建 'AI助手任务' 数据表"
    echo "3. 使用 '导入' 功能导入 ai-assistant-tasks.json"
    echo ""
    print_info "或使用NocoBase API进行自动导入（需要API Token）"
}

# 显示帮助
show_help() {
    echo "NocoBase 部署管理脚本"
    echo ""
    echo "用法: $0 [命令]"
    echo ""
    echo "命令:"
    echo "  start     启动 NocoBase 服务"
    echo "  stop      停止 NocoBase 服务"
    echo "  restart   重启 NocoBase 服务"
    echo "  status    查看服务状态"
    echo "  logs      查看服务日志"
    echo "  import    导入任务数据"
    echo "  help      显示帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 start    # 启动服务"
    echo "  $0 logs     # 查看日志"
}

# 主函数
main() {
    case "${1:-help}" in
        start)
            start_services
            ;;
        stop)
            stop_services
            ;;
        restart)
            restart_services
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs
            ;;
        import)
            import_tasks
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "未知命令: $1"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
