import type { Meta, StoryObj } from '@storybook/react';
import RadioButton from './RadioButton';
import React from 'react';

const meta: Meta<typeof RadioButton> = {
  title: 'Components/Inputs/RadioButton',
  component: RadioButton,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary'],
    },
    disabled: {
      control: 'boolean',
    },
    name: {
      control: 'text',
    },
    checked: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof RadioButton>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    name: 'primary-radio',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    name: 'secondary-radio',
  },
};

export const Disabled: Story = {
  args: {
    variant: 'primary',
    disabled: true,
  },
};

export const Checked: Story = {
  args: {
    variant: 'primary',
    checked: true,
    readOnly: true,
  },
};

export const RadioGroup: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '10px' }}>
      <RadioButton variant="primary" name="group1" value="option1" defaultChecked />
      <RadioButton variant="primary" name="group1" value="option2" />
      <RadioButton variant="primary" name="group1" value="option3" disabled />
    </div>
  ),
};
