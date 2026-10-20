import type { Meta, StoryObj } from '@storybook/react-vite';
import { PlacementCell } from '../../../storybook/PlacementCell/PlacementCell';
import { VariantRow } from '../../../storybook/VariantMatrix/VariantRow';
import { Popover } from './Popover';
import { Button } from '../Button/Button';
import type { PopoverProps } from './Popover.types';
import { noop } from '@core/utils/fn';

type MatrixPlacement = NonNullable<PopoverProps['placement']>;

const MATRIX_PLACEMENTS: readonly MatrixPlacement[] = [
  'bottom-start',
  'bottom-end',
  'top-start',
  'top-end',
];

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

export const Matrix: Story = {
  args: {
    open: true,
    onClose: noop,
    children: null,
  },
  parameters: {
    layout: 'padded',
  },
  render: () => (
    <VariantRow
      columns={MATRIX_PLACEMENTS}
      renderCell={(placement: MatrixPlacement) => (
        <PlacementCell placement={placement}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <Button variant="secondary">Anchor</Button>
            <Popover
              open
              onClose={noop}
              placement={placement}
              title="Settings"
              width={200}
              closeLabel="Close"
            >
              <div style={{ padding: 'var(--space-16)' }}>Popover content</div>
            </Popover>
          </div>
        </PlacementCell>
      )}
    />
  ),
};
