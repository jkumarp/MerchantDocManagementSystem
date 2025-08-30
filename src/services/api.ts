const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

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
    login: (email: string, password: string, totpCode?: string) =>
      this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, totpCode }),
      }),

    refresh: () => this.request('/auth/refresh', { method: 'POST' }),

    logout: () => this.request('/auth/logout', { method: 'POST' }),

    setup2FA: () => this.request('/auth/2fa/setup', { method: 'POST' }),

    verify2FA: (totpCode: string, secret: string) =>
      this.request('/auth/2fa/verify', {
        method: 'POST',
        body: JSON.stringify({ totpCode, secret }),
      }),
  };

  // Merchant endpoints
  merchants = {
    create: (data: any) =>
      this.request('/merchants', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    get: (id: string) => this.request(`/merchants/${id}`),

    update: (id: string, data: any) =>
      this.request(`/merchants/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    getSummary: (id: string) => this.request(`/merchants/${id}/summary`),

    list: (page = 1, limit = 10) =>
      this.request(`/merchants?page=${page}&limit=${limit}`),
  };

  // User endpoints
  users = {
    create: (data: any) =>
      this.request('/users', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    list: (merchantId: string, page = 1, limit = 10) =>
      this.request(`/users/merchant/${merchantId}?page=${page}&limit=${limit}`),

    update: (id: string, data: any) =>
      this.request(`/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    acceptInvite: (token: string, password: string) =>
      this.request('/users/accept-invite', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      }),
  };

  // Document endpoints
  documents = {
    presign: (data: any) =>
      this.request('/docs/presign', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    save: (data: any) =>
      this.request('/docs', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    list: (params: any = {}) => {
      const query = new URLSearchParams(params).toString();
      return this.request(`/docs?${query}`);
    },

    getDownloadUrl: (id: string) => this.request(`/docs/${id}/download`),

    delete: (id: string) =>
      this.request(`/docs/${id}`, { method: 'DELETE' }),
  };

  // KYC endpoints
  kyc = {
    verifyPan: (data: any) =>
      this.request('/kyc/pan/verify', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    initAadhaarOtp: (data: any) =>
      this.request('/kyc/aadhaar/otp/init', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    verifyAadhaarOtp: (data: any) =>
      this.request('/kyc/aadhaar/otp/verify', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getStatus: (merchantId: string) =>
      this.request(`/kyc/status?merchantId=${merchantId}`),
  };

  // Admin endpoints
  admin = {
    getMerchants: (page = 1, limit = 10) =>
      this.request(`/admin/merchants?page=${page}&limit=${limit}`),

    getVerificationQueue: () => this.request('/admin/verifications/queue'),

    getAuditLogs: (params: any = {}) => {
      const query = new URLSearchParams(params).toString();
      return this.request(`/admin/audit?${query}`);
    },

    getStats: () => this.request('/admin/stats'),
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