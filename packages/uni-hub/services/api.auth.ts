import type { AuthResponse } from '@uni-hub/types';
import { safeStorage } from './api.storage';
import { request } from './api.request';

export interface GoogleAuthResponse {
  access_token: string;
  isLinked: boolean;
}

export class AuthApi {
  async login(email: string, password: string): Promise<{ data: AuthResponse }> {
    const response = await request<AuthResponse>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      },
      0,
    );

    if (response.data?.access_token) {
      safeStorage.setItem('accessToken', response.data.access_token);
      safeStorage.setItem('isLoggedIn', 'true');
    }

    return response;
  }

  async loginWithGoogle(idToken: string): Promise<{ data: GoogleAuthResponse }> {
    const response = await request<GoogleAuthResponse>(
      '/auth/google',
      {
        method: 'POST',
        body: JSON.stringify({ idToken }),
      },
      0,
    );

    if (response.data?.access_token) {
      localStorage.setItem('accessToken', response.data.access_token);

      if (response.data.isLinked) {
        localStorage.setItem('isLoggedIn', 'true');
      }
    }

    return response;
  }

  async linkMoodleAccount(
    username: string,
    password: string,
  ): Promise<{ data: { access_token: string; isLinked: boolean } }> {
    const response = await request<{ access_token: string; isLinked: boolean }>(
      '/auth/moodle/link',
      {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      },
      0,
    );

    if (response.data?.access_token) {
      localStorage.setItem('accessToken', response.data.access_token);

      if (response.data.isLinked) {
        localStorage.setItem('isLoggedIn', 'true');
      }
    }

    return response;
  }

  async logout(): Promise<void> {
    try {
      await request('/auth/logout', { method: 'POST' }, 0);
    } finally {
      safeStorage.removeItem('accessToken');
      safeStorage.removeItem('isLoggedIn');
      safeStorage.removeItem('moodleToken');
      safeStorage.removeItem('username');
      safeStorage.removeItem('universe_student_profile');
      safeStorage.removeItem('universe_dashboard_data');
      safeStorage.removeItem('universe_last_sync_time');
    }
  }
}

export const authApi = new AuthApi();
