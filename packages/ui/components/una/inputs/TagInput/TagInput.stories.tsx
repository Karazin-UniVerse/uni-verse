import type { Meta, StoryObj } from '@storybook/react-vite';
import { VariantColumn } from '../../../../storybook/VariantMatrix/VariantColumn';
import { TagInput } from './TagInput';
import type { TagInputProps } from './TagInput.types';

const KNOWN_TAGS = ['react', 'react native', 'typescript', 'research', 'design'];

const loadSuggestions = async (query: string): Promise<string[]> =>
  KNOWN_TAGS.filter((tag) => tag.includes(query));

type MatrixRow = 'Empty' | 'With values' | 'Limit reached' | 'Disabled';

const MATRIX_ROWS: Record<MatrixRow, Pick<TagInputProps, 'value' | 'maxTags' | 'disabled'>> = {
  Empty: { value: [] },
  'With values': { value: ['react', 'typescript'] },
  'Limit reached': { value: ['react', 'typescript'], maxTags: 2 },
  Disabled: { value: ['react'], disabled: true },
};

const meta = {
  title: 'Una/Inputs/TagInput',
  component: TagInput,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  args: {
    value: [],
    onChange: () => undefined,
    placeholder: 'Add a tag',
    removeLabel: 'Remove',
    loadSuggestions,
    formatCreateLabel: (tag: string) => `Create "${tag}"`,
  },
} satisfies Meta<typeof TagInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Matrix: Story = {
  argTypes: {
    value: { control: false },
    disabled: { control: false },
    maxTags: { control: false },
  },
  render: (args) => (
    <VariantColumn
      rows={Object.keys(MATRIX_ROWS) as MatrixRow[]}
      renderCell={(row: MatrixRow) => <TagInput {...args} {...MATRIX_ROWS[row]} />}
    />
  ),
};
