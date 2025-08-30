import { Router } from 'express';
import { z } from 'zod';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import { prisma } from '../server.js';
import { requireAuth, requirePerm, requireMerchantAccess } from '../middleware/auth.js';
import { PERMISSIONS } from '../types/auth.js';

const router = Router();

// Initialize S3 client
const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  forcePathStyle: true,
});

const presignSchema = z.object({
  category: z.enum(['KYC', 'CONTRACT', 'INVOICE', 'BANK', 'MISC']),
  mimeType: z.string(),
  sizeBytes: z.number().max(20_000_000), // 20MB limit
  filename: z.string().min(1),
  checksumSha256: z.string(),
});

const saveDocumentSchema = z.object({
  storageKey: z.string(),
  category: z.enum(['KYC', 'CONTRACT', 'INVOICE', 'BANK', 'MISC']),
  filename: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  checksumSha256: z.string(),
  metadata: z.record(z.any()).optional(),
});

// Get presigned upload URL
router.post('/presign', requireAuth, requirePerm(PERMISSIONS.DOC_UPLOAD), async (req, res) => {
  try {
    const { category, mimeType, sizeBytes, filename, checksumSha256 } = presignSchema.parse(req.body);
    const user = (req as any).user;

    if (!user.mid) {
      return res.status(400).json({ error: 'Merchant ID required' });
    }

    // Generate storage key
    const timestamp = Date.now();
    const randomId = crypto.randomUUID();
    const storageKey = `merchants/${user.mid}/${category.toLowerCase()}/${timestamp}-${randomId}`;

    // Create presigned URL
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: storageKey,
      ContentType: mimeType,
      Metadata: {
        checksum: checksumSha256,
        uploadedBy: user.sub,
        merchantId: user.mid,
      },
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 }); // 5 minutes

    res.json({
      uploadUrl,
      storageKey,
      expiresIn: 300,
    });
  } catch (error) {
    console.error('Presign error:', error);
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});

// Save document metadata after upload
router.post('/', requireAuth, requirePerm(PERMISSIONS.DOC_UPLOAD), async (req, res) => {
  try {
    const data = saveDocumentSchema.parse(req.body);
    const user = (req as any).user;

    if (!user.mid) {
      return res.status(400).json({ error: 'Merchant ID required' });
    }

    // Verify storage key belongs to this merchant
    if (!data.storageKey.startsWith(`merchants/${user.mid}/`)) {
      return res.status(403).json({ error: 'Invalid storage key' });
    }

    const document = await prisma.document.create({
      data: {
        ...data,
        merchantId: user.mid,
        uploadedById: user.sub,
      },
    });

    // Log document upload
    await prisma.auditLog.create({
      data: {
        actorId: user.sub,
        merchantId: user.mid,
        action: 'DOC.UPLOAD',
        targetId: document.id,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: {
          filename: data.filename,
          category: data.category,
          sizeBytes: data.sizeBytes,
        },
      },
    });

    res.status(201).json(document);
  } catch (error) {
    console.error('Save document error:', error);
    res.status(500).json({ error: 'Failed to save document' });
  }
});

// List documents
router.get('/', requireAuth, requirePerm(PERMISSIONS.DOC_VIEW), async (req, res) => {
  try {
    const user = (req as any).user;
    const merchantId = req.query.merchantId as string || user.mid;
    const category = req.query.category as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Check access to merchant
    if (user.role !== 'ADMIN' && user.mid !== merchantId) {
      return res.status(403).json({ error: 'Access denied to this merchant' });
    }

    const where: any = {
      merchantId,
      isDeleted: false,
    };

    if (category) {
      where.category = category;
    }

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          uploadedBy: {
            select: { name: true, email: true },
          },
        },
      }),
      prisma.document.count({ where }),
    ]);

    res.json({
      documents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('List documents error:', error);
    res.status(500).json({ error: 'Failed to list documents' });
  }
});

// Get presigned download URL
router.get('/:documentId/download', requireAuth, requirePerm(PERMISSIONS.DOC_VIEW), async (req, res) => {
  try {
    const { documentId } = req.params;
    const user = (req as any).user;

    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document || document.isDeleted) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check access
    if (user.role !== 'ADMIN' && user.mid !== document.merchantId) {
      return res.status(403).json({ error: 'Access denied to this document' });
    }

    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: document.storageKey,
    });

    const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    // Log document access
    await prisma.auditLog.create({
      data: {
        actorId: user.sub,
        merchantId: document.merchantId,
        action: 'DOC.DOWNLOAD',
        targetId: documentId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { filename: document.filename },
      },
    });

    res.json({
      downloadUrl,
      filename: document.filename,
      expiresIn: 300,
    });
  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({ error: 'Failed to generate download URL' });
  }
});

// Soft delete document
router.delete('/:documentId', requireAuth, requirePerm(PERMISSIONS.DOC_DELETE), async (req, res) => {
  try {
    const { documentId } = req.params;
    const user = (req as any).user;

    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check access
    if (user.role !== 'ADMIN' && user.mid !== document.merchantId) {
      return res.status(403).json({ error: 'Access denied to this document' });
    }

    await prisma.document.update({
      where: { id: documentId },
      data: { isDeleted: true },
    });

    // Log deletion
    await prisma.auditLog.create({
      data: {
        actorId: user.sub,
        merchantId: document.merchantId,
        action: 'DOC.DELETE',
        targetId: documentId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { filename: document.filename },
      },
    });

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

export default router;