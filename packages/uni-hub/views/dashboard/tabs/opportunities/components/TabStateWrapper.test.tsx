import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageProvider } from '@uni-hub/i18n/LanguageContext';
import { TabStateWrapper } from './TabStateWrapper';

describe('TabStateWrapper', () => {
  it('should render Spinner when loading is true', () => {
    const emptyDescription = 'No opportunities available';

    render(
      <TabStateWrapper
        loading={true}
        isError={false}
        onRetry={vi.fn()}
        isEmpty={false}
        emptyDescription={emptyDescription}
      >
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
      <TabStateWrapper
        loading={false}
        isError={false}
        onRetry={vi.fn()}
        isEmpty={true}
        emptyDescription={emptyDescription}
      >
        <div data-testid="tab-content">Opportunities List</div>
      </TabStateWrapper>,
    );

    expect(screen.getByText(emptyDescription)).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tab-content')).not.toBeInTheDocument();
  });

  it('should render error state and call onRetry when isError is true', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const emptyDescription = 'No opportunities available';

    render(
      <LanguageProvider>
        <TabStateWrapper
          loading={false}
          isError={true}
          onRetry={onRetry}
          isEmpty={false}
          emptyDescription={emptyDescription}
        >
          <div data-testid="tab-content">Opportunities List</div>
        </TabStateWrapper>
      </LanguageProvider>,
    );

    const retryButton = screen.getByRole('button');

    expect(retryButton).toBeInTheDocument();
    expect(screen.queryByTestId('tab-content')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    await user.click(retryButton);

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('should render children when not loading and not empty', () => {
    const emptyDescription = 'No opportunities available';

    render(
      <TabStateWrapper
        loading={false}
        isError={false}
        onRetry={vi.fn()}
        isEmpty={false}
        emptyDescription={emptyDescription}
      >
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
      <TabStateWrapper
        loading={true}
        isError={false}
        onRetry={vi.fn()}
        isEmpty={true}
        emptyDescription={emptyDescription}
      >
        <div data-testid="tab-content">Opportunities List</div>
      </TabStateWrapper>,
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText(emptyDescription)).not.toBeInTheDocument();
    expect(screen.queryByTestId('tab-content')).not.toBeInTheDocument();
  });
});
