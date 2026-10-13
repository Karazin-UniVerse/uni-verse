import type { ReactNode } from 'react';
import type { PopoverPlacement } from '../../components/una/Popover/Popover.types';

export type PlacementCellProps = {
  children: ReactNode;
  placement: PopoverPlacement;
};

export function PlacementCell({ children, placement }: Readonly<PlacementCellProps>) {
  const isTop = placement.startsWith('top');
  const isEnd = placement.endsWith('end');

  return (
    <div
      style={{
        display: 'flex',
        width: '220px',
        height: '200px',
        alignItems: isTop ? 'flex-end' : 'flex-start',
        justifyContent: isEnd ? 'flex-end' : 'flex-start',
      }}
    >
      {children}
    </div>
  );
}
