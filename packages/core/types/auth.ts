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
