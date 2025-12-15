# 🥛 Hazare Dairy Farm - Subscription Web App

A production-ready daily milk subscription platform for Hazare Dairy Farm.
Built with Next.js 15, TypeScript, Prisma, and Razorpay.

## 🌟 Features

### 🥛 Dairy Subscription System
- **Daily Morning Delivery**: Automated scheduling for daily milk needs.
- **Alternate Day Option**: For flexible delivery schedules.
- **Pause/Resume**: Customers can pause subscriptions when out of town.
- **Wallet/Payment**: Integrated Razorpay for payments.

### 🛍️ Product Catalog
- **Milk**: Cow Milk, Buffalo Milk (Fat % displayed).
- **Dairy Products**: Curd, Paneer, Ghee, Butter.
- **Freshness Indicators**: Shelf life and refrigeration notes.

### 🚛 Admin Dashboard
- **Daily Deliveries**: View exactly what needs to be delivered today.
- **Delivery Management**: Mark deliveries as 'Delivered' or 'Missed'.
- **Product Management**: Manage stock, price, and dairy attributes.
- **Analytics**: Track active subscriptions and revenue.

## 🚀 Deployment Guide (Vercel)

This application is optimised for deployment on Vercel.

### 1. Prerequisites
- **GitHub Account**: Push this repository to your GitHub.
- **Vercel Account**: Sign up at vercel.com.
- **Postgres Database**: Use Vercel Postgres, Supabase, or Neon.
- **Razorpay Account**: Get API credentials.

### 2. Deployment Steps

1.  **Import Project**: Go to Vercel Dashboard -> Add New Project -> Import from GitHub.
2.  **Environment Variables**: Configure the following in Vercel Project Settings:
    ```env
    # Database (Postgres)
    DATABASE_URL="postgres://user:password@host:port/dbname"

    # NextAuth (Authentication)
    NEXTAUTH_URL="https://hazare-dairy.yourdomain.com" # Your Vercel domain
    NEXTAUTH_SECRET="generate-a-random-secret-key-at-least-32-chars"

    # App Config
    NEXT_PUBLIC_APP_URL="https://hazare-dairy.yourdomain.com"

    # Razorpay (Payments)
    NEXT_PUBLIC_RAZORPAY_KEY_ID="rzp_test_..." 
    RAZORPAY_KEY_SECRET="your_secret_key"
    ```
3.  **Build Settings**:
    - Framework Preset: Next.js
    - Build Command: `prisma generate && next build` (Default is usually `next build`, but `prisma generate` is safer).
    - *Note*: You can use the default `next build` if `postinstall` script in `package.json` runs `prisma generate`. (It does).

4.  **Database Migration**:
    - After deployment (or during build if configured), you need to push the schema.
    - Recommended: Run `npx prisma db push` locally pointing to the PRODUCTION database URL, OR use Vercel's build step to run migration if you set it up.
    - **Seeding**: To populate initial data (Products, Packages), run:
        ```bash
        DATABASE_URL="your_production_db_url" npm run db:seed
        ```

5.  **Domain Configuration**:
    - Go to Vercel Settings -> Domains.
    - Add `hazare-dairy.yourdomain.com`.

### 3. Verification
- Visit the deployed URL.
- Log in as Admin (Credentials from seed or created manually).
- Verify "Daily Deliveries" dashboard loads.
- Test a subscription flow.

## 🛠️ Local Development

1.  **Clone & Install**
    ```bash
    git clone <repo-url>
    npm install
    ```

2.  **Setup Environment**
    Copy `.env.example` to `.env` and fill in details.
    ```bash
    # For local dev using SQLite (if supported) or local Postgres
    DATABASE_URL="postgresql://..."
    ```

3.  **Run Database**
    ```bash
    npx prisma db push
    npm run db:seed
    ```

4.  **Start Server**
    ```bash
    npm run dev
    ```

## 📦 Project Structure

- `src/app/admin/deliveries`: Daily delivery management.
- `src/app/subscriptions`: Subscription user interface.
- `prisma/schema.prisma`: Database model (Product, Subscription, Order).
- `prisma/seed.ts`: Initial data for Hazare Dairy.

---

**Hazare Dairy Farm** - Pure & Fresh.
