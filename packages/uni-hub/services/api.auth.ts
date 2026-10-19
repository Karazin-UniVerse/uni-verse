import type { AuthResponse, GoogleAuthResponse } from '@core/types/auth';
import { safeStorage } from './api.storage';
import { request } from './api.request';
import { clearUserSessionStorage } from './api.session';

export class AuthApi {
  async login(email: string, password: string): Promise<{ data: AuthResponse }> {
    const response = await request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      retries: 0,
    });

    if (response.data?.access_token) {
      safeStorage.setItem('accessToken', response.data.access_token);
      safeStorage.setItem('isLoggedIn', 'true');
      safeStorage.setItem('isMoodleLinked', 'true');
    }

    return response;
  }

  async loginWithGoogle(idToken: string): Promise<{ data: GoogleAuthResponse }> {
    const response = await request<GoogleAuthResponse>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
      retries: 0,
    });

    if (response.data?.access_token) {
      safeStorage.setItem('accessToken', response.data.access_token);

      if (response.data.isLinked) {
        safeStorage.setItem('isLoggedIn', 'true');
        safeStorage.setItem('isMoodleLinked', 'true');
      } else {
        safeStorage.setItem('isMoodleLinked', 'false');
      }
    }

    return response;
  }

  async linkMoodleAccount(
    username: string,
    password: string,
  ): Promise<{ data: GoogleAuthResponse }> {
    const response = await request<GoogleAuthResponse>('/auth/moodle/link', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
      retries: 0,
    });

    if (response.data?.access_token) {
      safeStorage.setItem('accessToken', response.data.access_token);

      if (response.data.isLinked) {
        safeStorage.setItem('isLoggedIn', 'true');
        safeStorage.setItem('isMoodleLinked', 'true');
        safeStorage.removeItem('universe_dashboard_data');
        safeStorage.removeItem('universe_last_sync_time');
      }
    }

    return response;
  }

  async unlinkMoodleAccount(): Promise<{ data: GoogleAuthResponse }> {
    const response = await request<GoogleAuthResponse>('/auth/moodle/unlink', {
      method: 'POST',
      retries: 0,
    });

    if (response.data?.access_token) {
      safeStorage.setItem('accessToken', response.data.access_token);
      safeStorage.setItem('isMoodleLinked', 'false');
      safeStorage.removeItem('moodleToken');
      safeStorage.removeItem('universe_dashboard_data');
      safeStorage.removeItem('universe_last_sync_time');
    }

    return response;
  }

  async logout(): Promise<void> {
    try {
      await request('/auth/logout', { method: 'POST', retries: 0 });
    } finally {
      clearUserSessionStorage();
    }
  }
}

export const authApi = new AuthApi();
