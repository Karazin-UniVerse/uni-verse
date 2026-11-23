export const AUTH_ERROR = {
  CORPORATE_DOMAIN_REQUIRED: 'login.errors.corporateDomainRequired',
  MOODLE_ALREADY_LINKED: 'login.errors.moodleAlreadyLinked',
} as const;

export type AuthError = (typeof AUTH_ERROR)[keyof typeof AUTH_ERROR];
