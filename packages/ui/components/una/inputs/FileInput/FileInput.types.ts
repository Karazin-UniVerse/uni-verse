import type { ChangeEvent, InputHTMLAttributes, ReactNode } from 'react';

export interface FileInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'size' | 'onChange' | 'value'
> {
  variant?: 'primary' | 'secondary';
  size?: 'small' | 'medium' | 'large';
  label?: ReactNode;
  hint?: string;
  dragText?: string;
  browseText?: string;
  error?: string;
  maxSize?: number;
  maxFiles?: number;
  files?: File[];
  onFilesChange?: (files: File[]) => void;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  showFileList?: boolean;
}
