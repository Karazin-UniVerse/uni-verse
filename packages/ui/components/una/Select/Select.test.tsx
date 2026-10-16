import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Select } from './Select';
import type { Option } from './Select.types';

const defaultOptions: Option[] = [
  { value: 'ua', label: 'Українська' },
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
];

describe('UNA Select Component', () => {
  it('should render select with all provided options', () => {
    const handleChange = vi.fn();

    render(
      <Select
        value="ua"
        onChange={handleChange}
        options={defaultOptions}
        aria-label="Language selector"
      />,
    );

    const select = screen.getByRole('combobox', { name: /language selector/i });
    const options = screen.getAllByRole('option');

    expect(select).toBeInTheDocument();
    expect(options).toHaveLength(defaultOptions.length);

    for (const option of defaultOptions) {
      const optionElement = screen.getByRole('option', { name: option.label });

      expect(optionElement).toBeInTheDocument();
      expect(optionElement).toHaveValue(option.value);
    }
  });

  it('should trigger onChange when user selects an option', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(
      <Select
        value="ua"
        onChange={handleChange}
        options={defaultOptions}
        aria-label="Select language"
      />,
    );

    const select = screen.getByRole('combobox', { name: /select language/i });

    await user.selectOptions(select, 'en');

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith('en');
  });

  it('should display selected value correctly', () => {
    const handleChange = vi.fn();

    const { rerender } = render(
      <Select value="ua" onChange={handleChange} options={defaultOptions} />,
    );

    const select = screen.getByRole('combobox');

    expect(select).toHaveValue('ua');

    rerender(<Select value="de" onChange={handleChange} options={defaultOptions} />);

    expect(select).toHaveValue('de');
  });

  it('should support id and aria-label attributes', () => {
    const handleChange = vi.fn();

    render(
      <Select
        id="accessible-select"
        value="en"
        onChange={handleChange}
        options={defaultOptions}
        aria-label="Course list"
      />,
    );

    const select = screen.getByRole('combobox', { name: /course list/i });

    expect(select).toBeInTheDocument();
    expect(select).toHaveAttribute('id', 'accessible-select');
    expect(select).toHaveAttribute('aria-label', 'Course list');
  });

  it('should apply custom className when provided', () => {
    const handleChange = vi.fn();

    render(
      <Select
        value="ua"
        onChange={handleChange}
        options={defaultOptions}
        className="custom-select-test"
      />,
    );

    const select = screen.getByRole('combobox');

    expect(select).toHaveClass('custom-select-test');
  });
});
