export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface GoogleAuthRequest {
  idToken: string;
}

export interface LinkMoodleRequest {
  username: string;
  password: string;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  roles: string[];
  isLinked: boolean;
}

export interface AuthResponse {
  user: SessionUser;
}

export interface GoogleAuthResponse {
  isLinked: boolean;
  user: SessionUser;
}

export interface LogoutResponse {
  message: string;
}
