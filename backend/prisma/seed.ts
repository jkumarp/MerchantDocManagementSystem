import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await argon2.hash('admin123456789');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@dms.com' },
    update: {},
    create: {
      email: 'admin@dms.com',
      passwordHash: adminPassword,
      name: 'System Administrator',
      role: 'ADMIN',
      isActive: true,
    },
  });

  console.log('✅ Created admin user:', admin.email);

  // Create sample merchant
  const merchant = await prisma.merchant.upsert({
    where: { contactEmail: 'contact@acmecorp.com' },
    update: {},
    create: {
      legalName: 'ACME Corporation',
      businessType: 'Private Limited',
      gstin: '29ABCDE1234F1Z5',
      addressLine1: '123 Business Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      postalCode: '400001',
      contactEmail: 'contact@acmecorp.com',
      contactPhone: '+91-9876543210',
    },
  });

  console.log('✅ Created sample merchant:', merchant.legalName);

  // Create merchant admin user
  const merchantAdminPassword = await argon2.hash('merchant123456789');
  const merchantAdmin = await prisma.user.upsert({
    where: { email: 'admin@acmecorp.com' },
    update: {},
    create: {
      email: 'admin@acmecorp.com',
      passwordHash: merchantAdminPassword,
      name: 'John Doe',
      role: 'MERCHANT_ADMIN',
      merchantId: merchant.id,
      isActive: true,
    },
  });

  console.log('✅ Created merchant admin:', merchantAdmin.email);

  // Create sample KYC record
  await prisma.kyc.upsert({
    where: { merchantId: merchant.id },
    update: {},
    create: {
      merchantId: merchant.id,
      panNumber: 'ABCXX1234XX5',
      panStatus: 'PENDING',
      aadhaarLast4: '1234',
      aadhaarStatus: 'PENDING',
    },
  });

  console.log('✅ Created sample KYC record');

  console.log('🎉 Seeding completed!');
  console.log('\n📋 Test Credentials:');
  console.log('Admin: admin@dms.com / admin123456789');
  console.log('Merchant Admin: admin@acmecorp.com / merchant123456789');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });