import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { TagInput } from './TagInput';
import type { TagInputProps } from './TagInput.types';

const KNOWN_TAGS = ['react', 'react native', 'typescript', 'research', 'design'];

const loadSuggestions = async (query: string): Promise<string[]> =>
  KNOWN_TAGS.filter((tag) => tag.includes(query));

const meta = {
  title: 'Una/Inputs/TagInput',
  component: TagInput,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  args: {
    value: [],
    onChange: () => undefined,
    placeholder: 'Add a tag',
    removeLabel: 'Remove',
    loadSuggestions,
    formatCreateLabel: (tag: string) => `Create "${tag}"`,
  },
} satisfies Meta<typeof TagInput>;

export default meta;

type Story = StoryObj<typeof meta>;

function DefaultTagInput(args: TagInputProps): React.ReactElement {
  const [value, setValue] = useState<string[]>([]);

  return <TagInput {...args} value={value} onChange={setValue} />;
}

export const Default: Story = {
  render: (args) => <DefaultTagInput {...args} />,
};

function WithValuesTagInput(args: TagInputProps): React.ReactElement {
  const [value, setValue] = useState<string[]>(['react', 'typescript']);

  return <TagInput {...args} value={value} onChange={setValue} />;
}

export const WithValues: Story = {
  render: (args) => <WithValuesTagInput {...args} />,
};

export const LimitReached: Story = {
  args: {
    value: ['react', 'typescript'],
    maxTags: 2,
  },
};

export const Disabled: Story = {
  args: {
    value: ['react'],
    disabled: true,
  },
};
