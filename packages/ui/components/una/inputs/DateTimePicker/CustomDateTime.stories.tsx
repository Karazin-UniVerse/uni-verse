import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { VariantMatrix } from '../../../../storybook/VariantMatrix/VariantMatrix';
import { CustomDateTime } from './CustomDateTime';
import type { CustomDateTimeProps } from './DateTimePicker.types';

type MatrixRow =
  'primary' | 'secondary' | 'transparent' | 'primary disabled' | 'secondary disabled';
type MatrixSize = NonNullable<CustomDateTimeProps['size']>;
type MatrixDateTimeProps = Omit<CustomDateTimeProps, 'selected' | 'onChange'>;

const MATRIX_DATE = new Date(2026, 0, 15, 12, 0);
const MATRIX_ROWS: Record<
  MatrixRow,
  Pick<CustomDateTimeProps, 'variant' | 'isTransparent' | 'disabled'>
> = {
  primary: { variant: 'primary' },
  secondary: { variant: 'secondary' },
  transparent: { isTransparent: true },
  'primary disabled': { variant: 'primary', disabled: true },
  'secondary disabled': { variant: 'secondary', disabled: true },
};
const MATRIX_SIZES: readonly MatrixSize[] = ['small', 'medium', 'large'];

function MatrixDateTime(props: MatrixDateTimeProps) {
  const [date, setDate] = useState<Date | null>(MATRIX_DATE);

  return <CustomDateTime {...props} selected={date} onChange={setDate} />;
}

const meta: Meta<typeof CustomDateTime> = {
  title: 'Una/Inputs/CustomDateTime',
  component: CustomDateTime,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['small', 'medium', 'large'],
    },
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary'],
    },
    disabled: {
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof CustomDateTime>;

export const Matrix: Story = {
  args: {
    selected: null,
    onChange: () => {},
  },
  parameters: {
    layout: 'padded',
  },
  render: () => (
    <VariantMatrix
      rows={Object.keys(MATRIX_ROWS) as MatrixRow[]}
      columns={MATRIX_SIZES}
      renderCell={(row: MatrixRow, size: MatrixSize) => (
        <MatrixDateTime size={size} aria-label={`${row} ${size}`} {...MATRIX_ROWS[row]} />
      )}
    />
  ),
};
