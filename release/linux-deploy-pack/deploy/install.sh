#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# GRT System — Install Script
# Checks prerequisites, creates directories, initializes database, pulls images
# =============================================================================

GRT_HOME="${GRT_HOME:-/opt/grt-system}"
COMPOSE_PROJECT_NAME="grt"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }
log_step()  { echo -e "${CYAN}[STEP]${NC}  $*"; }

# -----------------------------------------------------------------------------
# 1. Check prerequisites
# -----------------------------------------------------------------------------
log_step "Checking prerequisites..."

MISSING=()

command -v docker >/dev/null 2>&1 || MISSING+=("docker")
command -v git    >/dev/null 2>&1 || MISSING+=("git")
command -v curl   >/dev/null 2>&1 || MISSING+=("curl")

if [ ${#MISSING[@]} -gt 0 ]; then
    log_error "Missing required tools: ${MISSING[*]}"
    echo "Please install them before continuing."
    exit 1
fi

# Docker Compose — support both plugin and standalone
if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
else
    log_error "Missing docker compose (plugin or standalone)."
    exit 1
fi

DOCKER_VERSION=$(docker version --format '{{.Server.Version}}' 2>/dev/null || echo "unknown")
log_info "Docker version: ${DOCKER_VERSION}"
log_info "Compose command: ${COMPOSE_CMD}"

# -----------------------------------------------------------------------------
# 2. Create data directories
# -----------------------------------------------------------------------------
log_step "Creating data directories under ${GRT_HOME}..."

sudo mkdir -p "${GRT_HOME}"/{data,logs,backups,uploads}
sudo chown -R "$(id -u):$(id -g)" "${GRT_HOME}"

log_info "Directories created:"
ls -ld "${GRT_HOME}"/{data,logs,backups,uploads}

# -----------------------------------------------------------------------------
# 3. Copy .env.example → .env
# -----------------------------------------------------------------------------
log_step "Setting up environment file..."

ENV_FILE="${PROJECT_DIR}/.env"
ENV_EXAMPLE="${PROJECT_DIR}/.env.example"

if [ -f "${ENV_FILE}" ]; then
    log_warn ".env already exists — skipping copy. Review it manually."
else
    if [ -f "${ENV_EXAMPLE}" ]; then
        cp "${ENV_EXAMPLE}" "${ENV_FILE}"
        log_info "Copied .env.example → .env"
    else
        log_warn ".env.example not found — creating minimal .env"
        cat > "${ENV_FILE}" <<'ENVEOF'
# GRT System Environment Configuration
NODE_ENV=production
DATABASE_URL=postgresql://grt:grt_password@postgres:5432/grt_db
POSTGRES_PASSWORD=grt_password
JWT_SECRET=change-me-to-a-long-random-string
VITE_APP_ID=grt-system
VITE_APP_TITLE=GRT智能系统
ENVEOF
    fi
    log_warn "IMPORTANT: Edit ${ENV_FILE} and set secure passwords before starting."
fi

# -----------------------------------------------------------------------------
# 4. Pull Docker images
# -----------------------------------------------------------------------------
log_step "Pulling Docker images..."

cd "${PROJECT_DIR}"
export COMPOSE_PROJECT_NAME
${COMPOSE_CMD} pull --ignore-buildable 2>/dev/null || ${COMPOSE_CMD} pull 2>/dev/null || true

log_info "Building application image..."
${COMPOSE_CMD} build --no-cache grt-app

# -----------------------------------------------------------------------------
# 5. Initialize database (run migrations)
# -----------------------------------------------------------------------------
log_step "Starting database for migration..."

${COMPOSE_CMD} up -d postgres redis
log_info "Waiting for PostgreSQL to become healthy..."

RETRIES=30
until ${COMPOSE_CMD} exec -T postgres pg_isready -U grt -d grt_db >/dev/null 2>&1; do
    RETRIES=$((RETRIES - 1))
    if [ "${RETRIES}" -le 0 ]; then
        log_error "PostgreSQL did not become ready in time."
        exit 1
    fi
    sleep 2
done
log_info "PostgreSQL is ready."

log_info "Running database migrations..."
${COMPOSE_CMD} run --rm grt-app sh -c "npx drizzle-kit push" 2>/dev/null || {
    log_warn "drizzle-kit push failed — migrations may need manual attention."
}

# Stop services (start.sh will bring them up properly)
${COMPOSE_CMD} down

# -----------------------------------------------------------------------------
# 6. Done
# -----------------------------------------------------------------------------
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  GRT System installed successfully!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "  Data directory:  ${GRT_HOME}"
echo "  Project:         ${PROJECT_DIR}"
echo ""
echo "  Next steps:"
echo "    1. Review and edit:  ${ENV_FILE}"
echo "    2. Start services:   ${SCRIPT_DIR}/start.sh"
echo ""
echo "  After starting:"
echo "    Application:   http://localhost:3000"
echo "    Health check:  http://localhost:3000/api/health"
echo ""
