import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import SimpleDateTime from './SimpleDateTime';
import 'react-datepicker/dist/react-datepicker.css';

const meta: Meta<typeof SimpleDateTime> = {
  title: 'Components/Inputs/SimpleDateTime',
  component: SimpleDateTime,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'radio' },
      options: ['primary', 'secondary'],
    },
    size: {
      control: { type: 'radio' },
      options: ['small', 'medium', 'large'],
    },
    isTransparent: {
      control: { type: 'boolean' },
    },
    disabled: {
      control: { type: 'boolean' },
    },
  },
  decorators: [
    (Story, context) => {
      const [date, setDate] = useState<Date | null>(new Date());
      const mergedArgs = { ...context.args, selected: date, onChange: setDate };
      return <Story args={mergedArgs} />;
    },
  ],
};

export default meta;
type Story = StoryObj<typeof SimpleDateTime>;

export const Default: Story = {
  args: {
    variant: 'primary',
    size: 'medium',
    isTransparent: false,
    disabled: false,
  },
};

export const Secondary: Story = {
  args: {
    ...Default.args,
    variant: 'secondary',
  },
};

export const Large: Story = {
  args: {
    ...Default.args,
    size: 'large',
  },
};

export const Small: Story = {
  args: {
    ...Default.args,
    size: 'small',
  },
};

export const Transparent: Story = {
  args: {
    ...Default.args,
    isTransparent: true,
  },
};

export const Disabled: Story = {
  args: {
    ...Default.args,
    disabled: true,
  },
};
