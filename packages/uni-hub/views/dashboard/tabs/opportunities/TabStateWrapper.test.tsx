import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TabStateWrapper } from './TabStateWrapper';

describe('TabStateWrapper', () => {
  it('should render Spinner when loading is true', () => {
    const emptyDescription = 'No opportunities available';

    render(
      <TabStateWrapper loading={true} isEmpty={false} emptyDescription={emptyDescription}>
        <div data-testid="tab-content">Opportunities List</div>
      </TabStateWrapper>,
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText(emptyDescription)).not.toBeInTheDocument();
    expect(screen.queryByTestId('tab-content')).not.toBeInTheDocument();
  });

  it('should render Empty state with emptyDescription when isEmpty is true and not loading', () => {
    const emptyDescription = 'No opportunities available';

    render(
      <TabStateWrapper loading={false} isEmpty={true} emptyDescription={emptyDescription}>
        <div data-testid="tab-content">Opportunities List</div>
      </TabStateWrapper>,
    );

    expect(screen.getByText(emptyDescription)).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tab-content')).not.toBeInTheDocument();
  });

  it('should render children when not loading and not empty', () => {
    const emptyDescription = 'No opportunities available';

    render(
      <TabStateWrapper loading={false} isEmpty={false} emptyDescription={emptyDescription}>
        <div data-testid="tab-content">Opportunities List</div>
      </TabStateWrapper>,
    );

    expect(screen.getByTestId('tab-content')).toBeInTheDocument();
    expect(screen.getByText('Opportunities List')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByText(emptyDescription)).not.toBeInTheDocument();
  });

  it('should prioritize loading state over empty state', () => {
    const emptyDescription = 'No opportunities available';

    render(
      <TabStateWrapper loading={true} isEmpty={true} emptyDescription={emptyDescription}>
        <div data-testid="tab-content">Opportunities List</div>
      </TabStateWrapper>,
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText(emptyDescription)).not.toBeInTheDocument();
    expect(screen.queryByTestId('tab-content')).not.toBeInTheDocument();
  });
});
