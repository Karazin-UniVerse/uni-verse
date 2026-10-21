export type TopicChipOption = {
  id: string;
  label: string;
};

export type TopicChipsProps = {
  options: TopicChipOption[];
  onSelect: (id: string) => void;
  label?: string;
  ariaLabel?: string;
  selectedId?: string;
  className?: string;
};
