const MAX_RETRY_SECONDS = 60;

export function gripRetrySeconds(value: string | null): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;

  const seconds = Number(value);

  return Number.isSafeInteger(seconds) && seconds > 0
    ? Math.min(MAX_RETRY_SECONDS, seconds)
    : undefined;
}
