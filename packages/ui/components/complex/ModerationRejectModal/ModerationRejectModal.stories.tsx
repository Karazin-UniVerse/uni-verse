import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ModerationRejectModal } from './ModerationRejectModal';
import type { ModerationRejectModalProps } from './ModerationRejectModal.types';

const meta = {
  title: 'Complex/ModerationRejectModal',
  component: ModerationRejectModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    open: true,
    onClose: () => {},
    onRevise: () => {},
    onReject: () => {},
    comment: '',
    onCommentChange: () => {},
    isSubmitting: false,
  },
} satisfies Meta<typeof ModerationRejectModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => {
    const InteractiveWrapper = (props: ModerationRejectModalProps) => {
      const [comment, setComment] = useState(props.comment);

      return <ModerationRejectModal {...props} comment={comment} onCommentChange={setComment} />;
    };

    return <InteractiveWrapper {...args} />;
  },
};

export const WithComment: Story = {
  render: (args) => {
    const InteractiveWrapper = (props: ModerationRejectModalProps) => {
      const [comment, setComment] = useState(
        'Будь ласка, уточніть обов’язки стажера та вкажіть конкретні вимоги до володіння інструментами.',
      );

      return <ModerationRejectModal {...props} comment={comment} onCommentChange={setComment} />;
    };

    return <InteractiveWrapper {...args} />;
  },
};
