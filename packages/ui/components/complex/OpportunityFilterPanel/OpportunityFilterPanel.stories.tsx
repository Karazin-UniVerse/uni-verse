import type { Meta, StoryObj } from '@storybook/react-vite';
import { useArgs } from 'storybook/preview-api';
import { OpportunityFilterPanel } from './OpportunityFilterPanel';
import type {
  OpportunityFilterPanelProps,
  OpportunityFilterValue,
} from './OpportunityFilterPanel.types';

const KNOWN_TAGS = ['react', 'react native', 'typescript', 'research', 'design'];

const meta = {
  title: 'Complex/OpportunityFilterPanel',
  component: OpportunityFilterPanel,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  args: {
    value: { paymentType: '', isRecruiting: false, tags: [] },
    onApply: () => undefined,
    loadTagSuggestions: async (query: string) => KNOWN_TAGS.filter((tag) => tag.includes(query)),
    labels: {
      open: 'Open filters',
      close: 'Close filters',
      title: 'Filters',
      paymentType: 'Payment',
      paymentAll: 'All',
      paymentPaid: 'Paid',
      paymentUnpaid: 'Unpaid',
      recruiting: 'Recruitment is underway',
      tags: 'Tags',
      tagsPlaceholder: 'Add a tag',
      removeTag: 'Remove',
      apply: 'Apply',
      formatCreateTag: (tag: string) => `Create "${tag}"`,
    },
  },
} satisfies Meta<typeof OpportunityFilterPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

function RenderFilterPanel(args: OpportunityFilterPanelProps): React.ReactElement {
  const [{ value }, updateArgs] = useArgs<OpportunityFilterPanelProps>();

  return (
    <OpportunityFilterPanel
      {...args}
      value={value}
      onApply={(nextValue: OpportunityFilterValue) => updateArgs({ value: nextValue })}
    />
  );
}

export const Default: Story = {
  render: RenderFilterPanel,
};

export const WithActiveFilters: Story = {
  render: RenderFilterPanel,
  args: {
    value: { paymentType: 'PAID', isRecruiting: true, tags: ['react', 'typescript'] },
  },
};
