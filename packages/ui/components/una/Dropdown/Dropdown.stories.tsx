import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChevronDown, Globe } from 'lucide-react';
import { Button } from '../Button/Button';
import { Dropdown } from './Dropdown';
import { DropdownOption } from './DropdownOption';

const meta = {
  title: 'Una/Feedback/Dropdown',
  component: Dropdown,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    placement: {
      control: 'select',
      options: ['bottom-end', 'bottom-start', 'top-end', 'top-start'],
      description: 'Panel placement relative to the trigger',
    },
    isPadded: {
      control: 'boolean',
      description: 'Adds inner padding, for lists of options',
    },
    isFullWidth: {
      control: 'boolean',
      description: 'Stretches the wrapper to the width of its container',
    },
    width: {
      control: 'text',
      description: 'Panel width (number in px or CSS string)',
    },
  },
} satisfies Meta<typeof Dropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

const LANGUAGES = [
  { code: 'uk', label: 'Українська', flag: '🇺🇦' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'pl', label: 'Polski', flag: '🇵🇱' },
];

const OptionsDemo = (args: React.ComponentProps<typeof Dropdown>) => {
  const [selectedCode, setSelectedCode] = useState('uk');

  return (
    <Dropdown {...args}>
      {(close) =>
        LANGUAGES.map((language) => (
          <DropdownOption
            key={language.code}
            icon={language.flag}
            isSelected={language.code === selectedCode}
            onSelect={() => {
              setSelectedCode(language.code);
              close();
            }}
          >
            {language.label}
          </DropdownOption>
        ))
      }
    </Dropdown>
  );
};

export const Options: Story = {
  render: OptionsDemo,
  args: {
    isPadded: true,
    placement: 'bottom-end',
    trigger: (triggerProps, isOpen) => (
      <Button variant="secondary" aria-label="Select language" {...triggerProps}>
        <Globe size={16} />
        <ChevronDown size={14} style={{ transform: isOpen ? 'rotate(180deg)' : undefined }} />
      </Button>
    ),
    children: null,
  },
};

export const FreeContent: Story = {
  args: {
    placement: 'bottom-start',
    width: 280,
    trigger: (triggerProps) => (
      <Button variant="secondary" {...triggerProps}>
        Notifications
      </Button>
    ),
    children: (
      <div style={{ padding: 'var(--space-16)' }}>
        <strong>No new notifications</strong>
        <p style={{ margin: 'var(--space-8) 0 0' }}>Anything can be placed inside the panel.</p>
      </div>
    ),
  },
};

export const OpensUpwards: Story = {
  render: OptionsDemo,
  args: {
    ...Options.args,
    placement: 'top-start',
  },
};
