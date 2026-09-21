/**
 * Authentication & User Management API Service
 */

const API_BASE = 'http://localhost:3000/api/v1';

export interface LoginPayload {
  username: string;
  password: string;
}

export interface UserItem {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phoneNumber?: string | null;
  role: 'ADM' | 'MGR' | 'ACC' | 'PAR';
  roleName: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
  students?: any[];
}

export interface CreateUserPayload {
  username: string;
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
  role: 'ADM' | 'MGR' | 'ACC' | 'PAR';
}

export interface UpdateUserPayload {
  fullName?: string;
  phoneNumber?: string;
  role?: 'ADM' | 'MGR' | 'ACC' | 'PAR';
  isActive?: boolean;
}

export class AuthService {
  private static TOKEN_KEY = 'sb_access_token';
  private static USER_KEY = 'sb_current_user';

  public static getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  public static getCurrentUser(): UserItem | null {
    const raw = localStorage.getItem(this.USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  public static setSession(token: string, user: UserItem): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  public static clearSession(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  private static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const token = this.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'x-mock-role': this.getCurrentUser()?.role || 'ADM',
      ...(options.headers as Record<string, string> || {}),
    };

    const response = await fetch(url, { ...options, headers });
    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data?.message || data?.error?.message || `HTTP ${response.status}: Yêu cầu thất bại`;
      throw new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
    }

    return data;
  }

  // 1. Login User
  public static async login(payload: LoginPayload) {
    const res = await this.request<{
      success: boolean;
      data: {
        accessToken: string;
        expiresIn: number;
        tokenType: string;
        user: UserItem;
      };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (res.data?.accessToken) {
      this.setSession(res.data.accessToken, res.data.user);
    }

    return res.data;
  }

  // 2. Get Current Profile
  public static async getProfile() {
    return this.request<{ success: boolean; data: UserItem }>('/users/profile');
  }

  // 3. List Users with optional role filter & search
  public static async listUsers(params?: { role?: string; search?: string; page?: number; pageSize?: number }) {
    const query = new URLSearchParams();
    if (params?.role && params.role !== 'ALL') query.append('role', params.role);
    if (params?.search) query.append('search', params.search);
    if (params?.page) query.append('page', String(params.page));
    if (params?.pageSize) query.append('pageSize', String(params.pageSize));

    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<{
      success: boolean;
      data: UserItem[];
      pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
    }>(`/users${qs}`);
  }

  // 4. Create User (Admin only)
  public static async createUser(payload: CreateUserPayload) {
    return this.request<{ success: boolean; data: UserItem }>('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // 5. Update User / Toggle Active Status
  public static async updateUser(id: string, payload: UpdateUserPayload) {
    return this.request<{ success: boolean; data: UserItem }>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  // 6. Delete User
  public static async deleteUser(id: string) {
    return this.request<{ success: boolean; message: string }>(`/users/${id}`, {
      method: 'DELETE',
    });
  }
}
