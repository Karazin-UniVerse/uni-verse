import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { ToastProvider, useToast } from './Toast';
import { Button } from '../Button/Button';

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

const ToastDemoButtons = () => {
  const toast = useToast();

  return (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
      <Button variant="primary" size="medium" onClick={() => toast.info('Інформаційне сповіщення')}>
        Показати Info Toast
      </Button>
      <Button
        variant="secondary"
        size="medium"
        onClick={() => toast.success('Зміни успішно збережено!')}
      >
        Показати Success Toast
      </Button>
      <Button
        variant="primary"
        size="medium"
        onClick={() => toast.error('Помилка під час надсилання форми.')}
      >
        Показати Error Toast
      </Button>
    </div>
  );
};

export const Default: Story = {
  render: () => (
    <ToastProvider>
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <p style={{ marginBottom: '16px', color: 'var(--text-secondary, #666)' }}>
          Натисніть кнопку, щоб викликати спливаюче сповіщення:
        </p>
        <ToastDemoButtons />
      </div>
    </ToastProvider>
  ),
};

const SuccessToastDemo = () => {
  const toast = useToast();

  return (
    <Button variant="secondary" onClick={() => toast.success('Операцію успішно виконано!')}>
      Тригер Success Toast
    </Button>
  );
};

export const Success: Story = {
  render: () => (
    <ToastProvider>
      <SuccessToastDemo />
    </ToastProvider>
  ),
};

const ErrorToastDemo = () => {
  const toast = useToast();

  return (
    <Button variant="primary" onClick={() => toast.error('Помилка автентифікації користувача.')}>
      Тригер Error Toast
    </Button>
  );
};

export const ErrorStory: Story = {
  name: 'Error',
  render: () => (
    <ToastProvider>
      <ErrorToastDemo />
    </ToastProvider>
  ),
};
