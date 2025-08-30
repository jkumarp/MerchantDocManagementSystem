import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtClaims, AuthenticatedRequest, ROLE_PERMISSIONS } from '../types/auth.js';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization?.split(' ');
  if (!auth || auth[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Missing token' });
  }

  try {
    const claims = jwt.verify(auth[1], process.env.JWT_ACCESS_SECRET!) as JwtClaims;
    (req as AuthenticatedRequest).user = claims;
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid/expired token' });
  }
}

export function requirePerm(...needed: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Admin has all permissions
    if (user.role === 'ADMIN') {
      return next();
    }

    const hasPermissions = needed.every(perm => user.perms.includes(perm));
    if (!hasPermissions) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    return next();
  };
}

export function requireMerchantAccess(req: Request, res: Response, next: NextFunction) {
  const user = (req as AuthenticatedRequest).user;
  const merchantId = req.params.merchantId || req.body.merchantId || req.query.merchantId;

  // Admin can access any merchant
  if (user.role === 'ADMIN') {
    return next();
  }

  // User must belong to the merchant they're trying to access
  if (user.mid !== merchantId) {
    return res.status(403).json({ error: 'Access denied to this merchant' });
  }

  return next();
}

export function computePermissions(role: string): string[] {
  return ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || [];
}