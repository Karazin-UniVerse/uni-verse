import type { Meta, StoryObj } from '@storybook/react-vite';
import { Lock } from 'lucide-react';
import { PasswordInput } from './PasswordInput';

const meta = {
  title: 'Una/Inputs/PasswordInput',
  component: PasswordInput,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary'],
      description: 'Visual variant of the component',
    },
    size: {
      control: { type: 'select' },
      options: ['small', 'medium', 'large'],
      description: 'Input size',
    },
    disabled: {
      control: { type: 'boolean' },
      description: 'Disables interaction when true',
    },
    isTransparent: {
      control: { type: 'boolean' },
      description: 'Transparent background mode',
    },
    showPassword: {
      control: { type: 'boolean' },
      description: 'Controlled visibility of the password',
    },
  },
} satisfies Meta<typeof PasswordInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Enter password',
    defaultValue: 'super-secret-password',
  },
};

export const WithLeftIcon: Story = {
  args: {
    placeholder: 'Enter password',
    leftIcon: <Lock size={16} />,
    defaultValue: 'super-secret-password',
  },
};

export const Disabled: Story = {
  args: {
    placeholder: 'Enter password',
    defaultValue: 'super-secret-password',
    disabled: true,
  },
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '320px' }}>
      <PasswordInput size="small" placeholder="Small password input" />
      <PasswordInput size="medium" placeholder="Medium password input" />
      <PasswordInput size="large" placeholder="Large password input" />
    </div>
  ),
};
