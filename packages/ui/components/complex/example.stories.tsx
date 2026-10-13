import type { Meta, StoryObj } from '@storybook/react-vite';

import { VariantRow } from '../../storybook/VariantMatrix/VariantRow';
import { ExampleComponent } from './example';
import type { ExampleComponentProps } from './example';

type MatrixContent = 'title only' | 'with description';

const MATRIX_CONTENT: Record<MatrixContent, ExampleComponentProps> = {
  'title only': { title: 'Example complex component' },
  'with description': {
    title: 'Complex Component Overview',
    description: 'This is an example complex component story demonstrating CSF3 format.',
  },
};

const meta = {
  title: 'Complex/ExampleComponent',
  component: ExampleComponent,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    title: {
      control: 'text',
      description: 'Heading title for the example component',
    },
    description: {
      control: 'text',
      description: 'Optional descriptive message',
    },
  },
} satisfies Meta<typeof ExampleComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Matrix: Story = {
  parameters: {
    layout: 'padded',
  },
  render: () => (
    <VariantRow
      columns={Object.keys(MATRIX_CONTENT) as MatrixContent[]}
      renderCell={(content: MatrixContent) => <ExampleComponent {...MATRIX_CONTENT[content]} />}
    />
  ),
};
