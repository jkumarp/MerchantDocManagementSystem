import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../server.js';
import { requireAuth, requirePerm, requireMerchantAccess } from '../middleware/auth.js';
import { PERMISSIONS } from '../types/auth.js';
import { Prisma } from '@prisma/client';

const router = Router();

const createMerchantSchema = z.object({
  legalName: z.string().min(2),
  businessType: z.string(),
  gstin: z.string().optional(),
  addressLine1: z.string().min(5),
  addressLine2: z.string().optional(),
  city: z.string().min(2),
  state: z.string().min(2),
  country: z.string().min(2),
  postalCode: z.string().min(5),
  contactEmail: z.string().email(),
  contactPhone: z.string().optional(),
});

const updateMerchantSchema = createMerchantSchema.partial();

// Create merchant (Admin only)
router.post('/', requireAuth, requirePerm(PERMISSIONS.MERCHANT_WRITE), async (req, res) => {
  try {
    const data = createMerchantSchema.parse(req.body);

    const merchant = await prisma.merchant.create({
      data: {
        ...data,
        gstin: data.gstin ?? null,
        addressLine2: data.addressLine2 ?? null,
        contactPhone: data.contactPhone ?? null,
      },
    });

    // Log creation
    await prisma.auditLog.create({
      data: {
        actorId: (req as any).user.sub,
        action: 'MERCHANT.CREATE',
        targetId: merchant.id,
        ip: req.ip ?? null,
        userAgent: req.headers['user-agent'] ?? null,
      },
    });

    res.status(201).json(merchant);
  } catch (error) {
    console.error('Create merchant error:', error);
    res.status(500).json({ error: 'Failed to create merchant' });
  }
});

// Get merchant
router.get('/:merchantId', requireAuth, requireMerchantAccess, async (req, res) => {
  try {
    const { merchantId } = req.params;

    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId as string},
      include: {
        kyc: true,
        _count: {
          select: {
            users: true,
            documents: { where: { isDeleted: false } },
          },
        },
      },
    });

    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    return res.json(merchant);
  } catch (error) {
    console.error('Get merchant error:', error);
    return res.status(500).json({ error: 'Failed to get merchant' });
  }
});

// Update merchant
router.patch('/:merchantId', requireAuth, requireMerchantAccess, requirePerm(PERMISSIONS.MERCHANT_WRITE), async (req, res) => {
  try {
    const { merchantId } = req.params;
    const data = updateMerchantSchema.parse(req.body);

    const updateData: Prisma.MerchantUpdateInput = {
      ...(data.legalName !== undefined && { legalName: data.legalName }),
      ...(data.businessType !== undefined && { businessType: data.businessType }),
      ...(data.gstin !== undefined && { gstin: data.gstin || null }),
      ...(data.addressLine1 !== undefined && { addressLine1: data.addressLine1 }),
      ...(data.addressLine2 !== undefined && { addressLine2: data.addressLine2 || null }),
      ...(data.city !== undefined && { city: data.city }),
      ...(data.state !== undefined && { state: data.state }),
      ...(data.country !== undefined && { country: data.country }),
      ...(data.postalCode !== undefined && { postalCode: data.postalCode }),
      ...(data.contactEmail !== undefined && { contactEmail: data.contactEmail }),
      ...(data.contactPhone !== undefined && { contactPhone: data.contactPhone || null }),
    };
    const merchant = await prisma.merchant.update({
      where: { id: merchantId as string},
      data:updateData,
    });

    // Log update
    await prisma.auditLog.create({
      data: {
        actorId: (req as any).user.sub,
        merchantId: null,
        action: 'MERCHANT.UPDATE',
        targetId: merchantId ?? null,
        ip: req.ip ?? null,
        userAgent: req.headers['user-agent'] ?? null,
        metadata: { changes: Object.keys(data)} ,
      },
    });

    res.json(merchant);
  } catch (error) {
    console.error('Update merchant error:', error);
    res.status(500).json({ error: 'Failed to update merchant' });
  }
});

// Get merchant summary for dashboard
router.get('/:merchantId/summary', requireAuth, requireMerchantAccess, async (req, res) => {
  try {
    const { merchantId } = req.params;

    const [merchant, kycStatus, documentCounts, recentDocs] = await Promise.all([
      prisma.merchant.findUnique({
        where: { id: merchantId as string},
        select: { id: true, legalName: true, createdAt: true },
      }),
      prisma.kyc.findUnique({
        where: {id: merchantId as string},
        select: { panStatus: true, aadhaarStatus: true },
      }),
      prisma.document.groupBy({
        by: ['category'],
        where: {id: merchantId as string, isDeleted: false },
        _count: { id: true },
      }),
      prisma.document.findMany({
        where: { id: merchantId as string, isDeleted: false },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          filename: true,
          category: true,
          createdAt: true,
          uploadedBy: { select: { name: true } },
        },
      }),
    ]);

    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    const summary = {
      merchant,
      kyc: {
        panVerified: kycStatus?.panStatus === 'VERIFIED',
        aadhaarVerified: kycStatus?.aadhaarStatus === 'VERIFIED',
        overallStatus: (kycStatus?.panStatus === 'VERIFIED' && kycStatus?.aadhaarStatus === 'VERIFIED') 
          ? 'COMPLETE' : 'PENDING',
      },
      documents: {
        total: documentCounts.reduce((sum, cat) => sum + cat._count.id, 0),
        byCategory: documentCounts.reduce((acc, cat) => {
          acc[cat.category] = cat._count.id;
          return acc;
        }, {} as Record<string, number>),
        recent: recentDocs,
      },
    };

    return res.json(summary);
  } catch (error) {
    console.error('Get merchant summary error:', error);
    return res.status(500).json({ error: 'Failed to get merchant summary' });
  }
});

// List merchants (Admin only)
router.get('/', requireAuth, requirePerm(PERMISSIONS.MERCHANT_READ), async (req, res) => {
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
          _count: {
            select: {
              users: true,
              documents: { where: { isDeleted: false } },
            },
          },
          kyc: {
            select: { panStatus: true, aadhaarStatus: true },
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
    console.error('List merchants error:', error);
    res.status(500).json({ error: 'Failed to list merchants' });
  }
});

export default router;