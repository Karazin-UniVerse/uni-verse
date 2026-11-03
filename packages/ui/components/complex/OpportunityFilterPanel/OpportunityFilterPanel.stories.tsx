import type { Meta, StoryObj } from '@storybook/react-vite';
import { VariantColumn } from '../../../storybook/VariantMatrix/VariantColumn';
import { OpportunityFilterPanel } from './OpportunityFilterPanel';
import type { OpportunityFilterValue } from './OpportunityFilterPanel.types';

const KNOWN_TAGS = ['react', 'react native', 'typescript', 'research', 'design'];

type MatrixVariant = 'Default' | 'With active filters';

const MATRIX_VALUES: Record<MatrixVariant, OpportunityFilterValue> = {
  Default: { paymentType: '', isRecruiting: false, tags: [] },
  'With active filters': {
    paymentType: 'PAID',
    isRecruiting: true,
    tags: ['react', 'typescript'],
  },
};

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

export const Matrix: Story = {
  argTypes: {
    value: { control: false },
  },
  render: (args) => (
    <VariantColumn
      rows={Object.keys(MATRIX_VALUES) as MatrixVariant[]}
      renderCell={(variant: MatrixVariant) => (
        <OpportunityFilterPanel {...args} value={MATRIX_VALUES[variant]} />
      )}
    />
  ),
};
