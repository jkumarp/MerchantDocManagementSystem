import { Router } from 'express';
import { z } from 'zod';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import { prisma } from '../server.js';
import { requireAuth, requirePerm, requireMerchantAccess } from '../middleware/auth.js';
import { PERMISSIONS } from '../types/auth.js';
import { Prisma } from "@prisma/client";
const router = Router();

// Initialize S3 client
const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT!,
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

/**
 * @swagger
 * /api/docs/presign:
 *   post:
 *     summary: Get presigned upload URL
 *     description: Generate a presigned URL for direct S3 document upload
 *     tags: [Documents]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PresignRequest'
 *     responses:
 *       200:
 *         description: Presigned URL generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PresignResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
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

    return res.json({
      uploadUrl,
      storageKey,
      expiresIn: 300,
    });
  } catch (error) {
    console.error('Presign error:', error);
    return res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});

/**
 * @swagger
 * /api/docs:
 *   post:
 *     summary: Save document metadata
 *     description: Save document metadata after successful S3 upload
 *     tags: [Documents]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [storageKey, category, filename, mimeType, sizeBytes, checksumSha256]
 *             properties:
 *               storageKey:
 *                 type: string
 *                 example: merchants/clp123merchant456/kyc/1642234567890-abc123.pdf
 *                 description: S3 storage key from presign response
 *               category:
 *                 type: string
 *                 enum: [KYC, CONTRACT, INVOICE, BANK, MISC]
 *                 example: KYC
 *               filename:
 *                 type: string
 *                 example: pan_card.pdf
 *               mimeType:
 *                 type: string
 *                 example: application/pdf
 *               sizeBytes:
 *                 type: integer
 *                 example: 1048576
 *               checksumSha256:
 *                 type: string
 *                 pattern: '^[a-f0-9]{64}$'
 *                 example: a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3
 *               metadata:
 *                 type: object
 *                 additionalProperties: true
 *                 example:
 *                   description: PAN card for KYC verification
 *                   tags: [identity, kyc]
 *     responses:
 *       201:
 *         description: Document metadata saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Document'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *   get:
 *     summary: List documents
 *     description: Get paginated list of documents with optional filtering
 *     tags: [Documents]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: merchantId
 *         schema:
 *           type: string
 *         description: Filter by merchant ID (defaults to user's merchant)
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [KYC, CONTRACT, INVOICE, BANK, MISC]
 *         description: Filter by document category
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
 *         description: List of documents
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 documents:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Document'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
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
        merchantId: user.mid as string,
        uploadedById: user.sub as string,
        metadata:data.metadata??Prisma.JsonNull,
      },
    });

    // Log document upload
    await prisma.auditLog.create({
      data: {
        actorId: user.sub,
        merchantId: user.mid,
        action: 'DOC.UPLOAD',
        targetId: document.id,
        ip: req.ip ?? null,
        userAgent: req.headers['user-agent'] ?? null,
        metadata: {
          filename: data.filename,
          category: data.category,
          sizeBytes: data.sizeBytes,
        },
      },
    });

    return res.status(201).json(document);
  } catch (error) {
    console.error('Save document error:', error);
    return res.status(500).json({ error: 'Failed to save document' });
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

    return res.json({
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
    return res.status(500).json({ error: 'Failed to list documents' });
  }
});

/**
 * @swagger
 * /api/docs/{documentId}/download:
 *   get:
 *     summary: Get document download URL
 *     description: Generate a presigned URL for document download
 *     tags: [Documents]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID
 *     responses:
 *       200:
 *         description: Download URL generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 downloadUrl:
 *                   type: string
 *                   format: uri
 *                   example: https://s3.amazonaws.com/bucket/key?X-Amz-Algorithm=...
 *                   description: Presigned URL for document download
 *                 filename:
 *                   type: string
 *                   example: pan_card.pdf
 *                   description: Original filename
 *                 expiresIn:
 *                   type: integer
 *                   example: 300
 *                   description: URL expiration time in seconds
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Get presigned download URL
router.get('/:documentId/download', requireAuth, requirePerm(PERMISSIONS.DOC_VIEW), async (req, res) => {
  try {
    const { documentId } = req.params;
    const user = (req as any).user;

    const document = await prisma.document.findUnique({
      where: { id: documentId as string },
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
        targetId: documentId ?? null,
        ip: req.ip ?? null,
        userAgent: req.headers['user-agent'] ?? null,
        metadata: { filename: document.filename },
      },
    });

    return res.json({
      downloadUrl,
      filename: document.filename,
      expiresIn: 300,
    });
  } catch (error) {
    console.error('Download document error:', error);
    return res.status(500).json({ error: 'Failed to generate download URL' });
  }
});

/**
 * @swagger
 * /api/docs/{documentId}:
 *   delete:
 *     summary: Delete document
 *     description: Soft delete a document (marks as deleted but preserves data)
 *     tags: [Documents]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID
 *     responses:
 *       200:
 *         description: Document deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Soft delete document
router.delete('/:documentId', requireAuth, requirePerm(PERMISSIONS.DOC_DELETE), async (req, res) => {
  try {
    const { documentId } = req.params;
    const user = (req as any).user;

    const document = await prisma.document.findUnique({
      where: { id: documentId as string},
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check access
    if (user.role !== 'ADMIN' && user.mid !== document.merchantId) {
      return res.status(403).json({ error: 'Access denied to this document' });
    }

    await prisma.document.update({
      where: { id: documentId  as string},
      data: { isDeleted: true },
    });

    // Log deletion
    await prisma.auditLog.create({
      data: {
        actorId: user.sub,
        merchantId: document.merchantId,
        action: 'DOC.DELETE',
        targetId: documentId ?? null,
        ip: req.ip ?? null,
        userAgent: req.headers['user-agent'] ?? null,
        metadata: { filename: document.filename },
      },
    });

    return res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    return res.status(500).json({ error: 'Failed to delete document' });
  }
});

export default router;