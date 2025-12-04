import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with multi-tenant data...');

  // Create default tenants
  const fruitlandTenant = await prisma.tenant.upsert({
    where: { slug: 'fruitland' },
    update: {},
    create: {
      name: 'Fruitland',
      slug: 'fruitland',
      description: 'Premium fresh fruits delivered to your doorstep',
      contactEmail: 'support@fruitland.com',
      contactPhone: '+91-9876543210',
      isActive: true,
    },
  });
  console.log('✅ Default tenant created:', fruitlandTenant.slug);

  const organicTenant = await prisma.tenant.upsert({
    where: { slug: 'organic-market' },
    update: {},
    create: {
      name: 'Organic Market',
      slug: 'organic-market',
      description: ' 100% organic fruits and vegetables',
      contactEmail: 'hello@organicmarket.com',
      contactPhone: '+91-9876543211',
      isActive: true,
    },
  });
  console.log('✅ Demo tenant created:', organicTenant.slug);

  // Create SUPERADMIN user (no tenantId)
  const superadminPassword = await bcrypt.hash('superadmin123', 10);
  const superadmin = await prisma.user.upsert({
    where: { email: 'superadmin@fruitland.com' },
    update: {},
    create: {
      email: 'superadmin@fruitland.com',
      name: 'Super Admin',
      password: superadminPassword,
      role: 'SUPERADMIN',
      tenantId: null,
    },
  });
  console.log('✅ SUPERADMIN user created:', superadmin.email);

  // Create tenant admin for Fruitland
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@fruitland.com' },
    update: {},
    create: {
      email: 'admin@fruitland.com',
      name: 'Fruitland Admin',
      password: adminPassword,
      role: 'ADMIN',
      tenantId: fruitlandTenant.id,
    },
  });
  console.log('✅ Fruitland admin created:', admin.email);

  // Create tenant admin for Organic Market
  const organicAdminPassword = await bcrypt.hash('admin123', 10);
  const organicAdmin = await prisma.user.upsert({
    where: { email: 'admin@organicmarket.com' },
    update: {},
    create: {
      email: 'admin@organicmarket.com',
      name: 'Organic Market Admin',
      password: organicAdminPassword,
      role: 'ADMIN',
      tenantId: organicTenant.id,
    },
  });
  console.log('✅ Organic Market admin created:', organicAdmin.email);

  // Create test customer for Fruitland
  const customerPassword = await bcrypt.hash('customer123', 10);
  const customer = await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: {
      email: 'customer@example.com',
      name: 'Test Customer',
      password: customerPassword,
      role: 'CUSTOMER',
      tenantId: fruitlandTenant.id,
    },
  });
  console.log('✅ Fruitland customer created:', customer.email);

  // Create test customer for Organic Market
  const organicCustomerPassword = await bcrypt.hash('customer123', 10);
  const organicCustomer = await prisma.user.upsert({
    where: { email: 'customer@organicmarket.com' },
    update: {},
    create: {
      email: 'customer@organicmarket.com',
      name: 'Organic Customer',
      password: organicCustomerPassword,
      role: 'CUSTOMER',
      tenantId: organicTenant.id,
    },
  });
  console.log('✅ Organic Market customer created:', organicCustomer.email);

  // Create sample products for Fruitland
  const fruitlandProducts = [
    {
      name: 'Fresh Apples',
      description: 'Crisp and juicy red apples, perfect for snacking',
      price: 150,
      image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400',
      category: 'fresh',
      stock: 100,
      isAvailable: true,
      isSeasonal: false,
      tenantId: fruitlandTenant.id,
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
      tenantId: fruitlandTenant.id,
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
      tenantId: fruitlandTenant.id,
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
      tenantId: fruitlandTenant.id,
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
      tenantId: fruitlandTenant.id,
    },
  ];

  // Create sample products for Organic Market
  const organicProducts = [
    {
      name: 'Organic Apples',
      description: '100% certified organic apples',
      price: 200,
      image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400',
      category: 'organic',
      stock: 80,
      isAvailable: true,
      isSeasonal: false,
      tenantId: organicTenant.id,
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
      tenantId: organicTenant.id,
    },
    {
      name: 'Dragon Fruit',
      description: 'Exotic organic dragon fruit',
      price: 350,
      image: 'https://images.unsplash.com/photo-1527325678964-54921661f888?w=400',
      category: 'exotic',
      stock: 25,
      isAvailable: true,
      isSeasonal: false,
      tenantId: organicTenant.id,
    },
  ];

  const allProducts = [...fruitlandProducts, ...organicProducts];
  
  for (const product of allProducts) {
    const existing = await prisma.product.findFirst({
      where: { 
        name: product.name,
        tenantId: product.tenantId,
      },
    });
    
    if (!existing) {
      await prisma.product.create({
        data: product,
      });
    }
  }
  console.log(`✅ Created ${allProducts.length} products across tenants`);

  // Create warehouses for Fruitland
  const fruitlandWarehouse = await prisma.warehouse.upsert({
    where: { id: 'warehouse-fruitland-1' },
    update: {},
    create: {
      id: 'warehouse-fruitland-1',
      tenantId: fruitlandTenant.id,
      name: 'Fruitland Main Warehouse',
      city: 'Mumbai',
      pincode: '400001',
      zone: 'West',
      contactName: 'Warehouse Manager',
      contactPhone: '9876543210',
      isActive: true,
    },
  });
  console.log('✅ Fruitland warehouse created');

  // Create warehouse for Organic Market
  const organicWarehouse = await prisma.warehouse.upsert({
    where: { id: 'warehouse-organic-1' },
    update: {},
    create: {
      id: 'warehouse-organic-1',
      tenantId: organicTenant.id,
      name: 'Organic Market Central',
      city: 'Pune',
      pincode: '411001',
      zone: 'West',
      contactName: 'Warehouse Head',
      contactPhone: '9876543212',
      isActive: true,
    },
  });
  console.log('✅ Organic Market warehouse created');

  // Create a sample address for Fruitland customer
  const customerAddress = await prisma.address.upsert({
    where: { id: 'sample-address-fruitland-1' },
    update: {},
    create: {
      id: 'sample-address-fruitland-1',
      userId: customer.id,
      tenantId: fruitlandTenant.id,
      name: 'Test Customer',
      phone: '9876543210',
      addressLine1: '123 Main Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      isDefault: true,
    },
  });
  console.log('✅ Created sample addresses');

  // Create subscription packages for Fruitland
  const fruitlandPackage = await prisma.subscriptionPackage.upsert({
    where: { id: 'package-fruitland-1' },
    update: {},
    create: {
      id: 'package-fruitland-1',
      tenantId: fruitlandTenant.id,
      name: 'Weekly Fresh Box',
      description: 'Fresh fruits delivered weekly',
      frequency: 'WEEKLY',
      price: 500,
      features: JSON.stringify(['5kg mixed fruits', 'Free delivery', 'Cancel anytime']),
      isActive: true,
    },
  });
  console.log('✅ Subscription packages created');

  console.log('\n🎉 Multi-tenant seeding completed!');
  console.log('\n📝 Test Credentials:');
  console.log('SUPERADMIN: superadmin@fruitland.com / superadmin123');
  console.log('\nFruitland Tenant (slug: fruitland):');
  console.log('  Admin: admin@fruitland.com / admin123');
  console.log('  Customer: customer@example.com / customer123');
  console.log('\nOrganic Market Tenant (slug: organic-market):');
  console.log('  Admin: admin@organicmarket.com / admin123');
  console.log('  Customer: customer@organicmarket.com / customer123');
  console.log('\n📍 URLs:');
  console.log('  Superadmin: http://localhost:3000/superadmin');
  console.log('  Fruitland: http://localhost:3000/fruitland');
  console.log('  Organic Market: http://localhost:3000/organic-market');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
