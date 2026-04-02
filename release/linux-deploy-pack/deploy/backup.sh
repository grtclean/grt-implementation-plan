#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# GRT System — Backup Script
# Backs up PostgreSQL, Redis, .env, uploads to a timestamped tarball
# Retains the last 7 backups
# =============================================================================

GRT_HOME="${GRT_HOME:-/opt/grt-system}"
COMPOSE_PROJECT_NAME="grt"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${GRT_HOME}/backups"
BACKUP_NAME="grt-backup-${TIMESTAMP}"
WORK_DIR="${BACKUP_DIR}/${BACKUP_NAME}"
RETENTION=7

GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
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

cd "${PROJECT_DIR}"
export COMPOSE_PROJECT_NAME

mkdir -p "${WORK_DIR}"

# -----------------------------------------------------------------------------
# 1. Backup PostgreSQL
# -----------------------------------------------------------------------------
log_step "Backing up PostgreSQL database..."

${COMPOSE_CMD} exec -T postgres pg_dump \
    -U grt \
    -d grt_db \
    --format=custom \
    --compress=6 \
    > "${WORK_DIR}/grt_db.dump" 2>/dev/null || {
    log_error "PostgreSQL backup failed."
    rm -rf "${WORK_DIR}"
    exit 1
}

PG_SIZE=$(du -sh "${WORK_DIR}/grt_db.dump" | cut -f1)
log_info "PostgreSQL backup: ${PG_SIZE}"

# -----------------------------------------------------------------------------
# 2. Backup Redis (RDB snapshot)
# -----------------------------------------------------------------------------
log_step "Backing up Redis..."

${COMPOSE_CMD} exec -T redis redis-cli BGSAVE >/dev/null 2>&1 || true
sleep 2
# Copy the RDB dump from the container
docker cp grt-redis:/data/dump.rdb "${WORK_DIR}/redis-dump.rdb" 2>/dev/null || {
    log_info "No Redis RDB file found — skipping Redis backup."
}

# -----------------------------------------------------------------------------
# 3. Backup .env and uploads
# -----------------------------------------------------------------------------
log_step "Backing up configuration and uploads..."

if [ -f "${PROJECT_DIR}/.env" ]; then
    cp "${PROJECT_DIR}/.env" "${WORK_DIR}/dot-env"
    log_info "Backed up .env"
fi

if [ -d "${GRT_HOME}/uploads" ] && [ "$(ls -A "${GRT_HOME}/uploads" 2>/dev/null)" ]; then
    tar -cf "${WORK_DIR}/uploads.tar" -C "${GRT_HOME}" uploads
    log_info "Backed up uploads directory"
else
    log_info "No uploads to back up."
fi

# Save metadata
cat > "${WORK_DIR}/backup-meta.txt" <<EOF
Backup timestamp: ${TIMESTAMP}
Git commit: $(git rev-parse HEAD 2>/dev/null || echo "unknown")
Git branch: $(git branch --show-current 2>/dev/null || echo "unknown")
Hostname: $(hostname)
Created by: $(whoami)
EOF

# -----------------------------------------------------------------------------
# 4. Compress to tarball
# -----------------------------------------------------------------------------
log_step "Compressing backup..."

TARBALL="${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
tar -czf "${TARBALL}" -C "${BACKUP_DIR}" "${BACKUP_NAME}"
rm -rf "${WORK_DIR}"

TARBALL_SIZE=$(du -sh "${TARBALL}" | cut -f1)
log_info "Backup saved: ${TARBALL} (${TARBALL_SIZE})"

# -----------------------------------------------------------------------------
# 5. Retention — keep last N backups
# -----------------------------------------------------------------------------
log_step "Applying retention policy (keep last ${RETENTION})..."

BACKUP_COUNT=$(find "${BACKUP_DIR}" -maxdepth 1 -name "grt-backup-*.tar.gz" -type f | wc -l)
if [ "${BACKUP_COUNT}" -gt "${RETENTION}" ]; then
    REMOVE_COUNT=$((BACKUP_COUNT - RETENTION))
    find "${BACKUP_DIR}" -maxdepth 1 -name "grt-backup-*.tar.gz" -type f -printf '%T+ %p\n' \
        | sort \
        | head -n "${REMOVE_COUNT}" \
        | awk '{print $2}' \
        | while read -r OLD_BACKUP; do
            rm -f "${OLD_BACKUP}"
            log_info "Removed old backup: $(basename "${OLD_BACKUP}")"
        done
else
    log_info "Backup count (${BACKUP_COUNT}) within retention limit."
fi

echo ""
log_info "Backup complete: ${TARBALL}"
