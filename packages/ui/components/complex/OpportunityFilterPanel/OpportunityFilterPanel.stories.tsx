import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import type { OpportunityTag } from '@core/constants/tags';
import type { MultiSelectGroup } from '../../una/inputs/MultiSelect';
import { VariantColumn } from '../../../storybook/VariantMatrix/VariantColumn';
import { OpportunityFilterPanel } from './OpportunityFilterPanel';
import type { OpportunityFilterValue } from './OpportunityFilterPanel.types';

const TAG_GROUPS: MultiSelectGroup<OpportunityTag>[] = [
  {
    label: 'Field',
    tone: 'info',
    options: [
      { value: 'IT', label: 'IT' },
      { value: 'LAW', label: 'Law' },
    ],
  },
  {
    label: 'Location',
    tone: 'success',
    options: [
      { value: 'REMOTE', label: 'Remote' },
      { value: 'KHARKIV', label: 'Kharkiv' },
    ],
  },
];

type MatrixVariant = 'Default' | 'With active filters';

const MATRIX_VALUES: Record<MatrixVariant, OpportunityFilterValue> = {
  Default: { paymentType: '', isRecruiting: false, tags: [] },
  'With active filters': {
    paymentType: 'PAID',
    isRecruiting: true,
    tags: ['IT', 'REMOTE'],
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
    tagGroups: TAG_GROUPS,
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
      tagsPlaceholder: 'Select tags',
      removeTag: 'Remove',
      apply: 'Apply',
    },
  },
} satisfies Meta<typeof OpportunityFilterPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Matrix: Story = {
  argTypes: {
    value: { control: false },
  },
  render: function Matrix(args): React.ReactElement {
    const [values, setValues] = useState(MATRIX_VALUES);

    return (
      <VariantColumn
        rows={Object.keys(MATRIX_VALUES) as MatrixVariant[]}
        renderCell={(variant: MatrixVariant) => (
          <OpportunityFilterPanel
            {...args}
            value={values[variant]}
            onApply={(value) => setValues((previous) => ({ ...previous, [variant]: value }))}
          />
        )}
      />
    );
  },
};
