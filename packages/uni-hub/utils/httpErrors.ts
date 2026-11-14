/** Whether a failed request from `api.request` ended with the given HTTP status. */
export function hasHttpStatus(failure: unknown, status: number): boolean {
  return failure instanceof Error && failure.message.includes(`(HTTP ${status})`);
}
