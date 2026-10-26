import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DateTime } from './DateTime';

describe('UNA DateTime Component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should render date and time formatted according to default format', () => {
    const testDate = new Date(2026, 4, 15, 14, 30);

    render(<DateTime selected={testDate} onChange={vi.fn()} locale="en-US" />);

    const input = screen.getByRole('textbox');

    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('May 15, 2026 2:30 PM');
  });

  it('should format date without time when showTime is false and respect locale', () => {
    const testDate = new Date(2026, 4, 15, 14, 30);

    render(<DateTime selected={testDate} onChange={vi.fn()} showTime={false} locale="en-US" />);

    expect(screen.getByRole('textbox')).toHaveValue('May 15, 2026');
  });

  it('should update displayed value when selected Date prop changes', () => {
    const { rerender } = render(
      <DateTime selected={new Date(2026, 0, 10, 9, 15)} onChange={vi.fn()} locale="en-US" />,
    );

    expect(screen.getByRole('textbox')).toHaveValue('January 10, 2026 9:15 AM');

    rerender(
      <DateTime selected={new Date(2026, 6, 20, 16, 45)} onChange={vi.fn()} locale="en-US" />,
    );

    expect(screen.getByRole('textbox')).toHaveValue('July 20, 2026 4:45 PM');
  });

  it('should render empty value when selected is null', () => {
    render(<DateTime selected={null} onChange={vi.fn()} />);

    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it('should open picker dialog when input is clicked', async () => {
    const user = userEvent.setup();

    render(<DateTime selected={new Date(2026, 4, 15)} onChange={vi.fn()} />);

    const input = screen.getByRole('textbox');

    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(input);

    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should toggle picker dialog when Enter or Space is pressed on input', () => {
    render(<DateTime selected={new Date(2026, 4, 15)} onChange={vi.fn()} />);

    const input = screen.getByRole('textbox');

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(input, { key: ' ' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should close dialog and restore focus when Escape is pressed', async () => {
    const user = userEvent.setup();

    render(<DateTime selected={new Date(2026, 4, 15)} onChange={vi.fn()} />);

    const input = screen.getByRole('textbox');

    await user.click(input);

    const dialog = screen.getByRole('dialog');

    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(input).toHaveFocus();
  });

  it('should close dialog when clicking outside the component', async () => {
    const user = userEvent.setup();

    render(
      <div>
        <DateTime selected={new Date(2026, 4, 15)} onChange={vi.fn()} />
        <button type="button">Outside Element</button>
      </div>,
    );

    const input = screen.getByRole('textbox');

    await user.click(input);

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should select a day and trigger onChange with updated Date', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    const testDate = new Date(2026, 4, 15, 10, 30);

    render(<DateTime selected={testDate} onChange={handleChange} />);

    await user.click(screen.getByRole('textbox'));

    const dayButtons = screen.getAllByRole('button', { name: '20' });

    await user.click(dayButtons[0]);

    expect(handleChange).toHaveBeenCalledTimes(1);
    const calledDate = handleChange.mock.calls[0][0] as Date;

    expect(calledDate.getDate()).toBe(20);
    expect(calledDate.getMonth()).toBe(4);
    expect(calledDate.getFullYear()).toBe(2026);
    expect(calledDate.getHours()).toBe(10);
    expect(calledDate.getMinutes()).toBe(30);
  });

  it('should select a day and close dialog immediately when showTime is false', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    const testDate = new Date(2026, 4, 15);

    render(<DateTime selected={testDate} onChange={handleChange} showTime={false} />);

    await user.click(screen.getByRole('textbox'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const dayButtons = screen.getAllByRole('button', { name: '22' });

    await user.click(dayButtons[0]);

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should select a time option and trigger onChange with updated time', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    const testDate = new Date(2026, 4, 15, 9, 0);

    render(<DateTime selected={testDate} onChange={handleChange} showTime />);

    await user.click(screen.getByRole('textbox'));

    const timeButton = screen.getByRole('button', { name: '14:45' });

    await user.click(timeButton);

    expect(handleChange).toHaveBeenCalledTimes(1);
    const calledDate = handleChange.mock.calls[0][0] as Date;

    expect(calledDate.getHours()).toBe(14);
    expect(calledDate.getMinutes()).toBe(45);
    expect(calledDate.getDate()).toBe(15);
  });

  it('should call onChange with null and close dialog when clear button is clicked', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <DateTime selected={new Date(2026, 4, 15)} onChange={handleChange} clearLabel="Clear Date" />,
    );

    await user.click(screen.getByRole('textbox'));

    const clearBtn = screen.getByRole('button', { name: 'Clear Date' });

    await user.click(clearBtn);

    expect(handleChange).toHaveBeenCalledWith(null);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should call onChange with today date when today button is clicked', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 17, 12, 0, 0));

    try {
      const handleChange = vi.fn();

      render(
        <DateTime
          selected={new Date(2026, 4, 15)}
          onChange={handleChange}
          todayLabel="Choose Today"
          locale="en-US"
        />,
      );

      fireEvent.click(screen.getByRole('textbox'));

      const todayBtn = screen.getByRole('button', { name: 'Choose Today' });

      fireEvent.click(todayBtn);

      expect(handleChange).toHaveBeenCalledTimes(1);
      const calledDate = handleChange.mock.calls[0][0] as Date;
      const now = new Date(2026, 9, 17, 12, 0, 0);

      expect(calledDate.getDate()).toBe(now.getDate());
      expect(calledDate.getMonth()).toBe(now.getMonth());
      expect(calledDate.getFullYear()).toBe(now.getFullYear());
    } finally {
      vi.useRealTimers();
    }
  });

  it('should navigate to previous and next months using navigation buttons', async () => {
    const user = userEvent.setup();
    const testDate = new Date(2026, 4, 15);

    render(<DateTime selected={testDate} onChange={vi.fn()} />);

    await user.click(screen.getByRole('textbox'));

    const prevMonthBtn = screen.getByRole('button', { name: '<' });
    const nextMonthBtn = screen.getByRole('button', { name: '>' });
    const selects = screen.getAllByRole('combobox');
    const monthSelect = selects[0];

    expect(monthSelect).toHaveValue('4');

    await user.click(prevMonthBtn);
    expect(monthSelect).toHaveValue('3');

    await user.click(nextMonthBtn);
    expect(monthSelect).toHaveValue('4');
  });

  it('should change month and year using header select dropdowns', async () => {
    const user = userEvent.setup();
    const testDate = new Date(2026, 4, 15);

    render(<DateTime selected={testDate} onChange={vi.fn()} />);

    await user.click(screen.getByRole('textbox'));

    const selects = screen.getAllByRole('combobox');
    const monthSelect = selects[0];
    const yearSelect = selects[1];

    await user.selectOptions(monthSelect, '7');
    expect(monthSelect).toHaveValue('7');

    await user.selectOptions(yearSelect, '2028');
    expect(yearSelect).toHaveValue('2028');
  });

  it('should forward TextInput attributes like placeholder and disabled', () => {
    render(
      <DateTime
        selected={null}
        onChange={vi.fn()}
        placeholder="Pick appointment"
        disabled
        aria-label="Appointment date"
      />,
    );

    const input = screen.getByRole('textbox', { name: 'Appointment date' });

    expect(input).toBeInTheDocument();
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute('placeholder', 'Pick appointment');
  });
});
