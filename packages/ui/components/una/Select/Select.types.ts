export type Option = {
  value: string;
  label: string;
};

export type SelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  id?: string;
  className?: string;
  disabled?: boolean;
  'aria-label'?: string;
};
