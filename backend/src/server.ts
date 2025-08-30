import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';

import authRoutes from './routes/auth.js';
import merchantRoutes from './routes/merchants.js';
import userRoutes from './routes/users.js';
import documentRoutes from './routes/documents.js';
import kycRoutes from './routes/kyc.js';
import adminRoutes from './routes/admin.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const port = process.env.PORT || 8080;

// Initialize Prisma
export const prisma = new PrismaClient();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Auth rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // limit auth attempts
  skipSuccessfulRequests: true,
});

// Middleware
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Health checks
app.get('/healthz', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/readyz', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: 'Database connection failed' });
  }
});

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/merchants', merchantRoutes);
app.use('/api/users', userRoutes);
app.use('/api/docs', documentRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/admin', adminRoutes);

// Error handling
app.use(errorHandler);

// Start server
app.listen(port, () => {
  console.log(`🚀 API server running on port ${port}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});