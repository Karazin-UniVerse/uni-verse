import type { Meta, StoryObj } from '@storybook/react-vite';
import { Lock } from 'lucide-react';

import { VariantMatrix } from '../../../../storybook/VariantMatrix/VariantMatrix';
import { PasswordInput } from './PasswordInput';
import type { PasswordInputProps } from './PasswordInput.types';

type MatrixRow =
  | 'primary'
  | 'secondary'
  | 'transparent'
  | 'primary disabled'
  | 'secondary disabled'
  | 'with left icon';
type MatrixSize = NonNullable<PasswordInputProps['size']>;

const MATRIX_ROWS: Record<
  MatrixRow,
  Pick<PasswordInputProps, 'variant' | 'isTransparent' | 'disabled' | 'leftIcon'>
> = {
  primary: { variant: 'primary' },
  secondary: { variant: 'secondary' },
  transparent: { isTransparent: true },
  'primary disabled': { variant: 'primary', disabled: true },
  'secondary disabled': { variant: 'secondary', disabled: true },
  'with left icon': { variant: 'primary', leftIcon: <Lock size={16} /> },
};
const MATRIX_SIZES: readonly MatrixSize[] = ['small', 'medium', 'large'];

const meta: Meta<typeof PasswordInput> = {
  title: 'Una/Inputs/PasswordInput',
  component: PasswordInput,
  tags: ['autodocs'],
  args: {
    'aria-label': 'Password',
    hidePasswordLabel: 'Hide password',
    showPasswordLabel: 'Show password',
  },
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary'],
      description: 'Visual variant of the component',
    },
    size: {
      control: { type: 'select' },
      options: ['small', 'medium', 'large'],
      description: 'Input size',
    },
    disabled: {
      control: { type: 'boolean' },
      description: 'Disables interaction when true',
    },
    isTransparent: {
      control: { type: 'boolean' },
      description: 'Transparent background mode',
    },
    showPassword: {
      control: { type: 'boolean' },
      description: 'Controlled visibility of the password',
    },
  },
};

export default meta;
type Story = StoryObj<typeof PasswordInput>;

export const Matrix: Story = {
  parameters: {
    layout: 'padded',
  },
  render: () => (
    <VariantMatrix
      rows={Object.keys(MATRIX_ROWS) as MatrixRow[]}
      columns={MATRIX_SIZES}
      renderCell={(row: MatrixRow, size: MatrixSize) => (
        <PasswordInput
          size={size}
          placeholder="Password"
          aria-label={`${row} ${size}`}
          defaultValue="super-secret-password"
          hidePasswordLabel="Hide password"
          showPasswordLabel="Show password"
          {...MATRIX_ROWS[row]}
        />
      )}
    />
  ),
};
