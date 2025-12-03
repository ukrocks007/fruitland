import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with multi-tenant architecture...');

  // Create default tenant
  const defaultTenant = await prisma.tenant.upsert({
    where: { id: 'default-tenant' },
    update: {},
    create: {
      id: 'default-tenant',
      name: 'Default Tenant',
      slug: 'default',
    },
  });
  console.log('✅ Default tenant created:', defaultTenant.name);

  // Create SUPERADMIN user (no tenantId)
  const superadminPassword = await bcrypt.hash('superadmin123', 10);
  const superadmin = await prisma.user.upsert({
    where: { 
      email_tenantId: {
        email: 'superadmin@fruitland.com',
        tenantId: null
      }
    },
    update: {},
    create: {
      email: 'superadmin@fruitland.com',
      name: 'Super Admin',
      password: superadminPassword,
      role: 'SUPERADMIN',
      tenantId: null,
    },
  });
  console.log('✅ Superadmin user created:', superadmin.email);

  // Create admin user for default tenant
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { 
      email_tenantId: {
        email: 'admin@fruitland.com',
        tenantId: defaultTenant.id
      }
    },
    update: {},
    create: {
      email: 'admin@fruitland.com',
      name: 'Admin User',
      password: adminPassword,
      role: 'ADMIN',
      tenantId: defaultTenant.id,
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // Create test customer for default tenant
  const customerPassword = await bcrypt.hash('customer123', 10);
  const customer = await prisma.user.upsert({
    where: { 
      email_tenantId: {
        email: 'customer@example.com',
        tenantId: defaultTenant.id
      }
    },
    update: {},
    create: {
      email: 'customer@example.com',
      name: 'Test Customer',
      password: customerPassword,
      role: 'CUSTOMER',
      tenantId: defaultTenant.id,
    },
  });
  console.log('✅ Customer user created:', customer.email);

  // Create sample products for default tenant
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
      tenantId: defaultTenant.id,
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
      tenantId: defaultTenant.id,
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
      tenantId: defaultTenant.id,
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
      tenantId: defaultTenant.id,
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
      tenantId: defaultTenant.id,
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
      tenantId: defaultTenant.id,
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
      tenantId: defaultTenant.id,
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
      tenantId: defaultTenant.id,
    },
  ];

  for (const product of products) {
    const existing = await prisma.product.findFirst({
      where: { 
        name: product.name,
        tenantId: defaultTenant.id
      },
    });
    
    if (!existing) {
      await prisma.product.create({
        data: product,
      });
    }
  }
  console.log(`✅ Created ${products.length} products for default tenant`);

  console.log('✅ Database seeding completed successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error seeding database:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
