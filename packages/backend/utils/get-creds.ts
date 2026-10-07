import { Injectable } from '@nestjs/common';
import { MoodleClientService } from '../moodle/moodle-client/moodle.client.service';

interface MoodleTokenResponse {
  token?: string;
  error?: string;
}

interface MoodleUserIdResponse {
  userid?: string | number;
  error?: string;
  errorcode?: string;
}

@Injectable()
export class GetCreds {
  constructor(private readonly moodleClient: MoodleClientService) {}

  async getToken(email: string, password: string): Promise<string> {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const body = new URLSearchParams({
      username: email,
      password: password,
      service: 'moodle_mobile_app',
    });

    const response = await this.moodleClient.fetch('/login/token.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const text = await response.text();
    const tokenResponse = JSON.parse(text || '{}') as MoodleTokenResponse;

    if (tokenResponse.error || !tokenResponse.token) {
      throw new Error(
        `Moodle error: ${tokenResponse.error ?? 'Failed to obtain token'}`,
      );
    }

    return tokenResponse.token;
  }

  async getUserId(token: string): Promise<string> {
    if (!token) {
      throw new Error('Token is required');
    }

    const response = await this.moodleClient.fetch(
      `/webservice/rest/server.php?wstoken=${encodeURIComponent(token)}&wsfunction=core_webservice_get_site_info&moodlewsrestformat=json`,
    );

    const data = (await response.json()) as MoodleUserIdResponse;

    if (
      data.error ||
      data.errorcode ||
      data.userid === undefined ||
      data.userid === null
    ) {
      throw new Error(
        `Moodle error: ${data.error ?? data.errorcode ?? 'User ID not found'}`,
      );
    }

    return String(data.userid);
  }
}
