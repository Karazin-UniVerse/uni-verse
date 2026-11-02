import clsx from 'clsx';
import { X } from 'lucide-react';
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  TAG_MAX_LENGTH,
  TAG_MAX_PER_OPPORTUNITY,
  TAG_SUGGEST_DEBOUNCE_MS,
  TAG_SUGGEST_MIN_QUERY_LENGTH,
} from '@core/constants/tags';
import { useClickOutside } from '../../../../hooks/useClickOutside';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import { DropdownOption } from '../../Dropdown/DropdownOption';
import { Tag } from '../../Tag';
import { TextInput } from '../TextInput';
import type { TagInputProps } from './TagInput.types';
import styles from './TagInput.module.scss';

interface TagOption {
  name: string;
  isNew: boolean;
}

const EMPTY_TAGS: string[] = [];

const defaultNormalizeTag = (tag: string): string => tag.trim().replace(/\s+/g, ' ').toLowerCase();

export const TagInput: React.FC<TagInputProps> = ({
  removeLabel,
  value,
  onChange,
  loadSuggestions,
  id,
  placeholder,
  formatCreateLabel,
  className,
  disabled = false,
  maxTags = TAG_MAX_PER_OPPORTUNITY,
  maxTagLength = TAG_MAX_LENGTH,
  minQueryLength = TAG_SUGGEST_MIN_QUERY_LENGTH,
  debounceMs = TAG_SUGGEST_DEBOUNCE_MS,
}) => {
  const safeValue = value ?? EMPTY_TAGS;
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);
  const loadRef = useRef(loadSuggestions);
  const listId = useId();

  useEffect(() => {
    loadRef.current = loadSuggestions;
  });

  const normalizedQuery = defaultNormalizeTag(query);
  const debouncedQuery = useDebouncedValue(normalizedQuery, debounceMs);
  const isLimitReached = safeValue.length >= maxTags;

  useClickOutside(rootRef, () => setIsOpen(false), { enabled: isOpen });

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    const load = loadRef.current;

    if (!load || debouncedQuery.length < minQueryLength) {
      setSuggestions([]);

      return;
    }

    load(debouncedQuery)
      .then((names) => {
        if (requestId === requestIdRef.current) {
          setSuggestions(names.map(defaultNormalizeTag));
        }
      })
      .catch(() => {
        if (requestId === requestIdRef.current) {
          setSuggestions([]);
        }
      });
  }, [debouncedQuery, minQueryLength]);

  const options = useMemo<TagOption[]>(() => {
    if (isLimitReached || normalizedQuery.length < minQueryLength) {
      return [];
    }

    const existing: TagOption[] = suggestions
      .filter((name) => name.includes(normalizedQuery) && !(value ?? EMPTY_TAGS).includes(name))
      .map((name) => ({ name, isNew: false }));

    const hasExactMatch =
      (value ?? EMPTY_TAGS).includes(normalizedQuery) ||
      existing.some((option) => option.name === normalizedQuery);

    if (hasExactMatch || normalizedQuery.length > maxTagLength) {
      return existing;
    }

    return [...existing, { name: normalizedQuery, isNew: true }];
  }, [suggestions, value, normalizedQuery, minQueryLength, maxTagLength, isLimitReached]);

  const addTag = (raw: string): void => {
    const tag = defaultNormalizeTag(raw);

    if (!tag || tag.length > maxTagLength || isLimitReached || safeValue.includes(tag)) {
      return;
    }

    onChange([...safeValue, tag]);
    setQuery('');
    setSuggestions([]);
    setActiveIndex(-1);
  };

  const removeTag = (tag: string): void => {
    onChange(safeValue.filter((item) => item !== tag));
    inputRef.current?.focus();
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setQuery(event.target.value);
    setActiveIndex(-1);
    setIsOpen(true);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();

      const activeOption = options[activeIndex];

      addTag(activeOption ? activeOption.name : query);

      return;
    }

    if (event.key === 'ArrowDown' && options.length > 0) {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((previous) => (previous + 1) % options.length);

      return;
    }

    if (event.key === 'ArrowUp' && options.length > 0) {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((previous) => (previous <= 0 ? options.length - 1 : previous - 1));

      return;
    }

    if (event.key === 'Backspace' && query === '' && safeValue.length > 0) {
      onChange(safeValue.slice(0, -1));

      return;
    }

    if (event.key === 'Escape' && isOpen) {
      event.stopPropagation();
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  const getOptionLabel = ({ name, isNew }: TagOption): string =>
    isNew && formatCreateLabel ? formatCreateLabel(name) : name;

  const isPanelVisible = isOpen && options.length > 0;

  return (
    <div ref={rootRef} className={clsx(styles.root, className)}>
      <div className={clsx(styles.field, disabled && styles.disabled)}>
        {safeValue.map((tag) => (
          <Tag key={tag} tone="info" className={styles.chip}>
            <span>{tag}</span>
            <button
              type="button"
              className={styles.remove}
              onClick={(event) => {
                event.stopPropagation();
                removeTag(tag);
              }}
              aria-label={`${removeLabel} ${tag}`}
              disabled={disabled}
            >
              <X size={12} aria-hidden />
            </button>
          </Tag>
        ))}

        <TextInput
          ref={inputRef}
          id={id}
          className={styles.input}
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={safeValue.length === 0 ? placeholder : undefined}
          disabled={disabled || isLimitReached}
          autoComplete="off"
          role="combobox"
          aria-expanded={isPanelVisible}
          aria-controls={isPanelVisible ? listId : undefined}
          aria-activedescendant={
            isPanelVisible && activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined
          }
          aria-autocomplete="list"
          isTransparent
        />
      </div>

      {isPanelVisible && (
        <div id={listId} role="listbox" className={styles.panel}>
          {options.map((option, index) => (
            <div
              key={`${option.isNew ? 'new' : 'existing'}-${option.name}`}
              id={`${listId}-option-${index}`}
              role="option"
              tabIndex={-1}
              aria-selected={index === activeIndex}
              className={clsx(styles.item, index === activeIndex && styles.itemActive)}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <DropdownOption isSelected={false} onSelect={() => addTag(option.name)}>
                {getOptionLabel(option)}
              </DropdownOption>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TagInput;
