#!/bin/bash
# GRT智能系统 - 数据库备份脚本
# 版本: v1.6.2
# 用途: 自动备份MySQL数据库

set -e

# ============================================
# 配置
# ============================================
BACKUP_DIR="${BACKUP_DIR:-$HOME/grt-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
CONTAINER_NAME="${CONTAINER_NAME:-grt-mysql}"
DB_NAME="${DB_NAME:-grt_db}"
DB_USER="${DB_USER:-grt}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="grt_db_${TIMESTAMP}.sql"

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
echo "║           GRT 智能系统 - 数据库备份工具 v1.6.2               ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# 创建备份目录
if [ ! -d "$BACKUP_DIR" ]; then
    print_info "创建备份目录: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
fi

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

# 执行备份
print_info "开始备份数据库: $DB_NAME"
print_info "备份文件: $BACKUP_DIR/$BACKUP_FILE"

docker exec "$CONTAINER_NAME" mysqldump \
    -u "$DB_USER" \
    -p"$DB_PASSWORD" \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    "$DB_NAME" > "$BACKUP_DIR/$BACKUP_FILE"

# 检查备份文件
if [ -f "$BACKUP_DIR/$BACKUP_FILE" ] && [ -s "$BACKUP_DIR/$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
    print_success "备份完成! 文件大小: $BACKUP_SIZE"
else
    print_error "备份失败: 文件为空或不存在"
    exit 1
fi

# 压缩备份文件
print_info "压缩备份文件..."
gzip "$BACKUP_DIR/$BACKUP_FILE"
COMPRESSED_FILE="${BACKUP_FILE}.gz"
COMPRESSED_SIZE=$(du -h "$BACKUP_DIR/$COMPRESSED_FILE" | cut -f1)
print_success "压缩完成! 压缩后大小: $COMPRESSED_SIZE"

# 清理旧备份
print_info "清理 $RETENTION_DAYS 天前的旧备份..."
DELETED_COUNT=$(find "$BACKUP_DIR" -name "grt_db_*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
if [ "$DELETED_COUNT" -gt 0 ]; then
    print_info "已删除 $DELETED_COUNT 个旧备份文件"
else
    print_info "没有需要清理的旧备份"
fi

# 显示备份统计
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                      备份完成摘要                            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  备份文件: $BACKUP_DIR/$COMPRESSED_FILE"
echo "  文件大小: $COMPRESSED_SIZE"
echo "  备份时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# 列出最近的备份
print_info "最近5个备份文件:"
ls -lht "$BACKUP_DIR"/grt_db_*.sql.gz 2>/dev/null | head -5 || echo "  (无备份文件)"
echo ""

print_success "备份任务完成!"
