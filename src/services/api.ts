import type {
  AuthResponse,
  Merchant,
  MerchantListResponse,
  MerchantSummary,
  UserListResponse,
  CreateUserResponse,
  DocumentListResponse,
  PresignResponse,
  DownloadResponse,
  KycStatusResponse,
  PanVerifyResponse,
  AadhaarInitResponse,
  AadhaarVerifyResponse,
  VerificationQueueResponse,
  AuditLogResponse,
  AdminStats,
  Setup2FAResponse,
  MessageResponse,
} from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth endpoints
  auth = {
    login: (email: string, password: string, totpCode?: string): Promise<AuthResponse> =>
      this.request<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, totpCode }),
      }),

    refresh: (): Promise<AuthResponse> => this.request<AuthResponse>('/auth/refresh', { method: 'POST' }),

    logout: (): Promise<MessageResponse> => this.request<MessageResponse>('/auth/logout', { method: 'POST' }),

    setup2FA: (): Promise<Setup2FAResponse> => this.request<Setup2FAResponse>('/auth/2fa/setup', { method: 'POST' }),

    verify2FA: (totpCode: string, secret: string): Promise<MessageResponse> =>
      this.request<MessageResponse>('/auth/2fa/verify', {
        method: 'POST',
        body: JSON.stringify({ totpCode, secret }),
      }),
  };

  // Merchant endpoints
  merchants = {
    create: (data: any): Promise<Merchant> =>
      this.request<Merchant>('/merchants', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    get: (id: string): Promise<Merchant> => this.request<Merchant>(`/merchants/${id}`),

    update: (id: string, data: any): Promise<Merchant> =>
      this.request<Merchant>(`/merchants/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    getSummary: (id: string): Promise<MerchantSummary> => this.request<MerchantSummary>(`/merchants/${id}/summary`),

    list: (page = 1, limit = 10): Promise<MerchantListResponse> =>
      this.request<MerchantListResponse>(`/merchants?page=${page}&limit=${limit}`),
  };

  // User endpoints
  users = {
    create: (data: any): Promise<CreateUserResponse> =>
      this.request<CreateUserResponse>('/users', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    list: (merchantId: string, page = 1, limit = 10): Promise<UserListResponse> =>
      this.request<UserListResponse>(`/users/merchant/${merchantId}?page=${page}&limit=${limit}`),

    update: (id: string, data: any): Promise<Partial<CreateUserResponse>> =>
      this.request<Partial<CreateUserResponse>>(`/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    acceptInvite: (token: string, password: string): Promise<MessageResponse> =>
      this.request<MessageResponse>('/users/accept-invite', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      }),
  };

  // Document endpoints
  documents = {
    presign: (data: any): Promise<PresignResponse> =>
      this.request<PresignResponse>('/docs/presign', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    save: (data: any): Promise<Document> =>
      this.request<Document>('/docs', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    list: (params: any = {}): Promise<DocumentListResponse> => {
      const query = new URLSearchParams(params).toString();
      return this.request<DocumentListResponse>(`/docs?${query}`);
    },

    getDownloadUrl: (id: string): Promise<DownloadResponse> => this.request<DownloadResponse>(`/docs/${id}/download`),

    delete: (id: string): Promise<MessageResponse> =>
      this.request<MessageResponse>(`/docs/${id}`, { method: 'DELETE' }),
  };

  // KYC endpoints
  kyc = {
    verifyPan: (data: any): Promise<PanVerifyResponse> =>
      this.request<PanVerifyResponse>('/kyc/pan/verify', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    initAadhaarOtp: (data: any): Promise<AadhaarInitResponse> =>
      this.request<AadhaarInitResponse>('/kyc/aadhaar/otp/init', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    verifyAadhaarOtp: (data: any): Promise<AadhaarVerifyResponse> =>
      this.request<AadhaarVerifyResponse>('/kyc/aadhaar/otp/verify', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getStatus: (merchantId: string): Promise<KycStatusResponse> =>
      this.request<KycStatusResponse>(`/kyc/status?merchantId=${merchantId}`),
  };

  // Admin endpoints
  admin = {
    getMerchants: (page = 1, limit = 10): Promise<MerchantListResponse> =>
      this.request<MerchantListResponse>(`/admin/merchants?page=${page}&limit=${limit}`),

    getVerificationQueue: (): Promise<VerificationQueueResponse> => this.request<VerificationQueueResponse>('/admin/verifications/queue'),

    getAuditLogs: (params: any = {}): Promise<AuditLogResponse> => {
      const query = new URLSearchParams(params).toString();
      return this.request<AuditLogResponse>(`/admin/audit?${query}`);
    },

    getStats: (): Promise<AdminStats> => this.request<AdminStats>('/admin/stats'),
  };
}

export const api = new ApiClient();


// Convenience exports
export const authApi = api.auth;
export const merchantApi = api.merchants;
export const userApi = api.users;
export const documentApi = api.documents;
export const kycApi = api.kyc;
export const adminApi = api.admin;