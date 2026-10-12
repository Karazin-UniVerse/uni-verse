import React, { useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
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
      description: 'Controls popover visibility',
    },
    title: {
      control: 'text',
      description: 'Popover title',
    },
    width: {
      control: 'text',
      description: 'Popover width (number in px or CSS string)',
    },
    placement: {
      control: 'select',
      options: ['bottom-end', 'bottom-start', 'top-end', 'top-start'],
      description: 'Popover placement relative to anchor',
    },
    closeButton: {
      control: 'boolean',
      description: 'Whether to show the close button',
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
        Open panel
      </Button>
      <Popover {...args} open={isOpen} onClose={() => setIsOpen(false)} anchorRef={anchorRef}>
        <div style={{ padding: '16px' }}>
          <p style={{ margin: '0 0 12px 0', fontSize: '13px' }}>
            This is a floating popover anchored to the button.
          </p>
          <Button size="small" variant="primary" onClick={() => setIsOpen(false)}>
            Got it
          </Button>
        </div>
      </Popover>
    </div>
  );
};

export const Default: Story = {
  render: InteractivePopoverDemo,
  args: {
    title: 'Settings',
    placement: 'bottom-end',
    width: 320,
    closeLabel: 'Close',
  },
};
