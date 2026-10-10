#!/bin/bash
# Deprecated compatibility wrapper.
# The only approved production deployment entrypoint is scripts/deploy-systemd.sh.
set -euo pipefail

echo "deploy.sh is deprecated. Use scripts/deploy-systemd.sh instead." >&2
exit 1
