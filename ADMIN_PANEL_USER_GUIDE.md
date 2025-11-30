# Admin Panel User Guide

## Getting Started

### Accessing the Admin Panel

1. **Sign in as Admin:**
   - Navigate to `/auth/signin`
   - Use admin credentials (role must be `ADMIN`)
   - You'll be redirected to the admin dashboard

2. **Admin Dashboard URL:**
   - Main dashboard: `http://localhost:3000/admin`
   - Protected by authentication - automatically redirects non-admin users

---

## Dashboard Overview

The main admin dashboard (`/admin`) provides:

### Quick Stats (Top Cards)
- **Active Subscriptions:** Count of currently active subscription plans
- **Monthly Recurring Revenue:** Total MRR from active subscriptions
- **Orders This Month:** Number of orders placed in current month
- **Total Customers:** Count of registered customers
- **Revenue This Month:** Total revenue earned this month
- **Low Stock Products:** Products below threshold (alerts in red)

### Navigation Buttons
Located at the top right:
- 🛒 **Orders** - Manage all orders
- 📦 **Subscriptions** - Manage recurring deliveries
- 👥 **Users** - Manage customers and admins
- 📋 **Products** - Manage inventory
- ⚙️ **Settings** - Configure system settings

### Analytics Charts
- **Revenue Over Time:** 6-month revenue trend (area chart)
- **Orders by Status:** Distribution pie chart
- **Revenue by Category:** Bar chart of category performance
- **Subscription Growth:** Line chart showing subscriber growth

### Recent Activity
- **Recent Orders:** Last 10 orders with quick details
- **Top Selling Products:** Best performers with sales count

---

## Managing Orders

### Viewing Orders
1. Click **Orders** button or navigate to `/admin/orders`
2. See all orders in table format

### Search & Filter
- **Search bar:** Type order number or customer email
- **Status filter:** Select specific order status
- **Payment filter:** Filter by payment method

### Order Actions

#### Update Status
1. Click status dropdown in the order row
2. Select new status:
   - PENDING (initial state)
   - PROCESSING (order confirmed)
   - SHIPPED (out for delivery)
   - DELIVERED (completed)
   - CANCELLED (cancelled by admin/customer)
3. Changes save automatically

#### View Order Details
1. Click **"View Details"** button
2. Dialog shows:
   - Customer information
   - Delivery address
   - All ordered items with quantities
   - Payment method and status
   - Total amount

#### Delete Order
1. Click **trash icon** (🗑️)
2. Confirm deletion
3. Order permanently removed

---

## Managing Subscriptions

### Viewing Subscriptions
1. Click **Subscriptions** button or navigate to `/admin/subscriptions`
2. See all subscriptions in table format

### Search & Filter
- **Search bar:** Type customer email or product name
- **Status filter:** ACTIVE / PAUSED / CANCELLED
- **Frequency filter:** DAILY / WEEKLY / MONTHLY

### Subscription Actions

#### Pause Subscription
1. Click **Pause** button (⏸️) on active subscription
2. Status changes to PAUSED
3. No deliveries until resumed

#### Resume Subscription
1. Click **Resume** button (▶️) on paused subscription
2. Status changes back to ACTIVE
3. Deliveries continue from next scheduled date

#### Cancel Subscription
1. Click **Cancel** button (⏹️)
2. Status changes to CANCELLED
3. Permanent - cannot be resumed

#### View Details
1. Click **"View Details"** button
2. Dialog shows complete subscription information

#### Delete Subscription
1. Click **trash icon** (🗑️)
2. Confirm deletion
3. Subscription removed from database

---

## Managing Users

### Viewing Users
1. Click **Users** button or navigate to `/admin/users`
2. See all users in table format

### Search & Filter
- **Search bar:** Type email or name
- **Role filter:** CUSTOMER / ADMIN

### User Information
Table shows:
- Name and email
- Current role
- Number of orders placed
- Number of active subscriptions
- Account creation date

### User Actions

#### Change Role
1. Click role dropdown in user row
2. Select CUSTOMER or ADMIN
3. Changes save immediately
4. **Note:** Be careful when changing admin roles!

#### View/Add Notes (CRM)
1. Click **"Notes"** button
2. Dialog opens showing:
   - All existing notes with timestamps
   - Text area to add new note
3. Type note and click **"Add Note"**
4. Use for:
   - Customer service interactions
   - Special requests
   - Account issues
   - Follow-up reminders

#### Delete User
1. Click **trash icon** (🗑️)
2. Confirm deletion
3. **Warning:** This deletes all user data including orders and subscriptions

---

## Managing Products

### Viewing Products
1. Click **Products** button or navigate to `/admin/products`
2. See inventory in table format

### Search & Filter
- **Search bar:** Type product name or category
- **Category dropdown:** Filter by specific category

### Product Information
Table displays:
- Product name
- Category badge
- Price (₹)
- Stock quantity (red badge if low)
- Availability status (Available/Unavailable button)

### Product Actions

#### Add New Product
1. Click **"Add Product"** button (top right)
2. Fill form:
   - **Product Name** (required)
   - **Category** (required) - e.g., "Fruits", "Vegetables"
   - **Price** (required) - in rupees
   - **Stock** (required) - quantity available
   - **Description** (optional) - product details
   - **Image URL** (optional) - product image link
   - **Available** checkbox - enable for sale
3. Click **"Create Product"**

#### Edit Product
1. Click **edit icon** (✏️)
2. Form opens with current values
3. Modify any field
4. Click **"Update Product"**

#### Toggle Availability
1. Click the **Available/Unavailable** button
2. Toggles product visibility to customers
3. Use for:
   - Seasonal products
   - Out of stock items
   - Products under review

#### Delete Product
1. Click **trash icon** (🗑️)
2. Confirm deletion
3. Product removed from inventory

### Stock Management Tips
- Products with stock < 10 show red badge
- Low stock products count shown on dashboard
- Update stock quantity after receiving shipments

---

## Settings & Configuration

### Accessing Settings
1. Click **Settings** button or navigate to `/admin/settings`
2. Three configuration sections available

### Payment Settings

#### Enable/Disable Payment Methods
- **Online Payment (Razorpay):** Check to enable online payments
- **Cash on Delivery (COD):** Check to enable COD option
- **Note:** At least one payment method should be enabled
- Changes apply immediately after saving

### Email Configuration

Set up SMTP for transactional emails:
- **SMTP Host:** e.g., `smtp.gmail.com`
- **SMTP Port:** e.g., `587` for TLS
- **SMTP Username:** Your email address
- **SMTP Password:** Email account password or app-specific password
- **From Email:** Address shown as sender

**Gmail Example:**
```
SMTP Host: smtp.gmail.com
SMTP Port: 587
SMTP User: your-email@gmail.com
SMTP Password: your-app-password
From Email: noreply@fruitland.com
```

### General Settings

- **Site Name:** Business name shown in emails and frontend
- **Support Email:** Customer support contact email
- **Low Stock Threshold:** Number below which products are flagged
  - Default: 10
  - Products below this count show alerts on dashboard

### Saving Settings
1. Make changes in any section
2. Click **"Save All Settings"** button at bottom
3. Wait for success confirmation
4. Settings stored in database - no redeployment needed

---

## Analytics & Reports

### Understanding Charts

#### Revenue Over Time (Area Chart)
- Shows last 6 months of revenue
- Hover to see exact amounts
- Identify trends and seasonality

#### Orders by Status (Pie Chart)
- Visual breakdown of order lifecycle
- Colors represent different statuses
- Click legend to toggle visibility

#### Revenue by Category (Bar Chart)
- Compare performance across categories
- Identify best-selling categories
- Plan inventory accordingly

#### Subscription Growth (Line Chart)
- Track active subscriber count over time
- Identify growth patterns
- Plan capacity and inventory

### Using Insights
- Monitor revenue trends for forecasting
- Track order status distribution for workflow optimization
- Analyze category performance for inventory decisions
- Watch subscription growth for business planning

---

## Best Practices

### Daily Tasks
- [ ] Check new orders and update status
- [ ] Review low stock alerts
- [ ] Process any paused subscriptions
- [ ] Respond to customer notes

### Weekly Tasks
- [ ] Review analytics charts
- [ ] Update product inventory
- [ ] Check subscription health
- [ ] Review user feedback in notes

### Monthly Tasks
- [ ] Analyze revenue trends
- [ ] Review top-selling products
- [ ] Update product catalog
- [ ] Verify email settings are working

### Security Recommendations
- Change admin passwords regularly
- Don't share admin credentials
- Review user roles periodically
- Keep customer notes professional
- Delete test orders before going live

---

## Troubleshooting

### Can't Access Admin Panel
- **Problem:** Redirected to sign-in
- **Solution:** Ensure your user role is set to `ADMIN` in database

### Changes Not Saving
- **Problem:** Updates not persisting
- **Solution:** Check browser console for errors, verify network connection

### Charts Not Showing
- **Problem:** Empty charts on dashboard
- **Solution:** Need orders/subscriptions data first, seed database if testing

### Low Stock Alert Not Showing
- **Problem:** Products not flagged
- **Solution:** Check threshold in Settings, ensure stock is below threshold

### Email Not Sending
- **Problem:** Transactional emails failing
- **Solution:** Verify SMTP settings, check email provider allows SMTP access

---

## Keyboard Shortcuts (Future Enhancement)

While not currently implemented, these would be useful:
- `Ctrl+K` - Quick search
- `Escape` - Close dialogs
- `Enter` - Submit forms
- `Tab` - Navigate fields

---

## Mobile Access

The admin panel is responsive and works on tablets and mobile devices:
- Cards stack vertically
- Tables scroll horizontally
- Dialogs are mobile-friendly
- Touch-friendly buttons and controls

**Recommendation:** For best experience, use desktop/laptop for admin tasks.

---

## Getting Help

### Common Issues

**Q: How do I create the first admin user?**
A: Use Prisma Studio or seed script to set role to `ADMIN` for your user.

**Q: Can I have multiple admins?**
A: Yes! Change any user's role to `ADMIN` in the Users page.

**Q: What happens if I delete a user with orders?**
A: Orders are preserved (cascade delete can be adjusted in schema).

**Q: Can customers see the admin panel?**
A: No, it's protected by role-based authentication.

**Q: Where is data stored?**
A: SQLite database in development, configure PostgreSQL for production.

---

## Production Deployment Checklist

Before going live:
- [ ] Switch to PostgreSQL database
- [ ] Set secure `NEXTAUTH_SECRET`
- [ ] Configure production Razorpay keys
- [ ] Set up SMTP for production
- [ ] Create admin user account
- [ ] Seed initial product catalog
- [ ] Test all payment methods
- [ ] Enable SSL/HTTPS
- [ ] Configure domain settings
- [ ] Set up backup strategy
- [ ] Review security settings
- [ ] Test on staging environment

---

## Support & Documentation

- **Technical Documentation:** See `ADMIN_PANEL_FEATURES.md`
- **Deployment Guide:** See `DEPLOYMENT.md`
- **Project Overview:** See `PROJECT_SUMMARY.md`
- **Database Schema:** See `prisma/schema.prisma`

For development questions, check the source code comments and API documentation.

---

**Happy Administrating! 🎉**
