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
import { getFeaturedProducts, getHeroProduct, getCategories } from '@/lib/products';

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const featuredProducts = await getFeaturedProducts();
  const heroProduct = await getHeroProduct();
  const categories = await getCategories();

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-blue-100 selection:text-blue-900">
      <Navbar />

      <main>
        <Hero product={heroProduct} />
        <CategoryRail categories={categories} />
        <FeaturedProducts products={featuredProducts} />
        <TrustBadges />
        <Testimonials />

        {/* CTA Section - Only show for non-logged-in users */}
        {!session && (
          <section className="bg-blue-900 text-white py-24 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
              <div className="absolute right-0 top-0 w-96 h-96 bg-cyan-400 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute left-0 bottom-0 w-96 h-96 bg-blue-400 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
            </div>

            <div className="container mx-auto px-4 text-center relative z-10">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                Start Your Purity Journey Today
              </h2>
              <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
                Join thousands of happy families who trust Hazare Dairy for their daily supply of fresh, pure milk.
              </p>
              <Link href="/auth/signup">
                <Button size="lg" className="h-14 px-10 text-lg bg-yellow-500 hover:bg-yellow-400 text-blue-900 font-bold rounded-full shadow-xl hover:shadow-yellow-500/20 transition-all">
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
              <h3 className="text-white text-lg font-bold mb-4">Hazare Dairy Farm</h3>
              <p className="text-sm leading-relaxed">
                Delivering 100% pure, farm-fresh milk and dairy products directly to your doorstep. Quality you can trust.
              </p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Shop</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/products" className="hover:text-white transition">All Products</Link></li>
                <li><Link href="/subscriptions" className="hover:text-white transition">Subscriptions</Link></li>
                <li><Link href="/products?category=seasonal" className="hover:text-white transition">Seasonal</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/about" className="hover:text-white transition">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-white transition">Contact</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Newsletter</h4>
              <p className="text-sm mb-4">Subscribe for updates.</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Email address"
                  className="bg-gray-800 border-none rounded-lg px-4 py-2 text-sm w-full focus:ring-1 focus:ring-blue-500"
                />
                <Button size="sm" className="bg-blue-600 hover:bg-blue-500">
                  Join
                </Button>
              </div>
            </div>
          </div>
          <div className="text-center pt-8 border-t border-gray-800 text-sm">
            <p>&copy; {new Date().getFullYear()} Hazare Dairy Farm. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
