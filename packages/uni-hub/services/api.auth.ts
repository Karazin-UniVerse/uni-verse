import { isBrowser } from '@uni-hub/utils/browser';
import type { AuthResponse } from '@uni-hub/types';
import { safeStorage, isDemoMode } from './api.storage';
import { request } from './api.request';

export interface GoogleAuthResponse {
  access_token: string;
  isLinked: boolean;
}

export class AuthApi {
  async login(email: string, password: string): Promise<{ data: AuthResponse }> {
    if (email === 'demo' && password === 'demo') {
      const mockAuth: AuthResponse = {
        access_token: 'demo-token',
        token: 'demo-token',
        userID: 'karazin-student-001',
      };

      const persisted =
        safeStorage.setItem('accessToken', 'demo-token') &&
        safeStorage.setItem('moodleToken', 'demo-token') &&
        safeStorage.setItem('isLoggedIn', 'true') &&
        safeStorage.setItem('isDemo', 'true');

      if (!persisted && isBrowser) {
        throw new Error('Не вдалося зберегти сесію: доступ до локального сховища заборонено');
      }

      return { data: mockAuth };
    }

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
      safeStorage.removeItem('isDemo');
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
      if (!isDemoMode()) {
        await request('/auth/logout', { method: 'POST' }, 0);
      }
    } finally {
      safeStorage.removeItem('accessToken');
      safeStorage.removeItem('isLoggedIn');
      safeStorage.removeItem('moodleToken');
      safeStorage.removeItem('isDemo');
      safeStorage.removeItem('username');
      safeStorage.removeItem('universe_student_profile');
      safeStorage.removeItem('universe_dashboard_data');
      safeStorage.removeItem('universe_last_sync_time');
    }
  }
}

export const authApi = new AuthApi();
