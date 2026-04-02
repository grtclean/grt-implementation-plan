#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# GRT System — Restore Script
# Restores database and uploads from a backup tarball
# Usage: ./restore.sh /path/to/grt-backup-YYYYMMDD_HHMMSS.tar.gz
# =============================================================================

GRT_HOME="${GRT_HOME:-/opt/grt-system}"
COMPOSE_PROJECT_NAME="grt"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }
log_step()  { echo -e "${CYAN}[STEP]${NC}  $*"; }

if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
else
    log_error "docker compose not found."
    exit 1
fi

# -----------------------------------------------------------------------------
# Validate arguments
# -----------------------------------------------------------------------------
if [ $# -lt 1 ]; then
    echo "Usage: $0 <backup-file.tar.gz>"
    echo ""
    echo "Available backups:"
    ls -lh "${GRT_HOME}/backups"/grt-backup-*.tar.gz 2>/dev/null || echo "  (none found)"
    exit 1
fi

BACKUP_FILE="$1"
if [ ! -f "${BACKUP_FILE}" ]; then
    log_error "Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

# Confirmation prompt
echo -e "${YELLOW}WARNING: This will overwrite the current database and uploads.${NC}"
echo "Backup file: ${BACKUP_FILE}"
read -r -p "Continue? [y/N] " CONFIRM
if [[ ! "${CONFIRM}" =~ ^[yY]$ ]]; then
    echo "Aborted."
    exit 0
fi

cd "${PROJECT_DIR}"
export COMPOSE_PROJECT_NAME

# -----------------------------------------------------------------------------
# 1. Extract backup
# -----------------------------------------------------------------------------
log_step "Extracting backup..."

RESTORE_DIR=$(mktemp -d)
tar -xzf "${BACKUP_FILE}" -C "${RESTORE_DIR}"

# Find the extracted directory (first subdirectory)
BACKUP_CONTENT=$(find "${RESTORE_DIR}" -mindepth 1 -maxdepth 1 -type d | head -1)
if [ -z "${BACKUP_CONTENT}" ]; then
    log_error "Invalid backup archive — no directory found inside."
    rm -rf "${RESTORE_DIR}"
    exit 1
fi

log_info "Extracted to: ${BACKUP_CONTENT}"

# Show metadata if available
if [ -f "${BACKUP_CONTENT}/backup-meta.txt" ]; then
    echo "--- Backup metadata ---"
    cat "${BACKUP_CONTENT}/backup-meta.txt"
    echo "---"
fi

# -----------------------------------------------------------------------------
# 2. Stop application (keep database running)
# -----------------------------------------------------------------------------
log_step "Stopping application service..."
${COMPOSE_CMD} stop grt-app 2>/dev/null || true

# Ensure PostgreSQL is running
${COMPOSE_CMD} up -d postgres
sleep 5

RETRIES=15
until ${COMPOSE_CMD} exec -T postgres pg_isready -U grt -d grt_db >/dev/null 2>&1; do
    RETRIES=$((RETRIES - 1))
    if [ "${RETRIES}" -le 0 ]; then
        log_error "PostgreSQL did not become ready."
        rm -rf "${RESTORE_DIR}"
        exit 1
    fi
    sleep 2
done

# -----------------------------------------------------------------------------
# 3. Restore database
# -----------------------------------------------------------------------------
if [ -f "${BACKUP_CONTENT}/grt_db.dump" ]; then
    log_step "Restoring PostgreSQL database..."

    # Drop and recreate the database
    ${COMPOSE_CMD} exec -T postgres psql -U grt -d postgres -c "
        SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'grt_db' AND pid <> pg_backend_pid();
    " >/dev/null 2>&1 || true

    ${COMPOSE_CMD} exec -T postgres psql -U grt -d postgres -c "DROP DATABASE IF EXISTS grt_db;" >/dev/null 2>&1
    ${COMPOSE_CMD} exec -T postgres psql -U grt -d postgres -c "CREATE DATABASE grt_db OWNER grt;" >/dev/null 2>&1

    cat "${BACKUP_CONTENT}/grt_db.dump" | \
        ${COMPOSE_CMD} exec -T postgres pg_restore \
            -U grt \
            -d grt_db \
            --no-owner \
            --no-privileges \
            --if-exists \
            --clean \
            2>/dev/null || {
        log_warn "pg_restore reported warnings — this is often normal."
    }

    log_info "Database restored."
else
    log_warn "No database dump found in backup."
fi

# -----------------------------------------------------------------------------
# 4. Restore Redis
# -----------------------------------------------------------------------------
if [ -f "${BACKUP_CONTENT}/redis-dump.rdb" ]; then
    log_step "Restoring Redis data..."
    ${COMPOSE_CMD} stop redis 2>/dev/null || true
    docker cp "${BACKUP_CONTENT}/redis-dump.rdb" grt-redis:/data/dump.rdb 2>/dev/null || true
    ${COMPOSE_CMD} up -d redis
    log_info "Redis data restored."
fi

# -----------------------------------------------------------------------------
# 5. Restore uploads
# -----------------------------------------------------------------------------
if [ -f "${BACKUP_CONTENT}/uploads.tar" ]; then
    log_step "Restoring uploads..."
    tar -xf "${BACKUP_CONTENT}/uploads.tar" -C "${GRT_HOME}"
    log_info "Uploads restored."
fi

# Restore .env if requested
if [ -f "${BACKUP_CONTENT}/dot-env" ]; then
    log_info "Backup contains .env file. To restore it:"
    echo "  cp ${BACKUP_CONTENT}/dot-env ${PROJECT_DIR}/.env"
fi

# -----------------------------------------------------------------------------
# 6. Cleanup and restart
# -----------------------------------------------------------------------------
rm -rf "${RESTORE_DIR}"

log_step "Starting all services..."
"${SCRIPT_DIR}/start.sh"

# -----------------------------------------------------------------------------
# 7. Verify health
# -----------------------------------------------------------------------------
log_step "Verifying health after restore..."
if "${SCRIPT_DIR}/healthcheck.sh"; then
    log_info "Restore completed successfully."
else
    log_error "Health check failed after restore — check logs."
    exit 1
fi
