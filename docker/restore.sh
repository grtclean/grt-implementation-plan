#!/bin/bash
# GRT智能系统 - 数据库恢复脚本
# 版本: v1.6.2
# 用途: 从备份文件恢复MySQL数据库

set -e

# ============================================
# 配置
# ============================================
BACKUP_DIR="${BACKUP_DIR:-$HOME/grt-backups}"
CONTAINER_NAME="${CONTAINER_NAME:-grt-mysql}"
DB_NAME="${DB_NAME:-grt_db}"
DB_USER="${DB_USER:-grt}"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ============================================
# 函数
# ============================================
print_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# ============================================
# 主逻辑
# ============================================

# 显示横幅
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           GRT 智能系统 - 数据库恢复工具 v1.6.2               ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# 检查参数
if [ -z "$1" ]; then
    print_info "用法: $0 <备份文件>"
    echo ""
    print_info "可用的备份文件:"
    if [ -d "$BACKUP_DIR" ]; then
        ls -lht "$BACKUP_DIR"/grt_db_*.sql.gz 2>/dev/null | head -10 || echo "  (无备份文件)"
    else
        echo "  备份目录不存在: $BACKUP_DIR"
    fi
    echo ""
    exit 1
fi

BACKUP_FILE="$1"

# 检查备份文件
if [ ! -f "$BACKUP_FILE" ]; then
    # 尝试在备份目录中查找
    if [ -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
        BACKUP_FILE="$BACKUP_DIR/$BACKUP_FILE"
    else
        print_error "备份文件不存在: $BACKUP_FILE"
        exit 1
    fi
fi

print_info "准备恢复备份文件: $BACKUP_FILE"

# 检查Docker容器
print_info "检查MySQL容器状态..."
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    print_error "MySQL容器 ($CONTAINER_NAME) 未运行"
    exit 1
fi
print_success "MySQL容器运行正常"

# 从.env文件读取密码
if [ -f ".env" ]; then
    source .env 2>/dev/null || true
fi
DB_PASSWORD="${MYSQL_PASSWORD:-grt_password}"

# 确认恢复操作
echo ""
print_warning "警告: 此操作将覆盖现有数据库中的所有数据!"
echo ""
read -p "确定要继续吗? [y/N]: " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    print_info "取消恢复操作"
    exit 0
fi

# 创建当前数据库的备份
print_info "创建当前数据库的备份（以防万一）..."
TEMP_BACKUP="$BACKUP_DIR/pre_restore_$(date +%Y%m%d_%H%M%S).sql.gz"
docker exec "$CONTAINER_NAME" mysqldump \
    -u "$DB_USER" \
    -p"$DB_PASSWORD" \
    --single-transaction \
    "$DB_NAME" | gzip > "$TEMP_BACKUP"
print_success "当前数据库已备份到: $TEMP_BACKUP"

# 解压备份文件（如果是压缩的）
RESTORE_FILE="$BACKUP_FILE"
if [[ "$BACKUP_FILE" == *.gz ]]; then
    print_info "解压备份文件..."
    RESTORE_FILE="${BACKUP_FILE%.gz}"
    gunzip -k "$BACKUP_FILE" 2>/dev/null || cp "$BACKUP_FILE" "${RESTORE_FILE}.gz" && gunzip "${RESTORE_FILE}.gz"
fi

# 执行恢复
print_info "开始恢复数据库..."
docker exec -i "$CONTAINER_NAME" mysql \
    -u "$DB_USER" \
    -p"$DB_PASSWORD" \
    "$DB_NAME" < "$RESTORE_FILE"

# 清理临时文件
if [ "$RESTORE_FILE" != "$BACKUP_FILE" ]; then
    rm -f "$RESTORE_FILE"
fi

# 验证恢复
print_info "验证数据库恢复..."
TABLE_COUNT=$(docker exec "$CONTAINER_NAME" mysql \
    -u "$DB_USER" \
    -p"$DB_PASSWORD" \
    -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB_NAME'")

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                      恢复完成摘要                            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  恢复文件: $BACKUP_FILE"
echo "  数据库表数量: $TABLE_COUNT"
echo "  恢复时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "  恢复前备份: $TEMP_BACKUP"
echo ""

print_success "数据库恢复完成!"
print_info "如需回滚，请使用恢复前备份: $TEMP_BACKUP"
