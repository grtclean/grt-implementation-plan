#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# GRT System — Restart Script
# Stops then starts all services
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Stopping GRT System ==="
"${SCRIPT_DIR}/stop.sh"

echo ""
echo "=== Starting GRT System ==="
"${SCRIPT_DIR}/start.sh"
