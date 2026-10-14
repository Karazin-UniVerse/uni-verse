import type { Meta, StoryObj } from '@storybook/react-vite';

import { VariantMatrix } from '../../../../storybook/VariantMatrix/VariantMatrix';
import { TextInput } from './TextInput';
import type { TextInputProps } from './TextInput.types';

type MatrixRow =
  'primary' | 'secondary' | 'transparent' | 'primary disabled' | 'secondary disabled';
type MatrixSize = NonNullable<TextInputProps['size']>;

const MATRIX_ROWS: Record<
  MatrixRow,
  Pick<TextInputProps, 'variant' | 'isTransparent' | 'disabled'>
> = {
  primary: { variant: 'primary' },
  secondary: { variant: 'secondary' },
  transparent: { isTransparent: true },
  'primary disabled': { variant: 'primary', disabled: true },
  'secondary disabled': { variant: 'secondary', disabled: true },
};
const MATRIX_SIZES: readonly MatrixSize[] = ['small', 'medium', 'large'];

const meta: Meta<typeof TextInput> = {
  title: 'Una/Inputs/TextInput',
  component: TextInput,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary'],
    },
    size: {
      control: { type: 'select' },
      options: ['small', 'medium', 'large'],
    },
    isTransparent: {
      control: { type: 'boolean' },
    },
    disabled: {
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof TextInput>;

export const Matrix: Story = {
  parameters: {
    layout: 'padded',
  },
  render: () => (
    <VariantMatrix
      rows={Object.keys(MATRIX_ROWS) as MatrixRow[]}
      columns={MATRIX_SIZES}
      renderCell={(row: MatrixRow, size: MatrixSize) => (
        <TextInput
          size={size}
          placeholder="Input"
          aria-label={`${row} ${size}`}
          {...MATRIX_ROWS[row]}
        />
      )}
    />
  ),
};
