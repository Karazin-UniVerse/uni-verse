import type { Meta, StoryObj } from '@storybook/react-vite';
import { Form } from './Form';
import { TextInput } from '../inputs/TextInput/TextInput';
import { Button } from '../Button/Button';
import { VariantMatrix } from '../../../storybook/VariantMatrix/VariantMatrix';
import type { FormProps } from './Form.types';

type MatrixVariant = NonNullable<FormProps['variant']>;
type MatrixGap = 'default gap' | 'large gap';

const MATRIX_VARIANTS: readonly MatrixVariant[] = ['simple', 'card'];
const MATRIX_GAPS: Record<MatrixGap, Pick<FormProps, 'style'>> = {
  'default gap': { style: { width: '300px' } },
  'large gap': { style: { width: '300px', gap: 'var(--gap-large)' } },
};

const meta = {
  title: 'Una/Form/Form',
  component: Form,
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
} satisfies Meta<typeof Form>;

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
        <Form variant={variant} {...MATRIX_GAPS[gap]}>
          <TextInput type="email" name="email" placeholder="Email address" />
          <TextInput type="text" name="subject" placeholder="Subject" />
          <Button variant="primary" size="medium" type="submit">
            Send
          </Button>
        </Form>
      )}
    />
  ),
};
