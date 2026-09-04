import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { CustomDateTime } from './CustomDateTime';

const meta: Meta<typeof CustomDateTime> = {
  title: 'Components/Inputs/CustomDateTime',
  component: CustomDateTime,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['small', 'medium', 'large'],
    },
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary'],
    },
    disabled: {
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof CustomDateTime>;

const InteractiveTemplate = (args: any) => {
  const [date, setDate] = useState<Date | null>(new Date());

  return (
    <div style={{ minHeight: '400px' }}>
      <CustomDateTime {...args} selected={date} onChange={setDate} />
    </div>
  );
};

export const Primary: Story = {
  render: InteractiveTemplate,
  args: {
    size: 'medium',
    placeholder: 'Select date and time',
  },
};

export const Small: Story = {
  render: InteractiveTemplate,
  args: {
    size: 'small',
    placeholder: 'Small DatePicker',
  },
};

export const Large: Story = {
  render: InteractiveTemplate,
  args: {
    size: 'large',
    placeholder: 'Large DatePicker',
  },
};

export const Disabled: Story = {
  render: InteractiveTemplate,
  args: {
    size: 'medium',
    disabled: true,
    placeholder: 'Disabled DatePicker',
  },
};
