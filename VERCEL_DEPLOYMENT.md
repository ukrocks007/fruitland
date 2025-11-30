# Vercel Deployment Guide for Fruitland

## Prerequisites

1. **GitHub Account** - Your code should be pushed to a GitHub repository
2. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
3. **PostgreSQL Database** - For production (recommended: Neon, Supabase, or Vercel Postgres)
4. **Razorpay Account** - For payment processing

## Step-by-Step Deployment

### 1. Prepare Your Database

#### Option A: Vercel Postgres (Recommended)
1. Go to your Vercel dashboard
2. Click "Storage" → "Create Database" → "Postgres"
3. Copy the `DATABASE_URL` connection string

#### Option B: Neon (Free Tier Available)
1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string from "Connection Details"

#### Option C: Supabase
1. Sign up at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Project Settings → Database
4. Copy the "Connection string" (use "Connection pooling" for better performance)

### 2. Push Your Code to GitHub

```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Ready for Vercel deployment"

# Add your GitHub repository as remote
git remote add origin https://github.com/YOUR_USERNAME/fruitland.git

# Push to GitHub
git push -u origin main
```

### 3. Deploy to Vercel

#### Via Vercel Dashboard:

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click "Import Git Repository"
3. Select your GitHub repository
4. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: ./
   - **Build Command**: `prisma generate && next build`
   - **Output Directory**: .next
   - **Install Command**: `npm install`

5. Add Environment Variables (see below)
6. Click "Deploy"

#### Via Vercel CLI:

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (from project root)
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? Select your account
# - Link to existing project? No
# - Project name? fruitland (or your preferred name)
# - Directory? ./
# - Override settings? No
```

### 4. Configure Environment Variables

In Vercel Dashboard → Your Project → Settings → Environment Variables, add:

#### Database
```
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
```

#### NextAuth
```
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your-generated-secret-key
```
Generate secret: `openssl rand -base64 32`

#### Razorpay (Use LIVE keys for production)
```
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxxx
RAZORPAY_KEY_SECRET=your_razorpay_live_secret
```

#### Application Config
```
NEXT_PUBLIC_APP_NAME=Fruitland
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_ENABLE_ONLINE_PAYMENT=true
NEXT_PUBLIC_ENABLE_COD=true
```

### 5. Run Database Migrations

After deployment, you need to set up your database schema:

#### Option 1: Using Vercel CLI
```bash
# Set environment variables locally for migration
export DATABASE_URL="your-production-database-url"

# Run Prisma migrations
npx prisma migrate deploy

# Optional: Seed the database
npm run db:seed
```

#### Option 2: Using Prisma Studio (GUI)
```bash
# Connect to production database
npx prisma studio --schema=./prisma/schema.prisma
```

#### Option 3: Add to package.json and run via Vercel
Add this script to package.json:
```json
"postbuild": "prisma generate"
```

Then create a one-time deployment script:
```bash
# Create a migration from your schema
npx prisma migrate dev --name init

# Push the migration to production
npx prisma migrate deploy
```

### 6. Verify Deployment

1. **Check Build Logs**: Vercel Dashboard → Deployments → Latest Deployment → View Build Logs
2. **Test Your Site**: Visit your deployed URL
3. **Test Authentication**: Try signing up/logging in
4. **Test Database**: Ensure products load correctly
5. **Test Payments**: Use Razorpay test mode first

## Post-Deployment Checklist

- [ ] Database is connected and migrations are run
- [ ] Environment variables are set correctly
- [ ] Authentication (sign up/login) works
- [ ] Products display correctly
- [ ] Cart functionality works
- [ ] Checkout process works
- [ ] Payment integration works (test mode first)
- [ ] Admin panel is accessible
- [ ] Custom domain configured (optional)

## Custom Domain Setup (Optional)

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your custom domain (e.g., `fruitland.com`)
3. Configure DNS records as instructed by Vercel:
   - For root domain: A record pointing to Vercel IP
   - For www: CNAME record pointing to `cname.vercel-dns.com`
4. Wait for DNS propagation (can take up to 48 hours)

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify Prisma schema is valid

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Ensure SSL mode is enabled for production databases
- Check if database allows connections from Vercel IPs

### Environment Variables Not Working
- Make sure variables starting with `NEXT_PUBLIC_` are set for both Production and Preview environments
- Redeploy after adding new environment variables

### Prisma Migration Issues
```bash
# Reset database (⚠️ destroys all data)
npx prisma migrate reset

# Deploy migrations
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```

## Useful Commands

```bash
# Deploy to production
vercel --prod

# Check deployment status
vercel ls

# View logs
vercel logs

# Open project in browser
vercel open

# Pull environment variables from Vercel
vercel env pull

# Add environment variable via CLI
vercel env add DATABASE_URL production
```

## Security Best Practices

1. **Use Strong Secrets**: Generate strong `NEXTAUTH_SECRET`
2. **Secure Database**: Use SSL connections and strong passwords
3. **Environment Variables**: Never commit `.env` files
4. **CORS Settings**: Configure allowed origins if needed
5. **Rate Limiting**: Consider adding rate limiting for API routes
6. **Razorpay Webhooks**: Verify webhook signatures

## Monitoring & Analytics

1. **Vercel Analytics**: Enable in project settings
2. **Error Tracking**: Consider adding Sentry
3. **Performance Monitoring**: Use Vercel Speed Insights

## Continuous Deployment

Once set up, every push to your main branch will automatically:
1. Trigger a new deployment
2. Run build process
3. Deploy to production
4. Previous deployment becomes a rollback point

## Rollback

If something goes wrong:
1. Go to Vercel Dashboard → Deployments
2. Find the last working deployment
3. Click "..." → "Promote to Production"

## Need Help?

- Vercel Documentation: https://vercel.com/docs
- Vercel Support: https://vercel.com/support
- Prisma + Vercel: https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel

## Cost Estimate

- **Vercel Hobby Plan**: Free (includes 100GB bandwidth/month)
- **Vercel Pro**: $20/month (more features, better limits)
- **Database**: 
  - Neon Free: $0 (0.5GB storage)
  - Supabase Free: $0 (500MB storage)
  - Vercel Postgres: Starting at $20/month

---

**Ready to deploy? Run `vercel` in your terminal!** 🚀
