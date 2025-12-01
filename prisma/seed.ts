import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@fruitland.com' },
    update: {},
    create: {
      email: 'admin@fruitland.com',
      name: 'Admin User',
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
      name: 'Test Customer',
      password: customerPassword,
      role: 'CUSTOMER',
    },
  });
  console.log('✅ Customer user created:', customer.email);

  // Create sample products
  const products = [
    {
      name: 'Fresh Apples',
      description: 'Crisp and juicy red apples, perfect for snacking',
      price: 150,
      image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400',
      category: 'fresh',
      stock: 100,
      isAvailable: true,
      isSeasonal: false,
    },
    {
      name: 'Organic Bananas',
      description: 'Sweet organic bananas from local farms',
      price: 60,
      image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400',
      category: 'organic',
      stock: 150,
      isAvailable: true,
      isSeasonal: false,
    },
    {
      name: 'Seasonal Strawberries',
      description: 'Fresh seasonal strawberries, limited availability',
      price: 250,
      image: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400',
      category: 'seasonal',
      stock: 50,
      isAvailable: true,
      isSeasonal: true,
    },
    {
      name: 'Exotic Mango',
      description: 'Premium Alphonso mangoes from Maharashtra',
      price: 400,
      image: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=400',
      category: 'exotic',
      stock: 30,
      isAvailable: true,
      isSeasonal: true,
    },
    {
      name: 'Fresh Oranges',
      description: 'Vitamin C rich fresh oranges',
      price: 120,
      image: 'https://images.unsplash.com/photo-1547514701-42782101795e?w=400',
      category: 'fresh',
      stock: 200,
      isAvailable: true,
      isSeasonal: false,
    },
    {
      name: 'Organic Avocado',
      description: 'Creamy organic avocados',
      price: 180,
      image: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400',
      category: 'organic',
      stock: 80,
      isAvailable: true,
      isSeasonal: false,
    },
    {
      name: 'Dragon Fruit',
      description: 'Exotic dragon fruit with unique flavor',
      price: 350,
      image: 'https://images.unsplash.com/photo-1527325678964-54921661f888?w=400',
      category: 'exotic',
      stock: 25,
      isAvailable: true,
      isSeasonal: false,
    },
    {
      name: 'Watermelon',
      description: 'Sweet and refreshing watermelon',
      price: 80,
      image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400',
      category: 'seasonal',
      stock: 60,
      isAvailable: true,
      isSeasonal: true,
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
    }
  }
  console.log(`✅ Created ${products.length} products`);

  // Get all products for creating sample orders
  const allProducts = await prisma.product.findMany();
  
  // Create a sample address for the customer
  const customerAddress = await prisma.address.upsert({
    where: { id: 'sample-address-1' },
    update: {},
    create: {
      id: 'sample-address-1',
      userId: customer.id,
      name: 'Test Customer',
      phone: '9876543210',
      addressLine1: '123 Main Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      isDefault: true,
    },
  });
  console.log('✅ Created sample address');

  // Create sample orders to generate recommendation data
  const sampleOrders = [
    // Order 1: Apples, Bananas, Oranges (frequently bought together)
    {
      products: ['Fresh Apples', 'Organic Bananas', 'Fresh Oranges'],
    },
    // Order 2: Apples, Bananas, Strawberries
    {
      products: ['Fresh Apples', 'Organic Bananas', 'Seasonal Strawberries'],
    },
    // Order 3: Mango, Dragon Fruit, Watermelon (exotic/seasonal)
    {
      products: ['Exotic Mango', 'Dragon Fruit', 'Watermelon'],
    },
    // Order 4: Avocado, Bananas, Apples
    {
      products: ['Organic Avocado', 'Organic Bananas', 'Fresh Apples'],
    },
    // Order 5: Apples, Oranges (repeat order)
    {
      products: ['Fresh Apples', 'Fresh Oranges'],
    },
  ];

  let orderCount = 0;
  for (const orderData of sampleOrders) {
    const orderProducts = allProducts.filter(p => orderData.products.includes(p.name));
    if (orderProducts.length === 0) continue;

    const totalAmount = orderProducts.reduce((sum, p) => sum + p.price, 0);
    const orderNumber = `ORD-${Date.now()}-${orderCount}`;

    const existingOrder = await prisma.order.findFirst({
      where: { orderNumber },
    });

    if (!existingOrder) {
      await prisma.order.create({
        data: {
          userId: customer.id,
          addressId: customerAddress.id,
          orderNumber,
          totalAmount,
          status: 'DELIVERED',
          paymentStatus: 'PAID',
          items: {
            create: orderProducts.map(p => ({
              productId: p.id,
              quantity: 1,
              price: p.price,
            })),
          },
        },
      });
      orderCount++;
    }
  }
  console.log(`✅ Created ${orderCount} sample orders for recommendations`);

  console.log('🎉 Seeding completed!');
  console.log('\n📝 Test Credentials:');
  console.log('Admin: admin@fruitland.com / admin123');
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
