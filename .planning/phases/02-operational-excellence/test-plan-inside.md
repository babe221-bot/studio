---
phase: 02-operational-excellence
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  [
    .github/workflows/main.yml,
    .env.example,
    backend/.env.example,
    scripts/sync-env.js,
  ]
autonomous: true
requirements: [OPS-01, OPS-04]
must_haves:
  truths:
    - 'CI builds cache dependencies'
    - 'CI builds cache python venv'
    - 'Environment variables sync correctly locally'
  artifacts:
    - path: .github/workflows/main.yml
      provides: 'CI/CD pipeline'
      contains: 'actions/cache@v4'
    - path: scripts/sync-env.js
      provides: 'Env var synchronization'
  key_links:
    - from: '.github/workflows/main.yml'
      to: 'node_modules'
      via: 'cache key'
    - from: 'scripts/sync-env.js'
      to: '.env.local'
      via: 'fs.writeFileSync'
---

<objective>
Optimize the CI/CD pipeline with dependency caching and standardize environment variable synchronization.

Purpose: Speed up builds and ensure consistent development environments.
Output: Faster GitHub Actions builds and a reliable `npm run sync-env` script.
</objective>

<execution_context>
@C:/Users/Administrator/.config/opencode/get-shit-done/workflows/execute-plan.md
@C:/Users/Administrator/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/STATE.md
@package.json
</context>

<tasks>
<task type="auto">
  <name>Task 1: Optimize GitHub Actions Caching</name>
  <files>.github/workflows/main.yml</files>
  <action>
    Update the main workflow to cache `node_modules` (using `package-lock.json` hash) and Python `.venv` (using `requirements.txt` hash).
    Use `actions/cache@v4`.
    Ensure the workflow runs on push to main and pull requests.
    Add a step to run `npm run sync-env` if needed in CI (or ensure env vars are set via secrets).
  </action>
  <verify>
    <automated>grep "actions/cache@v4" .github/workflows/main.yml && grep "path: node_modules" .github/workflows/main.yml</automated>
  </verify>
  <done>Workflow file includes caching steps for both JS and Python deps.</done>
</task>

<task type="auto">
  <name>Task 2: Enhance Env Sync Script</name>
  <files>scripts/sync-env.js, .env.example, backend/.env.example</files>
  <action>
    Review and enhance `scripts/sync-env.js` to be robust.
    Ensure `.env.example` files exist and contain necessary keys (dummy values).
    The script should:
    1. Copy example to local if local missing.
    2. Add missing keys from example to local if local exists.
    3. Log clear output.
    (Current script looks good, just double check it handles backend env too, which it does).
    Add a validation step: ensure no secrets are in `.env.example` files (scan for "sk_live", etc).
  </action>
  <verify>
    <automated>node scripts/sync-env.js</automated>
  </verify>
  <done>Script runs without error and syncs variables.</done>
</task>
</tasks>

<verification>
Run `npm run sync-env` locally to verify it works.
Push changes to trigger CI and verify cache saves (manual check later).
</verification>

<success_criteria>

- [ ] GitHub Actions workflow has caching enabled.
- [ ] `npm run sync-env` works reliably.
- [ ] No secrets in `.env.example` files.
      </success_criteria>

<output>
After completion, create `.planning/phases/02-operational-excellence/02-01-SUMMARY.md`
</output>
