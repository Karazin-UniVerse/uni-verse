import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { Modal } from './Modal';
import { Button } from '../Button/Button';

const meta = {
  title: 'Una/Feedback/Modal',
  component: Modal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    open: {
      control: 'boolean',
      description: 'Стан видимості модального вікна',
    },
    title: {
      control: 'text',
      description: 'Заголовок модального вікна',
    },
    width: {
      control: 'text',
      description: 'Ширина модального вікна (число в пікселях або CSS-рядок)',
    },
    closeLabel: {
      control: 'text',
      description: 'Текст aria-label та підказка для кнопки закриття',
    },
  },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

const InteractiveModalDemo = (args: React.ComponentProps<typeof Modal>) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <Button variant="primary" onClick={() => setIsOpen(true)}>
        Відкрити модальне вікно
      </Button>
      <Modal {...args} open={isOpen} onClose={() => setIsOpen(false)}>
        {args.children}
      </Modal>
    </div>
  );
};

export const Interactive: Story = {
  render: InteractiveModalDemo,
  args: {
    title: 'Підтвердження дії',
    closeLabel: 'Закрити діалог',
    children: (
      <div>
        <p style={{ margin: '0 0 16px 0', lineHeight: 1.5 }}>
          Ви впевнені, що бажаєте зберегти поточні зміни? Цю дію можна буде скасувати пізніше.
        </p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <Button variant="secondary" size="small">
            Скасувати
          </Button>
          <Button variant="primary" size="small">
            Підтвердити
          </Button>
        </div>
      </div>
    ),
  },
};

export const CustomWidth: Story = {
  render: InteractiveModalDemo,
  args: {
    title: 'Широке модальне вікно (900px)',
    width: 900,
    children: (
      <div>
        <p style={{ lineHeight: 1.6 }}>
          Це модальне вікно з кастомною шириною 900px, придатне для таблиць, форм або детального
          перегляду даних.
        </p>
      </div>
    ),
  },
};

export const WithoutTitle: Story = {
  render: InteractiveModalDemo,
  args: {
    ariaLabel: 'Інформаційне повідомлення',
    children: (
      <div>
        <p style={{ margin: 0, lineHeight: 1.5 }}>
          Модальне вікно без візуального заголовка h3, але з доступним aria-label для зчитувачів
          екрана.
        </p>
      </div>
    ),
  },
};
