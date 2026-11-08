import React from 'react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Chart } from './Chart';
import type { ChartDatum } from './Chart.types';

const MOCK_DATA: ChartDatum[] = [
  { name: 'Київ', value: 45 },
  { name: 'Харків', value: 30 },
  { name: 'Львів', value: 25 },
];

describe('UNA Chart Component', () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ): DOMRect {
      return new DOMRect(0, 0, 500, Number.parseFloat(this.style.height) || 300);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render chart container with heading when title is provided', () => {
    const { rerender } = render(<Chart title="Статистика студентів" data={MOCK_DATA} />);

    const heading = screen.getByRole('heading', { level: 3, name: 'Статистика студентів' });

    expect(heading).toBeInTheDocument();

    rerender(<Chart data={MOCK_DATA} />);

    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument();
  });

  it('should render chart with provided series/data', () => {
    render(<Chart title="Міста" data={MOCK_DATA} layout="horizontal" />);

    expect(screen.getByRole('application')).toBeInTheDocument();
    expect(screen.getByText('Київ')).toBeInTheDocument();
    expect(screen.getByText('Харків')).toBeInTheDocument();
    expect(screen.getByText('Львів')).toBeInTheDocument();
  });

  it('should handle empty data safely with default and custom empty description', () => {
    const { rerender } = render(<Chart data={[]} />);

    expect(screen.getByText('Нет данных')).toBeInTheDocument();

    rerender(<Chart data={[]} emptyDescription="Немає інформації для відображення" />);
    expect(screen.getByText('Немає інформації для відображення')).toBeInTheDocument();
  });

  it('should render vertical bar chart layout with data', () => {
    render(<Chart data={MOCK_DATA} type="bar" layout="vertical" />);

    expect(screen.getByRole('application')).toBeInTheDocument();
    expect(screen.getByText('Київ')).toBeInTheDocument();
    expect(screen.getByText('Харків')).toBeInTheDocument();
    expect(screen.getByText('Львів')).toBeInTheDocument();
  });

  it('should render donut chart with legend and series items', () => {
    render(<Chart data={MOCK_DATA} type="donut" showLegend />);

    expect(screen.getByRole('application')).toBeInTheDocument();

    const legendItems = screen.getAllByText(/Київ|Харків|Львів/);

    expect(legendItems.length).toBeGreaterThanOrEqual(3);
  });

  it('should apply custom className and explicit height', () => {
    const { container } = render(
      <Chart data={MOCK_DATA} className="custom-test-chart" height={320} />,
    );

    expect(container.firstChild).toHaveClass('custom-test-chart');

    const chartWrapper = container.firstElementChild?.children.item(0);

    expect(chartWrapper).toBeInTheDocument();
    expect(chartWrapper).toHaveStyle({ height: '320px' });
    expect(screen.getByRole('application')).toHaveAttribute('height', '320');
  });

  it('should render chart with custom datum colors', () => {
    const customData: ChartDatum[] = [
      { name: 'Факультет 1', value: 50, color: '#ff0000' },
      { name: 'Факультет 2', value: 30, color: '#00ff00' },
    ];

    render(<Chart data={customData} type="donut" showLegend />);

    expect(screen.getByText('Факультет 1')).toBeInTheDocument();
    expect(screen.getByText('Факультет 2')).toBeInTheDocument();
  });
});
