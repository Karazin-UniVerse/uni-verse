export function hasLoadFailed(query: { isError: boolean; data: unknown }): boolean {
  return query.isError && query.data === undefined;
}
