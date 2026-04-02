#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# GRT System — Upgrade Script
# Backs up current state, pulls latest, migrates DB, restarts, verifies health
# =============================================================================

GRT_HOME="${GRT_HOME:-/opt/grt-system}"
COMPOSE_PROJECT_NAME="grt"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

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

cd "${PROJECT_DIR}"
export COMPOSE_PROJECT_NAME

# Record current git revision for rollback
PREV_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
log_info "Current commit: ${PREV_COMMIT}"

# -----------------------------------------------------------------------------
# 1. Pre-upgrade backup
# -----------------------------------------------------------------------------
log_step "Creating pre-upgrade backup..."
"${SCRIPT_DIR}/backup.sh" || {
    log_error "Backup failed — aborting upgrade."
    exit 1
}

# -----------------------------------------------------------------------------
# 2. Pull latest code
# -----------------------------------------------------------------------------
log_step "Pulling latest code..."
git pull --ff-only || {
    log_error "git pull failed. Resolve conflicts manually."
    exit 1
}

NEW_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
log_info "Updated to commit: ${NEW_COMMIT}"

# -----------------------------------------------------------------------------
# 3. Pull / rebuild images
# -----------------------------------------------------------------------------
log_step "Rebuilding application image..."
${COMPOSE_CMD} build --no-cache grt-app
${COMPOSE_CMD} pull --ignore-buildable 2>/dev/null || true

# -----------------------------------------------------------------------------
# 4. Run database migrations
# -----------------------------------------------------------------------------
log_step "Running database migrations..."

# Ensure DB is up
${COMPOSE_CMD} up -d postgres redis
sleep 5

${COMPOSE_CMD} run --rm grt-app sh -c "npx drizzle-kit push --force" 2>/dev/null || {
    log_warn "drizzle-kit push returned non-zero — check migration output above."
}

# -----------------------------------------------------------------------------
# 5. Restart services
# -----------------------------------------------------------------------------
log_step "Restarting services..."
"${SCRIPT_DIR}/restart.sh"

# -----------------------------------------------------------------------------
# 6. Verify health
# -----------------------------------------------------------------------------
log_step "Verifying health after upgrade..."
if "${SCRIPT_DIR}/healthcheck.sh"; then
    log_info "Upgrade completed successfully."
else
    log_error "Health check failed after upgrade!"
    echo ""
    echo "  To rollback:"
    echo "    1. git checkout ${PREV_COMMIT}"
    echo "    2. ${SCRIPT_DIR}/restore.sh <latest backup file>"
    echo "    3. ${SCRIPT_DIR}/restart.sh"
    exit 1
fi

# -----------------------------------------------------------------------------
# 7. Summary
# -----------------------------------------------------------------------------
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Upgrade Complete${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "  Previous commit: ${PREV_COMMIT}"
echo "  Current commit:  ${NEW_COMMIT}"
echo "  Backup created:  ${GRT_HOME}/backups/"
echo ""
echo "  Rollback instructions:"
echo "    git checkout ${PREV_COMMIT}"
echo "    ${SCRIPT_DIR}/restore.sh ${GRT_HOME}/backups/grt-backup-${TIMESTAMP}.tar.gz"
echo "    ${SCRIPT_DIR}/restart.sh"
echo ""
