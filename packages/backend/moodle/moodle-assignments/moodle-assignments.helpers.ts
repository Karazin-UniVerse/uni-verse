export function parseBooleanQuery(value: unknown): unknown {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (value === true || value === 'true' || value === 1 || value === '1') {
    return true;
  }

  if (value === false || value === 'false' || value === 0 || value === '0') {
    return false;
  }

  return value;
}
