#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# GRT System — Stop Script
# Gracefully stops all services
# =============================================================================

GRT_HOME="${GRT_HOME:-/opt/grt-system}"
COMPOSE_PROJECT_NAME="grt"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
STOP_TIMEOUT="${STOP_TIMEOUT:-30}"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC}  $*"; }
log_step() { echo -e "${CYAN}[STEP]${NC}  $*"; }

if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
else
    echo "docker compose not found." >&2
    exit 1
fi

log_step "Stopping GRT System (timeout: ${STOP_TIMEOUT}s)..."

cd "${PROJECT_DIR}"
export COMPOSE_PROJECT_NAME
${COMPOSE_CMD} down --timeout "${STOP_TIMEOUT}"

log_info "All services stopped."
