# Research: Admin Dashboard Implementation for Stone Slab Configurator

**Project:** Stone Slab Configurator Admin Dashboard  
**Researched:** March 10, 2026  
**Domain:** Admin Dashboard Implementation  
**Overall Confidence:** HIGH

## Executive Summary

This research covers the implementation of an admin dashboard for a Next.js + FastAPI stone slab configurator. The application already uses **Next.js 16.1.6**, **shadcn/ui**, **Recharts**, and **Supabase Auth**, providing a solid foundation for building admin features. The key recommendations include leveraging the existing shadcn/ui component library for the admin interface, implementing database-level RBAC with SQLite, creating dedicated admin API routes in FastAPI with role-based authorization, and establishing comprehensive audit logging for all admin actions.

The backend already has OrderDB and UserProfileDB models, which can be extended with role fields. The frontend has all necessary UI components (tables, forms, charts, dialogs) already installed via shadcn/ui. Implementation can proceed without additional major dependencies.

## Key Findings

**Technology Stack:** Leverage existing shadcn/ui components (table, dialog, form, select, cards) plus Recharts for analytics. No new UI dependencies required.

**Database Schema:** Extend existing UserProfileDB with role field, create AdminAuditLog table for tracking admin actions, and add indexes for order queries.

**API Security:** Create /api/admin/ endpoints with dependency injection for role verification. Use FastAPI's Security() with custom role-based dependencies.

**Frontend Structure:** Create /app/admin/ route group with nested layouts for dashboard, users, orders, materials, and analytics pages.

## 1. Recommended Technology Stack

### Core Technologies (Already Available)

| Technology    | Version | Purpose                | Status             |
| ------------- | ------- | ---------------------- | ------------------ |
| Next.js       | 16.1.6  | Frontend framework     | Already installed  |
| shadcn/ui     | Latest  | UI component library   | Already configured |
| Radix UI      | Latest  | Headless UI primitives | Already installed  |
| Recharts      | 2.15.4  | Charting library       | Already installed  |
| Tailwind CSS  | 3.4.19  | Styling                | Already configured |
| Supabase Auth | 2.98.0  | Authentication         | Already integrated |
| Zustand       | 5.0.11  | State management       | Already installed  |

### New Dependencies Required

| Package               | Version        | Purpose           | Justification                                   |
| --------------------- | -------------- | ----------------- | ----------------------------------------------- |
| @tanstack/react-query | ^5.60 fetching | .0                | Data Recommended for admin data management      |
| react-hook-form       | 7.71.2         | Form handling     | Already installed, use for admin forms          |
| zod                   | 3.25.76        | Schema validation | Already installed, use for admin API validation |

### Backend Dependencies

| Package     | Version | Purpose          | Justification              |
| ----------- | ------- | ---------------- | -------------------------- |
| python-jose | Latest  | JWT handling     | For admin token validation |
| passlib     | Latest  | Password hashing | For admin user management  |

## 2. Database Schema Additions

### Extended User Profile with Roles

```python
# backend/app/models/domain.py additions

from sqlalchemy import Column, Integer, String, Numeric, DateTime, func, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.services.database import Base
import enum

class UserRole(enum.Enum):
    CUSTOMER = "customer"
    STAFF = "staff"
    MANAGER = "manager"
    ADMIN = "admin"
    SUPERADMIN = "superadmin"

class UserProfileDB(Base):
    __tablename__ = "user_profiles"

    id = Column(String, primary_key=True)  # Matches auth.users UUID
    full_name = Column(String, nullable=True)
    phone_number = Column(String, nullable=True)
    billing_address = Column(String, nullable=True)
    shipping_address = Column(String, nullable=True)
    role = Column(String, nullable=False, default=UserRole.CUSTOMER.value)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())
```

### Admin Audit Log

```python
class AdminAuditLogDB(Base):
    __tablename__ = "admin_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(String, nullable=False)  # Admin user who performed action
    action = Column(String, nullable=False)  # CREATE, UPDATE, DELETE, VIEW, etc.
    resource_type = Column(String, nullable=False)  # user, order, material, etc.
    resource_id = Column(String, nullable=True)
    old_value = Column(Text, nullable=True)  # JSON string of old values
    new_value = Column(Text, nullable=True)  # JSON string of new values
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    request_id = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

### Extended Order Status Tracking

```python
# Add to existing OrderDB
class OrderDB(Base):
    __tablename__ = "orders"

    id = Column(String, primary_key=True, server_default=func.gen_random_uuid())
    user_id = Column(String, nullable=True)
    guest_session_id = Column(String, nullable=True)
    status = Column(String, default='pending_deposit')
    fulfillment_status = Column(String, default='pending')  # pending, processing, shipped, delivered
    assigned_staff_id = Column(String, nullable=True)  # Staff handling the order
    tracking_number = Column(String, nullable=True)
    shipping_carrier = Column(String, nullable=True)
    notes = Column(String, nullable=True)  # Internal admin notes
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())
```

### Material Management Table Extension

```python
class MaterialDB(Base):
    __tablename__ = "materials"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    density = Column(Numeric, nullable=False)
    cost_sqm = Column(Numeric, nullable=False)
    price_sqm = Column(Numeric, nullable=False)  # Selling price
    texture = Column(String, nullable=False, default="")
    color = Column(String, nullable=False, default="#ffffff")
    roughness_map = Column(String, nullable=True)
    normal_map = Column(String, nullable=True)
    metallic_map = Column(String, nullable=True)
    ambient_occlusion_map = Column(String, nullable=True)
    inventory_count = Column(Integer, default=0)
    low_stock_threshold = Column(Integer, default=5)
    is_active = Column(Boolean, default=True)  # Soft delete
    is_featured = Column(Boolean, default=False)  # Show on homepage
    sku = Column(String, unique=True, nullable=True)
    supplier = Column(String, nullable=True)
    lead_time_days = Column(Integer, default=7)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
```

## 3. API Endpoint Design

### Admin API Routes Structure

```
/api/admin/
├── /auth/
│   ├── GET /me - Get current admin profile
│   └── POST /login - Admin login (if separate from Supabase)
│
├── /users/
│   ├── GET / - List all users (paginated)
│   ├── GET /{user_id} - Get user details
│   ├── POST / - Create new user
│   ├── PUT /{user_id} - Update user
│   ├── DELETE /{user_id} - Soft delete user
│   └── POST /{user_id}/role - Update user role
│
├── /orders/
│   ├── GET / - List all orders (paginated, filterable)
│   ├── GET /{order_id} - Get order details
│   ├── PUT /{order_id} - Update order
│   ├── PUT /{order_id}/status - Update order status
│   ├── PUT /{order_id}/fulfillment - Update fulfillment status
│   └── POST /{order_id}/assign - Assign order to staff
│
├── /materials/
│   ├── GET / - List all materials
│   ├── GET /{material_id} - Get material details
│   ├── POST / - Create new material
│   ├── PUT /{material_id} - Update material
│   ├── DELETE /{material_id} - Soft delete material
│   └── PUT /{material_id}/inventory - Update inventory
│
├── /analytics/
│   ├── GET /revenue - Revenue analytics
│   ├── GET /orders - Order analytics
│   ├── GET /users - User analytics
│   └── GET /materials - Material analytics
│
└── /audit-logs/
    ├── GET / - List audit logs
    └── GET /{log_id} - Get specific log
```

### FastAPI Admin Router Example

```python
# backend/app/api/admin.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.services.database import get_db
from app.models.domain import UserProfileDB, OrderDB, MaterialDB, AdminAuditLogDB, UserRole
from app.api.dependencies import get_current_admin_user

router = APIRouter(prefix="/api/admin", tags=["Admin"])
security = HTTPBearer()

# Pydantic Schemas
class UserResponse(BaseModel):
    id: str
    full_name: Optional[str]
    email: str
    role: str
    is_active: bool
    created_at: datetime

class OrderResponse(BaseModel):
    id: str
    user_id: Optional[str]
    status: str
    fulfillment_status: str
    total_amount: float
    created_at: datetime

class MaterialResponse(BaseModel):
    id: int
    name: str
    cost_sqm: float
    price_sqm: float
    inventory_count: int
    is_active: bool
    sku: Optional[str]

class PaginatedResponse(BaseModel):
    items: List
    total: int
    page: int
    page_size: int

# Role Verification Dependency
async def require_role(required_role: UserRole):
    async def role_checker(
        credentials: HTTPAuthorizationCredentials = Depends(security),
        db: Session = Depends(get_db)
    ):
        # Verify token and get user from Supabase
        user = await get_current_admin_user(credentials.credentials, db)

        user_role = UserRole(user.role)
        role_hierarchy = {
            UserRole.SUPERADMIN: 5,
            UserRole.ADMIN: 4,
            UserRole.MANAGER: 3,
            UserRole.STAFF: 2,
            UserRole.CUSTOMER: 1
        }

        if role_hierarchy.get(user_role, 0) < role_hierarchy[required_role]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return user
    return role_checker

# User Management Endpoints
@router.get("/users", response_model=PaginatedResponse)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    admin = Depends(require_role(UserRole.STAFF))
):
    query = db.query(UserProfileDB)

    if role:
        query = query.filter(UserProfileDB.role == role)
    if is_active is not None:
        query = query.filter(UserProfileDB.is_active == is_active)
    if search:
        query = query.filter(
            UserProfileDB.full_name.ilike(f"%{search}%") |
            UserProfileDB.id.ilike(f"%{search}%")
        )

    total = query.count()
    users = query.offset((page - 1) * page_size).limit(page_size).all()

    return {"items": users, "total": total, "page": page, "page_size": page_size}

@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    new_role: str,
    db: Session = Depends(get_db),
    admin = Depends(require_role(UserRole.MANAGER))
):
    user = db.query(UserProfileDB).filter(UserProfileDB.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    old_role = user.role
    user.role = new_role

    # Audit log
    audit_log = AdminAuditLogDB(
        admin_id=admin.id,
        action="UPDATE",
        resource_type="user_role",
        resource_id=user_id,
        old_value=f'{{"role": "{old_role}"}}',
        new_value=f'{{"role": "{new_role}"}}'
    )
    db.add(audit_log)
    db.commit()

    return {"success": True, "new_role": new_role}

# Order Management Endpoints
@router.get("/orders", response_model=PaginatedResponse)
async def list_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    fulfillment_status: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    db: Session = Depends(get_db),
    admin = Depends(require_role(UserRole.STAFF))
):
    query = db.query(OrderDB)

    if status:
        query = query.filter(OrderDB.status == status)
    if fulfillment_status:
        query = query.filter(OrderDB.fulfillment_status == fulfillment_status)
    if date_from:
        query = query.filter(OrderDB.created_at >= date_from)
    if date_to:
        query = query.filter(OrderDB.created_at <= date_to)

    total = query.count()
    orders = query.order_by(OrderDB.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return {"items": orders, "total": total, "page": page, "page_size": page_size}

@router.put("/orders/{order_id}/status")
async def update_order_status(
    order_id: str,
    status: str,
    notes: Optional[str] = None,
    db: Session = Depends(get_db),
    admin = Depends(require_role(UserRole.STAFF))
):
    order = db.query(OrderDB).filter(OrderDB.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    old_status = order.status
    order.status = status
    if notes:
        order.notes = (order.notes or "") + f"\n[{datetime.now()}] {admin.full_name}: {notes}"

    # Audit log
    audit_log = AdminAuditLogDB(
        admin_id=admin.id,
        action="UPDATE",
        resource_type="order_status",
        resource_id=order_id,
        old_value=f'{{"status": "{old_status}"}}',
        new_value=f'{{"status": "{status}"}}'
    )
    db.add(audit_log)
    db.commit()

    return {"success": True, "status": status}

# Material Management Endpoints
@router.get("/materials")
async def list_materials(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    admin = Depends(require_role(UserRole.STAFF))
):
    query = db.query(MaterialDB)
    if not include_inactive:
        query = query.filter(MaterialDB.is_active == True)
    return query.all()

@router.post("/materials")
async def create_material(
    material: MaterialResponse,
    db: Session = Depends(get_db),
    admin = Depends(require_role(UserRole.MANAGER))
):
    db_material = MaterialDB(**material.dict())
    db.add(db_material)

    # Audit log
    audit_log = AdminAuditLogDB(
        admin_id=admin.id,
        action="CREATE",
        resource_type="material",
        resource_id=str(db_material.id),
        new_value=material.json()
    )
    db.add(audit_log)
    db.commit()

    return db_material

@router.put("/materials/{material_id}/inventory")
async def update_inventory(
    material_id: int,
    inventory_count: int,
    db: Session = Depends(get_db),
    admin = Depends(require_role(UserRole.STAFF))
):
    material = db.query(MaterialDB).filter(MaterialDB.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    old_count = material.inventory_count
    material.inventory_count = inventory_count

    # Audit log
    audit_log = AdminAuditLogDB(
        admin_id=admin.id,
        action="UPDATE",
        resource_type="material_inventory",
        resource_id=str(material_id),
        old_value=f'{{"inventory_count": {old_count}}}',
        new_value=f'{{"inventory_count": {inventory_count}}}'
    )
    db.add(audit_log)
    db.commit()

    return {"success": True, "inventory_count": inventory_count}
```

## 4. Frontend Component Structure

### Route Structure

```
src/app/
├── admin/
│   ├── layout.tsx          # Admin layout with sidebar
│   ├── page.tsx            # Dashboard overview
│   ├── users/
│   │   ├── page.tsx        # User list
│   │   └── [userId]/
│   │       └── page.tsx    # User details/edit
│   ├── orders/
│   │   ├── page.tsx        # Order list
│   │   └── [orderId]/
│   │       └── page.tsx    # Order details
│   ├── materials/
│   │   ├── page.tsx        # Material list
│   │   └── [materialId]/
│   │       └── page.tsx    # Material edit
│   ├── analytics/
│   │   └── page.tsx        # Analytics dashboard
│   └── settings/
│       └── page.tsx        # Admin settings
```

### Admin Layout Component

```tsx
// src/app/admin/layout.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Orders', href: '/admin/orders', icon: ShoppingCart },
  { name: 'Materials', href: '/admin/materials', icon: Package },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (
        !profile ||
        !['admin', 'superadmin', 'manager', 'staff'].includes(profile.role)
      ) {
        router.push('/dashboard');
        return;
      }

      setUserRole(profile.role);
    };

    checkAdmin();
  }, [supabase, router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (!userRole) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0">
        <div className="flex flex-col flex-grow bg-white dark:bg-gray-800 border-r">
          <div className="flex items-center h-16 px-4 border-b">
            <h1 className="text-xl font-bold">Admin Panel</h1>
          </div>
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/admin' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center px-4 py-2 text-sm font-medium rounded-md',
                    isActive
                      ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white'
                      : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                  )}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className="p-4 border-t">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={handleSignOut}
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild className="lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="fixed top-4 left-4 z-50"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex flex-col h-full">
            <div className="flex items-center h-16 px-4 border-b">
              <h1 className="text-xl font-bold">Admin Panel</h1>
            </div>
            <nav className="flex-1 px-2 py-4 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center px-4 py-2 text-sm font-medium rounded-md',
                      isActive
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:bg-gray-50'
                    )}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex-1 lg:pl-64">
        <div className="py-6">
          <div className="px-4 sm:px-6 lg:px-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
```

### Dashboard Overview Page

```tsx
// src/app/admin/page.tsx
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Users,
  ShoppingCart,
  DollarSign,
  Package,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

const revenueData = [
  { month: 'Jan', revenue: 12500 },
  { month: 'Feb', revenue: 15800 },
  { month: 'Mar', revenue: 18200 },
  { month: 'Apr', revenue: 14500 },
  { month: 'May', revenue: 21000 },
  { month: 'Jun', revenue: 24500 },
];

const ordersByStatus = [
  { status: 'Pending', count: 12 },
  { status: 'Processing', count: 8 },
  { status: 'Shipped', count: 15 },
  { status: 'Delivered', count: 45 },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to the admin panel</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$106,500</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500 flex items-center mt-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                +12.5%
              </span>
              from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">80</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500 flex items-center mt-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                +8.2%
              </span>
              from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">234</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-red-500 flex items-center mt-1">
                <TrendingDown className="h-3 w-3 mr-1" />
                -2.1%
              </span>
              from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Low Stock Items
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">
              Materials below threshold
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
            <CardDescription>
              Monthly revenue for the past 6 months
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary) / 0.2)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Orders by Status</CardTitle>
            <CardDescription>Current order distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ordersByStatus}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis dataKey="status" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar
                    dataKey="count"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

### User Management Page with Table

```tsx
// src/app/admin/users/page.tsx
'use client';

import { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MoreVertical, Plus, Search, Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type User = {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
};

export default function UsersPage() {
  const supabase = createClientComponentClient();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  useEffect(() => {
    fetchUsers();
  }, [search, roleFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    let query = supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,id.ilike.%${search}%`);
    }
    if (roleFilter !== 'all') {
      query = query.eq('role', roleFilter);
    }

    const { data, error } = await query;

    if (!error && data) {
      setUsers(data);
    }
    setLoading(false);
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from('user_profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (!error) {
      fetchUsers();
    }
  };

  const toggleUserActive = async (userId: string, isActive: boolean) => {
    const { error } = await supabase
      .from('user_profiles')
      .update({ is_active: !isActive })
      .eq('id', userId);

    if (!error) {
      fetchUsers();
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
      case 'superadmin':
        return 'destructive';
      case 'manager':
        return 'default';
      case 'staff':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Users</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="customer">Customer</SelectItem>
            <SelectItem value="staff">Staff</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.full_name || 'N/A'}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? 'default' : 'secondary'}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            toggleUserActive(user.id, user.is_active)
                          }
                        >
                          {user.is_active ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => updateUserRole(user.id, 'admin')}
                          disabled={user.role === 'admin'}
                        >
                          Make Admin
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => updateUserRole(user.id, 'manager')}
                          disabled={user.role === 'manager'}
                        >
                          Make Manager
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

## 5. Security Implementation (RBAC)

### Role Hierarchy

| Role           | Permissions                                                                          |
| -------------- | ------------------------------------------------------------------------------------ |
| **SUPERADMIN** | Full system access, can manage other admins, access audit logs, system configuration |
| **ADMIN**      | Full access to all admin features, can manage users and roles                        |
| **MANAGER**    | Can manage orders, materials, view analytics, limited user management                |
| **STAFF**      | Can view and update orders, view materials, limited analytics                        |
| **CUSTOMER**   | Regular user access, no admin panel access                                           |

### FastAPI Security Dependencies

```python
# backend/app/api/dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from typing import Optional
import os

from app.services.database import get_db
from app.models.domain import UserProfileDB, UserRole

security = HTTPBearer()

# Get from environment
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "your-secret-here")
ALGORITHM = "HS256"

async def get_current_admin_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> UserProfileDB:
    """Verify the user is authenticated and has admin role."""
    token = credentials.credentials

    try:
        # Decode Supabase JWT
        payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=[ALGORITHM])
        user_id = payload.get("sub")

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials"
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )

    # Get user from database
    user = db.query(UserProfileDB).filter(UserProfileDB.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )

    # Check if user has admin role
    if user.role not in ["admin", "superadmin", "manager", "staff"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    return user

def check_permission(user: UserProfileDB, required_roles: list[UserRole]) -> bool:
    """Check if user has one of the required roles."""
    user_role = UserRole(user.role)
    return user_role in required_roles
```

### Frontend Route Protection

```tsx
// src/components/admin-route-guard.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const ADMIN_ROLES = ['admin', 'superadmin', 'manager', 'staff'];

export function useAdminGuard() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const checkAdmin = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return false;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || !ADMIN_ROLES.includes(profile.role)) {
        router.push('/dashboard');
        return false;
      }

      return true;
    };

    checkAdmin();
  }, [supabase, router]);
}
```

## 6. Audit Logging Implementation

### Backend Audit Log Service

```python
# backend/app/services/audit_service.py
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional, Any, Dict
import json
import logging

from app.models.domain import AdminAuditLogDB

logger = logging.getLogger(__name__)

class AuditService:
    """Service for creating and managing audit logs."""

    @staticmethod
    def log_action(
        db: Session,
        admin_id: str,
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        old_value: Optional[Dict[str, Any]] = None,
        new_value: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_id: Optional[str] = None
    ) -> AdminAuditLogDB:
        """Create an audit log entry."""

        log_entry = AdminAuditLogDB(
            admin_id=admin_id,
            action=action.upper(),
            resource_type=resource_type,
            resource_id=resource_id,
            old_value=json.dumps(old_value) if old_value else None,
            new_value=json.dumps(new_value) if new_value else None,
            ip_address=ip_address,
            user_agent=user_agent,
            request_id=request_id
        )

        db.add(log_entry)

        try:
            db.commit()
            logger.info(f"Audit log created: {action} on {resource_type}/{resource_id}")
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to create audit log: {e}")

        return log_entry

    @staticmethod
    def get_logs(
        db: Session,
        admin_id: Optional[str] = None,
        action: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        limit: int = 100,
        offset: int = 0
    ) -> tuple[list[AdminAuditLogDB], int]:
        """Retrieve audit logs with filters."""

        query = db.query(AdminAuditLogDB)

        if admin_id:
            query = query.filter(AdminAuditLogDB.admin_id == admin_id)
        if action:
            query = query.filter(AdminAuditLogDB.action == action.upper())
        if resource_type:
            query = query.filter(AdminAuditLogDB.resource_type == resource_type)
        if resource_id:
            query = query.filter(AdminAuditLogDB.resource_id == resource_id)
        if date_from:
            query = query.filter(AdminAuditLogDB.created_at >= date_from)
        if date_to:
            query = query.filter(AdminAuditLogDB.created_at <= date_to)

        total = query.count()
        logs = query.order_by(
            AdminAuditLogDB.created_at.desc()
        ).offset(offset).limit(limit).all()

        return logs, total

# Audit log action types
class AuditAction:
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    VIEW = "VIEW"
    LOGIN = "LOGIN"
    LOGOUT = "LOGOUT"
    EXPORT = "EXPORT"
    IMPORT = "IMPORT"

# Resource types
class ResourceType:
    USER = "user"
    USER_ROLE = "user_role"
    ORDER = "order"
    ORDER_STATUS = "order_status"
    MATERIAL = "material"
    MATERIAL_INVENTORY = "material_inventory"
    ANALYTICS = "analytics"
    SETTINGS = "settings"
```

### Middleware for Auto-Logging

```python
# backend/app/middleware/audit_middleware.py
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from app.services.audit_service import AuditService, AuditAction, ResourceType

class AuditMiddleware(BaseHTTPMiddleware):
    """Middleware to automatically log admin API requests."""

    # Routes to audit (admin endpoints)
    AUDITED_PATHS = ["/api/admin"]

    async def dispatch(self, request: Request, call_next):
        # Skip if not an admin endpoint
        if not any(request.url.path.startswith(path) for path in self.AUDITED_PATHS):
            return await call_next(request)

        response = await call_next(request)

        # Only log write operations
        if request.method in ["POST", "PUT", "PATCH", "DELETE"]:
            # Get admin user from request state (set by auth dependency)
            admin_id = getattr(request.state, "admin_id", None)

            if admin_id:
                # Determine action type
                action = AuditAction.VIEW  # default
                if request.method == "POST":
                    action = AuditAction.CREATE
                elif request.method == "PUT":
                    action = AuditAction.UPDATE
                elif request.method == "PATCH":
                    action = AuditAction.UPDATE
                elif request.method == "DELETE":
                    action = AuditAction.DELETE

                # Extract resource info from path
                path_parts = request.url.path.split("/")
                resource_type = path_parts[3] if len(path_parts) > 3 else "unknown"
                resource_id = path_parts[4] if len(path_parts) > 4 else None

                # Log asynchronously to not block response
                # Note: In production, use a background task
                # For now, we'll skip async logging

        return response
```

## 7. Analytics Implementation

### Revenue Analytics Endpoint

```python
# backend/app/api/admin_analytics.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel

from app.services.database import get_db
from app.models.domain import OrderDB, UserProfileDB, MaterialDB, AdminAuditLogDB
from app.api.dependencies import get_current_admin_user
from app.api.admin import require_role
from app.models.domain import UserRole

router = APIRouter(prefix="/api/admin/analytics", tags=["Admin Analytics"])

class RevenueData(BaseModel):
    period: str
    revenue: float
    orders: int

class OrderStatusData(BaseModel):
    status: str
    count: int

class TopMaterial(BaseModel):
    material_id: int
    material_name: str
    count: int
    revenue: float

@router.get("/revenue")
async def get_revenue_analytics(
    period: str = Query("month", regex="^(day|week|month|year)$"),
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    db: Session = Depends(get_db),
    admin = Depends(require_role(UserRole.STAFF))
):
    """Get revenue analytics."""

    if not date_to:
        date_to = datetime.now()
    if not date_from:
        date_from = date_to - timedelta(days=30)

    # Query orders in date range
    orders = db.query(
        func.date(OrderDB.created_at).label("date"),
        func.sum(OrderDB.total_amount).label("revenue"),
        func.count(OrderDB.id).label("orders")
    ).filter(
        OrderDB.created_at >= date_from,
        OrderDB.created_at <= date_to
    ).group_by("date").all()

    return {
        "total_revenue": sum(o.revenue for o in orders),
        "total_orders": sum(o.orders for o in orders),
        "average_order_value": sum(o.revenue for o in orders) / sum(o.orders for o in orders) if orders else 0,
        "chart_data": [
            {"date": str(o.date), "revenue": float(o.revenue), "orders": o.orders}
            for o in orders
        ]
    }

@router.get("/orders")
async def get_order_analytics(
    db: Session = Depends(get_db),
    admin = Depends(require_role(UserRole.STAFF))
):
    """Get order status distribution."""

    status_counts = db.query(
        OrderDB.status,
        func.count(OrderDB.id).label("count")
    ).group_by(OrderDB.status).all()

    fulfillment_counts = db.query(
        OrderDB.fulfillment_status,
        func.count(OrderDB.id).label("count")
    ).group_by(OrderDB.fulfillment_status).all()

    return {
        "by_status": [{"status": s.status, "count": s.count} for s in status_counts],
        "by_fulfillment": [{"status": s.fulfillment_status, "count": s.count} for s in fulfillment_counts]
    }

@router.get("/users")
async def get_user_analytics(
    db: Session = Depends(get_db),
    admin = Depends(require_role(UserRole.STAFF))
):
    """Get user analytics."""

    total_users = db.query(UserProfileDB).count()
    active_users = db.query(UserProfileDB).filter(UserProfileDB.is_active == True).count()

    role_counts = db.query(
        UserProfileDB.role,
        func.count(UserProfileDB.id).label("count")
    ).group_by(UserProfileDB.role).all()

    # New users in last 30 days
    thirty_days_ago = datetime.now() - timedelta(days=30)
    new_users = db.query(UserProfileDB).filter(
        UserProfileDB.created_at >= thirty_days_ago
    ).count()

    return {
        "total_users": total_users,
        "active_users": active_users,
        "new_users_last_30_days": new_users,
        "by_role": [{"role": r.role, "count": r.count} for r in role_counts]
    }
```

## 8. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

- Add role field to UserProfileDB
- Create AdminAuditLogDB table
- Set up FastAPI admin router with authentication
- Create admin layout and basic routing
- Implement role-based route protection

### Phase 2: User Management (Week 2-3)

- Build user list page with filtering/search
- Create user edit dialog
- Implement role change functionality
- Add user activity toggle (active/inactive)

### Phase 3: Order Management (Week 3-4)

- Build order list with status filters
- Create order detail page
- Implement order status updates
- Add fulfillment tracking
- Create internal notes system

### Phase 4: Material Management (Week 4-5)

- Build material CRUD operations
- Add inventory management
- Implement pricing updates
- Add material activation toggle

### Phase 5: Analytics & Reporting (Week 5-6)

- Implement revenue charts
- Build order analytics
- Create user analytics dashboard
- Add export functionality (CSV/PDF)

### Phase 6: Audit & Security (Week 6-7)

- Implement comprehensive audit logging
- Add audit log viewer for admins
- Set up automated reports
- Security hardening

## 9. Sources

| Source                    | Type          | Confidence | Relevance        |
| ------------------------- | ------------- | ---------- | ---------------- |
| shadcn/ui Dashboard       | Official Docs | HIGH       | UI components    |
| FastAPI Security Tutorial | Official Docs | HIGH       | API security     |
| PostgreSQL Row Security   | Official Docs | HIGH       | Database RBAC    |
| Next.js App Router        | Official Docs | HIGH       | Frontend routing |
| Recharts Documentation    | Official Docs | HIGH       | Charting         |
| Supabase Auth             | Official Docs | HIGH       | Authentication   |

## Confidence Assessment

| Area         | Confidence | Reason                                |
| ------------ | ---------- | ------------------------------------- |
| Stack        | HIGH       | Using existing, proven technologies   |
| Features     | HIGH       | Standard admin dashboard features     |
| Architecture | HIGH       | Well-established patterns             |
| Security     | HIGH       | Industry-standard RBAC implementation |
| Pitfalls     | MEDIUM     | Some edge cases may require iteration |

## Gaps to Address

- **Payment Integration**: Need to integrate with Stripe webhooks for order payment status updates
- **Email Notifications**: Admin actions may need email notifications (order updates, low stock)
- **Multi-tenancy**: If the system needs to support multiple organizations, additional work needed
- **Real-time Updates**: Consider WebSocket support for order status changes
