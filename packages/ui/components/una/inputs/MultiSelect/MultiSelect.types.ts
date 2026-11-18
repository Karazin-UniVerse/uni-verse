import type { TagTone } from '../../Tag/Tag.types';

export type MultiSelectOption<T extends string> = {
  value: T;
  label: string;
};

export type MultiSelectGroup<T extends string> = {
  label: string;
  options: readonly MultiSelectOption<T>[];
  tone?: TagTone;
};

export interface MultiSelectProps<T extends string> {
  groups: readonly MultiSelectGroup<T>[];
  value: readonly T[];
  onChange: (value: T[]) => void;
  placeholder: string;
  removeLabel: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}
