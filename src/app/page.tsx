import { Navbar } from '@/components/navbar';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Hero } from '@/components/landing/Hero';
import { CategoryRail } from '@/components/landing/CategoryRail';
import { FeaturedProducts } from '@/components/landing/FeaturedProducts';
import { Testimonials } from '@/components/landing/Testimonials';
import { TrustBadges } from '@/components/landing/TrustBadges';
import { Footer } from '@/components/footer';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { getFeaturedProducts, getHeroProduct, getCategories } from '@/lib/products';
import { getStoreConfig } from '@/lib/store-config';

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const featuredProducts = await getFeaturedProducts();
  const heroProduct = await getHeroProduct();
  const categories = await getCategories();
  const config = await getStoreConfig();
  const landingConfig = config.landingPage;

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-green-100 selection:text-green-900">
      <Navbar />

      <main>
        <Hero
          product={heroProduct}
          title={landingConfig?.hero.title}
          subtitle={landingConfig?.hero.subtitle}
          badgeText={landingConfig?.hero.badgeText}
          ctaText={landingConfig?.hero.ctaText}
          imageUrl={landingConfig?.hero.imageUrl}
        />
        <CategoryRail categories={categories} />
        <FeaturedProducts products={featuredProducts} />
        <TrustBadges features={landingConfig?.features} />
        <Testimonials testimonials={landingConfig?.testimonials} />

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
                Join thousands of happy families who trust Fruitland for their daily dose of fresh, organic nutrition.
              </p>
              <Link href="/auth/signup">
                <Button size="lg" className="h-14 px-10 text-lg bg-yellow-500 hover:bg-yellow-400 text-green-900 font-bold rounded-full shadow-xl hover:shadow-yellow-500/20 transition-all">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </section>
        )}
      </main>

      <Footer siteName={config.siteName} config={config.footer} />
    </div>
  );
}
