/**
 * Standard HTTP response status codes
 */
export const RESPONSE_CODES = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export type ResponseCode = (typeof RESPONSE_CODES)[keyof typeof RESPONSE_CODES];
