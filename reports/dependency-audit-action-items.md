# Dependency Audit Action Items

## Security Vulnerabilities (High Priority)

1. **[NPM] dompurify** (Moderate Severity - XSS vulnerability)
   - Current Version: 3.1.3
   - Target Version: >= 3.3.1
   - Action: Run `npm update dompurify` or force upgrade to address GHSA-v2wj-7wpq-c8vv.

2. **[Python] pip** (Moderate Severity - CVE-2026-1703)
   - Current Version: 25.3
   - Target Version: 26.0+
   - Action: Run `python -m pip install --upgrade pip`.

## Major Version Upgrades (Medium Priority)

1. **React ecosystem** (18.3.1 -> 19.x)
   - `react`, `react-dom`
   - Warning: Requires checking compatibility with Next.js and third-party UI libraries.
2. **Tailwind CSS** (3.4.19 -> 4.x)
   - Warning: This is a major upgrade. Requires syntax and plugin compatibility checks.
3. **Three.js ecosystem**
   - `three` (0.165.0 -> 0.183.x)
   - `@react-three/fiber` (8.x -> 9.x)
   - `@react-three/drei` (9.x -> 10.x)
   - Action: Review CAD visualization compatibility with Three.js breaking changes before upgrading.
4. **Zod** (3.25.76 -> 4.3.6)
   - Action: Check for API breaking changes.
5. **Recharts** (2.15.4 -> 3.8.0)
   - Action: Check for breaking changes in charting components.

## Minor/Patch Upgrades (Low Priority)

- `@supabase/ssr` (0.8.0 -> 0.9.0)
- `@supabase/supabase-js` (2.98.0 -> 2.99.1)
- `date-fns` (3.6.0 -> 4.1.0)
- `lucide-react` (0.475.0 -> 0.577.0)
- `next-themes` (0.3.0 -> 0.4.6)

## Next Steps

1. Apply the security patches for `dompurify` and `pip` immediately.
2. Schedule a dedicated spike to evaluate the impact of upgrading React to v19 and Three.js ecosystems.
3. Create separate PRs for each major dependency upgrade to isolate potential breaking changes.
