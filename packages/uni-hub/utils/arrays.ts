export function asList<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}
