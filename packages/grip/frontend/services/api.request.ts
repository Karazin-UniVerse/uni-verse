export abstract class ApiClient {
  protected fetchResponse(url: string, options: RequestInit): Promise<Response> {
    return fetch(url, options);
  }
}
