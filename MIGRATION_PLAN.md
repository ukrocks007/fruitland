# Multi-Tenant Migration Plan

## Overview
This document outlines the database migration plan to add multi-tenant support to the Fruitland application.

## Changes Summary

### New Models
- **Tenant**: Core tenant model with slug-based routing

### Modified Models (Added tenantId FK)
- User (nullable for SUPERADMIN)
- Product
- Order
- Subscription
- SubscriptionPackage
- Address
- CartItem
- Warehouse
- LoyaltyTransaction
- Review

### New Indices
All tenant-scoped models now have indices on:
- `tenantId`
- `tenantId + frequently queried fields` (e.g., status, createdAt, userId)

## Migration Steps

### Step 1: Create Tenant Table
```sql
CREATE TABLE "Tenant" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "description" TEXT,
  "logo" TEXT,
  "contactEmail" TEXT,
  "contactPhone" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE INDEX "Tenant_slug_idx" ON "Tenant"("slug");
CREATE INDEX "Tenant_isActive_idx" ON "Tenant"("isActive");
```

### Step 2: Add tenantId to User (nullable)
```sql
ALTER TABLE "User" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- Update role comment to include SUPERADMIN
COMMENT ON COLUMN "User"."role" IS 'CUSTOMER, ADMIN, DELIVERY_PARTNER, or SUPERADMIN';
```

### Step 3: Create Default Tenant & Backfill
```sql
-- Insert default tenant
INSERT INTO "Tenant" ("id", "name", "slug", "description", "isActive", "createdAt", "updatedAt")
VALUES (
  'default-tenant-id',
  'Fruitland',
  'fruitland',
  'Default Fruitland tenant',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Backfill existing users (except future SUPERADMIN users)
UPDATE "User" SET "tenantId" = 'default-tenant-id' WHERE "role" != 'SUPERADMIN';
```

### Step 4: Add tenantId to other models (NOT NULL with default)
```sql
-- Product
ALTER TABLE "Product" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default-tenant-id';
ALTER TABLE "Product" ADD CONSTRAINT "Product_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Product_tenantId_idx" ON "Product"("tenantId");
CREATE INDEX "Product_tenantId_stock_isAvailable_idx" ON "Product"("tenantId", "stock", "isAvailable");
CREATE INDEX "Product_tenantId_category_idx" ON "Product"("tenantId", "category");

-- Order
ALTER TABLE "Order" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default-tenant-id';
ALTER TABLE "Order" ADD CONSTRAINT "Order_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Order_tenantId_idx" ON "Order"("tenantId");
CREATE INDEX "Order_tenantId_createdAt_idx" ON "Order"("tenantId", "createdAt");
CREATE INDEX "Order_tenantId_paymentStatus_idx" ON "Order"("tenantId", "paymentStatus");
CREATE INDEX "Order_tenantId_status_idx" ON "Order"("tenantId", "status");
CREATE INDEX "Order_tenantId_userId_idx" ON "Order"("tenantId", "userId");

-- Subscription
ALTER TABLE "Subscription" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default-tenant-id';
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Subscription_tenantId_idx" ON "Subscription"("tenantId");
CREATE INDEX "Subscription_tenantId_status_idx" ON "Subscription"("tenantId", "status");
CREATE INDEX "Subscription_tenantId_userId_idx" ON "Subscription"("tenantId", "userId");

-- SubscriptionPackage
ALTER TABLE "SubscriptionPackage" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default-tenant-id';
ALTER TABLE "SubscriptionPackage" ADD CONSTRAINT "SubscriptionPackage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "SubscriptionPackage_tenantId_idx" ON "SubscriptionPackage"("tenantId");
CREATE INDEX "SubscriptionPackage_tenantId_isActive_idx" ON "SubscriptionPackage"("tenantId", "isActive");

-- Address
ALTER TABLE "Address" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default-tenant-id';
ALTER TABLE "Address" ADD CONSTRAINT "Address_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Address_tenantId_idx" ON "Address"("tenantId");
CREATE INDEX "Address_userId_tenantId_idx" ON "Address"("userId", "tenantId");

-- CartItem (needs to drop and recreate unique constraint)
ALTER TABLE "CartItem" DROP CONSTRAINT IF EXISTS "CartItem_userId_productId_key";
ALTER TABLE "CartItem" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default-tenant-id';
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "CartItem_tenantId_idx" ON "CartItem"("tenantId");
CREATE INDEX "CartItem_userId_tenantId_idx" ON "CartItem"("userId", "tenantId");
CREATE UNIQUE INDEX "CartItem_userId_productId_tenantId_key" ON "CartItem"("userId", "productId", "tenantId");

-- Warehouse
ALTER TABLE "Warehouse" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default-tenant-id';
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Warehouse_tenantId_idx" ON "Warehouse"("tenantId");
CREATE INDEX "Warehouse_tenantId_city_idx" ON "Warehouse"("tenantId", "city");
CREATE INDEX "Warehouse_tenantId_pincode_idx" ON "Warehouse"("tenantId", "pincode");
CREATE INDEX "Warehouse_tenantId_zone_idx" ON "Warehouse"("tenantId", "zone");
CREATE INDEX "Warehouse_tenantId_isActive_idx" ON "Warehouse"("tenantId", "isActive");

-- LoyaltyTransaction
ALTER TABLE "LoyaltyTransaction" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default-tenant-id';
ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "LoyaltyTransaction_tenantId_idx" ON "LoyaltyTransaction"("tenantId");
CREATE INDEX "LoyaltyTransaction_tenantId_userId_idx" ON "LoyaltyTransaction"("tenantId", "userId");

-- Review (needs to drop and recreate unique constraint)
ALTER TABLE "Review" DROP CONSTRAINT IF EXISTS "Review_productId_userId_key";
ALTER TABLE "Review" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default-tenant-id';
ALTER TABLE "Review" ADD CONSTRAINT "Review_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Review_tenantId_idx" ON "Review"("tenantId");
CREATE INDEX "Review_tenantId_productId_status_idx" ON "Review"("tenantId", "productId", "status");
CREATE UNIQUE INDEX "Review_productId_userId_tenantId_key" ON "Review"("productId", "userId", "tenantId");
```

### Step 5: Remove DEFAULT constraint after backfill
```sql
-- After verification, remove the DEFAULT 'default-tenant-id' constraints
ALTER TABLE "Product" ALTER COLUMN "tenantId" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "tenantId" DROP DEFAULT;
ALTER TABLE "Subscription" ALTER COLUMN "tenantId" DROP DEFAULT;
ALTER TABLE "SubscriptionPackage" ALTER COLUMN "tenantId" DROP DEFAULT;
ALTER TABLE "Address" ALTER COLUMN "tenantId" DROP DEFAULT;
ALTER TABLE "CartItem" ALTER COLUMN "tenantId" DROP DEFAULT;
ALTER TABLE "Warehouse" ALTER COLUMN "tenantId" DROP DEFAULT;
ALTER TABLE "LoyaltyTransaction" ALTER COLUMN "tenantId" DROP DEFAULT;
ALTER TABLE "Review" ALTER COLUMN "tenantId" DROP DEFAULT;
```

## Rollback Plan

If issues occur, rollback in reverse order:

```sql
-- Drop foreign keys and columns
ALTER TABLE "Review" DROP CONSTRAINT "Review_tenantId_fkey";
ALTER TABLE "Review" DROP COLUMN "tenantId";
-- ... repeat for all tables

DROP TABLE "Tenant";
```

## Validation Queries

After migration, verify:

```sql
-- Check tenant exists
SELECT * FROM "Tenant" WHERE slug = 'fruitland';

-- Check all users have tenantId (or are SUPERADMIN)
SELECT COUNT(*) FROM "User" WHERE "tenantId" IS NULL AND "role" != 'SUPERADMIN';

-- Check all products have tenantId
SELECT COUNT(*) FROM "Product" WHERE "tenantId" IS NULL;

-- Verify indices
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE tablename IN ('Tenant', 'Product', 'Order', 'Subscription') 
AND indexname LIKE '%tenant%';
```

## Notes

- The default tenant slug is controlled by the `DEFAULT_TENANT_SLUG` environment variable
- SUPERADMIN users will have `tenantId = null` by design
- All new records must include a valid tenantId (enforced by application logic)
- Indices optimize tenant-scoped queries which will be the most common pattern
