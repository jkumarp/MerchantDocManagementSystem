export interface JwtClaims {
  sub: string; // user id
  rid: string; // refresh token id
  mid?: string; // merchant id
  role: 'ADMIN' | 'MERCHANT_ADMIN' | 'MERCHANT_MANAGER' | 'MERCHANT_USER' | 'READ_ONLY';
  perms: string[]; // flattened permissions
}

export interface AuthenticatedRequest extends Request {
  user: JwtClaims;
}

export const PERMISSIONS = {
  MERCHANT_READ: 'merchant:read',
  MERCHANT_WRITE: 'merchant:write',
  USER_MANAGE: 'user:manage',
  DOC_UPLOAD: 'doc:upload',
  DOC_VIEW: 'doc:view',
  DOC_DELETE: 'doc:delete',
  KYC_VERIFY: 'kyc:verify',
  BILLING_VIEW: 'billing:view',
  AUDIT_READ: 'audit:read',
  SETTINGS_WRITE: 'settings:write',
} as const;

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: Object.values(PERMISSIONS),
  MERCHANT_ADMIN: [
    PERMISSIONS.MERCHANT_READ,
    PERMISSIONS.MERCHANT_WRITE,
    PERMISSIONS.USER_MANAGE,
    PERMISSIONS.DOC_UPLOAD,
    PERMISSIONS.DOC_VIEW,
    PERMISSIONS.DOC_DELETE,
    PERMISSIONS.KYC_VERIFY,
    PERMISSIONS.BILLING_VIEW,
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.SETTINGS_WRITE,
  ],
  MERCHANT_MANAGER: [
    PERMISSIONS.MERCHANT_READ,
    PERMISSIONS.USER_MANAGE,
    PERMISSIONS.DOC_UPLOAD,
    PERMISSIONS.DOC_VIEW,
    PERMISSIONS.DOC_DELETE,
    PERMISSIONS.KYC_VERIFY,
    PERMISSIONS.BILLING_VIEW,
  ],
  MERCHANT_USER: [
    PERMISSIONS.MERCHANT_READ,
    PERMISSIONS.DOC_UPLOAD,
    PERMISSIONS.DOC_VIEW,
  ],
  READ_ONLY: [
    PERMISSIONS.MERCHANT_READ,
    PERMISSIONS.DOC_VIEW,
    PERMISSIONS.BILLING_VIEW,
  ],
} as const;