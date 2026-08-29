import type { Meta, StoryObj } from '@storybook/react';

import SimpleButton from './SimpleButton';

const meta: Meta<typeof SimpleButton> = {
  title: 'Components/Buttons/SimpleButton',
  component: SimpleButton,
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
    isLink: {
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof SimpleButton>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    size: 'medium',
    children: 'Primary SimpleButton',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    size: 'medium',
    children: 'Secondary SimpleButton',
  },
};

export const Large: Story = {
  args: {
    variant: 'primary',
    size: 'large',
    children: 'Large SimpleButton',
  },
};

export const Small: Story = {
  args: {
    variant: 'primary',
    size: 'small',
    children: 'Small SimpleButton',
  },
};

export const Link: Story = {
  args: {
    variant: 'primary',
    size: 'medium',
    isLink: true,
    children: 'Link SimpleButton',
    href: '#',
  },
};

export const Transparent: Story = {
  args: {
    isTransparent: true,
    children: 'Transparent SimpleButton',
    variant: 'primary',
    size: 'medium',
  },
};
