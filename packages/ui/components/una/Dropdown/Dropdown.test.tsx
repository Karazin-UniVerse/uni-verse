import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { Dropdown } from './Dropdown';
import { DropdownOption } from './DropdownOption';
import type { DropdownTriggerProps } from './Dropdown.types';

describe('UNA Dropdown Component', () => {
  it('renders only the trigger while closed', () => {
    const html = renderToString(
      <Dropdown trigger={(triggerProps) => <button {...triggerProps}>Open</button>}>
        <div>Panel Content</div>
      </Dropdown>,
    );

    expect(html).toContain('Open');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('aria-controls');
    expect(html).not.toContain('Panel Content');
  });

  it('passes the closed state and panel role to the trigger', () => {
    let receivedProps: DropdownTriggerProps | undefined;
    let receivedIsOpen: boolean | undefined;

    renderToString(
      <Dropdown
        panelRole="listbox"
        trigger={(triggerProps, isOpen) => {
          receivedProps = triggerProps;
          receivedIsOpen = isOpen;

          return <button type="button">Open</button>;
        }}
      >
        <div>Body</div>
      </Dropdown>,
    );

    expect(receivedIsOpen).toBe(false);
    expect(receivedProps?.['aria-expanded']).toBe(false);
    expect(receivedProps?.['aria-haspopup']).toBe('listbox');
  });

  it('applies the custom className and full width modifier to the wrapper', () => {
    const html = renderToString(
      <Dropdown
        className="custom-wrapper"
        isFullWidth
        trigger={(triggerProps) => <button {...triggerProps}>Open</button>}
      >
        <div>Body</div>
      </Dropdown>,
    );

    expect(html).toContain('custom-wrapper');
    expect(html).toContain('fullWidth');
  });
});

describe('UNA DropdownOption Component', () => {
  it('renders a selected option with the check mark and icon', () => {
    const html = renderToString(
      <DropdownOption isSelected icon={<span>I</span>} onSelect={() => {}}>
        English
      </DropdownOption>,
    );

    expect(html).toContain('role="option"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('English');
    expect(html).toContain('<svg');
  });

  it('renders an unselected option without the check mark', () => {
    const html = renderToString(
      <DropdownOption isSelected={false} onSelect={() => {}}>
        Українська
      </DropdownOption>,
    );

    expect(html).toContain('aria-selected="false"');
    expect(html).not.toContain('<svg');
  });
});
