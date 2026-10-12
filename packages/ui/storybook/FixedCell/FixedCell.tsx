import type { ReactNode } from 'react';

export type FixedCellProps = {
  children: ReactNode;
  height: number;
  width: number;
};

/** A transformed ancestor becomes the containing block of `position: fixed` children. */
export function FixedCell({ children, height, width }: FixedCellProps) {
  return (
    <div
      style={{
        position: 'relative',
        width: `${width}px`,
        height: `${height}px`,
        overflow: 'hidden',
        transform: 'translateZ(0)',
      }}
    >
      {children}
    </div>
  );
}
