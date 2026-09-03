export function buildMoodleParams(
  params: Record<string, unknown>,
  prefix = '',
): Array<[string, string]> {
  const result: Array<[string, string]> = [];

  const process = (keyPrefix: string, obj: unknown) => {
    if (Array.isArray(obj)) {
      obj.forEach((val: unknown, index) => {
        process(`${keyPrefix}[${index}]`, val);
      });
    } else if (typeof obj === 'object' && obj !== null) {
      Object.entries(obj).forEach(([subKey, subVal]) => {
        process(keyPrefix ? `${keyPrefix}[${subKey}]` : subKey, subVal);
      });
    } else if (
      typeof obj === 'string' ||
      typeof obj === 'number' ||
      typeof obj === 'boolean'
    ) {
      result.push([keyPrefix, String(obj)]);
    }
  };

  process(prefix, params);

  return result;
}
