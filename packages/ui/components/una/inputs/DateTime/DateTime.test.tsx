import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DateTime } from './DateTime';

describe('UNA DateTime Component', () => {
  it('should render date and time formatted according to default format', () => {
    const testDate = new Date(2026, 4, 15, 14, 30);

    render(<DateTime selected={testDate} onChange={vi.fn()} />);

    const input = screen.getByRole('textbox');

    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('May 15, 2026 2:30 PM');
  });

  it('should render date and time formatted according to locale or format prop', () => {
    const testDate = new Date(2026, 4, 15, 14, 30);

    const { rerender } = render(
      <DateTime selected={testDate} onChange={vi.fn()} format="YYYY/MM/DD HH:mm" />,
    );

    expect(screen.getByRole('textbox')).toHaveValue('2026/05/15 14:30');

    rerender(
      <DateTime
        selected={testDate}
        onChange={vi.fn()}
        format={(date) => `${date.getFullYear()}-${date.getMonth() + 1}`}
      />,
    );

    expect(screen.getByRole('textbox')).toHaveValue('2026-5');

    rerender(<DateTime selected={testDate} onChange={vi.fn()} showTime={false} locale="en-US" />);

    expect(screen.getByRole('textbox')).toHaveValue('May 15, 2026');
  });

  it('should handle date string, timestamp, or Date object inputs', () => {
    const { rerender } = render(
      <DateTime selected={new Date(2026, 0, 10, 9, 15)} onChange={vi.fn()} />,
    );

    expect(screen.getByRole('textbox')).toHaveValue('January 10, 2026 9:15 AM');

    const timestamp = new Date(2026, 6, 20, 16, 45).getTime();

    rerender(<DateTime selected={timestamp} onChange={vi.fn()} />);

    expect(screen.getByRole('textbox')).toHaveValue('July 20, 2026 4:45 PM');

    const dateString = '2026-03-25T11:00:00';

    rerender(<DateTime selected={dateString} onChange={vi.fn()} />);

    expect(screen.getByRole('textbox')).toHaveValue('March 25, 2026 11:00 AM');
  });

  it('should handle invalid or null dates gracefully with fallback', () => {
    const { rerender } = render(<DateTime selected={null} onChange={vi.fn()} />);

    expect(screen.getByRole('textbox')).toHaveValue('');

    rerender(<DateTime selected={undefined} onChange={vi.fn()} />);
    expect(screen.getByRole('textbox')).toHaveValue('');

    rerender(<DateTime selected={new Date('invalid-date')} onChange={vi.fn()} />);
    expect(screen.getByRole('textbox')).toHaveValue('');

    rerender(<DateTime selected="invalid-string-input" onChange={vi.fn()} />);
    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it('should support relative time if supported by component', () => {
    const testDate = new Date(2026, 4, 15, 12, 0);

    render(<DateTime selected={testDate} onChange={vi.fn()} format={() => 'Today'} />);

    expect(screen.getByRole('textbox')).toHaveValue('Today');
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
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <DateTime
        selected={new Date(2026, 4, 15)}
        onChange={handleChange}
        todayLabel="Choose Today"
      />,
    );

    await user.click(screen.getByRole('textbox'));

    const todayBtn = screen.getByRole('button', { name: 'Choose Today' });

    await user.click(todayBtn);

    expect(handleChange).toHaveBeenCalledTimes(1);
    const calledDate = handleChange.mock.calls[0][0] as Date;
    const now = new Date();

    expect(calledDate.getDate()).toBe(now.getDate());
    expect(calledDate.getMonth()).toBe(now.getMonth());
    expect(calledDate.getFullYear()).toBe(now.getFullYear());
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
