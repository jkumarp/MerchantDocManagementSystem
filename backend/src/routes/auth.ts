import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import crypto from 'crypto';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { prisma } from '../server.js';
import { requireAuth } from '../middleware/auth.js';
import { computePermissions } from '../middleware/auth.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
  name: z.string().min(2),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  totpCode: z.string().optional(),
});

const setup2FASchema = z.object({
  totpCode: z.string().length(6),
});

/**
 * @swagger
 * /api/auth/register-admin:
 *   post:
 *     summary: Bootstrap admin user
 *     description: Create the first admin user (only works if no admin exists)
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@dms.com
 *               password:
 *                 type: string
 *                 minLength: 12
 *                 example: admin123456789
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 example: System Administrator
 *     responses:
 *       201:
 *         description: Admin user created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Admin user created successfully
 *                 userId:
 *                   type: string
 *                   example: clp123admin456
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Bootstrap admin user
router.post('/register-admin', async (req, res) => {
  try {
    const { email, password, name } = registerSchema.parse(req.body);

    // Check if any admin exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (existingAdmin) {
      return res.status(400).json({ error: 'Admin user already exists' });
    }

    const passwordHash = await argon2.hash(password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: 'ADMIN',
      },
    });

    return res.status(201).json({ message: 'Admin user created successfully', userId: user.id });
  } catch (error) {
    console.error('Register admin error:', error);
    return res.status(500).json({ error: 'Failed to create admin user' });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticate user with email/password and optional 2FA code
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *         headers:
 *           Set-Cookie:
 *             description: HTTP-only refresh token cookie
 *             schema:
 *               type: string
 *               example: rt=token123.refresh456; HttpOnly; SameSite=Strict; Path=/api/auth
 *       401:
 *         description: Invalid credentials or 2FA code required
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ErrorResponse'
 *                 - type: object
 *                   properties:
 *                     error:
 *                       type: string
 *                       example: 2FA code required
 *                     requires2FA:
 *                       type: boolean
 *                       example: true
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password, totpCode } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      include: { merchant: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await argon2.verify(user.passwordHash, password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check 2FA if enabled
    if (user.twoFASecret) {
      if (!totpCode) {
        return res.status(401).json({ error: '2FA code required', requires2FA: true });
      }

      const verified = speakeasy.totp.verify({
        secret: user.twoFASecret,
        encoding: 'base32',
        token: totpCode,
        window: 2,
      });

      if (!verified) {
        return res.status(401).json({ error: 'Invalid 2FA code' });
      }
    }

    // Generate tokens
    const perms = computePermissions(user.role);
    const rawRefresh = crypto.randomBytes(32).toString('base64url');
    const tokenHash = await argon2.hash(rawRefresh);

    const refreshToken = await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days
        userAgent: req.headers['user-agent']??null,
        ip: req.ip??null,
      },
    });

    const accessToken = jwt.sign(
      {
        sub: user.id,
        rid: refreshToken.id,
        role: user.role,
        perms,
        mid: user.merchantId || undefined,
      },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: '15m' }
    );

    // Set refresh token cookie
    res.cookie('rt', `${refreshToken.id}.${rawRefresh}`, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/api/auth',
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    });

    // Log successful login
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        merchantId: user.merchantId,
        action: 'AUTH.LOGIN',
        ip: req.ip??null,
        userAgent: req.headers['user-agent']??null,
      },
    });

    return res.json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        merchantId: user.merchantId,
        merchant: user.merchant,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     description: Get a new access token using the refresh token cookie
 *     tags: [Authentication]
 *     security: []
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *         headers:
 *           Set-Cookie:
 *             description: New HTTP-only refresh token cookie
 *             schema:
 *               type: string
 *       401:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/refresh', async (req, res) => {
  try {
    const refreshCookie = req.cookies.rt;
    if (!refreshCookie) {
      return res.status(401).json({ error: 'No refresh token' });
    }

    const [tokenId, rawToken] = refreshCookie.split('.');
    if (!tokenId || !rawToken) {
      return res.status(401).json({ error: 'Invalid refresh token format' });
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { id: tokenId },
      include: { user: { include: { merchant: true } } },
    });

    if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const validToken = await argon2.verify(storedToken.tokenHash, rawToken);
    if (!validToken) {
      // Potential token reuse - revoke all user tokens
      await prisma.refreshToken.updateMany({
        where: { userId: storedToken.userId },
        data: { revokedAt: new Date() },
      });
      return res.status(401).json({ error: 'Token reuse detected' });
    }

    // Revoke old token and create new one
    await prisma.refreshToken.update({
      where: { id: tokenId },
      data: { revokedAt: new Date() },
    });

    const newRawRefresh = crypto.randomBytes(32).toString('base64url');
    const newTokenHash = await argon2.hash(newRawRefresh);

    const newRefreshToken = await prisma.refreshToken.create({
      data: {
        userId: storedToken.userId,
        tokenHash: newTokenHash,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        userAgent: req.headers['user-agent']??null,
        ip: req.ip??null,
      },
    });

    const perms = computePermissions(storedToken.user.role);
    const accessToken = jwt.sign(
      {
        sub: storedToken.user.id,
        rid: newRefreshToken.id,
        role: storedToken.user.role,
        perms,
        mid: storedToken.user.merchantId || undefined,
      },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: '15m' }
    );

    res.cookie('rt', `${newRefreshToken.id}.${newRawRefresh}`, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/api/auth',
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });

    return res.json({
      accessToken,
      user: {
        id: storedToken.user.id,
        email: storedToken.user.email,
        name: storedToken.user.name,
        role: storedToken.user.role,
        merchantId: storedToken.user.merchantId,
        merchant: storedToken.user.merchant,
      },
    });
  } catch (error) {
    console.error('Refresh error:', error);
    return res.status(500).json({ error: 'Token refresh failed' });
  }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: User logout
 *     description: Revoke refresh token and clear authentication cookies
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/logout', requireAuth, async (req, res) => {
  try {
    const refreshCookie = req.cookies.rt;
    if (refreshCookie) {
      const [tokenId] = refreshCookie.split('.');
      if (tokenId) {
        await prisma.refreshToken.update({
          where: { id: tokenId },
          data: { revokedAt: new Date() },
        });
      }
    }

    res.clearCookie('rt', { path: '/api/auth' });
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * @swagger
 * /api/auth/2fa/setup:
 *   post:
 *     summary: Setup 2FA
 *     description: Generate TOTP secret and QR code for 2FA setup
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 2FA setup data generated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Setup2FAResponse'
 *       400:
 *         description: 2FA already enabled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/2fa/setup', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: (req as any).user.sub },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.twoFASecret) {
      return res.status(400).json({ error: '2FA already enabled' });
    }

    const secret = speakeasy.generateSecret({
      name: `DMS (${user.email})`,
      issuer: 'Document Management System',
    });

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    return res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl,
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    return res.status(500).json({ error: '2FA setup failed' });
  }
});

/**
 * @swagger
 * /api/auth/2fa/verify:
 *   post:
 *     summary: Verify and enable 2FA
 *     description: Verify TOTP code and enable 2FA for the user
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [totpCode, secret]
 *             properties:
 *               totpCode:
 *                 type: string
 *                 pattern: '^[0-9]{6}$'
 *                 example: '123456'
 *                 description: 6-digit TOTP code
 *               secret:
 *                 type: string
 *                 example: JBSWY3DPEHPK3PXP
 *                 description: Base32 encoded secret from setup
 *     responses:
 *       200:
 *         description: 2FA enabled successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       400:
 *         description: Invalid TOTP code or missing secret
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/2fa/verify', requireAuth, async (req, res) => {
  try {
    const { totpCode } = setup2FASchema.parse(req.body);
    const secret = req.body.secret;

    if (!secret) {
      return res.status(400).json({ error: 'Secret required' });
    }

    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: totpCode,
      window: 2,
    });

    if (!verified) {
      return res.status(400).json({ error: 'Invalid 2FA code' });
    }

    await prisma.user.update({
      where: { id: (req as any).user.sub },
      data: { twoFASecret: secret },
    });

    return res.json({ message: '2FA enabled successfully' });
  } catch (error) {
    console.error('2FA verify error:', error);
    return res.status(500).json({ error: '2FA verification failed' });
  }
});

export default router;