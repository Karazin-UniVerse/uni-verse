import type { Meta, StoryObj } from '@storybook/react-vite';
import { VariantColumn } from '../../../../storybook/VariantMatrix/VariantColumn';
import { MultiSelect } from './MultiSelect';
import type { MultiSelectGroup, MultiSelectProps } from './MultiSelect.types';

const GROUPS: MultiSelectGroup<string>[] = [
  {
    label: 'Format',
    tone: 'info',
    options: [
      { value: 'RESEARCH', label: 'Research' },
      { value: 'INTERNSHIP', label: 'Internship' },
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

type MatrixRow = 'Empty' | 'With values' | 'Disabled';

const MATRIX_ROWS: Record<MatrixRow, Pick<MultiSelectProps<string>, 'value' | 'disabled'>> = {
  Empty: { value: [] },
  'With values': { value: ['RESEARCH', 'REMOTE'] },
  Disabled: { value: ['KHARKIV'], disabled: true },
};

const meta = {
  title: 'Una/Inputs/MultiSelect',
  component: MultiSelect<string>,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  args: {
    groups: GROUPS,
    value: [],
    onChange: () => undefined,
    placeholder: 'Select tags',
    removeLabel: 'Remove',
  },
} satisfies Meta<typeof MultiSelect<string>>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Matrix: Story = {
  argTypes: {
    value: { control: false },
    disabled: { control: false },
  },
  render: (args) => (
    <VariantColumn
      rows={Object.keys(MATRIX_ROWS) as MatrixRow[]}
      renderCell={(row: MatrixRow) => <MultiSelect {...args} {...MATRIX_ROWS[row]} />}
    />
  ),
};
