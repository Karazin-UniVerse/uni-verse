import type { Meta, StoryObj } from '@storybook/react-vite';
import { VariantColumn } from '../../../storybook/VariantMatrix/VariantColumn';
import { ContactTags } from './ContactTags';
import type { ContactTagsProps } from './ContactTags.types';

type MatrixContact = 'Default' | 'Profile email only' | 'Phone' | 'Long contact';

const MATRIX_CONTACTS: Record<MatrixContact, ContactTagsProps['alternativeContact']> = {
  Default: '@student_dev',
  'Profile email only': undefined,
  Phone: '+380671234567',
  'Long contact':
    'Please contact the department reception for further information about this opportunity.',
};

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

export const Matrix: Story = {
  argTypes: {
    alternativeContact: { control: false },
  },
  parameters: {
    layout: 'padded',
  },
  render: (args) => (
    <VariantColumn
      rows={Object.keys(MATRIX_CONTACTS) as MatrixContact[]}
      renderCell={(contact: MatrixContact) => (
        <ContactTags {...args} alternativeContact={MATRIX_CONTACTS[contact]} />
      )}
    />
  ),
};
