import { request } from '@uni-hub/services/api/client';
import { AuthResponse } from '@uni-hub/types';

export class AuthApi {
  async login(email: string, password: string): Promise<{ data: AuthResponse }> {
    const response = await request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.data?.access_token) {
      localStorage.setItem('accessToken', response.data.access_token);
      localStorage.setItem('isLoggedIn', 'true');
    }

    return response;
  }

  async logout(): Promise<void> {
    try {
      await request('/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('isLoggedIn');
    }
  }
}

export const authApi = new AuthApi();
