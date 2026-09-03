import type { TextInputProps } from '../TextInput/TextInput.types';

export interface CustomDateTimeProps extends Omit<TextInputProps, 'onChange' | 'value'> {
  selected: Date | null;
  onChange: (date: Date | null) => void;
}
