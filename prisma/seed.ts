import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database for Hazare Dairy Farm...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@hazaredairy.com' },
    update: {},
    create: {
      email: 'admin@hazaredairy.com',
      name: 'Hazare Admin',
      password: adminPassword,
      role: 'ADMIN',
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // Create test customer
  const customerPassword = await bcrypt.hash('customer123', 10);
  const customer = await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: {
      email: 'customer@example.com',
      name: 'Ravi Kumar',
      password: customerPassword,
      role: 'CUSTOMER',
    },
  });
  console.log('✅ Customer user created:', customer.email);

  // Clear existing products to avoid duplicates if re-seeding differently
  // await prisma.product.deleteMany({}); 

  // Create dairy products
  const products = [
    {
      name: 'Cow Milk (1L)',
      description: 'Fresh, pure cow milk. Delivered daily morning.',
      price: 70,
      image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400',
      category: 'MILK',
      stock: 500,
      isAvailable: true,
      fatPercentage: 4.5,
      shelfLifeDays: 2,
      isRefrigerated: true,
    },
    {
      name: 'Cow Milk (500ml)',
      description: 'Fresh, pure cow milk in 500ml pack.',
      price: 38,
      image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400',
      category: 'MILK',
      stock: 500,
      isAvailable: true,
      fatPercentage: 4.5,
      shelfLifeDays: 2,
      isRefrigerated: true,
    },
    {
      name: 'Buffalo Milk (1L)',
      description: 'Rich and creamy buffalo milk. High fat content.',
      price: 85,
      image: 'https://images.unsplash.com/photo-1559598467-f8b76c8155d0?w=400',
      category: 'MILK',
      stock: 300,
      isAvailable: true,
      fatPercentage: 7.0,
      shelfLifeDays: 2,
      isRefrigerated: true,
    },
    {
      name: 'Fresh Curd (500g)',
      description: 'Thick, creamy curd set from pure milk.',
      price: 50,
      image: 'https://images.unsplash.com/photo-1599307767316-77f6b7d6a520?w=400',
      category: 'CURD',
      stock: 100,
      isAvailable: true,
      fatPercentage: 4.0,
      shelfLifeDays: 5,
      isRefrigerated: true,
    },
    {
      name: 'Desi Ghee (500ml)',
      description: 'Aromatic ghee made from traditional bilona method.',
      price: 650,
      image: 'https://images.unsplash.com/photo-1631451095765-2c91616fc9e6?w=400',
      category: 'GHEE',
      stock: 50,
      isAvailable: true,
      shelfLifeDays: 180,
      isRefrigerated: false,
    },
    {
      name: 'Fresh Paneer (200g)',
      description: 'Soft and fresh paneer cubes.',
      price: 90,
      image: 'https://images.unsplash.com/photo-1559598467-f8b76c8155d0?w=400', // Placeholder
      category: 'PANEER',
      stock: 100,
      isAvailable: true,
      fatPercentage: 15.0,
      shelfLifeDays: 3,
      isRefrigerated: true,
    },
  ];

  for (const product of products) {
    const existing = await prisma.product.findFirst({
      where: { name: product.name },
    });

    if (!existing) {
      await prisma.product.create({
        data: product,
      });
    } else {
      // Update existing if needed
      await prisma.product.update({
        where: { id: existing.id },
        data: product
      });
    }
  }
  console.log(`✅ Seeded ${products.length} products`);

  // Create Subscription Packages
  const packages = [
    {
      name: 'Daily Milk Subscription',
      description: 'Get fresh milk delivered to your doorstep every morning.',
      frequency: 'DAILY',
      price: 0, // Pay per delivery calculation usually, or monthly
      features: JSON.stringify(['Free Delivery', 'Morning 6-8 AM', 'Pause Anytime']),
      imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400'
    },
    {
      name: 'Alternate Day Milk',
      description: 'Milk delivery every alternate day.',
      frequency: 'ALTERNATE_DAYS',
      price: 0,
      features: JSON.stringify(['Flexible Schedule', 'Morning 6-8 AM']),
      imageUrl: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400'
    }
  ];

  for (const pkg of packages) {
    const existing = await prisma.subscriptionPackage.findFirst({ where: { name: pkg.name } });
    if (!existing) {
      await prisma.subscriptionPackage.create({ data: pkg });
    }
  }
  console.log(`✅ Seeded subscription packages`);

  // Get products for creating sample orders (Recommendation data)
  const allProducts = await prisma.product.findMany();

  // Create a sample address for the customer
  const customerAddress = await prisma.address.upsert({
    where: { id: 'sample-address-1' },
    update: {},
    create: {
      id: 'sample-address-1',
      userId: customer.id,
      name: 'Ravi Kumar',
      phone: '9876543210',
      addressLine1: 'Flat 402, Hazare Heights',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
      isDefault: true,
    },
  });
  console.log('✅ Created sample address');

  // Create sample orders
  // Order 1: Milk & Curd
  const milk1L = allProducts.find(p => p.name === 'Cow Milk (1L)');
  const curd = allProducts.find(p => p.name === 'Fresh Curd (500g)');

  if (milk1L && curd) {
    await prisma.order.create({
      data: {
        userId: customer.id,
        addressId: customerAddress.id,
        orderNumber: `ORD-${Date.now()}`,
        totalAmount: milk1L.price + curd.price,
        status: 'DELIVERED',
        paymentStatus: 'PAID',
        items: {
          create: [
            { productId: milk1L.id, quantity: 1, price: milk1L.price },
            { productId: curd.id, quantity: 1, price: curd.price }
          ]
        }
      }
    });
  }

  console.log('🎉 Seeding completed!');
  console.log('\n📝 Test Credentials:');
  console.log('Admin: admin@hazaredairy.com / admin123');
  console.log('Customer: customer@example.com / customer123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
