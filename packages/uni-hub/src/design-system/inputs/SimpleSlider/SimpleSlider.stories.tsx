import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { SimpleSlider } from './SimpleSlider';

const meta: Meta<typeof SimpleSlider> = {
  title: 'Components/Inputs/SimpleSlider',
  component: SimpleSlider,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '400px', padding: '24px' }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    min: {
      control: { type: 'number' },
    },
    max: {
      control: { type: 'number' },
    },
    step: {
      control: { type: 'number' },
    },
    disabled: {
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof SimpleSlider>;

export const Default: Story = {
  args: {
    min: 0,
    max: 100,
    step: 1,
    value: 50,
    onChange: () => {},
    disabled: false,
  },
};

export const Disabled: Story = {
  args: {
    min: 0,
    max: 100,
    step: 1,
    value: 50,
    onChange: () => {},
    disabled: true,
  },
};

export const CustomStep: Story = {
  args: {
    min: 0,
    max: 100,
    step: 10,
    value: 40,
    onChange: () => {},
  },
};

const InteractiveSlider = (args: any) => {
  const [value, setValue] = useState(75);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
        <span>Выбор оценки</span>
        <strong>{value}</strong>
      </div>
      <SimpleSlider {...args} value={value} onChange={setValue} />
    </div>
  );
};

export const Interactive: Story = {
  render: InteractiveSlider,
  args: {
    min: 0,
    max: 100,
    step: 1,
    disabled: false,
  },
};
