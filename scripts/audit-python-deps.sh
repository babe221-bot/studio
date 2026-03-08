#!/bin/bash
# scripts/audit-python-deps.sh

echo "=== Checking outdated pip packages ==="
pip list --outdated --format=json > reports/pip-outdated.json || true

echo "=== Running security audit ==="
pip-audit --format=json > reports/pip-audit.json || true

echo "=== Checking for major version updates ==="
pip-compile requirements.in --dry-run --upgrade 2>/dev/null | head -50

echo "=== Generating dependency report ==="
python scripts/generate-python-dep-report.py
