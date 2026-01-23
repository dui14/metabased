// API types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface AuthPayload {
  sub: string;
  wallet_address: string;
  email?: string;
  role: 'user' | 'admin';
  iat: number;
  exp: number;
}
