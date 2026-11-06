import { gripBrowserContext, gripError, gripJson } from '../../helpers';

export async function GET(): Promise<Response> {
  try {
    const { client, token } = await gripBrowserContext();
    const identity = await client.session(token);

    return gripJson({
      githubId: identity.githubId,
      login: identity.login,
      expiresAt: identity.expiresAt,
      csrfToken: identity.csrfToken,
    });
  } catch (error: unknown) {
    return gripError(error);
  }
}
