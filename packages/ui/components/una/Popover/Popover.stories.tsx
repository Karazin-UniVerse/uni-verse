import React, { useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Popover } from './Popover';
import { Button } from '../Button/Button';

const meta = {
  title: 'Una/Feedback/Popover',
  component: Popover,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    open: {
      control: 'boolean',
      description: 'Стан видимості поповера',
    },
    title: {
      control: 'text',
      description: 'Заголовок поповера',
    },
    placement: {
      control: 'select',
      options: ['bottom-end', 'bottom-start', 'top-end', 'top-start'],
      description: 'Положення поповера відносно тригера',
    },
    closeButton: {
      control: 'boolean',
      description: 'Чи показувати кнопку закриття в шапці',
    },
    closeLabel: {
      control: 'text',
      description: 'Текст aria-label для кнопки закриття',
    },
    width: {
      control: 'text',
      description: 'Ширина поповера (число в px або CSS-рядок)',
    },
  },
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

const InteractivePopoverInner = (args: React.ComponentProps<typeof Popover>) => {
  const [isOpen, setIsOpen] = useState(args.open ?? false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleClose = () => {
    setIsOpen(false);
    args.onClose?.();
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block', padding: '80px' }}>
      <Button
        ref={triggerRef}
        variant="primary"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        {isOpen ? 'Закрити спливаюче вікно' : 'Відкрити спливаюче вікно'}
      </Button>

      <Popover {...args} open={isOpen} onClose={handleClose} anchorRef={triggerRef}>
        {args.children}
      </Popover>
    </div>
  );
};

const InteractivePopoverDemo = (args: React.ComponentProps<typeof Popover>) => (
  <InteractivePopoverInner key={String(args.open)} {...args} />
);

export const Default: Story = {
  render: (args) => <InteractivePopoverDemo {...args} />,
  args: {
    open: false,
    title: 'Параметри відображення',
    children: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <p style={{ margin: 0 }}>Налаштування швидкого доступу та персоналізації інтерфейсу.</p>
      </div>
    ),
    width: 320,
    closeButton: true,
  },
};

export const WithFooter: Story = {
  render: (args) => <InteractivePopoverDemo {...args} />,
  args: {
    open: false,
    title: 'Підтвердження дії',
    closeButton: true,
    children: (
      <p style={{ margin: 0 }}>
        Ви впевнені, що бажаєте скинути всі налаштування до стандартних значень?
      </p>
    ),
    footer: (
      <Button size="small" variant="secondary">
        Застосувати
      </Button>
    ),
    width: 320,
  },
};

export const BottomStart: Story = {
  render: (args) => <InteractivePopoverDemo {...args} />,
  args: {
    open: false,
    placement: 'bottom-start',
    title: 'Bottom-Start Позиція',
    closeButton: true,
    children: <p style={{ margin: 0 }}>Поповер вирівняний по лівому краю тригера.</p>,
    width: 300,
  },
};

export const TopEnd: Story = {
  render: (args) => <InteractivePopoverDemo {...args} />,
  args: {
    open: false,
    placement: 'top-end',
    title: 'Top-End Позиція',
    closeButton: true,
    children: <p style={{ margin: 0 }}>Поповер виринає зверху над кнопкою-тригером.</p>,
    width: 300,
  },
};
