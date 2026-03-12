#!/bin/bash
echo "=== Checking outdated pip packages ==="
pip list --outdated --format=json > reports/pip-outdated.json || true
echo "=== Running security audit ==="
pip-audit --format=json > reports/pip-audit.json || true

