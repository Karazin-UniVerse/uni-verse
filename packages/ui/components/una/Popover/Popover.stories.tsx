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
    width: {
      control: 'text',
      description: 'Ширина поповера',
    },
    placement: {
      control: 'select',
      options: ['bottom-end', 'bottom-start', 'top-end', 'top-start'],
      description: 'Розташування поповера відносно якоря',
    },
    closeButton: {
      control: 'boolean',
      description: 'Відображати кнопку закриття (хрестик)',
    },
  },
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

const InteractivePopoverDemo = (args: React.ComponentProps<typeof Popover>) => {
  const [isOpen, setIsOpen] = useState(args.open ?? false);
  const anchorRef = useRef<HTMLDivElement>(null);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={anchorRef}>
      <Button variant="secondary" onClick={() => setIsOpen((prev) => !prev)}>
        Відкрити панель
      </Button>
      <Popover {...args} open={isOpen} onClose={() => setIsOpen(false)} anchorRef={anchorRef}>
        <div style={{ padding: '16px' }}>
          <p style={{ margin: '0 0 12px 0', fontSize: '13px' }}>
            Це спливаючий поповер, привʼязаний до якірної кнопки.
          </p>
          <Button size="small" variant="primary" onClick={() => setIsOpen(false)}>
            Зрозуміло
          </Button>
        </div>
      </Popover>
    </div>
  );
};

export const Default: Story = {
  render: InteractivePopoverDemo,
  args: {
    title: 'Налаштування',
    placement: 'bottom-end',
    width: 320,
    closeLabel: 'Закрити',
  },
};
