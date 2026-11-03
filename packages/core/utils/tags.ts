export const normalizeTag = (tag: string): string => tag.trim().replace(/\s+/g, ' ').toLowerCase();

export const normalizeTags = (tags: unknown[]): string[] => {
  const normalized = tags
    .filter((tag): tag is string => typeof tag === 'string')
    .map(normalizeTag)
    .filter(Boolean);

  return [...new Set(normalized)];
};
