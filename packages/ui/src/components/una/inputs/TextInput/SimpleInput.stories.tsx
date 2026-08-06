import type { Meta, StoryObj } from '@storybook/react';

import SimpleInput from './SimpleInput';

const meta: Meta<typeof SimpleInput> = {
  title: 'Components/Inputs/SimpleInput',
  component: SimpleInput,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary'],
    },
    size: {
      control: { type: 'select' },
      options: ['small', 'medium', 'large'],
    },
    isTransparent: {
      control: { type: 'boolean' },
    },
    disabled: {
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof SimpleInput>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    size: 'medium',
    placeholder: 'Primary Input',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    size: 'medium',
    placeholder: 'Secondary Input',
  },
};

export const Large: Story = {
  args: {
    variant: 'primary',
    size: 'large',
    placeholder: 'Large Input',
  },
};

export const Small: Story = {
  args: {
    variant: 'primary',
    size: 'small',
    placeholder: 'Small Input',
  },
};

export const Transparent: Story = {
  args: {
    variant: 'primary',
    size: 'medium',
    isTransparent: true,
    placeholder: 'Transparent Input',
  },
};

export const Disabled: Story = {
  args: {
    variant: 'primary',
    size: 'medium',
    disabled: true,
    placeholder: 'Disabled Input',
  },
};
