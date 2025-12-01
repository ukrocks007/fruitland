'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Plus, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Product } from '@prisma/client';
import { useState } from 'react';
import { toast } from 'sonner';

interface FeaturedProductsProps {
    products: Product[];
}

export function FeaturedProducts({ products }: FeaturedProductsProps) {
    const [addingToCart, setAddingToCart] = useState<Record<string, boolean>>({});

    const addToCart = async (product: Product) => {
        setAddingToCart(prev => ({ ...prev, [product.id]: true }));
        try {
            const res = await fetch('/api/cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: product.id,
                    quantity: 1,
                }),
            });

            if (!res.ok) {
                const error = await res.json();
                toast.error(error.error || 'Failed to add to cart');
                return;
            }

            window.dispatchEvent(new Event('cartUpdated'));
            toast.success(`${product.name} added to cart!`);
        } catch (error) {
            console.error('Error adding to cart:', error);
            toast.error('Failed to add item to cart');
        } finally {
            setAddingToCart(prev => ({ ...prev, [product.id]: false }));
        }
    };

    if (!products || products.length === 0) {
        return null;
    }

    return (
        <section className="py-20 bg-gray-50">
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-end mb-12">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">Fresh Arrivals</h2>
                        <p className="text-gray-600">Handpicked for quality and taste</p>
                    </div>
                    <Link href="/products">
                        <Button variant="ghost" className="text-green-700 hover:text-green-800 hover:bg-green-50">
                            View All
                        </Button>
                    </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {products.map((product, index) => (
                        <motion.div
                            key={product.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            viewport={{ once: true }}
                        >
                            <Card className="border-none shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group h-full flex flex-col">
                                <div className={`h-48 bg-white flex items-center justify-center relative overflow-hidden`}>
                                    <Badge className="absolute top-4 left-4 bg-white/90 text-gray-900 hover:bg-white shadow-sm backdrop-blur-sm z-10">
                                        {product.isSeasonal ? 'Seasonal' : 'Fresh'}
                                    </Badge>
                                    {product.image ? (
                                        <img
                                            src={product.image}
                                            alt={product.name}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        />
                                    ) : (
                                        <span className="text-8xl filter drop-shadow-lg group-hover:scale-110 transition-transform duration-300">
                                            🍎
                                        </span>
                                    )}
                                </div>
                                <CardContent className="p-5 flex-grow">
                                    <div className="flex items-center gap-1 text-yellow-500 text-sm mb-2">
                                        <Star className="w-4 h-4 fill-current" />
                                        <span className="font-medium text-gray-900">4.8</span>
                                        <span className="text-gray-400">(120)</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">{product.name}</h3>
                                    <p className="text-gray-500 text-sm mb-4">₹{product.price}</p>
                                </CardContent>
                                <CardFooter className="p-5 pt-0 mt-auto">
                                    <Button
                                        className="w-full bg-white text-green-700 border-2 border-green-100 hover:bg-green-50 hover:border-green-200 shadow-none font-semibold"
                                        onClick={() => addToCart(product)}
                                        disabled={addingToCart[product.id]}
                                    >
                                        {addingToCart[product.id] ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                            <Plus className="w-4 h-4 mr-2" />
                                        )}
                                        Add to Cart
                                    </Button>
                                </CardFooter>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
