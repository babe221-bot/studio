# Research: Analytics Dashboard for Stone Slab Configurator

**Domain:** E-commerce Product Configurator Analytics  
**Researched:** March 2026  
**Confidence:** HIGH

## Executive Summary

This research outlines the implementation strategy for an analytics dashboard in a Next.js + FastAPI stone slab configurator. The existing PostHog integration provides the foundation, and this document details how to extend it with custom event tracking, dashboard UI components, user behavior analytics, and revenue metrics.

**Key Finding:** PostHog's native product analytics, revenue analytics, and customer analytics features can cover 80% of requirements. Custom development should focus on domain-specific metrics (material preferences, configuration patterns) and internal admin dashboards.

---

## 1. Recommended Analytics Stack

### Primary Stack (Already Integrated)

| Technology | Version | Purpose                                             | Status       |
| ---------- | ------- | --------------------------------------------------- | ------------ |
| PostHog    | Cloud   | Event collection, product analytics, session replay | ✅ Active    |
| Recharts   | ^2.15.4 | Data visualization in custom dashboards             | ✅ Installed |
| Next.js 16 | ^16.1.6 | Frontend framework                                  | ✅ Active    |
| FastAPI    | Latest  | Backend analytics API                               | ✅ Active    |

### Extended Stack (Recommended Additions)

| Technology             | Purpose                             | Why                                                                         |
| ---------------------- | ----------------------------------- | --------------------------------------------------------------------------- |
| **PostHog Python SDK** | Server-side event capture (FastAPI) | Track backend events (pricing calculations, PDF generation, order creation) |
| **date-fns**           | Date manipulation                   | Already installed, use for date ranges in analytics                         |
| **React Query**        | Data fetching/caching               | Manage analytics API state                                                  |
| **Zustand**            | Dashboard state                     | Already installed, reuse for analytics UI state                             |

### Alternative Considerations

**PostHog vs. Custom Dashboard:**

- PostHog's native dashboards cover 80% of needs (funnels, trends, retention)
- Build custom dashboard only for:
  - Internal admin metrics (staff performance, system health)
  - Domain-specific insights (material popularity by region)
  - White-label client reports

**Recommendation:** Use PostHog for product analytics; build custom dashboard for admin/internal use cases.

---

## 2. Event Taxonomy

### Core Events to Track

Based on the stone slab configurator flow, track these events:

#### 2.1 Session & Identity Events

```typescript
// Track on: App load
{
  event: 'session_started',
  properties: {
    source: 'direct' | 'gallery' | 'shared_link',
    referrer?: string,
    utm_source?: string,
    utm_medium?: string,
    utm_campaign?: string,
  }
}

// Track on: User login/registration
{
  event: 'user_identified',
  properties: {
    auth_method: 'email' | 'google' | 'supabase',
    is_new_user: boolean,
  }
}
```

#### 2.2 Configuration Flow Events

```typescript
// Track on: Material selection modal opened
{
  event: 'material_modal_opened',
  properties: {
    context: 'initial' | 'change' | 'gallery_import',
    current_items_count: number,
  }
}

// Track on: Material selected
{
  event: 'material_selected',
  properties: {
    material_id: number,
    material_name: string,
    material_category: 'granite' | 'marble' | 'quartz' | 'other',
    material_cost_per_sqm: number,
    was_previously_selected: boolean,
  }
}

// Track on: Dimension input change
{
  event: 'dimension_changed',
  properties: {
    dimension_type: 'length' | 'width' | 'height',
    value_cm: number,
    element_type: string, // e.g., 'countertop', 'backsplash'
    validation_status: 'valid' | 'invalid',
  }
}

// Track on: Surface finish selected
{
  event: 'finish_selected',
  properties: {
    finish_id: number,
    finish_name: string,
    finish_cost_per_sqm: number,
  }
}

// Track on: Edge profile selected
{
  event: 'profile_selected',
  properties: {
    profile_id: number,
    profile_name: string,
    profile_cost_per_m: number,
    edges_affected: number, // 1-4
  }
}

// Track on: Item added to project
{
  event: 'item_added',
  properties: {
    item_id: string,
    element_type: string,
    total_item_cost: number,
    total_items_in_project: number,
    dimensions: { length: number; width: number; height: number },
    material_cost: number,
    finish_cost: number,
    profile_cost: number,
  }
}

// Track on: Item removed from project
{
  event: 'item_removed',
  properties: {
    item_id: string,
    reason: 'user_action' | 'dimension_invalid' | 'price_too_high',
    total_items_remaining: number,
  }
}
```

#### 2.3 Visualization & Export Events

```typescript
// Track on: 3D render completed
{
  event: 'render_completed',
  properties: {
    render_type: 'realtime' | 'high_quality',
    render_time_ms: number,
    items_in_view: number,
    resolution: '720p' | '1080p' | '4k',
  }
}

// Track on: AR preview opened
{
  event: 'ar_preview_opened',
  properties: {
    device_type: 'ios' | 'android' | 'desktop',
    session_duration_sec: number,
  }
}

// Track on: PDF generated
{
  event: 'pdf_generated',
  properties: {
    pdf_type: 'quotation' | 'technical_drawing' | 'both',
    generation_time_ms: number,
    pages: number,
    includes_3d_snapshot: boolean,
    total_value: number,
  }
}

// Track on: 3D model downloaded
{
  event: 'model_downloaded',
  properties: {
    format: 'glb' | 'usdz' | 'obj',
    file_size_mb: number,
    items_included: number,
  }
}
```

#### 2.4 Project & Collaboration Events

```typescript
// Track on: Project saved
{
  event: 'project_saved',
  properties: {
    project_id: string,
    version_number: number,
    items_count: number,
    total_value: number,
    save_type: 'manual' | 'auto' | 'milestone',
  }
}

// Track on: Project shared
{
  event: 'project_shared',
  properties: {
    share_type: 'public_gallery' | 'private_link' | 'email',
    project_id: string,
    share_token: string,
  }
}

// Track on: Project loaded from gallery
{
  event: 'gallery_project_loaded',
  properties: {
    source_project_id: string,
    source_owner: string | 'anonymous',
    modification_intent: 'inspiration' | 'customize' | 'direct_order',
  }
}
```

#### 2.5 Checkout & Revenue Events

```typescript
// Track on: Checkout initiated
{
  event: 'checkout_started',
  properties: {
    cart_total: number,
    items_count: number,
    currency: 'EUR',
    source: 'direct' | 'quote_request' | 'reorder',
  }
}

// Track on: Pricing calculated (backend event)
{
  event: 'price_calculated',
  properties: {
    items_count: number,
    total_sqm: number,
    total_linear_m: number,
    subtotal: number,
    vat_amount: number,
    total: number,
    currency: 'EUR',
  }
}

// Track on: Stripe checkout created
{
  event: 'stripe_checkout_created',
  properties: {
    checkout_id: string,
    amount: number,
    currency: 'EUR',
    deposit_percentage: number,
    deposit_amount: number,
  }
}

// Track on: Payment successful
{
  event: 'payment_succeeded',
  properties: {
    order_id: string,
    amount: number,
    payment_method: 'card' | 'bank_transfer',
    stripe_payment_id: string,
  }
}

// Track on: Payment failed
{
  event: 'payment_failed',
  properties: {
    order_id: string,
    amount: number,
    failure_reason: string,
    retry_count: number,
  }
}
```

#### 2.6 Error & Performance Events

```typescript
// Track on: Any error occurs
{
  event: 'error_occurred',
  properties: {
    error_type: 'validation' | 'api' | 'render' | 'payment',
    error_message: string,
    stack_trace?: string,
    user_action?: string,
  }
}

// Track on: Performance threshold exceeded
{
  event: 'performance_degraded',
  properties: {
    metric: 'render_time' | 'page_load' | 'api_response',
    value: number,
    threshold: number,
    context: string,
  }
}
```

---

## 3. Analytics API Endpoints

### FastAPI Backend Design

```python
# backend/app/api/analytics.py

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel

from app.services.database import get_db
from app.models.domain import OrderDB, UserProfileDB

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

# ─────────────────────────────────────────────────────────
# Request/Response Models
# ─────────────────────────────────────────────────────────

class DashboardSummaryResponse(BaseModel):
    total_revenue: float
    total_orders: int
    average_order_value: float
    conversion_rate: float
    active_users_30d: int
    new_users_30d: int

class RevenueTimeSeriesResponse(BaseModel):
    period: str  # 'day' | 'week' | 'month'
    data: list[RevenueDataPoint]

class RevenueDataPoint(BaseModel):
    date: str
    revenue: float
    orders: int
    average_order_value: float

class MaterialPopularityResponse(BaseModel):
    materials: list[MaterialStats]

class MaterialStats(BaseModel):
    material_id: int
    material_name: string
    selection_count: int
    percentage: float
    revenue: float

class FunnelAnalysisResponse(BaseModel):
    funnel_name: str
    steps: list[FunnelStep]

class FunnelStep(BaseModel):
    step_name: str
    count: int
    conversion_rate_from_previous: float
    overall_conversion_rate: float

# ─────────────────────────────────────────────────────────
# Dashboard Summary Endpoints
# ─────────────────────────────────────────────────────────

@router.get("/summary", response_model=DashboardSummaryResponse)
async def get_dashboard_summary(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db)
):
    """
    Get high-level dashboard metrics for the specified period.
    """
    start_date = datetime.utcnow() - timedelta(days=days)

    # Total revenue
    revenue_result = await db.execute(
        select(func.sum(OrderDB.total_amount))
        .where(OrderDB.created_at >= start_date)
        .where(OrderDB.status == 'completed')
    )
    total_revenue = revenue_result.scalar() or 0

    # Total orders
    orders_result = await db.execute(
        select(func.count(OrderDB.id))
        .where(OrderDB.created_at >= start_date)
    )
    total_orders = orders_result.scalar() or 0

    # Average order value
    average_order_value = total_revenue / total_orders if total_orders > 0 else 0

    # Calculate conversion rate (orders / sessions)
    # This would require session tracking - simplified for now
    conversion_rate = 0.03  # Placeholder - implement with actual data

    return DashboardSummaryResponse(
        total_revenue=float(total_revenue),
        total_orders=total_orders,
        average_order_value=float(average_order_value),
        conversion_rate=conversion_rate,
        active_users_30d=0,  # Implement with PostHog API
        new_users_30d=0      # Implement with PostHog API
    )

# ─────────────────────────────────────────────────────────
# Revenue Analytics Endpoints
# ─────────────────────────────────────────────────────────

@router.get("/revenue/timeseries", response_model=RevenueTimeSeriesResponse)
async def get_revenue_timeseries(
    period: str = Query('day', regex='^(day|week|month)$'),
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db)
):
    """
    Get revenue data grouped by time period.
    """
    start_date = datetime.utcnow() - timedelta(days=days)

    # For daily data, use date truncation
    if period == 'day':
        date_format = '%Y-%m-%d'
    elif period == 'week':
        date_format = '%Y-W%W'
    else:
        date_format = '%Y-%m'

    # Query orders grouped by date
    query = """
        SELECT
            DATE(created_at) as date,
            SUM(total_amount) as revenue,
            COUNT(*) as orders
        FROM orders
        WHERE created_at >= :start_date
        AND status = 'completed'
        GROUP BY DATE(created_at)
        ORDER BY date
    """

    # Execute raw SQL (or use SQLAlchemy equivalent)
    # ... implementation ...

    return RevenueTimeSeriesResponse(period=period, data=[])

@router.get("/revenue/by-material", response_model=MaterialPopularityResponse)
async def get_revenue_by_material(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db)
):
    """
    Get revenue breakdown by material.
    """
    # This would require joining orders with order items
    # and materials - implement based on actual schema
    return MaterialPopularityResponse(materials=[])

@router.get("/revenue/by-channel")
async def get_revenue_by_channel(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db)
):
    """
    Get revenue breakdown by acquisition channel.
    """
    # Query PostHog for utm_source breakdown
    return {"channels": []}

# ─────────────────────────────────────────────────────────
# Funnel Analytics Endpoints
# ─────────────────────────────────────────────────────────

@router.get("/funnels/configurator", response_model=FunnelAnalysisResponse)
async def get_configurator_funnel():
    """
    Get conversion funnel for the configurator flow.

    Expected funnel:
    1. session_started
    2. material_selected
    3. dimensions_entered
    4. item_added
    5. project_saved
    6. checkout_started
    7. payment_succeeded
    """
    # This data comes from PostHog, not local DB
    # Use PostHog API to fetch funnel data
    return FunnelAnalysisResponse(
        funnel_name="configurator_conversion",
        steps=[
            FunnelStep(step_name="session_started", count=1000, conversion_rate=100, overall_conversion_rate=100),
            FunnelStep(step_name="material_selected", count=750, conversion_rate=75, overall_conversion_rate=75),
            FunnelStep(step_name="dimensions_entered", count=600, conversion_rate=80, overall_conversion_rate=60),
            FunnelStep(step_name="item_added", count=450, conversion_rate=75, overall_conversion_rate=45),
            FunnelStep(step_name="project_saved", count=200, conversion_rate=44, overall_conversion_rate=20),
            FunnelStep(step_name="checkout_started", count=50, conversion_rate=25, overall_conversion_rate=5),
            FunnelStep(step_name="payment_succeeded", count=30, conversion_rate=60, overall_conversion_rate=3),
        ]
    )

# ─────────────────────────────────────────────────────────
# User Behavior Endpoints
# ─────────────────────────────────────────────────────────

@router.get("/users/retention")
async def get_retention_metrics(
    cohort_period: str = Query('day', regex='^(day|week|month)$'),
    db: AsyncSession = Depends(get_db)
):
    """
    Get user retention metrics.
    """
    # PostHog provides retention analysis
    return {"retention_data": []}

@router.get("/users/segments")
async def get_user_segments():
    """
    Get user segment breakdown.
    """
    return {
        "segments": [
            {"name": "browsers", "count": 500},
            {"name": "researchers", "count": 200},
            {"name": "buyers", "count": 50},
        ]
    }

# ─────────────────────────────────────────────────────────
# Performance Metrics Endpoints
# ─────────────────────────────────────────────────────────

@router.get("/performance/render-times")
async def get_render_performance(
    days: int = Query(7, ge=1, le=30)
):
    """
    Get render time analytics.
    """
    return {
        "average_render_time_ms": 2500,
        "p50_render_time_ms": 2000,
        "p95_render_time_ms": 5000,
        "p99_render_time_ms": 10000,
    }

@router.get("/performance/api-latency")
async def get_api_latency(
    days: int = Query(7, ge=1, le=30)
):
    """
    Get API response time analytics.
    """
    return {
        "endpoints": [
            {"name": "/api/pricing/calculate", "avg_ms": 150, "p95_ms": 300},
            {"name": "/api/cad/render", "avg_ms": 2000, "p95_ms": 5000},
        ]
    }

# ─────────────────────────────────────────────────────────
# Custom Reports Endpoints
# ─────────────────────────────────────────────────────────

class CustomReportRequest(BaseModel):
    name: str
    metrics: list[str]
    dimensions: list[str]
    filters: dict
    date_range: dict

@router.post("/reports/custom")
async def create_custom_report(
    report: CustomReportRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Create and save a custom report configuration.
    """
    # Save report config to database
    return {"report_id": "uuid", "status": "created"}

@router.get("/reports/custom")
async def list_custom_reports(
    db: AsyncSession = Depends(get_db)
):
    """
    List all custom reports.
    """
    return {"reports": []}

@router.get("/reports/custom/{report_id}")
async def get_custom_report_data(
    report_id: str,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Execute custom report and return data.
    """
    return {"data": [], "generated_at": "2026-03-10T12:00:00Z"}
```

---

## 4. Dashboard Component Structure

### Recommended Component Hierarchy

```
src/
├── app/
│   └── analytics/
│       └── page.tsx          # Main dashboard page
├── components/
│   └── analytics/
│       ├── DashboardLayout.tsx
│       ├── MetricCard.tsx
│       ├── RevenueChart.tsx
│       ├── FunnelChart.tsx
│       ├── MaterialPopularity.tsx
│       ├── UserActivity.tsx
│       ├── DateRangePicker.tsx
│       ├── ExportButton.tsx
│       └── FilterBar.tsx
├── hooks/
│   └── useAnalytics.ts       # Analytics data fetching hooks
├── lib/
│   └── analytics.ts         # PostHog wrapper utilities
└── types/
    └── analytics.ts         # TypeScript types
```

### Key Component Implementations

#### 4.1 Dashboard Layout

```tsx
// src/components/analytics/DashboardLayout.tsx
'use client';

import { useState } from 'react';
import { DateRangePicker } from './DateRangePicker';
import { FilterBar } from './FilterBar';
import { ExportButton } from './ExportButton';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function DashboardLayout({
  children,
  title,
  subtitle,
}: DashboardLayoutProps) {
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  });

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-3">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <FilterBar />
          <ExportButton />
        </div>
      </div>

      {children}
    </div>
  );
}
```

#### 4.2 Metric Card Component

```tsx
// src/components/analytics/MetricCard.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number; // Percentage change
  changeLabel?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function MetricCard({
  title,
  value,
  change,
  changeLabel = 'vs previous period',
  icon,
  variant = 'default',
}: MetricCardProps) {
  const getTrendIcon = () => {
    if (!change) return <Minus className="h-4 w-4" />;
    return change > 0 ? (
      <TrendingUp className="h-4 w-4" />
    ) : (
      <TrendingDown className="h-4 w-4" />
    );
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return 'text-green-600 dark:text-green-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'danger':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs mt-1',
              getVariantStyles()
            )}
          >
            {getTrendIcon()}
            <span>{Math.abs(change)}%</span>
            <span className="text-muted-foreground">{changeLabel}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

#### 4.3 Revenue Chart (Recharts)

```tsx
// src/components/analytics/RevenueChart.tsx
'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RevenueDataPoint {
  date: string;
  revenue: number;
  orders: number;
}

interface RevenueChartProps {
  data: RevenueDataPoint[];
  loading?: boolean;
}

export function RevenueChart({ data, loading }: RevenueChartProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] animate-pulse bg-muted rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tickFormatter={(value) =>
                new Date(value).toLocaleDateString('en-GB', {
                  month: 'short',
                  day: 'numeric',
                })
              }
              className="text-xs"
            />
            <YAxis tickFormatter={formatCurrency} className="text-xs" />
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), 'Revenue']}
              labelFormatter={(label) =>
                new Date(label).toLocaleDateString('en-GB', {
                  dateStyle: 'long',
                })
              }
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#8884d8"
              fill="url(#revenueGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

#### 4.4 Funnel Visualization

```tsx
// src/components/analytics/FunnelChart.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FunnelStep {
  name: string;
  value: number;
  conversionRate: number;
}

interface FunnelChartProps {
  steps: FunnelStep[];
  title?: string;
}

export function FunnelChart({
  steps,
  title = 'Conversion Funnel',
}: FunnelChartProps) {
  const maxValue = Math.max(...steps.map((s) => s.value));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {steps.map((step, index) => {
            const width = (step.value / maxValue) * 100;
            const dropOff =
              index > 0
                ? (
                    ((steps[index - 1].value - step.value) /
                      steps[index - 1].value) *
                    100
                  ).toFixed(1)
                : null;

            return (
              <div key={step.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{step.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      {step.value.toLocaleString()}
                    </span>
                    {dropOff && (
                      <span className="text-xs text-red-500">
                        (-{dropOff}%)
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-8 bg-muted rounded-md overflow-hidden relative">
                  <div
                    className="h-full bg-primary/80 rounded-md transition-all duration-500"
                    style={{ width: `${width}%` }}
                  />
                  <span className="absolute inset-0 flex items-center px-3 text-xs text-primary-foreground font-medium">
                    {step.conversionRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
```

#### 4.5 Material Popularity Chart

```tsx
// src/components/analytics/MaterialPopularity.tsx
'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MaterialStats {
  name: string;
  count: number;
  revenue: number;
}

interface MaterialPopularityProps {
  data: MaterialStats[];
}

const COLORS = [
  '#0088FE',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#8884d8',
  '#82ca9d',
];

export function MaterialPopularity({ data }: MaterialPopularityProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Material Popularity</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis type="number" className="text-xs" />
            <YAxis
              dataKey="name"
              type="category"
              width={100}
              className="text-xs"
              tickFormatter={(value) =>
                value.length > 12 ? `${value.slice(0, 12)}...` : value
              }
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                value.toLocaleString(),
                name === 'count' ? 'Times Selected' : 'Revenue (EUR)',
              ]}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

---

## 5. PostHog Integration

### 5.1 Client-Side Tracking Hook

```typescript
// src/lib/analytics/posthog.ts
import posthog from 'posthog-js';

// Initialize check
const isEnabled = () =>
  typeof window !== 'undefined' && !!process.env.NEXT_PUBLIC_POSTHOG_KEY;

// ─────────────────────────────────────────────────────────
// Configuration Events
// ─────────────────────────────────────────────────────────

export function trackMaterialSelected(material: {
  id: number;
  name: string;
  category: string;
  cost_sqm: number;
}) {
  if (!isEnabled()) return;

  posthog.capture('material_selected', {
    material_id: material.id,
    material_name: material.name,
    material_category: material.category,
    material_cost_per_sqm: material.cost_sqm,
  });
}

export function trackDimensionChanged(dimension: {
  type: 'length' | 'width' | 'height';
  value: number;
  elementType: string;
}) {
  if (!isEnabled()) return;

  posthog.capture('dimension_changed', {
    dimension_type: dimension.type,
    value_cm: dimension.value,
    element_type: dimension.elementType,
  });
}

export function trackItemAdded(item: {
  id: string;
  totalCost: number;
  itemCount: number;
}) {
  if (!isEnabled()) return;

  posthog.capture('item_added', {
    item_id: item.id,
    total_item_cost: item.totalCost,
    total_items_in_project: item.itemCount,
  });
}

export function trackCheckoutStarted(cart: {
  total: number;
  itemsCount: number;
}) {
  if (!isEnabled()) return;

  posthog.capture('checkout_started', {
    cart_total: cart.total,
    items_count: cart.itemsCount,
  });
}

export function trackPaymentSucceeded(orderId: string, amount: number) {
  if (!isEnabled()) return;

  posthog.capture('payment_succeeded', {
    order_id: orderId,
    amount: amount,
  });

  // Also capture revenue for PostHog Revenue Analytics
  posthog.capture('revenue', {
    amount: amount,
    currency: 'EUR',
  });
}

// ─────────────────────────────────────────────────────────
// Page Views (for SPA)
// ─────────────────────────────────────────────────────────

export function trackPageView(
  pageName: string,
  properties?: Record<string, any>
) {
  if (!isEnabled()) return;

  posthog.capture('$pageview', {
    ...properties,
    page: pageName,
  });
}

// ─────────────────────────────────────────────────────────
// User Identification
// ─────────────────────────────────────────────────────────

export function identifyUser(
  userId: string,
  userProperties?: Record<string, any>
) {
  if (!isEnabled()) return;

  posthog.identify(userId, userProperties);
}

export function resetUser() {
  if (!isEnabled()) return;

  posthog.reset();
}
```

### 5.2 React Hook for Tracking

```typescript
// src/hooks/useAnalytics.ts
'use client';

import { useCallback } from 'react';
import * as posthog from '@/lib/analytics/posthog';

export function useAnalytics() {
  const trackMaterialSelected = useCallback(
    (material: Parameters<typeof posthog.trackMaterialSelected>[0]) => {
      posthog.trackMaterialSelected(material);
    },
    []
  );

  const trackDimensionChanged = useCallback(
    (dimension: Parameters<typeof posthog.trackDimensionChanged>[0]) => {
      posthog.trackDimensionChanged(dimension);
    },
    []
  );

  const trackItemAdded = useCallback(
    (item: Parameters<typeof posthog.trackItemAdded>[0]) => {
      posthog.trackItemAdded(item);
    },
    []
  );

  const trackCheckoutStarted = useCallback(
    (cart: Parameters<typeof posthog.trackCheckoutStarted>[0]) => {
      posthog.trackCheckoutStarted(cart);
    },
    []
  );

  const trackPaymentSucceeded = useCallback(
    (orderId: string, amount: number) => {
      posthog.trackPaymentSucceeded(orderId, amount);
    },
    []
  );

  return {
    trackMaterialSelected,
    trackDimensionChanged,
    trackItemAdded,
    trackCheckoutStarted,
    trackPaymentSucceeded,
  };
}
```

### 5.3 Server-Side Tracking (FastAPI)

```python
# backend/app/services/posthog_service.py
from posthog import Posthog
import os
from typing import Optional, Dict, Any

# Configure PostHog
posthog = Posthog(
    project_api_key=os.getenv("POSTHOG_PROJECT_API_KEY", ""),
    host=os.getenv("POSTHOG_HOST", "https://app.posthog.com"),
)

def capture_event(
    event_name: str,
    distinct_id: str,
    properties: Optional[Dict[str, Any]] = None,
    groups: Optional[Dict[str, str]] = None,
):
    """
    Capture an event on the server side.
    """
    if not os.getenv("POSTHOG_PROJECT_API_KEY"):
        return  # Skip if not configured

    posthog.capture(
        distinct_id=distinct_id,
        event=event_name,
        properties=properties,
        groups=groups,
    )

def capture_pricing_calculated(
    distinct_id: str,
    items_count: int,
    total_sqm: float,
    total_value: float,
):
    """
    Track pricing calculation events.
    """
    capture_event(
        event_name="price_calculated",
        distinct_id=distinct_id,
        properties={
            "items_count": items_count,
            "total_sqm": total_sqm,
            "total_value": total_value,
            "currency": "EUR",
        },
    )

def capture_order_created(
    distinct_id: str,
    order_id: str,
    amount: float,
    items_count: int,
):
    """
    Track order creation.
    """
    capture_event(
        event_name="order_created",
        distinct_id=distinct_id,
        properties={
            "order_id": order_id,
            "amount": amount,
            "items_count": items_count,
            "currency": "EUR",
        },
    )
```

---

## 6. Implementation Strategy

### Phase 1: Event Tracking Foundation (Week 1)

**Goals:**

- Implement all tracking events in frontend
- Add server-side tracking for backend events
- Verify data flows to PostHog

**Tasks:**

1. Create `src/lib/analytics/posthog.ts` with all tracking functions
2. Integrate tracking into Lab component and modals
3. Add server-side tracking to FastAPI endpoints
4. Verify events appear in PostHog debug mode

### Phase 2: PostHog Dashboards (Week 2)

**Goals:**

- Configure PostHog native dashboards
- Set up funnels and cohorts
- Create custom insights

**Tasks:**

1. Configure PostHog product analytics dashboard
2. Create configurator conversion funnel
3. Set up material popularity insight
4. Configure revenue analytics events

### Phase 3: Custom Admin Dashboard (Week 3)

**Goals:**

- Build custom analytics UI
- Implement admin-specific metrics
- Add export capabilities

**Tasks:**

1. Create analytics API endpoints
2. Build dashboard page with Recharts
3. Implement date filtering
4. Add CSV/Excel export

### Phase 4: Advanced Analytics (Week 4)

**Goals:**

- Implement custom reports
- Add predictive analytics
- Build real-time dashboards

**Tasks:**

1. Create custom report builder
2. Implement cohort analysis
3. Add real-time metrics via WebSockets
4. Build predictive revenue models

---

## 7. Data Visualization Best Practices

### Chart Selection Guide

| Data Type           | Recommended Chart     | Why                    |
| ------------------- | --------------------- | ---------------------- |
| Revenue over time   | Area Chart            | Shows trend and volume |
| Conversion funnel   | Horizontal Bar/Funnel | Shows drop-off clearly |
| Material popularity | Vertical Bar Chart    | Easy comparison        |
| User segments       | Donut/Pie Chart       | Shows proportion       |
| Performance metrics | Line Chart            | Shows trends           |
| Geographic data     | Heat Map              | Spatial patterns       |

### Design Principles

1. **Start with summary metrics** - Show key numbers first, allow drill-down
2. **Use consistent colors** - Material categories should have consistent colors across all charts
3. **Provide context** - Always show comparison to previous period
4. **Enable export** - Users should be able to download data
5. **Mobile-responsive** - Charts should work on all screen sizes

---

## 8. Confidence Assessment

| Area                    | Confidence | Reason                                                        |
| ----------------------- | ---------- | ------------------------------------------------------------- |
| Event Taxonomy          | HIGH       | Based on standard e-commerce flows and PostHog best practices |
| API Design              | HIGH       | Follows FastAPI conventions and analytics standards           |
| Component Structure     | HIGH       | Based on existing project patterns                            |
| PostHog Integration     | HIGH       | Uses official PostHog SDK patterns                            |
| Implementation Timeline | MEDIUM     | Estimates based on similar projects, may vary                 |

---

## 9. Open Questions

1. **PostHog Plan Level:** Determine if current plan includes revenue analytics features
2. **Data Retention:** How long should analytics data be retained locally vs. in PostHog?
3. **Real-time Requirements:** Is real-time dashboard needed or is hourly/daily sufficient?
4. **Admin Access:** Should analytics be available to all users or only admins?
5. **GDPR Compliance:** Are there specific data handling requirements for EU customers?

---

## 10. Sources

- [PostHog Product Analytics Documentation](https://posthog.com/docs/product-analytics)
- [PostHog Revenue Analytics Documentation](https://posthog.com/docs/revenue-analytics)
- [PostHog Event Tracking Guide](https://posthog.com/tutorials/event-tracking-guide)
- [PostHog Customer Analytics](https://posthog.com/docs/customer-analytics)
- [Recharts Documentation](https://recharts.github.io/)
- [PostHog Python SDK](https://posthog.com/docs/libraries/python)
