import type { Meta, StoryObj } from '@storybook/react-vite';

import { VariantMatrix } from '../../../storybook/VariantMatrix/VariantMatrix';
import { Button } from './Button';
import type { ButtonAsButtonProps } from './Button.types';

type MatrixRow =
  | 'primary'
  | 'secondary'
  | 'transparent'
  | 'primary success'
  | 'primary warning'
  | 'primary danger'
  | 'secondary success'
  | 'secondary warning'
  | 'secondary danger'
  | 'primary disabled'
  | 'secondary disabled';
type MatrixSize = NonNullable<ButtonAsButtonProps['size']>;

const MATRIX_ROWS: Record<
  MatrixRow,
  Pick<ButtonAsButtonProps, 'variant' | 'tone' | 'isTransparent' | 'disabled'>
> = {
  primary: { variant: 'primary' },
  secondary: { variant: 'secondary' },
  transparent: { isTransparent: true },
  'primary success': { variant: 'primary', tone: 'success' },
  'primary warning': { variant: 'primary', tone: 'warning' },
  'primary danger': { variant: 'primary', tone: 'danger' },
  'secondary success': { variant: 'secondary', tone: 'success' },
  'secondary warning': { variant: 'secondary', tone: 'warning' },
  'secondary danger': { variant: 'secondary', tone: 'danger' },
  'primary disabled': { variant: 'primary', disabled: true },
  'secondary disabled': { variant: 'secondary', disabled: true },
};
const MATRIX_SIZES: readonly MatrixSize[] = ['small', 'medium', 'large'];

const meta: Meta<typeof Button> = {
  title: 'Una/Buttons/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary'],
    },
    tone: {
      control: { type: 'select' },
      options: ['default', 'success', 'warning', 'danger'],
    },
    size: {
      control: { type: 'select' },
      options: ['small', 'medium', 'large'],
    },
    isTransparent: {
      control: { type: 'boolean' },
    },
    isLink: {
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Matrix: Story = {
  parameters: {
    layout: 'padded',
  },
  render: () => (
    <VariantMatrix
      rows={Object.keys(MATRIX_ROWS) as MatrixRow[]}
      columns={MATRIX_SIZES}
      renderCell={(row: MatrixRow, size: MatrixSize) => (
        <Button size={size} {...MATRIX_ROWS[row]}>
          Button
        </Button>
      )}
    />
  ),
};
