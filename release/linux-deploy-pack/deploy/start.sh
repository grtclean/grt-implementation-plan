#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# GRT System — Start Script
# Starts all services and waits for health check
# =============================================================================

GRT_HOME="${GRT_HOME:-/opt/grt-system}"
COMPOSE_PROJECT_NAME="grt"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
HEALTH_URL="http://localhost:3000/api/health"
MAX_RETRIES=30
RETRY_INTERVAL=3

GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }
log_step()  { echo -e "${CYAN}[STEP]${NC}  $*"; }

# Resolve compose command
if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
else
    log_error "docker compose not found."
    exit 1
fi

# -----------------------------------------------------------------------------
# Start services
# -----------------------------------------------------------------------------
log_step "Starting GRT System services..."

cd "${PROJECT_DIR}"
export COMPOSE_PROJECT_NAME
${COMPOSE_CMD} up -d

# -----------------------------------------------------------------------------
# Wait for health check
# -----------------------------------------------------------------------------
log_step "Waiting for application to become healthy..."

ATTEMPT=0
while [ "${ATTEMPT}" -lt "${MAX_RETRIES}" ]; do
    ATTEMPT=$((ATTEMPT + 1))
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${HEALTH_URL}" 2>/dev/null || echo "000")

    if [ "${HTTP_CODE}" = "200" ]; then
        log_info "Application is healthy (HTTP ${HTTP_CODE})."
        break
    fi

    if [ "${ATTEMPT}" -ge "${MAX_RETRIES}" ]; then
        log_error "Health check failed after ${MAX_RETRIES} attempts."
        echo "Check logs with: ${COMPOSE_CMD} logs grt-app"
        exit 1
    fi

    echo "  Attempt ${ATTEMPT}/${MAX_RETRIES} — HTTP ${HTTP_CODE}, retrying in ${RETRY_INTERVAL}s..."
    sleep "${RETRY_INTERVAL}"
done

# -----------------------------------------------------------------------------
# Print status
# -----------------------------------------------------------------------------
echo ""
${COMPOSE_CMD} ps
echo ""
log_info "GRT System is running."
echo "  Application:   http://localhost:3000"
echo "  Health check:  ${HEALTH_URL}"
echo ""
