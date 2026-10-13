import type { TextInputProps } from '../TextInput/TextInput.types';

export interface DateTimeProps extends Omit<TextInputProps, 'onChange' | 'value'> {
  selected: Date | null;
  onChange: (date: Date | null) => void;
  clearLabel?: string;
  dialogLabel?: string;
  locale?: string;
  showTime?: boolean;
  todayLabel?: string;
}
