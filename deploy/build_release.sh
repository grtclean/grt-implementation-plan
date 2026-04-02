#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# GRT System — Build Release Script
# Builds frontend+backend, installs production deps, creates distributable tarball
# Output: release/grt-system-linux-v<VERSION>.tar.gz
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
RELEASE_DIR="${PROJECT_DIR}/release"

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
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

# Prefix with 'v' if not already present
case "${VERSION}" in
    v*) ;; # already prefixed
    *)  VERSION="v${VERSION}" ;;
esac

log_info "Building release version: ${VERSION}"

# -----------------------------------------------------------------------------
# 1. Install all dependencies and build
# -----------------------------------------------------------------------------
log_step "Installing dependencies..."
cd "${PROJECT_DIR}"

if command -v pnpm >/dev/null 2>&1; then
    pnpm install --frozen-lockfile
else
    log_error "pnpm is required. Install with: npm install -g pnpm"
    exit 1
fi

log_step "Building project (frontend + backend)..."
pnpm build

if [ ! -d "${PROJECT_DIR}/dist" ]; then
    log_error "Build failed — dist/ directory not found."
    exit 1
fi

log_info "Build output:"
ls -lh "${PROJECT_DIR}/dist/"

# -----------------------------------------------------------------------------
# 2. Prepare staging directory
# -----------------------------------------------------------------------------
log_step "Assembling release package..."

STAGING_DIR="${RELEASE_DIR}/grt-system"
rm -rf "${RELEASE_DIR}"
mkdir -p "${STAGING_DIR}"

# --- Application build output ---
cp -r "${PROJECT_DIR}/dist" "${STAGING_DIR}/dist"

# --- Production node_modules ---
log_step "Installing production dependencies..."
cp "${PROJECT_DIR}/package.json" "${STAGING_DIR}/package.json"
cp "${PROJECT_DIR}/pnpm-lock.yaml" "${STAGING_DIR}/pnpm-lock.yaml"

cd "${STAGING_DIR}"
pnpm install --frozen-lockfile --prod 2>/dev/null || {
    # Fallback: if --frozen-lockfile fails in staging, copy from project
    log_warn "pnpm install --prod failed in staging, copying from project..."
    cd "${PROJECT_DIR}"
    pnpm install --frozen-lockfile --prod
    cp -r "${PROJECT_DIR}/node_modules" "${STAGING_DIR}/node_modules"
    # Restore full deps for the project
    pnpm install --frozen-lockfile
}
cd "${PROJECT_DIR}"

# --- Docker files ---
cp "${PROJECT_DIR}/Dockerfile" "${STAGING_DIR}/Dockerfile"
cp "${PROJECT_DIR}/docker-compose.yml" "${STAGING_DIR}/docker-compose.yml"
if [ -f "${PROJECT_DIR}/.dockerignore" ]; then
    cp "${PROJECT_DIR}/.dockerignore" "${STAGING_DIR}/.dockerignore"
fi

# --- Deploy scripts ---
cp -r "${PROJECT_DIR}/deploy" "${STAGING_DIR}/deploy"

# --- Database schema (for migrations) ---
if [ -d "${PROJECT_DIR}/drizzle" ]; then
    cp -r "${PROJECT_DIR}/drizzle" "${STAGING_DIR}/drizzle"
fi

# --- Shared types (may be needed by drizzle config) ---
if [ -d "${PROJECT_DIR}/shared" ]; then
    cp -r "${PROJECT_DIR}/shared" "${STAGING_DIR}/shared"
fi

# --- Documentation ---
if [ -d "${PROJECT_DIR}/docs" ]; then
    cp -r "${PROJECT_DIR}/docs" "${STAGING_DIR}/docs"
fi

# --- Environment templates ---
cp "${PROJECT_DIR}/.env.example" "${STAGING_DIR}/.env.example"

# Copy all provider-specific .env examples
for ENV_EXAMPLE in "${PROJECT_DIR}"/.env.*.example; do
    if [ -f "${ENV_EXAMPLE}" ]; then
        cp "${ENV_EXAMPLE}" "${STAGING_DIR}/$(basename "${ENV_EXAMPLE}")"
    fi
done

# --- Version file ---
cat > "${STAGING_DIR}/VERSION" <<EOF
version: ${VERSION}
build_date: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
git_commit: $(git rev-parse HEAD 2>/dev/null || echo "unknown")
git_branch: $(git branch --show-current 2>/dev/null || echo "unknown")
built_by: $(whoami)@$(hostname)
node_version: $(node --version 2>/dev/null || echo "unknown")
pnpm_version: $(pnpm --version 2>/dev/null || echo "unknown")
EOF

# -----------------------------------------------------------------------------
# 3. Create tarball
# -----------------------------------------------------------------------------
log_step "Creating release tarball..."

TARBALL_NAME="grt-system-linux-${VERSION}.tar.gz"
TARBALL_PATH="${RELEASE_DIR}/${TARBALL_NAME}"

tar -czf "${TARBALL_PATH}" -C "${RELEASE_DIR}" grt-system

TARBALL_SIZE=$(du -sh "${TARBALL_PATH}" | cut -f1)

# Clean up staging directory (keep tarball)
rm -rf "${STAGING_DIR}"

# -----------------------------------------------------------------------------
# 4. Verify tarball contents
# -----------------------------------------------------------------------------
log_step "Verifying tarball contents..."

REQUIRED_ENTRIES=(
    "grt-system/dist/index.js"
    "grt-system/node_modules"
    "grt-system/package.json"
    "grt-system/Dockerfile"
    "grt-system/docker-compose.yml"
    "grt-system/deploy/install.sh"
    "grt-system/deploy/start.sh"
    "grt-system/deploy/stop.sh"
    "grt-system/.env.example"
    "grt-system/VERSION"
)

VERIFY_OK=true
for ENTRY in "${REQUIRED_ENTRIES[@]}"; do
    if tar -tzf "${TARBALL_PATH}" "${ENTRY}" >/dev/null 2>&1; then
        echo -e "  ${GREEN}[OK]${NC} ${ENTRY}"
    else
        echo -e "  ${RED}[MISSING]${NC} ${ENTRY}"
        VERIFY_OK=false
    fi
done

if [ "${VERIFY_OK}" = false ]; then
    log_error "Tarball verification failed — some required files are missing."
    exit 1
fi

# -----------------------------------------------------------------------------
# 5. Summary
# -----------------------------------------------------------------------------
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Release Build Complete${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "  Version:    ${VERSION}"
echo "  Tarball:    ${TARBALL_PATH}"
echo "  Size:       ${TARBALL_SIZE}"
echo ""
echo "  To deploy on target Linux server:"
echo ""
echo "    # 1. Copy to server"
echo "    scp ${TARBALL_PATH} user@server:/opt/"
echo ""
echo "    # 2. Extract"
echo "    ssh user@server 'cd /opt && tar xzf ${TARBALL_NAME}'"
echo ""
echo "    # 3. Install (Docker mode)"
echo "    ssh user@server 'cd /opt/grt-system && deploy/install.sh'"
echo ""
echo "    # 4. Or run directly (systemd mode, requires Node.js 22+)"
echo "    ssh user@server 'cd /opt/grt-system && cp .env.example .env && node dist/index.js'"
echo ""
