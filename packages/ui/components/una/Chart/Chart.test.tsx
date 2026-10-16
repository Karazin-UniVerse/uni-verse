import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Chart } from './Chart';
import type { ChartDatum } from './Chart.types';

vi.mock('recharts', async (importOriginal) => {
  const original = await importOriginal<typeof import('recharts')>();

  return {
    ...original,
    ResponsiveContainer: ({
      children,
      width = 500,
      height = 300,
    }: {
      children: React.ReactNode;
      width?: number | string;
      height?: number | string;
    }) => {
      const resolvedWidth = typeof width === 'number' ? width : 500;
      const resolvedHeight = typeof height === 'number' ? height : 300;

      return (
        <div
          data-testid="responsive-container"
          style={{ width: resolvedWidth, height: resolvedHeight }}
        >
          {React.isValidElement(children)
            ? React.cloneElement(children, {
                width: resolvedWidth,
                height: resolvedHeight,
              } as Record<string, unknown>)
            : children}
        </div>
      );
    },
  };
});

const MOCK_DATA: ChartDatum[] = [
  { name: 'Київ', value: 45 },
  { name: 'Харків', value: 30 },
  { name: 'Львів', value: 25 },
];

describe('UNA Chart Component', () => {
  it('should render chart container with heading when title is provided', () => {
    const { rerender } = render(<Chart title="Статистика студентів" data={MOCK_DATA} />);

    const heading = screen.getByRole('heading', { level: 3, name: 'Статистика студентів' });

    expect(heading).toBeInTheDocument();

    rerender(<Chart data={MOCK_DATA} />);

    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument();
  });

  it('should render chart with provided series/data', () => {
    render(<Chart title="Міста" data={MOCK_DATA} layout="horizontal" />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
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

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByText('Київ')).toBeInTheDocument();
    expect(screen.getByText('Харків')).toBeInTheDocument();
    expect(screen.getByText('Львів')).toBeInTheDocument();
  });

  it('should render donut chart with legend and series items', () => {
    render(<Chart data={MOCK_DATA} type="donut" showLegend />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();

    const legendItems = screen.getAllByText(/Київ|Харків|Львів/);

    expect(legendItems.length).toBeGreaterThanOrEqual(3);
  });

  it('should apply custom className and explicit height', () => {
    const { container } = render(
      <Chart data={MOCK_DATA} className="custom-test-chart" height={320} />,
    );

    expect(container.firstChild).toHaveClass('custom-test-chart');

    const chartWrapper = screen.getByTestId('responsive-container').parentElement as HTMLElement;

    expect(chartWrapper).toBeInTheDocument();
    expect(chartWrapper.style.height).toBe('320px');
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
