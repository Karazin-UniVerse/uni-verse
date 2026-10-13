import { useEffect, useRef, type ReactNode } from 'react';

export type ClickOnMountProps = {
  children: ReactNode;
  selector: string;
};

/** Opens a self-managed popup by clicking its trigger once, so the open state shows in a matrix. */
export function ClickOnMount({ children, selector }: Readonly<ClickOnMountProps>) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trigger = containerRef.current?.querySelector<HTMLElement>(selector);

    if (trigger && trigger.getAttribute('aria-expanded') !== 'true') {
      trigger.click();
    }
  }, [selector]);

  return <div ref={containerRef}>{children}</div>;
}
