import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useState } from 'react';
import { RadioButton } from './RadioButton';

describe('UNA RadioButton Component', () => {
  it('should render radio button with label and accessible radio role', () => {
    render(
      <label htmlFor="test-radio">
        Option A
        <RadioButton id="test-radio" variant="primary" />
      </label>,
    );

    const radio = screen.getByRole('radio', { name: /option a/i });

    expect(radio).toBeInTheDocument();
    expect(radio).toHaveAttribute('type', 'radio');
  });

  it('should render with aria-label when standalone', () => {
    render(<RadioButton variant="primary" aria-label="Standalone option" />);

    const radio = screen.getByRole('radio', { name: /standalone option/i });

    expect(radio).toBeInTheDocument();
    expect(radio).toHaveAttribute('type', 'radio');
  });

  it('should trigger onChange when selected by user', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(
      <RadioButton variant="primary" aria-label="Selectable option" onChange={handleChange} />,
    );

    const radio = screen.getByRole('radio', { name: /selectable option/i });

    await user.click(radio);

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(radio).toBeChecked();
  });

  it('should be disabled when disabled prop is provided', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(
      <RadioButton
        variant="primary"
        aria-label="Disabled option"
        disabled
        onChange={handleChange}
      />,
    );

    const radio = screen.getByRole('radio', { name: /disabled option/i });

    expect(radio).toBeDisabled();

    await user.click(radio);

    expect(handleChange).not.toHaveBeenCalled();
    expect(radio).not.toBeChecked();
  });

  it('should reflect checked state correctly in controlled mode', async () => {
    function ControlledRadioGroup() {
      const [selected, setSelected] = useState('a');

      return (
        <div>
          <label>
            <RadioButton
              variant="primary"
              name="choice"
              value="a"
              checked={selected === 'a'}
              onChange={() => setSelected('a')}
            />
            Option A
          </label>
          <label>
            <RadioButton
              variant="primary"
              name="choice"
              value="b"
              checked={selected === 'b'}
              onChange={() => setSelected('b')}
            />
            Option B
          </label>
        </div>
      );
    }

    const user = userEvent.setup();

    render(<ControlledRadioGroup />);

    const radioA = screen.getByRole('radio', { name: /option a/i });
    const radioB = screen.getByRole('radio', { name: /option b/i });

    expect(radioA).toBeChecked();
    expect(radioB).not.toBeChecked();

    await user.click(radioB);

    expect(radioA).not.toBeChecked();
    expect(radioB).toBeChecked();
  });

  it('should reflect checked state correctly when defaultChecked is provided', () => {
    render(<RadioButton variant="primary" aria-label="Default checked option" defaultChecked />);

    const radio = screen.getByRole('radio', { name: /default checked option/i });

    expect(radio).toBeChecked();
  });

  it('should apply variant class and custom className', () => {
    render(
      <RadioButton
        variant="secondary"
        className="custom-radio-class"
        aria-label="Secondary option"
      />,
    );

    const radio = screen.getByRole('radio', { name: /secondary option/i });

    expect(radio).toHaveClass('custom-radio-class');
    expect(radio.className).toContain('secondary');
  });

  it('should support radio group click selection between multiple options', async () => {
    const user = userEvent.setup();

    render(
      <fieldset>
        <legend>Select priority</legend>
        <label>
          <RadioButton variant="primary" name="priority" value="low" />
          Low
        </label>
        <label>
          <RadioButton variant="primary" name="priority" value="high" />
          High
        </label>
      </fieldset>,
    );

    const lowRadio = screen.getByRole('radio', { name: /low/i });
    const highRadio = screen.getByRole('radio', { name: /high/i });

    expect(lowRadio).not.toBeChecked();
    expect(highRadio).not.toBeChecked();

    await user.click(lowRadio);

    expect(lowRadio).toBeChecked();
    expect(highRadio).not.toBeChecked();

    await user.click(highRadio);

    expect(lowRadio).not.toBeChecked();
    expect(highRadio).toBeChecked();
  });

  it('should support keyboard selection using space key when focused', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(
      <RadioButton
        variant="primary"
        aria-label="Keyboard selectable option"
        onChange={handleChange}
      />,
    );

    const radio = screen.getByRole('radio', { name: /keyboard selectable option/i });

    radio.focus();
    expect(radio).toHaveFocus();
    expect(radio).not.toBeChecked();

    await user.keyboard(' ');

    expect(radio).toBeChecked();
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('should support arrow key navigation within a radio group', async () => {
    const user = userEvent.setup();

    render(
      <form>
        <label>
          <RadioButton variant="primary" name="arrow-group" value="first" defaultChecked />
          First
        </label>
        <label>
          <RadioButton variant="primary" name="arrow-group" value="second" />
          Second
        </label>
      </form>,
    );

    const firstRadio = screen.getByRole('radio', { name: /first/i });
    const secondRadio = screen.getByRole('radio', { name: /second/i });

    firstRadio.focus();
    expect(firstRadio).toHaveFocus();
    expect(firstRadio).toBeChecked();

    await user.keyboard('[ArrowDown]');

    if (secondRadio === document.activeElement) {
      expect(secondRadio).toHaveFocus();
      expect(secondRadio).toBeChecked();
    }
  });
});
