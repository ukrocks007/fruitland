'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, Leaf } from 'lucide-react';
import Link from 'next/link';
import { Product } from '@prisma/client';

interface HeroProps {
    product?: Product | null;
    tenantSlug?: string;
}

export function Hero({ product, tenantSlug }: HeroProps) {
    // Default values if no product is provided
    const productName = product?.name || "Alphonso Mangoes";
    const productPrice = product?.price || 899;
    const productImage = product?.image;
    const productDescription = product?.description || "Experience the true taste of nature with our hand-picked, seasonal fruits. From local orchards to your doorstep in 24 hours.";
    const baseUrl = tenantSlug ? `/${tenantSlug}` : '';


    return (
        <section className="relative overflow-hidden bg-[#FDFBF7] pt-16 pb-24 lg:pt-32 lg:pb-40">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 right-0 -z-10 h-[600px] w-[600px] rounded-full bg-green-50 blur-3xl opacity-60 translate-x-1/3 -translate-y-1/4" />
            <div className="absolute bottom-0 left-0 -z-10 h-[400px] w-[400px] rounded-full bg-orange-50 blur-3xl opacity-60 -translate-x-1/3 translate-y-1/4" />

            <div className="container mx-auto px-4">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    {/* Text Content */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-center lg:text-left"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-800 text-sm font-medium mb-6">
                            <Leaf className="w-4 h-4" />
                            <span>100% Organic & Farm Fresh</span>
                        </div>
                        <h1 className="text-5xl lg:text-7xl font-bold text-gray-900 leading-[1.1] mb-6 tracking-tight">
                            Nature's Sweetest <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-500">
                                Bounty
                            </span>
                            , Delivered.
                        </h1>
                        <p className="text-xl text-gray-600 mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                            {productDescription}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                            <Link href={`${baseUrl}/products`}>
                                <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-green-700 hover:bg-green-800 transition-all shadow-lg hover:shadow-green-700/25">
                                    Shop Fresh
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            </Link>
                            <Link href={`${baseUrl}/subscriptions`}>
                                <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full border-2 border-gray-200 hover:border-green-600 hover:text-green-700 hover:bg-green-50 transition-all">
                                    View Plans
                                </Button>
                            </Link>
                        </div>

                        <div className="mt-10 flex items-center justify-center lg:justify-start gap-8 text-sm text-gray-500 font-medium">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                Same Day Delivery
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500" />
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
                        <div className="relative z-10 bg-white rounded-3xl p-6 shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500 border border-gray-100">
                            <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center overflow-hidden">
                                {productImage ? (
                                    <img
                                        src={productImage}
                                        alt={productName}
                                        className="w-full h-full object-cover animate-bounce-slow"
                                    />
                                ) : (
                                    <span className="text-9xl filter drop-shadow-2xl animate-bounce-slow">🥭</span>
                                )}
                            </div>
                            <div className="mt-4 flex justify-between items-end">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">{productName}</h3>
                                    <p className="text-gray-500 text-sm">Fresh from Farm</p>
                                </div>
                                <div className="text-green-700 font-bold text-xl">₹{productPrice}</div>
                            </div>
                        </div>

                        {/* Floating Elements */}
                        <motion.div
                            animate={{ y: [0, -20, 0] }}
                            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                            className="absolute -top-12 -right-8 bg-white p-4 rounded-2xl shadow-xl z-20 hidden md:block"
                        >
                            <span className="text-4xl">🍓</span>
                        </motion.div>
                        <motion.div
                            animate={{ y: [0, 20, 0] }}
                            transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
                            className="absolute -bottom-8 -left-8 bg-white p-4 rounded-2xl shadow-xl z-20 hidden md:block"
                        >
                            <span className="text-4xl">🥑</span>
                        </motion.div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
