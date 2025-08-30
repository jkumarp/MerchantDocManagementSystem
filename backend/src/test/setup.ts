import { beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Setup test database
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/dms_test';
  process.env.JWT_ACCESS_SECRET = 'test-secret-key-for-testing-only';
});

afterAll(async () => {
  await prisma.$disconnect();
});