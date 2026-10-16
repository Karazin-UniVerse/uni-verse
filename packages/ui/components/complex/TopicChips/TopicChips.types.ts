export type TopicChipOption = {
  id: string;
  label: string;
};

export type TopicChipsProps = {
  label?: string;
  ariaLabel?: string;
  options: TopicChipOption[];
  selectedId?: string;
  onSelect: (id: string) => void;
  className?: string;
};
