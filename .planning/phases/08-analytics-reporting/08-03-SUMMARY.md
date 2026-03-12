---
phase: 08-analytics-reporting
plan: 03
slug: predictive-analytics-03
subsystem: Admin Analytics
tags: [admin, analytics, forecasting, predictive, data-science]
dependency_graph:
  requires: [numpy, OrderDB, is_admin]
  provides: [GET /api/admin/forecast, ForecastChart]
  affects: [src/app/admin/analytics/page.tsx]
tech_stack:
  added: [numpy]
  patterns: [Linear Regression Forecasting, Dual-Series LineChart]
key_files:
  created:
    - backend/app/api/admin/forecast.py
    - src/components/admin/ForecastChart.tsx
  modified:
    - backend/app/main.py
    - src/app/admin/analytics/page.tsx
decisions_made:
  - 'Used `numpy.polyfit` for a first-order linear regression (trend line) as a simple forecasting model.'
  - 'Implemented a dual-line chart using Recharts where historical data is solid and predictions are dashed.'
  - 'Limited forecast to 7 days ahead by default to maintain reasonable accuracy for a simple linear model.'
metrics:
  duration: '15m'
  tasks_completed: 3
  files_changed: 4
  completed_at: '2026-03-12T23:55:00Z'
---

# Phase 08 Plan 03: Predictive Analytics & Forecasting Summary

**One-liner:** Implemented a predictive analytics engine and visualization component to forecast future order trends based on historical data.

## Execution Details

- Created a new FastAPI router `forecast.py` that performs linear regression on historical order/revenue data using `numpy`.
- The forecasting endpoint returns a unified time-series containing both actual historical values and predicted future values.
- Developed the `ForecastChart` React component using Recharts to visualize the trend line alongside actual data.
- Integrated the forecast chart into the Admin Analytics dashboard to provide "Predictive Insights" to administrators.
- Ensured proper registration of the new router in the main application.

## Deviations from Plan

### Auto-fixed Issues

None - plan executed as written.

## Self-Check: PASSED

FOUND: backend/app/api/admin/forecast.py
FOUND: src/components/admin/ForecastChart.tsx
FOUND: backend/app/main.py
FOUND: src/app/admin/analytics/page.tsx
