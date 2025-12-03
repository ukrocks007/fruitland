import { Navbar } from '@/components/navbar';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Hero } from '@/components/landing/Hero';
import { CategoryRail } from '@/components/landing/CategoryRail';
import { FeaturedProducts } from '@/components/landing/FeaturedProducts';
import { Testimonials } from '@/components/landing/Testimonials';
import { TrustBadges } from '@/components/landing/TrustBadges';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { getTenantBySlug } from '@/lib/tenant';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function TenantHomePage({ params }: PageProps) {
  const { tenantSlug } = await params;
  
  // Get tenant
  const tenant = await getTenantBySlug(tenantSlug);
  
  if (!tenant) {
    notFound();
  }
  
  if (!tenant.isActive) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Store Temporarily Unavailable</h1>
          <p className="text-gray-600">This store is currently not accepting orders.</p>
        </div>
      </div>
    );
  }

  const session = await getServerSession(authOptions);

  // Get tenant-specific data
  const featuredProducts = await prisma.product.findMany({
    where: {
      tenantId: tenant.id,
      isAvailable: true,
    },
    take: 8,
    orderBy: { createdAt: 'desc' },
  });

  const heroProduct = featuredProducts[0] || null;

  // Get categories (unique categories from tenant products)
  const categories = await prisma.product.findMany({
    where: {
      tenantId: tenant.id,
      isAvailable: true,
    },
    select: {
      category: true,
    },
    distinct: ['category'],
  });

  const uniqueCategories = categories.map(c => c.category);

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-green-100 selection:text-green-900">
      <Navbar tenantSlug={tenantSlug} />

      <main>
        <Hero product={heroProduct} tenantSlug={tenantSlug} />
        <CategoryRail categories={uniqueCategories} tenantSlug={tenantSlug} />
        <FeaturedProducts products={featuredProducts} tenantSlug={tenantSlug} />
        <TrustBadges />
        <Testimonials />

        {/* CTA Section - Only show for non-logged-in users */}
        {!session && (
          <section className="bg-[#1a472a] text-white py-24 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
              <div className="absolute right-0 top-0 w-96 h-96 bg-yellow-400 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute left-0 bottom-0 w-96 h-96 bg-green-400 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
            </div>

            <div className="container mx-auto px-4 text-center relative z-10">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                Start Your Healthy Journey Today
              </h2>
              <p className="text-xl text-green-100 mb-10 max-w-2xl mx-auto">
                Join thousands of happy families who trust {tenant.name} for their daily dose of fresh, organic nutrition.
              </p>
              <Link href={`/${tenantSlug}/auth/signup`}>
                <Button size="lg" className="h-14 px-10 text-lg bg-yellow-500 hover:bg-yellow-400 text-green-900 font-bold rounded-full shadow-xl hover:shadow-yellow-500/20 transition-all">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </section>
        )}
      </main>

      <footer className="bg-gray-900 text-gray-300 py-12 border-t border-gray-800">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-white text-lg font-bold mb-4">{tenant.name}</h3>
              <p className="text-sm leading-relaxed">
                {tenant.description || 'Delivering nature\'s finest fruits directly from organic farms to your doorstep. Freshness guaranteed.'}
              </p>
              {tenant.contactEmail && (
                <p className="text-sm mt-4">Email: {tenant.contactEmail}</p>
              )}
              {tenant.contactPhone && (
                <p className="text-sm">Phone: {tenant.contactPhone}</p>
              )}
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Shop</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href={`/${tenantSlug}/products`} className="hover:text-white transition">All Products</Link></li>
                <li><Link href={`/${tenantSlug}/subscriptions`} className="hover:text-white transition">Subscriptions</Link></li>
                <li><Link href={`/${tenantSlug}/bulk-orders`} className="hover:text-white transition">Bulk Orders</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Account</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href={`/${tenantSlug}/profile`} className="hover:text-white transition">My Profile</Link></li>
                <li><Link href={`/${tenantSlug}/orders`} className="hover:text-white transition">My Orders</Link></li>
                <li><Link href={`/${tenantSlug}/profile/addresses`} className="hover:text-white transition">Addresses</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Newsletter</h4>
              <p className="text-sm mb-4">Subscribe for fresh updates and offers.</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Email address"
                  className="bg-gray-800 border-none rounded-lg px-4 py-2 text-sm w-full focus:ring-1 focus:ring-green-500"
                />
                <Button size="sm" className="bg-green-600 hover:bg-green-500">
                  Join
                </Button>
              </div>
            </div>
          </div>
          <div className="text-center pt-8 border-t border-gray-800 text-sm">
            <p>&copy; {new Date().getFullYear()} {tenant.name}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
