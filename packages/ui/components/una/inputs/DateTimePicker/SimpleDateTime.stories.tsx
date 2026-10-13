import type { Meta, StoryObj } from '@storybook/react-vite';

import { ClickOnMount } from '../../../../storybook/ClickOnMount/ClickOnMount';
import { VariantRow } from '../../../../storybook/VariantMatrix/VariantRow';
import { SimpleDateTime } from './SimpleDateTime';

type MatrixState = 'closed' | 'open';

const MATRIX_STATES: readonly MatrixState[] = ['closed', 'open'];

const meta = {
  title: 'Una/Inputs/SimpleDateTime',
  component: SimpleDateTime,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof SimpleDateTime>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Matrix: Story = {
  parameters: {
    layout: 'padded',
  },
  render: () => (
    <VariantRow
      columns={MATRIX_STATES}
      renderCell={(state: MatrixState) => (
        <div style={{ minHeight: '400px' }}>
          {state === 'open' ? (
            <ClickOnMount selector="input">
              <SimpleDateTime />
            </ClickOnMount>
          ) : (
            <SimpleDateTime />
          )}
        </div>
      )}
    />
  ),
};
