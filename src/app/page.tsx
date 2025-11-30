import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Navbar } from '@/components/navbar';
import { ArrowRight, ShoppingBag, Package, Clock, Shield } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <Navbar />
      
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
          Fresh Fruits Delivered
          <span className="text-green-600"> to Your Door</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Subscribe to seasonal, organic, and exotic fruits. Enjoy hassle-free deliveries
          with flexible subscription plans tailored to your needs.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/products">
            <Button size="lg" className="text-lg px-8">
              Shop Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="/subscription">
            <Button size="lg" variant="outline" className="text-lg px-8">
              Start Subscription
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <ShoppingBag className="h-10 w-10 text-green-600 mb-2" />
              <CardTitle>Fresh Quality</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Hand-picked fresh fruits delivered at peak ripeness
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Package className="h-10 w-10 text-green-600 mb-2" />
              <CardTitle>Flexible Plans</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Weekly, bi-weekly, or monthly subscriptions to fit your lifestyle
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Clock className="h-10 w-10 text-green-600 mb-2" />
              <CardTitle>Easy Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Pause, skip, or cancel anytime with just a few clicks
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-10 w-10 text-green-600 mb-2" />
              <CardTitle>Secure Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Safe and secure payment processing via Razorpay
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Categories */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Our Categories</h2>
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { name: 'Fresh', emoji: '🍊', desc: 'Daily fresh picks' },
            { name: 'Seasonal', emoji: '🍓', desc: 'Best of the season' },
            { name: 'Organic', emoji: '🥑', desc: 'Certified organic' },
            { name: 'Exotic', emoji: '🥭', desc: 'Rare & exotic varieties' },
          ].map((category) => (
            <Link key={category.name} href={`/products?category=${category.name.toLowerCase()}`}>
              <Card className="hover:shadow-lg transition cursor-pointer">
                <CardHeader className="text-center">
                  <div className="text-5xl mb-2">{category.emoji}</div>
                  <CardTitle>{category.name}</CardTitle>
                  <CardDescription>{category.desc}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-green-600 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl mb-8">
            Join thousands of happy customers enjoying fresh fruits every week
          </p>
          <Link href="/auth/signup">
            <Button size="lg" variant="secondary" className="text-lg px-8">
              Create Your Account
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; 2025 Fruitland. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
