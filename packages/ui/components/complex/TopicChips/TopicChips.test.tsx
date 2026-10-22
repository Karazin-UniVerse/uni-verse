import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TopicChips } from './TopicChips';
import { noop } from '@core/utils/fn';

describe('TopicChips Component', () => {
  const sampleOptions = [
    { id: 'opt1', label: 'Option 1' },
    { id: 'opt2', label: 'Option 2' },
    { id: 'opt3', label: 'Option 3' },
  ];

  it('should render radiogroup container with role="radiogroup" and accessible label', () => {
    render(
      <TopicChips
        label="Select Option"
        options={sampleOptions}
        selectedId="opt1"
        onSelect={noop}
      />,
    );

    const group = screen.getByRole('radiogroup', { name: 'Select Option' });

    expect(group).toBeInTheDocument();
  });

  it('should render fallback ariaLabel when label is omitted', () => {
    render(
      <TopicChips
        ariaLabel="Inquiry topics"
        options={sampleOptions}
        selectedId="opt1"
        onSelect={noop}
      />,
    );

    const group = screen.getByRole('radiogroup', { name: 'Inquiry topics' });

    expect(group).toBeInTheDocument();
  });

  it('should set aria-checked and roving tabindex correctly when an item is selected', () => {
    render(<TopicChips options={sampleOptions} selectedId="opt2" onSelect={noop} />);

    const opt1 = screen.getByRole('radio', { name: 'Option 1' });
    const opt2 = screen.getByRole('radio', { name: 'Option 2' });
    const opt3 = screen.getByRole('radio', { name: 'Option 3' });

    expect(opt2).toHaveAttribute('aria-checked', 'true');
    expect(opt2).toHaveAttribute('tabindex', '0');

    expect(opt1).toHaveAttribute('aria-checked', 'false');
    expect(opt1).toHaveAttribute('tabindex', '-1');

    expect(opt3).toHaveAttribute('aria-checked', 'false');
    expect(opt3).toHaveAttribute('tabindex', '-1');
  });

  it('should give the first option tabIndex="0" when no item is selected', () => {
    render(<TopicChips options={sampleOptions} selectedId="" onSelect={noop} />);

    const opt1 = screen.getByRole('radio', { name: 'Option 1' });
    const opt2 = screen.getByRole('radio', { name: 'Option 2' });
    const opt3 = screen.getByRole('radio', { name: 'Option 3' });

    expect(opt1).toHaveAttribute('aria-checked', 'false');
    expect(opt1).toHaveAttribute('tabindex', '0');

    expect(opt2).toHaveAttribute('aria-checked', 'false');
    expect(opt2).toHaveAttribute('tabindex', '-1');

    expect(opt3).toHaveAttribute('aria-checked', 'false');
    expect(opt3).toHaveAttribute('tabindex', '-1');
  });

  it('should trigger onSelect when a radio option is clicked', async () => {
    const handleSelect = vi.fn();
    const user = userEvent.setup();

    render(<TopicChips options={sampleOptions} selectedId="opt1" onSelect={handleSelect} />);

    const opt2 = screen.getByRole('radio', { name: 'Option 2' });

    await user.click(opt2);
    expect(handleSelect).toHaveBeenCalledWith('opt2');
  });
});
