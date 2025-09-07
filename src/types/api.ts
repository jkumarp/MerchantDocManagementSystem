// API Response Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  merchantId?: string;
  merchant?: {
    id: string;
    legalName: string;
  };
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface Merchant {
  id: string;
  legalName: string;
  businessType: string;
  gstin?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  contactEmail: string;
  contactPhone?: string;
  logoUrl?: string;
  createdAt: string;
  updatedAt: string;
  kyc?: KycStatus;
  _count?: {
    users: number;
    documents: number;
  };
}

export interface KycStatus {
  id: string;
  merchantId: string;
  panNumber?: string;
  panStatus?: string;
  aadhaarLast4?: string;
  aadhaarStatus?: string;
  checkpoints?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  merchantId: string;
  uploadedById: string;
  category: string;
  filename: string;
  storageKey: string;
  version: number;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  metadata?: any;
  uploadedBy: {
    name: string;
    email: string;
  };
}

export interface UserItem {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  has2FA: boolean;
}

export interface AuditLog {
  id: string;
  actorId?: string;
  merchantId?: string;
  action: string;
  targetId?: string;
  ip?: string;
  userAgent?: string;
  metadata?: any;
  createdAt: string;
  actor?: {
    name: string;
    email: string;
  };
  merchant?: {
    legalName: string;
  };
}

export interface Verification {
  id: string;
  merchantId: string;
  panNumber?: string;
  panStatus?: string;
  aadhaarLast4?: string;
  aadhaarStatus?: string;
  updatedAt: string;
  merchant: {
    id: string;
    legalName: string;
    contactEmail: string;
  };
}

// API Response Wrappers
export interface PaginatedResponse<T> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  data: T[];
}

export interface DocumentListResponse extends PaginatedResponse<Document> {
  documents: Document[];
}

export interface UserListResponse extends PaginatedResponse<UserItem> {
  users: UserItem[];
}

export interface MerchantListResponse extends PaginatedResponse<Merchant> {
  merchants: Merchant[];
}

export interface AuditLogResponse extends PaginatedResponse<AuditLog> {
  logs: AuditLog[];
}

export interface VerificationQueueResponse {
  verifications: Verification[];
}

export interface MerchantSummary {
  merchant: {
    id: string;
    legalName: string;
    createdAt: string;
  };
  kyc: {
    panVerified: boolean;
    aadhaarVerified: boolean;
    overallStatus: string;
  };
  documents: {
    total: number;
    byCategory: Record<string, number>;
    recent: Array<{
      id: string;
      filename: string;
      category: string;
      createdAt: string;
      uploadedBy: { name: string };
    }>;
  };
}

export interface AdminStats {
  totalMerchants: number;
  totalUsers: number;
  totalDocuments: number;
  verifiedMerchants: number;
  recentActivity: number;
  verificationRate: number;
}

export interface PresignResponse {
  uploadUrl: string;
  storageKey: string;
  expiresIn: number;
}

export interface DownloadResponse {
  downloadUrl: string;
  filename: string;
  expiresIn: number;
}

export interface KycStatusResponse {
  panStatus: string;
  aadhaarStatus: string;
  overallStatus: string;
  panNumber?: string;
  aadhaarLast4?: string;
}

export interface PanVerifyResponse {
  status: string;
  maskedPan: string;
  message: string;
}

export interface AadhaarInitResponse {
  txnId: string;
  message: string;
  maskedAadhaar: string;
}

export interface AadhaarVerifyResponse {
  status: string;
  last4: string;
  message: string;
}

export interface Setup2FAResponse {
  secret: string;
  qrCode: string;
}

export interface MessageResponse {
  message: string;
}

export interface CreateUserResponse extends UserItem {
  tempPassword: string;
}