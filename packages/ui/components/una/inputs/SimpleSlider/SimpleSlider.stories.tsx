import type { Meta, StoryObj } from '@storybook/react';
import SimpleSlider from './SimpleSlider';

const meta: Meta<typeof SimpleSlider> = {
  title: 'Components/Inputs/SimpleSlider',
  component: SimpleSlider,
  tags: ['autodocs'],
  argTypes: {
    min: {
      control: 'number',
    },
    max: {
      control: 'number',
    },
    step: {
      control: 'number',
    },
    disabled: {
      control: 'boolean',
    },
    value: {
      control: 'number',
    },
  },
};

export default meta;
type Story = StoryObj<typeof SimpleSlider>;

export const Default: Story = {
  args: {
    value: 50,
    min: 0,
    max: 100,
    step: 1,
    disabled: false,
  },
};

export const Disabled: Story = {
  args: {
    value: 30,
    disabled: true,
  },
};
