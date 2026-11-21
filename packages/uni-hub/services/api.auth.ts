import type { AuthResponse, GoogleAuthResponse, SessionUser } from '@core/types/auth';
import { AUTH_ROUTES } from '@core/constants/routes';
import { safeStorage } from './api.storage';
import { ApiClient } from './api.request';
import { clearUserSessionStorage, saveSessionUser } from './api.session';

export class AuthApi extends ApiClient {
  async login(email: string, password: string): Promise<{ data: AuthResponse }> {
    const response = await this.request<AuthResponse>(`/auth/${AUTH_ROUTES.LOGIN}`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      retries: 0,
    });

    if (response.data?.user) {
      saveSessionUser(response.data.user);
      safeStorage.setItem('isLoggedIn', 'true');
      safeStorage.setItem('isMoodleLinked', String(response.data.user.isLinked));
      safeStorage.setItem('userEmail', response.data.user.email || email);
    }

    return response;
  }

  async loginWithGoogle(idToken: string): Promise<{ data: GoogleAuthResponse }> {
    const response = await this.request<GoogleAuthResponse>(`/auth/${AUTH_ROUTES.GOOGLE}`, {
      method: 'POST',
      body: JSON.stringify({ idToken }),
      retries: 0,
    });

    if (response.data?.user) {
      saveSessionUser(response.data.user);

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
    const response = await this.request<GoogleAuthResponse>(`/auth/${AUTH_ROUTES.MOODLE_LINK}`, {
      method: 'POST',
      body: JSON.stringify({ username, password }),
      retries: 0,
    });

    if (response.data?.user) {
      saveSessionUser(response.data.user);

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
    const response = await this.request<GoogleAuthResponse>(`/auth/${AUTH_ROUTES.MOODLE_UNLINK}`, {
      method: 'POST',
      retries: 0,
    });

    if (response.data?.user) {
      saveSessionUser(response.data.user);
      safeStorage.setItem('isMoodleLinked', 'false');
      safeStorage.removeItem('moodleToken');
      safeStorage.removeItem('universe_dashboard_data');
      safeStorage.removeItem('universe_last_sync_time');
    }

    return response;
  }

  async getMe(): Promise<{ data: SessionUser }> {
    const response = await this.request<SessionUser>(`/auth/${AUTH_ROUTES.ME}`, {
      retries: 0,
    });

    if (response.data) {
      saveSessionUser(response.data);
    }

    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.request(`/auth/${AUTH_ROUTES.LOGOUT}`, { method: 'POST', retries: 0 });
    } finally {
      clearUserSessionStorage();
    }
  }
}

export const authApi = new AuthApi();
