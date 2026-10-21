import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { OpportunityDetail } from './OpportunityDetail';
import type { OpportunityDetailProps } from './OpportunityDetail.types';

describe('OpportunityDetail Component', () => {
  const defaultProps: OpportunityDetailProps = {
    onBack: vi.fn(),
    backText: 'Back to opportunities',
    title: 'Junior React Developer',
    descriptionTitle: 'Description',
    descriptionText: 'Exciting startup opportunity',
    contactLabel: 'Contact:',
    contactValue: 'hr@example.com',
    applyText: 'Apply now',
    applicationsClosedText: 'Applications closed by author',
    acceptsApplicationsLabel: 'Accept new applications',
    manageTitle: 'Manage Opportunity',
    phaseLabel: 'Phase:',
    lifecycleState: 'ACTIVE',
    lifecycleOptions: [
      { value: 'START', label: 'Start' },
      { value: 'ACTIVE', label: 'Active' },
    ],
  };

  it('should render details content with title, description, and contact info', () => {
    render(<OpportunityDetail {...defaultProps} />);

    expect(
      screen.getByRole('heading', { level: 3, name: 'Junior React Developer' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Exciting startup opportunity')).toBeInTheDocument();
    expect(screen.getByText('hr@example.com')).toBeInTheDocument();
  });

  it('should render active apply button for candidate when canApply is true', () => {
    const onOpenApply = vi.fn();

    render(
      <OpportunityDetail
        {...defaultProps}
        isOwner={false}
        canApply={true}
        acceptsApplications={true}
        onOpenApply={onOpenApply}
      />,
    );

    const applyBtn = screen.getByRole('button', { name: 'Apply now' });

    expect(applyBtn).toBeInTheDocument();
    expect(applyBtn).toBeEnabled();

    fireEvent.click(applyBtn);

    expect(onOpenApply).toHaveBeenCalledTimes(1);
  });

  it('should render disabled applications closed button when acceptsApplications is false', () => {
    render(
      <OpportunityDetail
        {...defaultProps}
        isOwner={false}
        canApply={false}
        acceptsApplications={false}
      />,
    );

    const closedBtn = screen.getByRole('button', { name: 'Applications closed by author' });

    expect(closedBtn).toBeInTheDocument();
    expect(closedBtn).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Apply now' })).not.toBeInTheDocument();
  });

  it('should render author management panel with acceptsApplications checkbox when isOwner is true', () => {
    const onToggle = vi.fn();

    render(
      <OpportunityDetail
        {...defaultProps}
        isOwner={true}
        acceptsApplications={true}
        onToggleAcceptsApplications={onToggle}
      />,
    );

    expect(screen.getByText('Manage Opportunity')).toBeInTheDocument();

    const checkbox = screen.getByRole('checkbox');

    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);

    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it('should reflect unchecked state when acceptsApplications is false for author', () => {
    const onToggle = vi.fn();

    render(
      <OpportunityDetail
        {...defaultProps}
        isOwner={true}
        acceptsApplications={false}
        onToggleAcceptsApplications={onToggle}
      />,
    );

    const checkbox = screen.getByRole('checkbox');

    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);

    expect(onToggle).toHaveBeenCalledWith(true);
  });
});
