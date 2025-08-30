import { Router } from 'express';
import { prisma } from '../server.js';
import { requireAuth, requirePerm } from '../middleware/auth.js';
import { PERMISSIONS } from '../types/auth.js';

const router = Router();

// Get all merchants (Admin only)
router.get('/merchants', requireAuth, requirePerm(PERMISSIONS.MERCHANT_READ), async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [merchants, total] = await Promise.all([
      prisma.merchant.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          kyc: {
            select: { panStatus: true, aadhaarStatus: true },
          },
          _count: {
            select: {
              users: true,
              documents: { where: { isDeleted: false } },
            },
          },
        },
      }),
      prisma.merchant.count(),
    ]);

    res.json({
      merchants,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Admin list merchants error:', error);
    res.status(500).json({ error: 'Failed to list merchants' });
  }
});

// Get verification queue
router.get('/verifications/queue', requireAuth, requirePerm(PERMISSIONS.KYC_VERIFY), async (req, res) => {
  try {
    const pendingVerifications = await prisma.kyc.findMany({
      where: {
        OR: [
          { panStatus: 'PENDING' },
          { aadhaarStatus: 'PENDING' },
        ],
      },
      include: {
        merchant: {
          select: {
            id: true,
            legalName: true,
            contactEmail: true,
          },
        },
      },
      orderBy: { updatedAt: 'asc' },
    });

    res.json({ verifications: pendingVerifications });
  } catch (error) {
    console.error('Get verification queue error:', error);
    res.status(500).json({ error: 'Failed to get verification queue' });
  }
});

// Get audit logs
router.get('/audit', requireAuth, requirePerm(PERMISSIONS.AUDIT_READ), async (req, res) => {
  try {
    const merchantId = req.query.merchantId as string;
    const action = req.query.action as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (merchantId) where.merchantId = merchantId;
    if (action) where.action = { contains: action };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: { name: true, email: true },
          },
          merchant: {
            select: { legalName: true },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Failed to get audit logs' });
  }
});

// Get system stats
router.get('/stats', requireAuth, requirePerm(PERMISSIONS.AUDIT_READ), async (req, res) => {
  try {
    const [
      totalMerchants,
      totalUsers,
      totalDocuments,
      verifiedMerchants,
      recentActivity,
    ] = await Promise.all([
      prisma.merchant.count(),
      prisma.user.count(),
      prisma.document.count({ where: { isDeleted: false } }),
      prisma.kyc.count({
        where: {
          AND: [
            { panStatus: 'VERIFIED' },
            { aadhaarStatus: 'VERIFIED' },
          ],
        },
      }),
      prisma.auditLog.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      }),
    ]);

    res.json({
      totalMerchants,
      totalUsers,
      totalDocuments,
      verifiedMerchants,
      recentActivity,
      verificationRate: totalMerchants > 0 ? (verifiedMerchants / totalMerchants) * 100 : 0,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get system stats' });
  }
});

export default router;