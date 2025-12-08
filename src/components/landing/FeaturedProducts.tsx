'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Product } from '@prisma/client';
import { useEffect, useState } from 'react';
import ProductCard from '@/components/ProductCard';

interface FeaturedProductsProps {
    products: Product[];
    tenantSlug?: string;
}

interface CartItem {
    id: string;
    productId: string;
    quantity: number;
}

export function FeaturedProducts({ products, tenantSlug }: FeaturedProductsProps) {
    const [cartMap, setCartMap] = useState<Map<string, CartItem>>(new Map());
    const [loadingCart, setLoadingCart] = useState(true);
    const baseUrl = tenantSlug ? `/${tenantSlug}` : '';

    useEffect(() => {
        let cancelled = false;
        async function loadCart() {
            setLoadingCart(true);
            try {
                const url = tenantSlug ? `/api/cart?tenantSlug=${tenantSlug}` : '/api/cart';
                const res = await fetch(url);
                if (res.ok) {
                    const items = await res.json();
                    const map = new Map<string, CartItem>();
                    items.forEach((it: any) => {
                        map.set(it.productId, { id: it.id, productId: it.productId, quantity: it.quantity });
                    });
                    if (!cancelled) setCartMap(map);
                }
            } finally {
                if (!cancelled) setLoadingCart(false);
            }
        }
        loadCart();
        return () => {
            cancelled = true;
        };
    }, [tenantSlug]);

    const setQuantity = async (productId: string, nextQty: number) => {
        const current = cartMap.get(productId);
        if (!current) {
            const url = tenantSlug ? `/api/cart?tenantSlug=${tenantSlug}` : '/api/cart';
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId, quantity: nextQty }),
            });
            if (res.ok) {
                const item = await res.json();
                const newMap = new Map(cartMap);
                newMap.set(productId, { id: item.id, productId, quantity: item.quantity });
                setCartMap(newMap);
                window.dispatchEvent(new Event('cartUpdated'));
            }
            return;
        }
        const res = await fetch(`/api/cart/${current.id}?tenantSlug=${tenantSlug ?? ''}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'x-tenant-slug': tenantSlug ?? '' },
            body: JSON.stringify({ quantity: nextQty }),
        });
        if (res.ok) {
            const item = await res.json();
            const newMap = new Map(cartMap);
            newMap.set(productId, { id: item.id, productId, quantity: item.quantity });
            setCartMap(newMap);
            window.dispatchEvent(new Event('cartUpdated'));
        }
    };

    const removeItem = async (productId: string) => {
        const current = cartMap.get(productId);
        if (!current) return;
        const res = await fetch(`/api/cart/${current.id}?tenantSlug=${tenantSlug ?? ''}`, {
            method: 'DELETE',
            headers: { 'x-tenant-slug': tenantSlug ?? '' },
        });
        if (res.ok) {
            const newMap = new Map(cartMap);
            newMap.delete(productId);
            setCartMap(newMap);
            window.dispatchEvent(new Event('cartUpdated'));
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
                    <Link href={`${baseUrl}/products`}>
                        <Button variant="ghost" className="text-green-700 hover:text-green-800 hover:bg-green-50">
                            View All
                        </Button>
                    </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {products.map((product, index) => {
                        const ci = cartMap.get(product.id);
                        return (
                            <motion.div
                                key={product.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                viewport={{ once: true }}
                            >
                                <ProductCard
                                    product={product}
                                    tenantSlug={tenantSlug || ''}
                                    initialQuantity={ci?.quantity || 0}
                                    onIncrease={() => setQuantity(product.id, (ci?.quantity || 0) + 1)}
                                    onDecrease={() => {
                                        const q = (ci?.quantity || 0) - 1;
                                        if (q <= 0) removeItem(product.id);
                                        else setQuantity(product.id, q);
                                    }}
                                    onAdd={() => setQuantity(product.id, 1)}
                                />
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
