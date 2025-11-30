# 🍎 Fruitland - Fresh Fruit Subscription & E-commerce Platform

A modern, full-stack fruit subscription and e-commerce web application built with Next.js, TypeScript, Prisma, and Razorpay payments.

## ✨ Features

### Customer-Facing Store
- **Product Catalog**: Browse fresh, seasonal, organic, and exotic fruits
- **Subscription Management**: Weekly, bi-weekly, and monthly subscription plans
- **One-time Purchases**: Option to buy without subscription
- **User Authentication**: Secure signup and login with NextAuth.js
- **Order Management**: View order history and track deliveries
- **Subscription Controls**: Pause, resume, skip, or cancel subscriptions
- **Secure Payments**: Integrated Razorpay for UPI, cards, and net banking

### Admin Panel
- **Dashboard Analytics**: Key metrics (MRR, active subscriptions, orders, customers)
- **Product Management**: Add, edit, delete fruits; manage inventory and prices
- **Order Management**: View and manage all orders and subscriptions
- **Customer Management**: View customer data, order history, and subscriptions
- **Inventory Alerts**: Low stock warnings and seasonal availability tracking

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **UI Components**: shadcn/ui + Tailwind CSS
- **Database**: SQLite (Prisma ORM) - easily switch to PostgreSQL/MySQL
- **Authentication**: NextAuth.js v4
- **Payments**: Razorpay SDK
- **Deployment**: Vercel-ready

## 📋 Prerequisites

- Node.js 20.12 or higher
- npm or yarn package manager
- Razorpay account (get test/live API keys)

## 🚀 Getting Started

### 1. Install Dependencies

\`\`\`bash
npm install
\`\`\`

### 2. Environment Setup

Create a \`.env\` file in the root directory:

\`\`\`env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key-change-this-in-production"

# Razorpay Keys (Get from https://dashboard.razorpay.com/)
NEXT_PUBLIC_RAZORPAY_KEY_ID="your_razorpay_test_key_id"
RAZORPAY_KEY_SECRET="your_razorpay_test_key_secret"

# App Configuration
NEXT_PUBLIC_APP_NAME="Fruitland"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
\`\`\`

### 3. Database Setup

\`\`\`bash
# Generate Prisma client
npx prisma generate

# Push database schema
npx prisma db push
\`\`\`

### 4. Run Development Server

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) to see your application.

## 📦 Database Schema

The application uses Prisma ORM with the following models:

- **User**: Customer/Admin authentication and profiles
- **Product**: Fruit products with inventory tracking
- **Order**: Customer orders with payment tracking
- **Subscription**: Recurring fruit box subscriptions
- **Address**: Customer delivery addresses
- **OrderItem/SubscriptionItem**: Line items for orders and subscriptions

## 💳 Razorpay Integration

### Setup Steps:

1. Sign up at [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Navigate to Settings → API Keys
3. Generate Test Keys for development
4. Add keys to \`.env\` file
5. For production, generate Live Keys and update environment variables

### Payment Flow:

1. User adds items to cart and proceeds to checkout
2. Backend creates a Razorpay order via \`/api/payment/create-order\`
3. Frontend loads Razorpay Checkout UI with order_id
4. User completes payment (UPI/card/net banking)
5. Payment response sent to \`/api/payment/verify\`
6. Backend verifies signature and updates order status

### Test Credentials (Test Mode):

- **Card**: 4111 1111 1111 1111
- **CVV**: Any 3 digits
- **Expiry**: Any future date
- **OTP**: 123456

## 🏗️ Project Structure

\`\`\`
fruitland/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── app/
│   │   ├── api/              # API routes
│   │   │   ├── auth/         # Authentication
│   │   │   ├── products/     # Product CRUD
│   │   │   ├── orders/       # Orders
│   │   │   ├── subscriptions/# Subscriptions
│   │   │   ├── payment/      # Razorpay
│   │   │   └── admin/        # Admin analytics
│   │   ├── auth/             # Auth pages
│   │   ├── admin/            # Admin dashboard
│   │   ├── layout.tsx        # Root layout
│   │   └── page.tsx          # Homepage
│   ├── components/
│   │   ├── ui/               # shadcn/ui components
│   │   ├── navbar.tsx        # Navigation
│   │   └── providers.tsx     # Providers
│   ├── lib/
│   │   ├── prisma.ts         # Prisma client
│   │   ├── auth.ts           # NextAuth config
│   │   └── razorpay.ts       # Razorpay utilities
│   └── types/
│       └── index.ts          # Type definitions
├── .env                      # Environment variables
└── README.md
\`\`\`

## 🎨 UI Components

Built with **shadcn/ui** - fully customizable components. Customize theme in \`src/app/globals.css\`.

## 🔐 Authentication

- **Provider**: NextAuth.js with credentials
- **Password**: Hashed with bcryptjs
- **Session**: JWT-based
- **Roles**: CUSTOMER and ADMIN

### Creating an Admin User:

\`\`\`bash
npx prisma studio
# Manually update a user's role to "ADMIN"
\`\`\`

## 🚢 Deployment to Vercel

1. Push to GitHub
2. Import repository to Vercel
3. Add environment variables
4. Deploy!

For production, migrate to PostgreSQL using Vercel Postgres, Supabase, or PlanetScale.

## 📊 API Endpoints

### Public
- \`GET /api/products\` - List products

### Authenticated
- \`POST /api/auth/register\` - Register
- \`POST /api/payment/create-order\` - Create order
- \`POST /api/payment/verify\` - Verify payment
- \`GET /api/orders\` - User orders
- \`GET /api/subscriptions\` - User subscriptions
- \`POST /api/subscriptions\` - Create subscription
- \`PATCH /api/subscriptions/[id]\` - Update subscription

### Admin Only
- \`POST/PUT/DELETE /api/products\` - Manage products
- \`GET /api/admin/analytics\` - Analytics

## 📄 License

MIT License

---

**Built with ❤️ using Next.js, TypeScript, Prisma, and Razorpay**

