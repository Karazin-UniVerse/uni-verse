export interface TagInputProps {
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
  removeLabel?: string;
  formatCreateLabel?: (tag: string) => string;
  className?: string;
}
