import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../Button/Button';
import { ClickOnMount } from '../../../storybook/ClickOnMount/ClickOnMount';
import { PlacementCell } from '../../../storybook/PlacementCell/PlacementCell';
import { VariantRow } from '../../../storybook/VariantMatrix/VariantRow';
import { Dropdown } from './Dropdown';
import { DropdownOption } from './DropdownOption';
import type { DropdownProps } from './Dropdown.types';
import { noop } from '@core/utils/fn';

type MatrixPlacement = NonNullable<DropdownProps['placement']>;

const MATRIX_PLACEMENTS: readonly MatrixPlacement[] = [
  'bottom-start',
  'bottom-end',
  'top-start',
  'top-end',
];
const LANGUAGES = [
  { code: 'uk', label: 'Українська', flag: '🇺🇦' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'pl', label: 'Polski', flag: '🇵🇱' },
];

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

export const Matrix: Story = {
  args: {
    children: null,
    renderTrigger: () => null,
  },
  parameters: {
    layout: 'padded',
  },
  render: () => (
    <VariantRow
      columns={MATRIX_PLACEMENTS}
      renderCell={(placement: MatrixPlacement) => (
        <ClickOnMount selector="button">
          <PlacementCell placement={placement}>
            <Dropdown
              isPadded
              placement={placement}
              renderTrigger={(triggerProps) => (
                <Button variant="secondary" {...triggerProps}>
                  Open
                </Button>
              )}
            >
              {LANGUAGES.map((language, index) => (
                <DropdownOption
                  key={language.code}
                  icon={language.flag}
                  isSelected={index === 0}
                  onSelect={noop}
                >
                  {language.label}
                </DropdownOption>
              ))}
            </Dropdown>
          </PlacementCell>
        </ClickOnMount>
      )}
    />
  ),
};
