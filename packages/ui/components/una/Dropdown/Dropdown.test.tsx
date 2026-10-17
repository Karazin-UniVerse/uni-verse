import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dropdown } from './Dropdown';
import { DropdownOption } from './DropdownOption';
import type { DropdownTriggerProps } from './Dropdown.types';

describe('UNA Dropdown Component', () => {
  it('should render only the trigger while closed', () => {
    render(
      <Dropdown
        renderTrigger={(triggerProps) => (
          <button type="button" {...triggerProps}>
            Open
          </button>
        )}
      >
        <div>Panel Content</div>
      </Dropdown>,
    );

    const trigger = screen.getByRole('button', { name: /open/i });

    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).not.toHaveAttribute('aria-controls');
    expect(screen.queryByText('Panel Content')).not.toBeInTheDocument();
  });

  it('should pass the closed state to the trigger', () => {
    let receivedProps: DropdownTriggerProps | undefined;
    let receivedIsOpen: boolean | undefined;

    render(
      <Dropdown
        renderTrigger={(triggerProps, isOpen) => {
          receivedProps = triggerProps;
          receivedIsOpen = isOpen;

          return (
            <button type="button" {...triggerProps}>
              Open
            </button>
          );
        }}
      >
        <div>Body</div>
      </Dropdown>,
    );

    expect(receivedIsOpen).toBe(false);
    expect(receivedProps?.['aria-expanded']).toBe(false);
  });

  it('should toggle panel and update aria-expanded on trigger click', async () => {
    const user = userEvent.setup();

    render(
      <Dropdown
        renderTrigger={(triggerProps) => (
          <button type="button" {...triggerProps}>
            Open Dropdown
          </button>
        )}
      >
        <div>Panel Content</div>
      </Dropdown>,
    );

    const trigger = screen.getByRole('button', { name: /open dropdown/i });

    expect(screen.queryByText('Panel Content')).not.toBeInTheDocument();

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('aria-controls');
    expect(screen.getByText('Panel Content')).toBeInTheDocument();

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Panel Content')).not.toBeInTheDocument();
  });

  it('should apply the custom className and full width modifier to the wrapper', () => {
    const { container } = render(
      <Dropdown
        className="custom-wrapper"
        isFullWidth
        renderTrigger={(triggerProps) => (
          <button type="button" {...triggerProps}>
            Open
          </button>
        )}
      >
        <div>Body</div>
      </Dropdown>,
    );

    const wrapper = container.firstElementChild;

    expect(wrapper).toHaveClass('custom-wrapper');
    expect(wrapper?.className).toContain('fullWidth');
  });
});

describe('UNA DropdownOption Component', () => {
  it('should render a selected option with the check mark and icon', () => {
    render(
      <DropdownOption
        isSelected
        icon={<span data-testid="option-icon">I</span>}
        onSelect={() => {}}
      >
        English
      </DropdownOption>,
    );

    const option = screen.getByRole('button', { name: /english/i });

    expect(option).toBeInTheDocument();
    expect(option).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('option-icon')).toBeInTheDocument();
  });

  it('should render an unselected option without the check mark', () => {
    render(
      <DropdownOption isSelected={false} onSelect={() => {}}>
        Українська
      </DropdownOption>,
    );

    const option = screen.getByRole('button', { name: /українська/i });

    expect(option).toBeInTheDocument();
    expect(option).toHaveAttribute('aria-pressed', 'false');
  });

  it('should trigger onSelect when option is clicked', async () => {
    const handleSelect = vi.fn();
    const user = userEvent.setup();

    render(
      <DropdownOption isSelected={false} onSelect={handleSelect}>
        Option 1
      </DropdownOption>,
    );

    await user.click(screen.getByRole('button', { name: /option 1/i }));
    expect(handleSelect).toHaveBeenCalledTimes(1);
  });
});
