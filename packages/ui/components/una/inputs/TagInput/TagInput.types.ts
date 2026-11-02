export interface TagInputProps {
  removeLabel: string;
  value: string[];
  onChange: (tags: string[]) => void;
  loadSuggestions?: (query: string) => Promise<string[]>;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  maxTags?: number;
  maxTagLength?: number;
  minQueryLength?: number;
  debounceMs?: number;
  formatCreateLabel?: (tag: string) => string;
  className?: string;
}
