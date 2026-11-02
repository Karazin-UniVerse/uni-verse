import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
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

function DefaultFilterPanel(args: OpportunityFilterPanelProps): React.ReactElement {
  const [value, setValue] = useState<OpportunityFilterValue>(args.value);

  return <OpportunityFilterPanel {...args} value={value} onApply={setValue} />;
}

export const Default: Story = {
  render: (args) => <DefaultFilterPanel {...args} />,
};

export const WithActiveFilters: Story = {
  render: (args) => <DefaultFilterPanel {...args} />,
  args: {
    value: { paymentType: 'PAID', isRecruiting: true, tags: ['react', 'typescript'] },
  },
};
