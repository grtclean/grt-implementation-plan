#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# GRT System — Status Script
# Shows service status, health, recent logs, and disk usage
# =============================================================================

GRT_HOME="${GRT_HOME:-/opt/grt-system}"
COMPOSE_PROJECT_NAME="grt"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
HEALTH_URL="http://localhost:3000/api/health"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
else
    echo "docker compose not found." >&2
    exit 1
fi

cd "${PROJECT_DIR}"
export COMPOSE_PROJECT_NAME

# -----------------------------------------------------------------------------
# 1. Container status
# -----------------------------------------------------------------------------
echo -e "${CYAN}=== Container Status ===${NC}"
${COMPOSE_CMD} ps
echo ""

# -----------------------------------------------------------------------------
# 2. Health endpoint
# -----------------------------------------------------------------------------
echo -e "${CYAN}=== Health Check ===${NC}"
HTTP_CODE=$(curl -s -o /tmp/grt-health.json -w "%{http_code}" "${HEALTH_URL}" 2>/dev/null || echo "000")
if [ "${HTTP_CODE}" = "200" ]; then
    echo -e "${GREEN}Health endpoint: OK (HTTP ${HTTP_CODE})${NC}"
    cat /tmp/grt-health.json 2>/dev/null && echo ""
else
    echo -e "${RED}Health endpoint: FAILED (HTTP ${HTTP_CODE})${NC}"
fi
rm -f /tmp/grt-health.json
echo ""

# -----------------------------------------------------------------------------
# 3. Recent logs (last 20 lines per service)
# -----------------------------------------------------------------------------
echo -e "${CYAN}=== Recent Logs (grt-app, last 20 lines) ===${NC}"
${COMPOSE_CMD} logs --tail=20 grt-app 2>/dev/null || echo "(no logs available)"
echo ""

# -----------------------------------------------------------------------------
# 4. Disk usage
# -----------------------------------------------------------------------------
echo -e "${CYAN}=== Disk Usage ===${NC}"
echo "Docker volumes:"
docker system df -v 2>/dev/null | head -30 || docker system df 2>/dev/null || echo "(unavailable)"
echo ""

if [ -d "${GRT_HOME}" ]; then
    echo "GRT data directory (${GRT_HOME}):"
    du -sh "${GRT_HOME}"/* 2>/dev/null || echo "(empty or not accessible)"
fi
echo ""
