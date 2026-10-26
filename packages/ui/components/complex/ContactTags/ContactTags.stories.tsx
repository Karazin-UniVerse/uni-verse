import type { Meta, StoryObj } from '@storybook/react-vite';
import { ContactTags } from './ContactTags';

const meta = {
  title: 'Complex/ContactTags',
  component: ContactTags,
  tags: ['autodocs'],
  args: {
    email: 'student@example.com',
    alternativeContact: '@student_dev',
    emailLabel: 'Електронна пошта',
    alternativeContactLabel: 'Альтернативний контакт',
  },
} satisfies Meta<typeof ContactTags>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ProfileEmailOnly: Story = {
  args: { alternativeContact: undefined },
};

export const Phone: Story = {
  args: { alternativeContact: '+380671234567' },
};

export const LongContact: Story = {
  args: {
    alternativeContact:
      'Please contact the department reception for further information about this opportunity.',
  },
};
