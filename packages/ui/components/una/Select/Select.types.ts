export type Option = {
  value: string;
  label: string;
};

export type SelectProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  className?: string;
  'aria-label'?: string;
};
