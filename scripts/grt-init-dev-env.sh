#!/usr/bin/env bash
#
# GRT Developer Environment Initialization Script
#
# Idempotent — safe to re-run at any time.
#
# Steps:
#   1/5  Create .vscode/ with CTO-standard settings
#   2/5  Install git pre-push hook
#   3/5  Test API connectivity
#   4/5  Fetch BU SharePoint directory tree
#   5/5  Print summary + next steps
#
# Usage:
#   bash scripts/grt-init-dev-env.sh
#

set -euo pipefail

# ── Configuration ──────────────────────────────────────────────────────

GRT_API_BASE="${GRT_API_BASE:-http://localhost:5000}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── Color helpers ──────────────────────────────────────────────────────

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

passed=0
failed=0

step_ok() {
  echo -e "  ${GREEN}✓${NC} $1"
  ((passed++))
}

step_fail() {
  echo -e "  ${RED}✗${NC} $1"
  ((failed++))
}

step_skip() {
  echo -e "  ${YELLOW}⊘${NC} $1"
}

# ══════════════════════════════════════════════════════════════════════

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║     GRT Developer Environment Init  (v1.0)              ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# ── Step 1/5: VS Code settings ────────────────────────────────────────

echo -e "${CYAN}[1/5] Setting up VS Code workspace...${NC}"

mkdir -p "$PROJECT_ROOT/.vscode"

if [ -f "$SCRIPT_DIR/vscode/settings.json" ]; then
  cp "$SCRIPT_DIR/vscode/settings.json" "$PROJECT_ROOT/.vscode/settings.json"
  step_ok ".vscode/settings.json created"
else
  step_fail "scripts/vscode/settings.json template not found"
fi

if [ -f "$SCRIPT_DIR/vscode/extensions.json" ]; then
  cp "$SCRIPT_DIR/vscode/extensions.json" "$PROJECT_ROOT/.vscode/extensions.json"
  step_ok ".vscode/extensions.json created"
else
  step_fail "scripts/vscode/extensions.json template not found"
fi

# ── Step 2/5: Git pre-push hook ───────────────────────────────────────

echo ""
echo -e "${CYAN}[2/5] Installing git pre-push hook...${NC}"

if [ -d "$PROJECT_ROOT/.git" ]; then
  mkdir -p "$PROJECT_ROOT/.git/hooks"
  if [ -f "$SCRIPT_DIR/hooks/pre-push" ]; then
    cp "$SCRIPT_DIR/hooks/pre-push" "$PROJECT_ROOT/.git/hooks/pre-push"
    chmod +x "$PROJECT_ROOT/.git/hooks/pre-push"
    step_ok "Pre-push hook installed (.git/hooks/pre-push)"
  else
    step_fail "scripts/hooks/pre-push not found"
  fi
else
  step_fail "Not a git repository — cannot install hooks"
fi

# ── Step 3/5: API connectivity ────────────────────────────────────────

echo ""
echo -e "${CYAN}[3/5] Testing API connectivity...${NC}"

if curl -sf --max-time 5 "$GRT_API_BASE/api/trpc/health" > /dev/null 2>&1; then
  step_ok "API reachable at $GRT_API_BASE"
else
  step_fail "API unreachable at $GRT_API_BASE (start with: npm run dev)"
fi

# ── Step 4/5: SharePoint directory tree ───────────────────────────────

echo ""
echo -e "${CYAN}[4/5] Fetching BU SharePoint directory tree...${NC}"

SP_RESPONSE=$(curl -sf --max-time 5 "$GRT_API_BASE/api/trpc/devEnv.getSharePointTree?input=%7B%22json%22%3A%7B%7D%7D" 2>/dev/null || echo "")

if [ -n "$SP_RESPONSE" ] && echo "$SP_RESPONSE" | grep -q '"totalSites"'; then
  SITE_COUNT=$(echo "$SP_RESPONSE" | grep -o '"totalSites":[0-9]*' | grep -o '[0-9]*' || echo "0")
  step_ok "SharePoint directory: $SITE_COUNT sites found"
  echo ""
  echo -e "  ${BOLD}Project Folder Template (12 directories):${NC}"
  echo "    01_Proposal/       07_Procurement/"
  echo "    02_Mechanical/     08_QA_Testing/"
  echo "    03_Electrical/     09_FAT/"
  echo "    04_PLC/            10_SAT/"
  echo "    05_HMI/            11_Manuals/"
  echo "    06_BOM/            12_Archives/"
else
  step_skip "SharePoint tree unavailable (requires API + auth)"
fi

# ── Step 5/5: Summary ─────────────────────────────────────────────────

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║  Init Complete: ${GREEN}${passed} passed${NC}${BOLD}, ${RED}${failed} failed${NC}${BOLD}                        ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$failed" -eq 0 ]; then
  echo -e "${GREEN}All checks passed!${NC}"
else
  echo -e "${YELLOW}Some steps failed — see above for details.${NC}"
fi

echo ""
echo -e "${BOLD}Next steps:${NC}"
echo "  1. Create a .grt-dev-token file with your API auth token"
echo "  2. Set GRT_PROJECT_ID=<your-project-id> in your terminal"
echo "  3. Install recommended VS Code extensions (Ctrl+Shift+P → 'Install Recommended')"
echo "  4. Start the dev server: npm run dev"
echo "  5. Try pushing — the pre-push hook will validate mech/elec sync"
echo ""
