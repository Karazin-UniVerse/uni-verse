import type { Meta, StoryObj } from '@storybook/react-vite';
import { RadioButton } from './RadioButton';
import { VariantMatrix } from '../../../../storybook/VariantMatrix/VariantMatrix';
import type { RadioButtonProps } from './RadioButton.types';

type MatrixVariant = RadioButtonProps['variant'];
type MatrixState = 'unchecked' | 'checked' | 'disabled' | 'disabled checked';

const MATRIX_VARIANTS: readonly MatrixVariant[] = ['primary', 'secondary'];
const MATRIX_STATES: Record<MatrixState, Pick<RadioButtonProps, 'defaultChecked' | 'disabled'>> = {
  unchecked: {},
  checked: { defaultChecked: true },
  disabled: { disabled: true },
  'disabled checked': { defaultChecked: true, disabled: true },
};

const meta: Meta<typeof RadioButton> = {
  title: 'Una/Inputs/RadioButton',
  component: RadioButton,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary'],
    },
    disabled: {
      control: 'boolean',
    },
    name: {
      control: 'text',
    },
    checked: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof RadioButton>;

export const Matrix: Story = {
  parameters: {
    layout: 'padded',
  },
  render: () => (
    <VariantMatrix
      rows={MATRIX_VARIANTS}
      columns={Object.keys(MATRIX_STATES) as MatrixState[]}
      renderCell={(variant: MatrixVariant, state: MatrixState) => (
        <RadioButton
          variant={variant}
          aria-label={`${variant} ${state}`}
          {...MATRIX_STATES[state]}
        />
      )}
    />
  ),
};
