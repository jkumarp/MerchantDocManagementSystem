import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../server.js';
import { requireAuth, requirePerm, requireMerchantAccess } from '../middleware/auth.js';
import { PERMISSIONS } from '../types/auth.js';
import { MockKycProvider } from '../services/kycProvider.js';

const router = Router();

const kycProvider = new MockKycProvider();

const panVerifySchema = z.object({
  panNumber: z.string().length(10),
  name: z.string().min(2),
  dob: z.string().optional(),
  merchantId: z.string(),
});

const aadhaarInitSchema = z.object({
  aadhaarNumber: z.string().length(12),
  merchantId: z.string(),
});

const aadhaarVerifySchema = z.object({
  txnId: z.string(),
  otp: z.string().length(6),
  merchantId: z.string(),
});

/**
 * @swagger
 * /api/kyc/pan/verify:
 *   post:
 *     summary: Verify PAN
 *     description: Verify PAN card details using external KYC provider
 *     tags: [KYC]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PanVerifyRequest'
 *     responses:
 *       200:
 *         description: PAN verification result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [VERIFIED, FAILED, PENDING]
 *                   example: VERIFIED
 *                 maskedPan:
 *                   type: string
 *                   example: ABCXX1234XX5
 *                   description: Masked PAN number for security
 *                 message:
 *                   type: string
 *                   example: PAN verified successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Verify PAN
router.post('/pan/verify', requireAuth, requireMerchantAccess, requirePerm(PERMISSIONS.KYC_VERIFY), async (req, res) => {
  try {
    const { panNumber, name, dob, merchantId } = panVerifySchema.parse(req.body);
    const user = (req as any).user;

    // Call KYC provider
    const result = await kycProvider.verifyPAN({ pan: panNumber, name });

    // Update or create KYC record
    const kyc = await prisma.kyc.upsert({
      where: { merchantId },
      update: {
        panNumber: result.maskedPan,
        panStatus: result.status,
        checkpoints: {
          ...(await prisma.kyc.findUnique({ where: { merchantId } }))?.checkpoints as any,
          pan: {
            refId: result.refId,
            verifiedAt: new Date(),
            status: result.status,
          },
        },
      },
      create: {
        merchantId,
        panNumber: result.maskedPan,
        panStatus: result.status,
        checkpoints: {
          pan: {
            refId: result.refId,
            verifiedAt: new Date(),
            status: result.status,
          },
        },
      },
    });

    // Log KYC action
    await prisma.auditLog.create({
      data: {
        actorId: user.sub,
        merchantId,
        action: 'KYC.PAN_VERIFY',
        targetId: kyc.id,
        ip: req.ip??null,
        userAgent: req.headers['user-agent']??null,
        metadata: {
          panMasked: result.maskedPan,
          status: result.status,
        },
      },
    });

    res.json({
      status: result.status,
      maskedPan: result.maskedPan,
      message: result.status === 'VERIFIED' ? 'PAN verified successfully' : 'PAN verification failed',
    });
  } catch (error) {
    console.error('PAN verify error:', error);
    res.status(500).json({ error: 'PAN verification failed' });
  }
});

/**
 * @swagger
 * /api/kyc/aadhaar/otp/init:
 *   post:
 *     summary: Initialize Aadhaar OTP
 *     description: Send OTP to mobile number linked with Aadhaar
 *     tags: [KYC]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AadhaarInitRequest'
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 txnId:
 *                   type: string
 *                   example: TXN_1642234567890_abc123
 *                   description: Transaction ID for OTP verification
 *                 message:
 *                   type: string
 *                   example: OTP sent successfully
 *                 maskedAadhaar:
 *                   type: string
 *                   example: XXXX-XXXX-1234
 *                   description: Masked Aadhaar number
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Initialize Aadhaar OTP
router.post('/aadhaar/otp/init', requireAuth, requireMerchantAccess, requirePerm(PERMISSIONS.KYC_VERIFY), async (req, res) => {
  try {
    const { aadhaarNumber, merchantId } = aadhaarInitSchema.parse(req.body);

    const result = await kycProvider.initAadhaarOtp({ aadhaarNumber });

    res.json({
      txnId: result.txnId,
      message: 'OTP sent successfully',
      maskedAadhaar: `XXXX-XXXX-${aadhaarNumber.slice(-4)}`,
    });
  } catch (error) {
    console.error('Aadhaar OTP init error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

/**
 * @swagger
 * /api/kyc/aadhaar/otp/verify:
 *   post:
 *     summary: Verify Aadhaar OTP
 *     description: Verify OTP and complete Aadhaar verification
 *     tags: [KYC]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AadhaarVerifyRequest'
 *     responses:
 *       200:
 *         description: Aadhaar verification result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [VERIFIED, FAILED]
 *                   example: VERIFIED
 *                 last4:
 *                   type: string
 *                   example: '1234'
 *                   description: Last 4 digits of Aadhaar
 *                 message:
 *                   type: string
 *                   example: Aadhaar verified successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Verify Aadhaar OTP
router.post('/aadhaar/otp/verify', requireAuth, requireMerchantAccess, requirePerm(PERMISSIONS.KYC_VERIFY), async (req, res) => {
  try {
    const { txnId, otp, merchantId } = aadhaarVerifySchema.parse(req.body);
    const user = (req as any).user;

    const result = await kycProvider.verifyAadhaarOtp({ txnId, otp });

    // Update KYC record
    const kyc = await prisma.kyc.upsert({
      where: { merchantId },
      update: {
        aadhaarLast4: result.last4,
        aadhaarStatus: result.status,
        checkpoints: {
          ...(await prisma.kyc.findUnique({ where: { merchantId } }))?.checkpoints as any,
          aadhaar: {
            refId: result.refId,
            verifiedAt: new Date(),
            status: result.status,
            last4: result.last4,
          },
        },
      },
      create: {
        merchantId,
        aadhaarLast4: result.last4,
        aadhaarStatus: result.status,
        checkpoints: {
          aadhaar: {
            refId: result.refId,
            verifiedAt: new Date(),
            status: result.status,
            last4: result.last4,
          },
        },
      },
    });

    // Log KYC action
    await prisma.auditLog.create({
      data: {
        actorId: user.sub,
        merchantId,
        action: 'KYC.AADHAAR_VERIFY',
        targetId: kyc.id??null,
        ip: req.ip??null,
        userAgent: req.headers['user-agent']??null,
        metadata: {
          last4: result.last4,
          status: result.status,
        },
      },
    });

    return res.json({
      status: result.status,
      last4: result.last4,
      message: result.status === 'VERIFIED' ? 'Aadhaar verified successfully' : 'Aadhaar verification failed',
    });
  } catch (error) {
    console.error('Aadhaar verify error:', error);
    return res.status(500).json({ error: 'Aadhaar verification failed' });
  }
});

/**
 * @swagger
 * /api/kyc/status:
 *   get:
 *     summary: Get KYC status
 *     description: Get current KYC verification status for a merchant
 *     tags: [KYC]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Merchant ID
 *     responses:
 *       200:
 *         description: KYC status information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 panStatus:
 *                   type: string
 *                   enum: [PENDING, VERIFIED, FAILED]
 *                   example: VERIFIED
 *                 aadhaarStatus:
 *                   type: string
 *                   enum: [PENDING, VERIFIED, FAILED]
 *                   example: VERIFIED
 *                 overallStatus:
 *                   type: string
 *                   enum: [PENDING, COMPLETE]
 *                   example: COMPLETE
 *                 panNumber:
 *                   type: string
 *                   nullable: true
 *                   example: ABCXX1234XX5
 *                   description: Masked PAN number
 *                 aadhaarLast4:
 *                   type: string
 *                   nullable: true
 *                   example: '1234'
 *                   description: Last 4 digits of Aadhaar
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Get KYC status
router.get('/status', requireAuth, async (req, res) => {
  try {
    const merchantId = req.query.merchantId as string;
    const user = (req as any).user;

    // Check access
    if (user.role !== 'ADMIN' && user.mid !== merchantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const kyc = await prisma.kyc.findUnique({
      where: { merchantId },
    });

    if (!kyc) {
      return res.json({
        panStatus: 'PENDING',
        aadhaarStatus: 'PENDING',
        overallStatus: 'PENDING',
      });
    }

    const overallStatus = (kyc.panStatus === 'VERIFIED' && kyc.aadhaarStatus === 'VERIFIED') 
      ? 'COMPLETE' : 'PENDING';

    return res.json({
      panStatus: kyc.panStatus || 'PENDING',
      aadhaarStatus: kyc.aadhaarStatus || 'PENDING',
      overallStatus,
      panNumber: kyc.panNumber,
      aadhaarLast4: kyc.aadhaarLast4,
    });
  } catch (error) {
    console.error('Get KYC status error:', error);
    return res.status(500).json({ error: 'Failed to get KYC status' });
  }
});

export default router;