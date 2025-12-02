import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FooterConfig } from '@/lib/store-config';
import { Facebook, Twitter, Instagram } from 'lucide-react';

interface FooterProps {
    siteName: string;
    config?: FooterConfig | null;
}

export function Footer({ siteName, config }: FooterProps) {
    const currentYear = new Date().getFullYear();
    const description = config?.description || "Delivering nature's finest fruits directly from organic farms to your doorstep. Freshness guaranteed.";

    return (
        <footer className="bg-gray-900 text-gray-300 py-12 border-t border-gray-800">
            <div className="container mx-auto px-4">
                <div className="grid md:grid-cols-4 gap-8 mb-8">
                    <div>
                        <h3 className="text-white text-lg font-bold mb-4">{siteName}</h3>
                        <p className="text-sm leading-relaxed">
                            {description}
                        </p>
                        {config?.socialLinks && (
                            <div className="flex gap-4 mt-4">
                                {config.socialLinks.facebook && (
                                    <Link href={config.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                                        <Facebook className="w-5 h-5" />
                                    </Link>
                                )}
                                {config.socialLinks.twitter && (
                                    <Link href={config.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                                        <Twitter className="w-5 h-5" />
                                    </Link>
                                )}
                                {config.socialLinks.instagram && (
                                    <Link href={config.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                                        <Instagram className="w-5 h-5" />
                                    </Link>
                                )}
                            </div>
                        )}
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
                    <p>&copy; {currentYear} {siteName}. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}
