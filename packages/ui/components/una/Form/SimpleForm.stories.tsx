import type { Meta, StoryObj } from '@storybook/react-vite';
import { SimpleForm } from './SimpleForm';
import { TextInput } from '../inputs/TextInput/TextInput';
import { Button } from '../Button/Button';
import { VariantMatrix } from '../../../storybook/VariantMatrix/VariantMatrix';
import type { SimpleFormProps } from './SimpleForm.types';

type MatrixVariant = NonNullable<SimpleFormProps['variant']>;
type MatrixGap = 'default gap' | 'large gap';

const MATRIX_VARIANTS: readonly MatrixVariant[] = ['simple', 'card'];
const MATRIX_GAPS: Record<MatrixGap, Pick<SimpleFormProps, 'style'>> = {
  'default gap': { style: { width: '300px' } },
  'large gap': { style: { width: '300px', gap: 'var(--gap-large)' } },
};

const meta = {
  title: 'Una/Form/SimpleForm',
  component: SimpleForm,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    action: { action: 'action' },
    onData: { action: 'onData' },
    variant: {
      control: { type: 'select' },
      options: ['simple', 'card'],
      description: 'Внешний вид формы',
    },
  },
} satisfies Meta<typeof SimpleForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Matrix: Story = {
  parameters: {
    layout: 'padded',
  },
  render: () => (
    <VariantMatrix
      rows={MATRIX_VARIANTS}
      columns={Object.keys(MATRIX_GAPS) as MatrixGap[]}
      renderCell={(variant: MatrixVariant, gap: MatrixGap) => (
        <SimpleForm variant={variant} {...MATRIX_GAPS[gap]}>
          <TextInput type="email" name="email" placeholder="Email address" />
          <TextInput type="text" name="subject" placeholder="Subject" />
          <Button variant="primary" size="medium" type="submit">
            Send
          </Button>
        </SimpleForm>
      )}
    />
  ),
};
