export interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
  fullName: string;
  status: string;
  roles: string[];
  permissions: string[];
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: AuthUser;
  tokens: TokenPair;
}
