import { Injectable } from '@nestjs/common';

interface MoodleTokenResponse {
  token: string;
  error?: string;
}
interface MoodleUserIdResponse {
  userid: string;
  error?: string;
}
@Injectable()
export class GetCreds {
  constructor() {}
  async getToken(email: string, password: string) {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }
    const response = await fetch(
      `https://moodle.karazin.ua/login/token.php?username=${email}&password=${password}&service=moodle_mobile_app`,
    );
    const text = await response.text();
    const tokenResponse = JSON.parse(text || '{}') as MoodleTokenResponse;
    if (tokenResponse.error) {
      throw new Error(`Moodle error: ${tokenResponse.error}`);
    }
    return tokenResponse.token;
  }
  async getUserId(token: string) {
    if (!token) {
      throw new Error('Token is required');
    }
    try {
      const response = await fetch(
        `https://moodle.karazin.ua/webservice/rest/server.php?wstoken=${token}&wsfunction=core_webservice_get_site_info&moodlewsrestformat=json`,
      );
      const data = (await response.json()) as MoodleUserIdResponse;
      return data.userid;
    } catch (error) {
      throw new Error(`Moodle error: ${error}`);
    }
  }
}
