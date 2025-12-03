# Multi-Tenant Migration Guide

## Overview
This document describes the remaining steps to complete the multi-tenant architecture implementation for Fruitland.

## Completed Work

### 1. Database Schema ✅
- Created `Tenant` model with id, name, slug, domain
- Added `tenantId` (nullable) to `User` model
- Added `SUPERADMIN` role support
- Added `tenantId` to all tenant-scoped models:
  - Product, Order, Subscription, SubscriptionPackage
  - Warehouse, ProductStock, Review
  - LoyaltyTransaction, Config, AnalyticsCache
  - InventoryForecast
- Added comprehensive indexes for multi-tenant performance

### 2. Authentication & Authorization ✅
- Updated NextAuth types to include `tenantId` and `activeTenantId`
- Modified auth callbacks to include tenant information in session
- Created tenant utility functions (`getActiveTenantId`, `isSuperAdmin`, etc.)

### 3. Middleware ✅
- Implemented tenant isolation middleware
- Added role-based routing (SUPERADMIN → /superadmin, ADMIN → /admin)
- Enforced tenant selection for SUPERADMIN accessing admin routes

### 4. API Routes (Partial) ✅
- `/api/superadmin/tenants` - List and create tenants
- `/api/superadmin/analytics` - Global analytics
- `/api/tenant/set-active` - Set active tenant for SUPERADMIN
- `/api/products` - Tenant-filtered product listing
- `/api/admin/products` - Tenant-aware product creation
- `/api/admin/orders` - Tenant-filtered order listing
- `/api/admin/config` - Tenant-aware configuration

### 5. SUPERADMIN Dashboard ✅
- Created `/superadmin` route with layout
- Global analytics dashboard
- Tenant management page with creation form
- Tenant selector component for admin UI

## Remaining Work

### 1. Database Migration 🔴 REQUIRED
**File**: Generate Prisma migration

```bash
# When you have a database configured:
npx prisma migrate dev --name add_multi_tenant_architecture
npx prisma db seed
```

**Important**: Existing data will need `tenantId` populated. The seed file creates a default tenant.

### 2. API Routes Needing Updates 🔴 REQUIRED

The following API routes need tenant filtering added:

#### Subscription Routes
- `/api/admin/subscriptions/route.ts`
- `/api/subscriptions/route.ts`
- Add `where: { tenantId }` to all queries

#### Warehouse & Inventory Routes  
- `/api/admin/warehouses/route.ts`
- `/api/admin/inventory-warehouse/route.ts`
- `/api/admin/forecasting/route.ts` - Add tenantId to InventoryForecast creates

#### Review Routes
- `/api/admin/reviews/route.ts`
- `/api/products/[id]/reviews/route.ts`
- Add `where: { tenantId }` filters

#### Loyalty Routes
- `/api/admin/loyalty/route.ts`
- Add `where: { tenantId }` to LoyaltyTransaction queries

#### User Routes
- `/api/admin/users/route.ts`
- Filter users by tenantId (except SUPERADMIN)

#### Other Routes
- `/api/admin/bulk-orders/route.ts`
- `/api/admin/delivery-agents/route.ts`
- `/api/admin/refunds/route.ts`
- `/api/admin/analytics/route.ts`
- `/api/admin/nav-stats/route.ts`

### 3. Fix Compilation Errors 🔴 REQUIRED

Current build errors in:
- `src/app/api/admin/forecasting/route.ts` - Missing tenantId in InventoryForecast.create()

### 4. Session Management for activeTenantId 🟡 IMPORTANT

Currently, `activeTenantId` is only stored in the response but not persisted in JWT. Options:

**Option A (Recommended)**: Use JWT callback to persist activeTenantId
```typescript
// In src/lib/auth.ts callbacks
async jwt({ token, trigger, session }) {
  if (trigger === "update" && session?.activeTenantId) {
    token.activeTenantId = session.activeTenantId;
  }
  return token;
}
```

**Option B**: Use server-side session store (Redis, database)

### 5. Client-Side Tenant Switching 🟡 IMPORTANT

Update `TenantSelector` component to use NextAuth session update:

```typescript
import { useSession } from 'next-auth/react';

const { update } = useSession();

const handleTenantChange = async (tenantId: string) => {
  await fetch('/api/tenant/set-active', {
    method: 'POST',
    body: JSON.stringify({ tenantId }),
  });
  
  // Update session
  await update({ activeTenantId: tenantId });
  router.refresh();
};
```

### 6. Testing Checklist ⚪ TODO

- [ ] Create tenant via SUPERADMIN dashboard
- [ ] SUPERADMIN can switch between tenants
- [ ] Tenant isolation - users can't see other tenants' data
- [ ] Admin can only access their tenant
- [ ] Products are scoped to tenant
- [ ] Orders are scoped to tenant
- [ ] Analytics show only tenant-specific data
- [ ] SUPERADMIN sees global analytics
- [ ] Login with different roles (SUPERADMIN, ADMIN, CUSTOMER)

### 7. Data Migration Script ⚪ TODO

For existing deployments, create a migration script:

```typescript
// scripts/migrate-to-multi-tenant.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateToMultiTenant() {
  // 1. Create default tenant
  const defaultTenant = await prisma.tenant.upsert({
    where: { id: 'default-tenant' },
    create: {
      id: 'default-tenant',
      name: 'Default Tenant',
      slug: 'default',
    },
    update: {},
  });

  // 2. Update all users (except SUPERADMIN)
  await prisma.user.updateMany({
    where: { role: { not: 'SUPERADMIN' } },
    data: { tenantId: defaultTenant.id },
  });

  // 3. Update all tenant-scoped records
  await Promise.all([
    prisma.product.updateMany({ data: { tenantId: defaultTenant.id } }),
    prisma.order.updateMany({ data: { tenantId: defaultTenant.id } }),
    // ... etc for all models
  ]);
}
```

## Performance Considerations

The schema includes comprehensive indexes for multi-tenant queries:
- `tenantId` on all tenant-scoped tables
- Composite indexes like `tenantId + status`, `tenantId + createdAt`
- These ensure fast queries even with many tenants

## Security Notes

1. **Tenant Isolation**: All API routes MUST check tenantId
2. **SUPERADMIN Access**: Only allow in specific routes
3. **Session Validation**: Always verify tenant access in middleware
4. **SQL Injection**: Prisma protects against this, but validate input
5. **Rate Limiting**: Consider per-tenant rate limits

## Deployment Steps

1. **Before deployment**: Generate and test migration
2. **Deploy**: Apply schema changes
3. **Run seed**: Create default tenant and SUPERADMIN
4. **Migrate data**: Run migration script for existing data
5. **Test**: Verify tenant isolation and access control
6. **Monitor**: Check for any data leakage between tenants

## Support

For issues or questions about the multi-tenant implementation, refer to:
- Prisma multi-tenancy docs: https://www.prisma.io/docs/guides/database/multi-tenant-apps
- Next.js middleware: https://nextjs.org/docs/app/building-your-application/routing/middleware
- NextAuth callbacks: https://next-auth.js.org/configuration/callbacks
