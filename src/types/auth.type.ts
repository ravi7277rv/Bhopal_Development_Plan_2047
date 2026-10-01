export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthUser {
  id: string;
  username: string;
  name?: string;
  email?: string;
  mobile?: string;
}

export interface LoginResponse {
  status:String;
  access_token: string;
  refresh_token: string;
  token_type: string;
  token_expiry: string;
  user: AuthUser;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
   logout: () => Promise<void>;   // ← was `() => void`
  clearError: () => void;
}