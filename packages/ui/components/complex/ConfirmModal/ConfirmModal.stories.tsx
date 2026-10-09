import type { Meta, StoryObj } from '@storybook/react-vite';
import { ConfirmModal } from './ConfirmModal';

const meta = {
  title: 'Complex/ConfirmModal',
  component: ConfirmModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    open: { control: 'boolean' },
    title: { control: 'text' },
    message: { control: 'text' },
    cancelLabel: { control: 'text' },
    confirmLabel: { control: 'text' },
    loading: { control: 'boolean' },
    variant: {
      control: 'select',
      options: ['danger', 'warning', 'primary'],
    },
  },
} satisfies Meta<typeof ConfirmModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Danger: Story = {
  args: {
    open: true,
    title: "Від'єднання акаунта Moodle",
    message: "Ви дійсно бажаєте від'єднати свій акаунт Moodle від кабінету?",
    cancelLabel: 'Скасувати',
    confirmLabel: "Від'єднати",
    variant: 'danger',
    onClose: () => {},
    onConfirm: () => {},
  },
};

export const Loading: Story = {
  args: {
    ...Danger.args,
    loading: true,
    loadingLabel: 'Відʼєднання...',
  },
};
