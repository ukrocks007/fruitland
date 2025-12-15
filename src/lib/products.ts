import { prisma } from '@/lib/prisma';

export async function getFeaturedProducts() {
    try {
        const products = await prisma.product.findMany({
            where: {
                isAvailable: true,
            },
            take: 4,
            orderBy: {
                createdAt: 'desc',
            },
        });
        return products;
    } catch (error) {
        console.error('Error fetching featured products:', error);
        return [];
    }
}

export async function getHeroProduct() {
    try {
        // Try to find a seasonal product first, otherwise fallback to any available product
        const product = await prisma.product.findFirst({
            where: {
                isAvailable: true,
                OR: [
                    { name: { contains: 'Mango' } },
                    { isSeasonal: true }
                ]
            },
            orderBy: {
                price: 'desc',
            },
        });

        if (!product) {
            // Fallback if no specific hero product found
            return await prisma.product.findFirst({
                where: { isAvailable: true }
            });
        }

        return product;
    } catch (error) {
        console.error('Error fetching hero product:', error);
        return null;
    }
}

export async function getCategories() {
    try {
        // Get all unique categories
        const categories = await prisma.product.findMany({
            select: {
                category: true,
            },
            where: {
                isAvailable: true,
            },
            distinct: ['category'],
        });

        // Map them to the format expected by the UI
        // We'll add emojis and colors based on the category name
        return categories.map(c => {
            const name = c.category.charAt(0).toUpperCase() + c.category.slice(1).toLowerCase();
            let emoji = '🍎';
            let color = 'bg-red-100';

            switch (c.category.toLowerCase()) {
                case 'fresh':
                    emoji = '🍎';
                    color = 'bg-red-100';
                    break;
                case 'seasonal':
                    emoji = '🥭';
                    color = 'bg-yellow-100';
                    break;
                case 'organic':
                    emoji = '🥑';
                    color = 'bg-emerald-100';
                    break;
                case 'exotic':
                    emoji = '🥝';
                    color = 'bg-purple-100';
                    break;
                case 'milk':
                    emoji = '🥛';
                    color = 'bg-sky-100';
                    break;
                case 'curd':
                    emoji = '🥣';
                    color = 'bg-amber-100';
                    break;
                case 'paneer':
                    emoji = '🧀';
                    color = 'bg-amber-100';
                    break;
                case 'ghee':
                    emoji = '🫙';
                    color = 'bg-amber-100';
                    break;
                case 'butter':
                    emoji = '🧈';
                    color = 'bg-amber-100';
                    break;
                default:
                    emoji = '🧺';
                    color = 'bg-blue-100';
            }

            return {
                name,
                value: c.category,
                emoji,
                color
            };
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        return [];
    }
}
