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