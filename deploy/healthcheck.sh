#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# GRT System — Health Check Script
# Checks application, PostgreSQL, and Redis connectivity
# Returns exit code 0 (healthy) or 1 (unhealthy)
# =============================================================================

COMPOSE_PROJECT_NAME="grt"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
HEALTH_URL="http://localhost:3000/api/health"

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

HEALTHY=true

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
# 1. Application health endpoint
# -----------------------------------------------------------------------------
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${HEALTH_URL}" 2>/dev/null || echo "000")
if [ "${HTTP_CODE}" = "200" ]; then
    echo -e "${GREEN}[PASS]${NC} Application health endpoint (HTTP ${HTTP_CODE})"
else
    echo -e "${RED}[FAIL]${NC} Application health endpoint (HTTP ${HTTP_CODE})"
    HEALTHY=false
fi

# -----------------------------------------------------------------------------
# 2. PostgreSQL connectivity
# -----------------------------------------------------------------------------
if ${COMPOSE_CMD} exec -T postgres pg_isready -U grt -d grt_db >/dev/null 2>&1; then
    echo -e "${GREEN}[PASS]${NC} PostgreSQL is accepting connections"
else
    echo -e "${RED}[FAIL]${NC} PostgreSQL is not reachable"
    HEALTHY=false
fi

# -----------------------------------------------------------------------------
# 3. Redis connectivity
# -----------------------------------------------------------------------------
REDIS_PONG=$(${COMPOSE_CMD} exec -T redis redis-cli ping 2>/dev/null || echo "")
if [ "${REDIS_PONG}" = "PONG" ]; then
    echo -e "${GREEN}[PASS]${NC} Redis is responding"
else
    echo -e "${RED}[FAIL]${NC} Redis is not reachable"
    HEALTHY=false
fi

# -----------------------------------------------------------------------------
# Result
# -----------------------------------------------------------------------------
echo ""
if [ "${HEALTHY}" = true ]; then
    echo -e "${GREEN}Overall: HEALTHY${NC}"
    exit 0
else
    echo -e "${RED}Overall: UNHEALTHY${NC}"
    exit 1
fi
