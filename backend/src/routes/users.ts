import { Router } from 'express';
import { z } from 'zod';
import argon2 from 'argon2';
import crypto from 'crypto';
import { prisma } from '../server.js';
import { requireAuth, requirePerm, requireMerchantAccess } from '../middleware/auth.js';
import { PERMISSIONS } from '../types/auth.js';
import { Prisma } from '@prisma/client';
const router = Router();

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.enum(['MERCHANT_ADMIN', 'MERCHANT_MANAGER', 'MERCHANT_USER', 'READ_ONLY']),
  merchantId: z.string(),
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(['MERCHANT_ADMIN', 'MERCHANT_MANAGER', 'MERCHANT_USER', 'READ_ONLY']).optional(),
  isActive: z.boolean().optional(),
});

const acceptInviteSchema = z.object({
  token: z.string(),
  password: z.string().min(12),
});

// Create user (invite)
router.post('/', requireAuth, requirePerm(PERMISSIONS.USER_MANAGE), async (req, res) => {
  try {
    const { email, name, role, merchantId } = createUserSchema.parse(req.body);

    // Check if user can manage this merchant
    const user = (req as any).user;
    if (user.role !== 'ADMIN' && user.mid !== merchantId) {
      return res.status(403).json({ error: 'Cannot create users for this merchant' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Generate temporary password for invitation
    const tempPassword = crypto.randomBytes(16).toString('base64url');
    const passwordHash = await argon2.hash(tempPassword);

    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        role,
        merchantId,
        passwordHash,
        isActive: false, // User must accept invitation
      },
    });

    // Log user creation
    await prisma.auditLog.create({
      data: {
        actorId: user.sub,
        merchantId,
        action: 'USER.CREATE',
        targetId: newUser.id,
        ip: req.ip?? null,
        userAgent: req.headers['user-agent']?? null,
        metadata: { email, role },
      },
    });

    // In a real app, send invitation email here
    console.log(`Invitation for ${email}: temp password is ${tempPassword}`);

    return res.status(201).json({
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      isActive: newUser.isActive,
      tempPassword, // Remove this in production
    });
  } catch (error) {
    console.error('Create user error:', error);
    return res.status(500).json({ error: 'Failed to create user' });
  }
});

// List users for merchant
router.get('/merchant/:merchantId', requireAuth, requireMerchantAccess, async (req, res) => {
  try {
    const { merchantId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: { id:merchantId as string},
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
          twoFASecret: true,
        },
      }),
      prisma.user.count({ where: { id:merchantId as string } }),
    ]);

    const sanitizedUsers = users.map(user => ({
      ...user,
      has2FA: !!user.twoFASecret,
      twoFASecret: undefined,
    }));

    res.json({
      users: sanitizedUsers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

// Update user
router.patch('/:userId', requireAuth, requirePerm(PERMISSIONS.USER_MANAGE), async (req, res) => {
  try {
    const { userId } = req.params;
    const data = updateUserSchema.parse(req.body);

    const targetUser = await prisma.user.findUnique({
      where: { id: userId as string},
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check permissions
    const actor = (req as any).user;
    if (actor.role !== 'ADMIN' && actor.mid !== targetUser.merchantId) {
      return res.status(403).json({ error: 'Cannot update this user' });
    }

    const updateData: Prisma.UserUpdateInput = {
      ...(data.name !== undefined && { name: { set: data.name } }),
      ...(data.role !== undefined && { role: { set: data.role } }),
      ...(data.isActive !== undefined && { isActive: { set: data.isActive } }),
    };
    const updatedUser = await prisma.user.update({
      where: { id: userId as string},
      data:updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        merchantId: true,
      },
    });

    // Log update
    await prisma.auditLog.create({
      data: {
        actorId: actor.sub,
        merchantId: targetUser.merchantId,
        action: 'USER.UPDATE',
        targetId: userId?? null,
        ip: req.ip?? null,
        userAgent: req.headers['user-agent']?? null,
        metadata: { changes: Object.keys(data) },
      },
    });

    return res.json(updatedUser);
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({ error: 'Failed to update user' });
  }
});

// Accept invitation
router.post('/accept-invite', async (req, res) => {
  try {
    const { token, password } = acceptInviteSchema.parse(req.body);

    // In a real app, verify the invitation token
    // For now, we'll use email as token for simplicity
    const user = await prisma.user.findUnique({
      where: { email: token },
    });

    if (!user || user.isActive) {
      return res.status(400).json({ error: 'Invalid or expired invitation' });
    }

    const passwordHash = await argon2.hash(password);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        isActive: true,
      },
    });

    return res.json({ message: 'Invitation accepted successfully' });
  } catch (error) {
    console.error('Accept invite error:', error);
    return res.status(500).json({ error: 'Failed to accept invitation' });
  }
});

export default router;