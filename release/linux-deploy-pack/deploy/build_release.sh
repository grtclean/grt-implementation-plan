#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# GRT System — Build Release Script
# Builds frontend, assembles release directory, creates distributable tarball
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
RELEASE_DIR="${PROJECT_DIR}/release"

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }
log_step()  { echo -e "${CYAN}[STEP]${NC}  $*"; }

# -----------------------------------------------------------------------------
# Determine version
# -----------------------------------------------------------------------------
if git describe --tags --exact-match HEAD >/dev/null 2>&1; then
    VERSION=$(git describe --tags --exact-match HEAD)
elif git describe --tags >/dev/null 2>&1; then
    VERSION=$(git describe --tags)
else
    VERSION="$(date +%Y%m%d)-$(git rev-parse --short HEAD 2>/dev/null || echo 'local')"
fi

log_info "Building release version: ${VERSION}"

# -----------------------------------------------------------------------------
# 1. Build frontend and backend
# -----------------------------------------------------------------------------
log_step "Installing dependencies..."
cd "${PROJECT_DIR}"

if command -v pnpm >/dev/null 2>&1; then
    pnpm install --frozen-lockfile
else
    log_error "pnpm is required. Install with: npm install -g pnpm"
    exit 1
fi

log_step "Building project..."
pnpm build

if [ ! -d "${PROJECT_DIR}/dist" ]; then
    log_error "Build failed — dist/ directory not found."
    exit 1
fi

# -----------------------------------------------------------------------------
# 2. Assemble release directory
# -----------------------------------------------------------------------------
log_step "Assembling release package..."

rm -rf "${RELEASE_DIR}"
mkdir -p "${RELEASE_DIR}"

# Application build output
cp -r "${PROJECT_DIR}/dist" "${RELEASE_DIR}/dist"

# Docker files
cp "${PROJECT_DIR}/Dockerfile" "${RELEASE_DIR}/Dockerfile"
cp "${PROJECT_DIR}/docker-compose.yml" "${RELEASE_DIR}/docker-compose.yml"

# Deploy scripts
cp -r "${PROJECT_DIR}/deploy" "${RELEASE_DIR}/deploy"

# Documentation (if exists)
if [ -d "${PROJECT_DIR}/docs" ]; then
    cp -r "${PROJECT_DIR}/docs" "${RELEASE_DIR}/docs"
fi

# Environment template
if [ -f "${PROJECT_DIR}/.env.example" ]; then
    cp "${PROJECT_DIR}/.env.example" "${RELEASE_DIR}/.env.example"
else
    cat > "${RELEASE_DIR}/.env.example" <<'ENVEOF'
NODE_ENV=production
DATABASE_URL=postgresql://grt:grt_password@postgres:5432/grt_db
POSTGRES_PASSWORD=grt_password
JWT_SECRET=change-me-to-a-long-random-string
VITE_APP_ID=grt-system
VITE_APP_TITLE=GRT智能系统
ENVEOF
fi

# Package files for Docker build
cp "${PROJECT_DIR}/package.json" "${RELEASE_DIR}/package.json"
cp "${PROJECT_DIR}/pnpm-lock.yaml" "${RELEASE_DIR}/pnpm-lock.yaml"

# Database schema / migrations
if [ -d "${PROJECT_DIR}/drizzle" ]; then
    cp -r "${PROJECT_DIR}/drizzle" "${RELEASE_DIR}/drizzle"
fi

# Version file
cat > "${RELEASE_DIR}/VERSION" <<EOF
version: ${VERSION}
build_date: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
git_commit: $(git rev-parse HEAD 2>/dev/null || echo "unknown")
git_branch: $(git branch --show-current 2>/dev/null || echo "unknown")
built_by: $(whoami)@$(hostname)
EOF

# -----------------------------------------------------------------------------
# 3. Create tarball
# -----------------------------------------------------------------------------
log_step "Creating release tarball..."

TARBALL_NAME="grt-system-linux-${VERSION}.tar.gz"
tar -czf "${RELEASE_DIR}/${TARBALL_NAME}" \
    -C "${RELEASE_DIR}" \
    --exclude="${TARBALL_NAME}" \
    .

TARBALL_PATH="${RELEASE_DIR}/${TARBALL_NAME}"
TARBALL_SIZE=$(du -sh "${TARBALL_PATH}" | cut -f1)

# -----------------------------------------------------------------------------
# 4. Summary
# -----------------------------------------------------------------------------
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Release Build Complete${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "  Version:    ${VERSION}"
echo "  Tarball:    ${TARBALL_PATH}"
echo "  Size:       ${TARBALL_SIZE}"
echo "  Contents:"
ls -lh "${RELEASE_DIR}/" | tail -n +2
echo ""
echo "  To deploy on target server:"
echo "    scp ${TARBALL_PATH} user@server:/opt/"
echo "    ssh user@server 'cd /opt && tar xzf ${TARBALL_NAME} -C /opt/grt-system && cd /opt/grt-system && deploy/install.sh'"
echo ""
