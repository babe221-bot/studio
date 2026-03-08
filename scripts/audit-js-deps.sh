#!/bin/bash
# scripts/audit-js-deps.sh

echo "=== Checking outdated npm packages ==="
npm outdated --json > reports/npm-outdated.json || true

echo "=== Running security audit ==="
npm audit --json > reports/npm-audit.json || true

echo "=== Checking for major version updates ==="
cat package.json | jq '.dependencies, .devDependencies | to_entries | .[] | select(.value | test("^[~\^]?([5-9]|[1-9][0-9])\."))' 

echo "=== Generating dependency report ==="
node scripts/generate-dep-report.js
