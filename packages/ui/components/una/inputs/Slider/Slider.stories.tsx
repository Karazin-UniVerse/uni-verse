<<<<<<< HEAD:packages/ui/components/una/inputs/Slider/Slider.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Slider } from './Slider';
=======
import type { Meta, StoryObj } from '@storybook/react-vite';
import { SimpleSlider } from './SimpleSlider';
>>>>>>> origin/develop:packages/ui/components/una/inputs/SimpleSlider/SimpleSlider.stories.tsx

const meta: Meta<typeof Slider> = {
  title: 'Una/Inputs/Slider',
  component: Slider,
  tags: ['autodocs'],
  argTypes: {
    onChange: { action: 'changed' },
    min: {
      control: 'number',
    },
    max: {
      control: 'number',
    },
    step: {
      control: 'number',
    },
    disabled: {
      control: 'boolean',
    },
    value: {
      control: 'number',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Slider>;

export const Default: Story = {
  args: {
    value: 50,
    min: 0,
    max: 100,
    step: 1,
    disabled: false,
    onChange: () => {},
  },
};

export const Disabled: Story = {
  args: {
    value: 30,
    disabled: true,
    onChange: () => {},
  },
};
