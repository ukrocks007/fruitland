# 🚀 Deployment Guide - Fruitland

Complete guide to deploy your Fruitland application to production.

## Prerequisites

- GitHub account
- Vercel account (free tier available)
- Razorpay account with Live API keys
- PostgreSQL database (recommended for production)

## Step 1: Database Setup (Production)

### Option A: Vercel Postgres (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to Storage → Create Database
3. Select "Postgres"
4. Copy the connection string
5. Update your `.env` with the PostgreSQL URL

### Option B: Supabase

1. Create account at [Supabase](https://supabase.com/)
2. Create new project
3. Go to Settings → Database
4. Copy connection string (ensure mode is set to "Transaction")
5. Update your `.env`

### Option C: PlanetScale

1. Create account at [PlanetScale](https://planetscale.com/)
2. Create new database
3. Get connection string
4. Update your `.env`

### Update Database Schema

For PostgreSQL, update `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"  // Changed from "sqlite"
  url      = env("DATABASE_URL")
}
```

Then run:
```bash
npx prisma generate
npx prisma db push
npm run db:seed  # Optional: seed production data
```

## Step 2: Razorpay Production Setup

### Get Live API Keys

1. Login to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Switch from "Test Mode" to "Live Mode"
3. Navigate to Settings → API Keys
4. Generate new Live API keys
5. Save both Key ID and Key Secret securely

### Configure Webhooks (Optional but Recommended)

1. Go to Settings → Webhooks
2. Create new webhook
3. URL: `https://your-domain.com/api/webhooks/razorpay`
4. Select events:
   - `payment.captured`
   - `payment.failed`
   - `refund.created`
5. Save webhook secret for verification

## Step 3: GitHub Setup

### Push Code to GitHub

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Fruitland production ready"

# Add remote repository
git remote add origin https://github.com/yourusername/fruitland.git

# Push to main branch
git push -u origin main
```

### Ensure .gitignore includes:

```
.env
.env.local
node_modules/
.next/
*.db
*.db-journal
```

## Step 4: Vercel Deployment

### Deploy via Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/new)
2. Click "Import Project"
3. Select your GitHub repository
4. Vercel will auto-detect Next.js configuration

### Configure Environment Variables

In Vercel project settings, add these environment variables:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# NextAuth
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=generate-a-new-secure-secret-here

# Razorpay (LIVE KEYS)
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_live_secret_key

# App Config
NEXT_PUBLIC_APP_NAME=Fruitland
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### Generate Secure NEXTAUTH_SECRET

```bash
# Run this command to generate a secure secret
openssl rand -base64 32
```

### Deploy

1. Click "Deploy"
2. Wait for build to complete
3. Vercel will provide a production URL

## Step 5: Post-Deployment Setup

### Create Admin User

Since your production database is fresh:

```bash
# Option 1: Run seed script (includes admin user)
npm run db:seed

# Option 2: Use Prisma Studio
npx prisma studio
# Navigate to User table
# Update a user's role to "ADMIN"
```

### Test the Application

1. **Visit your production URL**
2. **Test user registration**: Create a customer account
3. **Test sign in**: Login with created account
4. **Admin access**: Login with admin credentials
5. **Browse products**: Check product listing
6. **Test payment flow** (with test cards first):
   - Add items to cart
   - Proceed to checkout
   - Complete payment
   - Verify order creation

### Razorpay Test in Production

Use Razorpay test cards even in live mode for testing:
- Card: 4111 1111 1111 1111
- CVV: 123
- Expiry: Any future date

## Step 6: Custom Domain (Optional)

### Add Custom Domain to Vercel

1. Go to Vercel Project → Settings → Domains
2. Add your domain (e.g., `fruitland.com`)
3. Follow DNS configuration instructions
4. Update `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` to your custom domain

### Update Razorpay Webhook

If using custom domain, update webhook URL in Razorpay Dashboard.

## Step 7: Monitoring & Maintenance

### Enable Vercel Analytics

1. Go to Vercel Project → Analytics
2. Enable Web Analytics (free tier available)
3. Monitor page views, performance, and errors

### Database Monitoring

- **Vercel Postgres**: Built-in monitoring dashboard
- **Supabase**: Database insights in dashboard
- **PlanetScale**: Insights tab

### Regular Maintenance

- **Monitor logs**: Check Vercel function logs for errors
- **Database backups**: Ensure automatic backups are enabled
- **Security updates**: Regularly update dependencies
- **Razorpay reconciliation**: Match payment records with orders

## Environment Variables Reference

### Required for Production

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `NEXTAUTH_URL` | Your production URL | `https://app.vercel.app` |
| `NEXTAUTH_SECRET` | Secure random string (32+ chars) | Generate with openssl |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay Live Key ID | `rzp_live_...` |
| `RAZORPAY_KEY_SECRET` | Razorpay Live Secret | Keep secure! |
| `NEXT_PUBLIC_APP_URL` | Public app URL | Same as NEXTAUTH_URL |

## Troubleshooting

### Build Fails

- Check Vercel build logs
- Ensure all dependencies are in `package.json`
- Verify TypeScript has no errors: `npm run build` locally

### Database Connection Issues

- Verify DATABASE_URL is correct
- Check if database allows external connections
- Ensure IP whitelist includes Vercel IPs (or allow all)

### Razorpay Payment Not Working

- Verify you're using **live** keys, not test keys
- Check Razorpay dashboard for failed payments
- Ensure CORS is not blocking requests
- Verify webhook signature validation

### NextAuth Session Issues

- Ensure NEXTAUTH_SECRET is set correctly
- Verify NEXTAUTH_URL matches your domain exactly
- Check browser cookies are not blocked

## Security Checklist

- ✅ All environment variables are set
- ✅ Using LIVE Razorpay keys (not test)
- ✅ NEXTAUTH_SECRET is cryptographically secure
- ✅ Database credentials are secured
- ✅ .env file is in .gitignore
- ✅ Webhooks are secured with signature verification
- ✅ HTTPS is enabled (Vercel provides by default)
- ✅ Rate limiting considered for APIs
- ✅ Input validation on all forms

## Performance Optimization

### Enable Vercel Edge Functions (Optional)

For faster API responses, consider Edge Functions for:
- Authentication
- Product listing
- Basic CRUD operations

### Database Optimization

- Add indexes to frequently queried fields
- Use connection pooling (PgBouncer for PostgreSQL)
- Enable caching for product listings

### Image Optimization

Next.js automatically optimizes images with `next/image`.
For custom domains, configure in `next.config.ts`.

## Backup Strategy

### Database Backups

- **Vercel Postgres**: Automatic daily backups
- **Supabase**: Point-in-time recovery available
- **Manual**: Schedule `pg_dump` via cron job

### Code Backups

- GitHub serves as primary backup
- Consider GitHub Actions for automated backups

## Scaling Considerations

As your application grows:

1. **Database**: Upgrade to higher tier or implement read replicas
2. **CDN**: Vercel provides global CDN by default
3. **Caching**: Implement Redis for session/data caching
4. **Queue System**: Use Vercel Cron or external queue for subscriptions
5. **Email Service**: Integrate SendGrid, Resend, or AWS SES

## Support & Resources

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **Razorpay Docs**: https://razorpay.com/docs

## Success!

Your Fruitland application is now live in production! 🎉

**Remember**: Always test thoroughly in production with small transactions before going live to customers.
