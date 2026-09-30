import type { Meta, StoryObj } from '@storybook/react';

import { ExampleComponent } from './example';

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

export const Default: Story = {
  args: {
    title: 'Example complex component',
  },
};

export const WithDescription: Story = {
  args: {
    title: 'Complex Component Overview',
    description: 'This is an example complex component story demonstrating CSF3 format and section separation.',
  },
};
