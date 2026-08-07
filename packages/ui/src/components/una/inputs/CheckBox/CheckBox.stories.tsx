import type { Meta, StoryObj } from '@storybook/react';
import CheckBox from './CheckBox';
import React from 'react';

const meta: Meta<typeof CheckBox> = {
  title: 'Components/Inputs/CheckBox',
  component: CheckBox,
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
type Story = StoryObj<typeof CheckBox>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    name: 'primary-checkbox',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    name: 'secondary-checkbox',
  },
};

export const Checked: Story = {
  args: {
    variant: 'primary',
    checked: true,
    readOnly: true,
  },
};

export const Disabled: Story = {
  args: {
    variant: 'primary',
    disabled: true,
  },
};

export const DisabledChecked: Story = {
  args: {
    variant: 'primary',
    disabled: true,
    checked: true,
    readOnly: true,
  },
};

export const CheckboxGroup: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <CheckBox variant="primary" name="group1" value="option1" defaultChecked />
        Option 1
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <CheckBox variant="primary" name="group1" value="option2" />
        Option 2
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <CheckBox variant="primary" name="group1" value="option3" disabled />
        Option 3 (Disabled)
      </label>
    </div>
  ),
};
