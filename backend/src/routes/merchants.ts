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

/**
 * @swagger
 * /api/merchants:
 *   post:
 *     summary: Create merchant
 *     description: Create a new merchant (Admin only)
 *     tags: [Merchants]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateMerchantRequest'
 *     responses:
 *       201:
 *         description: Merchant created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Merchant'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *   get:
 *     summary: List merchants
 *     description: Get paginated list of merchants (Admin only)
 *     tags: [Merchants]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of merchants
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 merchants:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Merchant'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
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

/**
 * @swagger
 * /api/merchants/{merchantId}:
 *   get:
 *     summary: Get merchant
 *     description: Get merchant details by ID
 *     tags: [Merchants]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Merchant ID
 *     responses:
 *       200:
 *         description: Merchant details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Merchant'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *   patch:
 *     summary: Update merchant
 *     description: Update merchant information
 *     tags: [Merchants]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Merchant ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               legalName:
 *                 type: string
 *                 minLength: 2
 *                 example: ACME Corporation Ltd.
 *               businessType:
 *                 type: string
 *                 example: Private Limited Company
 *               gstin:
 *                 type: string
 *                 pattern: '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
 *                 example: 29ABCDE1234F1Z5
 *               addressLine1:
 *                 type: string
 *                 minLength: 5
 *                 example: 123 Business Street
 *               addressLine2:
 *                 type: string
 *                 example: Suite 456
 *               city:
 *                 type: string
 *                 minLength: 2
 *                 example: Mumbai
 *               state:
 *                 type: string
 *                 minLength: 2
 *                 example: Maharashtra
 *               country:
 *                 type: string
 *                 minLength: 2
 *                 example: India
 *               postalCode:
 *                 type: string
 *                 minLength: 5
 *                 example: '400001'
 *               contactEmail:
 *                 type: string
 *                 format: email
 *                 example: contact@acmecorp.com
 *               contactPhone:
 *                 type: string
 *                 example: '+91-9876543210'
 *     responses:
 *       200:
 *         description: Merchant updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Merchant'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
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

/**
 * @swagger
 * /api/merchants/{merchantId}/summary:
 *   get:
 *     summary: Get merchant dashboard summary
 *     description: Get merchant summary data for dashboard display
 *     tags: [Merchants]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Merchant ID
 *     responses:
 *       200:
 *         description: Merchant summary data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 merchant:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: clp123merchant456
 *                     legalName:
 *                       type: string
 *                       example: ACME Corporation Ltd.
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2024-01-15T10:30:00Z
 *                 kyc:
 *                   type: object
 *                   properties:
 *                     panVerified:
 *                       type: boolean
 *                       example: true
 *                     aadhaarVerified:
 *                       type: boolean
 *                       example: true
 *                     overallStatus:
 *                       type: string
 *                       enum: [COMPLETE, PENDING]
 *                       example: COMPLETE
 *                 documents:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 15
 *                     byCategory:
 *                       type: object
 *                       additionalProperties:
 *                         type: integer
 *                       example:
 *                         KYC: 3
 *                         CONTRACT: 5
 *                         INVOICE: 7
 *                     recent:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: clp123doc456
 *                           filename:
 *                             type: string
 *                             example: contract.pdf
 *                           category:
 *                             type: string
 *                             example: CONTRACT
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             example: 2024-01-15T10:30:00Z
 *                           uploadedBy:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                                 example: John Doe
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
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