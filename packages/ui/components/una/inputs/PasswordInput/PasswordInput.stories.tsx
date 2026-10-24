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
  args: {
    'aria-label': 'Password',
    hidePasswordLabel: 'Hide password',
    showPasswordLabel: 'Show password',
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
    'aria-label': 'Password',
    placeholder: 'Enter password',
    defaultValue: 'super-secret-password',
  },
};

export const WithLeftIcon: Story = {
  args: {
    'aria-label': 'Password',
    placeholder: 'Enter password',
    leftIcon: <Lock size={16} />,
    defaultValue: 'super-secret-password',
  },
};

export const Disabled: Story = {
  args: {
    'aria-label': 'Password',
    placeholder: 'Enter password',
    defaultValue: 'super-secret-password',
    disabled: true,
  },
};

export const Sizes: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        width: '320px',
      }}
    >
      <PasswordInput
        size="small"
        aria-label="Small password input"
        placeholder="Small password input"
        showPasswordLabel="Show password"
        hidePasswordLabel="Hide password"
      />
      <PasswordInput
        size="medium"
        aria-label="Medium password input"
        placeholder="Medium password input"
        showPasswordLabel="Show password"
        hidePasswordLabel="Hide password"
      />
      <PasswordInput
        size="large"
        aria-label="Large password input"
        placeholder="Large password input"
        showPasswordLabel="Show password"
        hidePasswordLabel="Hide password"
      />
    </div>
  ),
};
