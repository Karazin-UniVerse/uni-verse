import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SegmentedControl } from './SegmentedControl';
import { noop } from '@core/utils/fn';

describe('SegmentedControl Component', () => {
  const sampleItems = [
    { id: 'first', label: 'First' },
    { id: 'second', label: 'Second', badge: 4 },
    { id: 'third', label: 'Third', badge: 0 },
  ];

  it('should render a tablist with an accessible label', () => {
    render(
      <SegmentedControl
        items={sampleItems}
        selectedId="first"
        panelIdPrefix="panel"
        ariaLabel="Sections"
        onSelect={noop}
      />,
    );

    const tablist = screen.getByRole('tablist', { name: 'Sections' });

    expect(tablist).toBeInTheDocument();
  });

  it('should mark only the selected tab and give it the roving tabindex', () => {
    render(
      <SegmentedControl
        items={sampleItems}
        selectedId="second"
        panelIdPrefix="panel"
        onSelect={noop}
      />,
    );

    const selectedTab = screen.getByRole('tab', { name: /Second/ });
    const inactiveTab = screen.getByRole('tab', { name: 'First' });

    expect(selectedTab).toHaveAttribute('aria-selected', 'true');
    expect(selectedTab).toHaveAttribute('tabindex', '0');

    expect(inactiveTab).toHaveAttribute('aria-selected', 'false');
    expect(inactiveTab).toHaveAttribute('tabindex', '-1');
  });

  it('should place aria-controls only on the selected tab', () => {
    render(
      <SegmentedControl
        items={sampleItems}
        selectedId="first"
        panelIdPrefix="study-panel"
        onSelect={noop}
      />,
    );

    const firstTab = screen.getByRole('tab', { name: 'First' });
    const thirdTab = screen.getByRole('tab', { name: 'Third' });

    expect(firstTab).toHaveAttribute('aria-controls', 'study-panel-first');
    expect(thirdTab).not.toHaveAttribute('aria-controls');
  });

  it('should render a badge only when it is greater than zero', () => {
    render(
      <SegmentedControl
        items={sampleItems}
        selectedId="first"
        panelIdPrefix="panel"
        onSelect={noop}
      />,
    );

    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('should navigate between tabs with ArrowRight and ArrowLeft including edge wrap-around', () => {
    const onSelect = vi.fn();

    render(
      <SegmentedControl
        items={sampleItems}
        selectedId="first"
        panelIdPrefix="panel"
        onSelect={onSelect}
      />,
    );

    const tabs = screen.getAllByRole('tab');

    // ArrowRight from first tab -> second tab
    fireEvent.keyDown(tabs[0]!, { key: 'ArrowRight' });
    expect(onSelect).toHaveBeenCalledWith('second');

    // ArrowLeft from first tab -> wraps to third (last) tab
    fireEvent.keyDown(tabs[0]!, { key: 'ArrowLeft' });
    expect(onSelect).toHaveBeenCalledWith('third');

    // ArrowRight from third tab -> wraps to first tab
    fireEvent.keyDown(tabs[2]!, { key: 'ArrowRight' });
    expect(onSelect).toHaveBeenCalledWith('first');
  });

  it('should navigate to first and last tabs with Home and End keys', () => {
    const onSelect = vi.fn();

    render(
      <SegmentedControl
        items={sampleItems}
        selectedId="second"
        panelIdPrefix="panel"
        onSelect={onSelect}
      />,
    );

    const tabs = screen.getAllByRole('tab');

    fireEvent.keyDown(tabs[1]!, { key: 'Home' });
    expect(onSelect).toHaveBeenCalledWith('first');

    fireEvent.keyDown(tabs[1]!, { key: 'End' });
    expect(onSelect).toHaveBeenCalledWith('third');
  });
});
