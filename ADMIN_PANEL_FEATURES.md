# Admin Panel Features - Complete Documentation

## Overview
This document outlines all the features implemented in the comprehensive admin panel for the Fruitland e-commerce platform.

## Admin Panel Features

### 1. **Dashboard Overview** (`/admin`)
**Location:** `/src/app/admin/page.tsx`

**Features:**
- Quick access navigation buttons to all admin sections
- Real-time analytics cards:
  - Active Subscriptions count
  - Monthly Recurring Revenue (MRR)
  - Orders this month
  - Total Customers
  - Revenue this month
  - Low Stock Products alert
- Recent Orders list (last 10)
- Top Selling Products (top 5)

**Enhanced Analytics with Charts:**
- Revenue Over Time (Area Chart) - Last 6 months trend
- Orders by Status (Pie Chart) - Distribution of order statuses
- Revenue by Category (Bar Chart) - Sales breakdown
- Subscription Growth (Line Chart) - Active subscriptions over time

**Navigation:**
- Quick links to Orders, Subscriptions, Users, Products, and Settings

---

### 2. **Orders Management** (`/admin/orders`)
**Location:** `/src/app/admin/orders/page.tsx`

**Features:**
- Table view of all orders with:
  - Order number
  - Customer email
  - Total amount
  - Payment status (PAID/COD/PENDING)
  - Order status (PENDING/PROCESSING/SHIPPED/DELIVERED/CANCELLED)
  - Creation date

**Search & Filters:**
- Search by order number or customer email
- Filter by status (all statuses available)
- Filter by payment method (PAID/COD/PENDING)

**Actions:**
- **Update Status:** Inline dropdown to change order status
- **View Details:** Dialog showing:
  - Customer information
  - Delivery address
  - All order items with product details
  - Payment and status information
- **Delete Order:** Remove order from system

**API Endpoints:**
- `GET /api/admin/orders` - Fetch all orders with relations
- `PATCH /api/admin/orders/[id]` - Update order status
- `DELETE /api/admin/orders/[id]` - Delete order

---

### 3. **Subscriptions Management** (`/admin/subscriptions`)
**Location:** `/src/app/admin/subscriptions/page.tsx`

**Features:**
- Table view of all subscriptions with:
  - Customer email
  - Product name
  - Frequency (DAILY/WEEKLY/MONTHLY)
  - Total amount
  - Status (ACTIVE/PAUSED/CANCELLED)
  - Next delivery date
  - Creation date

**Search & Filters:**
- Search by customer email or product name
- Filter by status (ACTIVE/PAUSED/CANCELLED)
- Filter by frequency (DAILY/WEEKLY/MONTHLY)

**Actions:**
- **Pause:** Temporarily pause active subscription
- **Resume:** Reactivate paused subscription
- **Cancel:** Permanently cancel subscription
- **View Details:** Dialog showing:
  - Customer information
  - Product details
  - Delivery schedule
  - Subscription history
- **Delete:** Remove subscription from system

**API Endpoints:**
- `GET /api/admin/subscriptions` - Fetch all subscriptions
- `PATCH /api/admin/subscriptions/[id]` - Update subscription status
- `DELETE /api/admin/subscriptions/[id]` - Delete subscription

---

### 4. **Users Management** (`/admin/users`)
**Location:** `/src/app/admin/users/page.tsx`

**Features:**
- Table view of all users with:
  - Name
  - Email
  - Role (CUSTOMER/ADMIN)
  - Order count
  - Subscription count
  - Join date

**Search & Filters:**
- Search by email or name
- Filter by role (CUSTOMER/ADMIN)

**Actions:**
- **Change Role:** Inline dropdown to promote/demote users
- **View Notes:** Open CRM dialog to:
  - View all customer notes
  - Add new notes with timestamp
  - Track customer interactions
- **Delete User:** Remove user from system

**CRM Features:**
- Customer notes dialog for each user
- Add timestamped notes
- View complete note history
- Notes stored in `CustomerNote` table

**API Endpoints:**
- `GET /api/admin/users` - Fetch all users with counts
- `PATCH /api/admin/users/[id]` - Update user role
- `DELETE /api/admin/users/[id]` - Delete user
- `GET /api/admin/users/[id]/notes` - Fetch user notes
- `POST /api/admin/users/[id]/notes` - Add new note

---

### 5. **Product Inventory Management** (`/admin/products`)
**Location:** `/src/app/admin/products/page.tsx`

**Features:**
- Table view of all products with:
  - Product name
  - Category
  - Price
  - Stock quantity (highlighted if low)
  - Availability status

**Search & Filters:**
- Search by product name or category
- Filter by category (dynamic based on existing products)

**Actions:**
- **Add Product:** Dialog form to create new product with:
  - Name (required)
  - Category (required)
  - Price (required)
  - Stock quantity (required)
  - Description (optional)
  - Image URL (optional)
  - Availability checkbox
- **Edit Product:** Update all product details
- **Toggle Availability:** Quick enable/disable product
- **Delete Product:** Remove product from inventory

**Stock Management:**
- Low stock indicators (< 10 items)
- Stock quantity updates
- Availability toggle for seasonal products

**API Endpoints:**
- `POST /api/admin/products` - Create new product
- `PATCH /api/admin/products/[id]` - Update product
- `DELETE /api/admin/products/[id]` - Delete product

---

### 6. **Settings/Configuration** (`/admin/settings`)
**Location:** `/src/app/admin/settings/page.tsx`

**Features:**
Database-driven configuration system replacing environment variables.

**Payment Settings:**
- Enable/Disable Online Payment (Razorpay)
- Enable/Disable Cash on Delivery (COD)

**Email Configuration:**
- SMTP Host
- SMTP Port
- SMTP Username
- SMTP Password
- From Email Address

**General Settings:**
- Site Name
- Support Email
- Low Stock Alert Threshold

**Database Storage:**
All settings stored in `Config` table with key-value pairs, allowing dynamic updates without redeployment.

**API Endpoints:**
- `GET /api/admin/config` - Fetch all configuration
- `POST /api/admin/config` - Upsert configuration values

---

## Database Schema Updates

### New Models Added:

#### 1. **Config Model**
```prisma
model Config {
  id        String   @id @default(cuid())
  key       String   @unique
  value     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```
**Purpose:** Store dynamic configuration that can be changed from admin panel

#### 2. **CustomerNote Model**
```prisma
model CustomerNote {
  id         String   @id @default(cuid())
  customerId String
  customer   User     @relation(fields: [customerId], references: [id], onDelete: Cascade)
  note       String
  createdAt  DateTime @default(now())
}
```
**Purpose:** CRM functionality to track customer interactions and notes

---

## Analytics API

**Location:** `/src/app/api/admin/analytics/route.ts`

**Data Provided:**
- Active subscriptions count
- Monthly recurring revenue
- Orders this month
- Total customers
- Revenue this month
- Low stock products alert
- Recent orders (last 10)
- Top selling products (top 5)
- Revenue by month (last 6 months) - for Area Chart
- Orders by status distribution - for Pie Chart
- Subscription growth over time (last 6 months) - for Line Chart
- Revenue by category - for Bar Chart

---

## Chart Visualizations

**Component:** `/src/components/admin-charts.tsx`

**Libraries Used:**
- `recharts` for data visualization

**Charts Implemented:**
1. **Revenue Over Time** - Area Chart showing monthly revenue trend
2. **Orders by Status** - Pie Chart with color-coded status distribution
3. **Revenue by Category** - Bar Chart showing sales by product category
4. **Subscription Growth** - Line Chart tracking active subscriptions

**Features:**
- Responsive design
- Tooltips with formatted currency
- Color-coded data visualization
- Interactive legends

---

## Technical Implementation

### Authentication & Authorization
- All admin routes protected with `getServerSession`
- Role-based access control (ADMIN only)
- Unauthorized access redirects to sign-in

### UI Components
- `shadcn/ui` components for consistent design
- `sonner` for toast notifications
- `lucide-react` for icons
- Responsive design with Tailwind CSS

### Data Fetching
- Server-side data fetching for initial load
- Client-side updates with `fetch` API
- Real-time updates after CRUD operations
- Optimistic UI updates with immediate feedback

### Error Handling
- Try-catch blocks for all API calls
- User-friendly error messages
- Toast notifications for success/failure
- Validation before database operations

---

## User Experience Features

### Common Patterns:
- **Back to Dashboard** button on all pages
- **Loading states** with spinner during data fetch
- **Confirmation dialogs** for destructive actions
- **Search and filter** on all list pages
- **Inline editing** where appropriate
- **Detailed view dialogs** for complex data

### Accessibility:
- Proper form labels
- Keyboard navigation support
- ARIA labels on interactive elements
- Clear visual feedback for actions

---

## Configuration Migration

### From Environment Variables to Database:
The following configurations are now managed in the database via Settings page:

- `ENABLE_ONLINE_PAYMENT` → Config table key
- `ENABLE_COD` → Config table key
- SMTP settings → Config table
- Site name, support email → Config table
- Low stock threshold → Config table

**Benefits:**
- No redeployment needed for config changes
- Dynamic updates from admin panel
- Version controlled in database
- Easier for non-technical admins

---

## Future Enhancement Opportunities

### Potential Additions:
1. **Email Templates:** Manage transactional email templates
2. **Bulk Actions:** Select multiple items for batch operations
3. **Export Data:** CSV/Excel export for reports
4. **Advanced Filters:** Date range, custom filters
5. **Activity Log:** Track all admin actions
6. **Role Permissions:** Fine-grained permission control
7. **Notifications:** Real-time alerts for low stock, new orders
8. **Customer Analytics:** Lifetime value, cohort analysis
9. **Discount Management:** Create and manage coupon codes
10. **Inventory Alerts:** Automated low stock notifications

---

## Security Considerations

### Implemented:
- Role-based access control
- Server-side validation
- Secure password handling (bcrypt)
- SQL injection protection (Prisma ORM)
- CSRF protection (NextAuth)

### Recommendations:
- Rate limiting on API endpoints
- Audit logging for sensitive operations
- Two-factor authentication for admin accounts
- Regular security audits
- Input sanitization for rich text fields

---

## Performance Optimizations

### Current:
- Server-side rendering for initial load
- Efficient database queries with Prisma
- Indexed database fields
- Pagination ready structure

### Future Improvements:
- Implement pagination for large datasets
- Add caching for analytics data
- Optimize chart rendering
- Lazy loading for images
- Database query optimization

---

## Summary

The admin panel now provides comprehensive control over:
✅ Orders - Full lifecycle management
✅ Subscriptions - Pause, resume, cancel functionality
✅ Users - Role management and CRM
✅ Products - Complete inventory CRUD
✅ Settings - Dynamic configuration
✅ Analytics - Visual insights with charts
✅ CRM - Customer notes and tracking

All features are production-ready with proper error handling, loading states, and user feedback mechanisms.
