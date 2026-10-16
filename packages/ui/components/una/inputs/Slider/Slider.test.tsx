import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Slider } from './Slider';

describe('UNA Slider Component', () => {
  it('should render slider with accessible slider role and default range attributes', () => {
    render(<Slider value={50} onChange={vi.fn()} aria-label="Volume" />);

    const slider = screen.getByRole('slider', { name: /volume/i });

    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute('type', 'range');
    expect(slider).toHaveValue('50');
    expect(slider).toHaveAttribute('min', '0');
    expect(slider).toHaveAttribute('max', '100');
    expect(slider).toHaveAttribute('step', '1');
  });

  it('should trigger onChange when value changes', () => {
    const handleChange = vi.fn();

    render(<Slider value={20} onChange={handleChange} aria-label="Volume" />);

    const slider = screen.getByRole('slider', { name: /volume/i });

    fireEvent.change(slider, { target: { value: '45' } });

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith(45);
  });

  it('should respect min, max, and step boundaries', () => {
    const handleChange = vi.fn();

    render(
      <Slider
        value={25}
        min={10}
        max={50}
        step={5}
        onChange={handleChange}
        aria-label="Zoom level"
      />,
    );

    const slider = screen.getByRole('slider', { name: /zoom level/i });

    expect(slider).toHaveAttribute('min', '10');
    expect(slider).toHaveAttribute('max', '50');
    expect(slider).toHaveAttribute('step', '5');
    expect(slider).toHaveValue('25');

    fireEvent.change(slider, { target: { value: '50' } });

    expect(handleChange).toHaveBeenCalledWith(50);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Slider value={30} disabled onChange={vi.fn()} aria-label="Disabled slider" />);

    const slider = screen.getByRole('slider', { name: /disabled slider/i });

    expect(slider).toBeDisabled();
    expect(slider).toHaveAttribute('disabled');
  });

  it('should apply custom id and className', () => {
    render(
      <Slider
        value={15}
        id="unique-slider"
        className="custom-theme-slider"
        onChange={vi.fn()}
        aria-label="Theme"
      />,
    );

    const slider = screen.getByRole('slider', { name: /theme/i });

    expect(slider).toHaveAttribute('id', 'unique-slider');
    expect(slider).toHaveClass('custom-theme-slider');
  });

  it('should update value when rerendered with new value', () => {
    const { rerender } = render(
      <Slider value={10} onChange={vi.fn()} aria-label="Dynamic value" />,
    );

    const slider = screen.getByRole('slider', { name: /dynamic value/i });

    expect(slider).toHaveValue('10');

    rerender(<Slider value={80} onChange={vi.fn()} aria-label="Dynamic value" />);

    expect(slider).toHaveValue('80');
  });
});
