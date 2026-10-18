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

export interface AuthResponse {
  access_token: string;
}

export interface GoogleAuthResponse {
  access_token: string;
  isLinked: boolean;
}

export interface LogoutResponse {
  message: string;
}
