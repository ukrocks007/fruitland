'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, Droplet } from 'lucide-react';
import Link from 'next/link';
import { Product } from '@prisma/client';

interface HeroProps {
    product?: Product | null;
}

export function Hero({ product }: HeroProps) {
    // Default values if no product is provided
    const productName = product?.name || "Pure Cow Milk";
    const productPrice = product?.price || 70;
    const productImage = product?.image || "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400";
    const productDescription = product?.description || "Experience the purity of farm-fresh milk delivered to your doorstep every morning. No preservatives, just nature's goodness.";

    return (
        <section className="relative overflow-hidden bg-blue-50 pt-16 pb-24 lg:pt-32 lg:pb-40">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 right-0 -z-10 h-[600px] w-[600px] rounded-full bg-blue-100 blur-3xl opacity-60 translate-x-1/3 -translate-y-1/4" />
            <div className="absolute bottom-0 left-0 -z-10 h-[400px] w-[400px] rounded-full bg-cyan-100 blur-3xl opacity-60 -translate-x-1/3 translate-y-1/4" />

            <div className="container mx-auto px-4">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    {/* Text Content */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-center lg:text-left"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-800 text-sm font-medium mb-6">
                            <Droplet className="w-4 h-4" />
                            <span>100% Pure & Hygienic</span>
                        </div>
                        <h1 className="text-5xl lg:text-7xl font-bold text-gray-900 leading-[1.1] mb-6 tracking-tight">
                            Freshness <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
                                Delivered Daily
                            </span>
                        </h1>
                        <p className="text-xl text-gray-600 mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                            {productDescription}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                            <Link href="/products">
                                <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-blue-600 hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-600/25">
                                    Our Products
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            </Link>
                            <Link href="/subscriptions">
                                <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full border-2 border-gray-200 hover:border-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-all">
                                    View Plans
                                </Button>
                            </Link>
                        </div>

                        <div className="mt-10 flex items-center justify-center lg:justify-start gap-8 text-sm text-gray-500 font-medium">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                Morning 7 AM Delivery
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                No Minimum Order
                            </div>
                        </div>
                    </motion.div>

                    {/* Visual Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="relative"
                    >
                        <Link
                            href={product ? `/products/${product.id}` : '/products'}
                            aria-label={`View ${productName}`}
                            className="group"
                        >
                            <div className="relative z-10 bg-white rounded-3xl p-6 shadow-2xl rotate-3 group-hover:rotate-0 hover:rotate-0 transition-transform duration-500 border border-gray-100 cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200">
                                <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-blue-100 to-cyan-50 flex items-center justify-center overflow-hidden">
                                    {productImage ? (
                                        <img
                                            src={productImage}
                                            alt={productName}
                                            className="w-full h-full object-cover animate-bounce-slow group-hover:scale-105 transition-transform duration-300"
                                        />
                                    ) : (
                                        <span className="text-9xl filter drop-shadow-2xl animate-bounce-slow">🥛</span>
                                    )}
                                </div>
                                <div className="mt-4 flex justify-between items-end">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">{productName}</h3>
                                        <p className="text-gray-500 text-sm">Farm Fresh</p>
                                    </div>
                                    <div className="text-blue-700 font-bold text-xl">₹{productPrice}</div>
                                </div>
                            </div>
                        </Link>

                        {/* Floating Elements */}
                        <motion.div
                            animate={{ y: [0, -20, 0] }}
                            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                            className="absolute -top-12 -right-8 bg-white p-4 rounded-2xl shadow-xl z-20 hidden md:block"
                        >
                            <span className="text-4xl">🧀</span>
                        </motion.div>
                        <motion.div
                            animate={{ y: [0, 20, 0] }}
                            transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
                            className="absolute -bottom-8 -left-8 bg-white p-4 rounded-2xl shadow-xl z-20 hidden md:block"
                        >
                            <span className="text-4xl">🥛</span>
                        </motion.div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
