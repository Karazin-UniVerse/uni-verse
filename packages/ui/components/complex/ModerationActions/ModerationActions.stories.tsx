import type { Meta, StoryObj } from '@storybook/react-vite';
import { noop } from '@core/utils/fn';
import { ModerationActions } from './ModerationActions';

const meta = {
  title: 'Complex/ModerationActions',
  component: ModerationActions,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  args: {
    onApprove: noop,
    onOpenRejectModal: noop,
    approveText: 'Схвалити',
    reviseText: 'На доопрацювання',
    rejectText: 'Відхилити',
  },
} satisfies Meta<typeof ModerationActions>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = {
  args: { disabled: true },
};

export const LongLabels: Story = {
  args: {
    approveText: 'Approve this opportunity for publication',
    reviseText: 'Return this opportunity to the author for changes',
    rejectText: 'Reject this opportunity with a comment',
  },
};
