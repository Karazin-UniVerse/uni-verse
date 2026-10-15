import type { Meta, StoryObj } from '@storybook/react-vite';

import { VariantMatrix } from '../../../storybook/VariantMatrix/VariantMatrix';
import { Skeleton } from './Skeleton';
import type { SkeletonProps } from './Skeleton.types';

type MatrixShape = 'text line' | 'avatar' | 'block';
type MatrixSize = 'small' | 'medium' | 'large';

const MATRIX_SIZES: readonly MatrixSize[] = ['small', 'medium', 'large'];
const MATRIX_SHAPES: Record<
  MatrixShape,
  Record<MatrixSize, Pick<SkeletonProps, 'width' | 'height' | 'borderRadius'>>
> = {
  'text line': {
    small: { width: 120, height: 12, borderRadius: 4 },
    medium: { width: 240, height: 16, borderRadius: 4 },
    large: { width: 360, height: 20, borderRadius: 4 },
  },
  avatar: {
    small: { width: 32, height: 32, borderRadius: '50%' },
    medium: { width: 48, height: 48, borderRadius: '50%' },
    large: { width: 64, height: 64, borderRadius: '50%' },
  },
  block: {
    small: { width: 120, height: 60, borderRadius: 8 },
    medium: { width: 240, height: 120, borderRadius: 8 },
    large: { width: 320, height: 160, borderRadius: 8 },
  },
};

const meta = {
  title: 'Una/Feedback/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    width: {
      control: 'text',
      description: 'Ширина скелетона (число у пікселях або CSS-рядок)',
    },
    height: {
      control: 'text',
      description: 'Висота скелетона (число у пікселях або CSS-рядок)',
    },
    borderRadius: {
      control: 'text',
      description: 'Радіус заокруглення кутів',
    },
  },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Matrix: Story = {
  parameters: {
    layout: 'padded',
  },
  render: () => (
    <VariantMatrix
      rows={Object.keys(MATRIX_SHAPES) as MatrixShape[]}
      columns={MATRIX_SIZES}
      renderCell={(shape: MatrixShape, size: MatrixSize) => (
        <Skeleton {...MATRIX_SHAPES[shape][size]} />
      )}
    />
  ),
};

export const CardMockup: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        width: '300px',
        padding: '16px',
        border: '1px solid var(--border-color, #e0e0e0)',
        borderRadius: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Skeleton width={44} height={44} borderRadius="50%" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          <Skeleton width="75%" height={16} borderRadius={4} />
          <Skeleton width="45%" height={12} borderRadius={4} />
        </div>
      </div>
      <Skeleton width="100%" height={90} borderRadius={8} />
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
        <Skeleton width={64} height={28} borderRadius={6} />
        <Skeleton width={64} height={28} borderRadius={6} />
      </div>
    </div>
  ),
};
