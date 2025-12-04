'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

interface Category {
    name: string;
    value: string;
    emoji: string;
    color: string;
}

interface CategoryRailProps {
    categories: string[] | Category[];
    tenantSlug?: string;
}

export function CategoryRail({ categories, tenantSlug }: CategoryRailProps) {
    if (!categories || categories.length === 0) {
        return null;
    }

    const baseUrl = tenantSlug ? `/${tenantSlug}` : '';

    // Map string categories to full category objects
    const categoryMap: Record<string, { emoji: string; color: string; name: string }> = {
        fresh: { emoji: '🍎', color: 'bg-red-100', name: 'Fresh' },
        seasonal: { emoji: '🍓', color: 'bg-pink-100', name: 'Seasonal' },
        organic: { emoji: '🥬', color: 'bg-green-100', name: 'Organic' },
        exotic: { emoji: '🥭', color: 'bg-yellow-100', name: 'Exotic' },
    };

    const processedCategories: Category[] = categories.map(cat => {
        if (typeof cat === 'string') {
            const mapped = categoryMap[cat] || { emoji: '🍊', color: 'bg-orange-100', name: cat };
            return {
                name: mapped.name,
                value: cat,
                emoji: mapped.emoji,
                color: mapped.color,
            };
        }
        return cat;
    });

    return (
        <section className="py-12 border-b border-gray-100 bg-white">
            <div className="container mx-auto px-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-8">Shop by Category</h2>
                <div className="flex gap-8 overflow-x-auto pb-6 scrollbar-hide snap-x">
                    {processedCategories.map((cat) => (
                        <Link key={cat.name} href={`${baseUrl}/products?category=${cat.value}`} className="snap-start shrink-0 group">
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="flex flex-col items-center gap-3"
                            >
                                <div className={`w-24 h-24 rounded-full ${cat.color} flex items-center justify-center text-4xl shadow-sm group-hover:shadow-md transition-all`}>
                                    {cat.emoji}
                                </div>
                                <span className="font-medium text-gray-700 group-hover:text-green-700 transition-colors">
                                    {cat.name}
                                </span>
                            </motion.div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
