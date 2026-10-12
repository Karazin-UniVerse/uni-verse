import { parseBoolean } from '@universe/core/utils/boolean';

export function parseBooleanQuery(value: unknown): unknown {
  if (value === undefined || value === null) {
    return undefined;
  }

  return parseBoolean(value) ?? value;
}
