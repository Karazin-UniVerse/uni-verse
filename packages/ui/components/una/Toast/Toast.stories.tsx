import type { Meta, StoryObj } from '@storybook/react-vite';

import { VariantRow } from '../../../storybook/VariantMatrix/VariantRow';
import { ToastProvider } from './Toast';
import { ToastMessage } from './ToastMessage';
import type { ToastKind } from './Toast.types';

const MATRIX_KINDS: readonly ToastKind[] = ['info', 'success', 'warning', 'error'];

const meta = {
  title: 'Una/Feedback/Toast',
  component: ToastProvider,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof ToastProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Matrix: Story = {
  args: {
    children: null,
  },
  parameters: {
    layout: 'padded',
  },
  render: () => (
    <VariantRow
      columns={MATRIX_KINDS}
      renderCell={(kind: ToastKind) => (
        <div style={{ width: '280px' }}>
          <ToastMessage kind={kind} text="Changes saved" />
        </div>
      )}
    />
  ),
};
