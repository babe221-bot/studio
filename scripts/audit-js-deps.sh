#!/bin/bash
echo "=== Checking outdated npm packages ==="
npm outdated --json > reports/npm-outdated.json || true
echo "=== Running security audit ==="
npm audit --json > reports/npm-audit.json || true

