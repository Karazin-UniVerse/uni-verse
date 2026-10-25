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
    manageTitle: 'Manage Opportunity',
    deleteText: 'Delete draft',
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

  it('should render author management panel with delete button when isOwner and canDelete are true', () => {
    const onDelete = vi.fn();

    render(
      <OpportunityDetail {...defaultProps} isOwner={true} canDelete={true} onDelete={onDelete} />,
    );

    expect(screen.getByText('Manage Opportunity')).toBeInTheDocument();

    const deleteBtn = screen.getByRole('button', { name: 'Delete draft' });

    expect(deleteBtn).toBeInTheDocument();

    fireEvent.click(deleteBtn);

    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('should render view applicants button in author panel when onOpenApplicants is provided', () => {
    const onOpenApplicants = vi.fn();

    render(
      <OpportunityDetail
        {...defaultProps}
        isOwner={true}
        onOpenApplicants={onOpenApplicants}
        viewApplicantsText="View applicants"
      />,
    );

    const applicantsBtn = screen.getByRole('button', { name: 'View applicants' });

    expect(applicantsBtn).toBeInTheDocument();

    fireEvent.click(applicantsBtn);

    expect(onOpenApplicants).toHaveBeenCalledTimes(1);
  });

  it('should render phase select and trigger onLifecycleChange', () => {
    const onLifecycleChange = vi.fn();
    const lifecycleOptions = [
      { label: 'Active', value: 'ACTIVE' },
      { label: 'Completed', value: 'COMPLETED' },
    ];

    render(
      <OpportunityDetail
        {...defaultProps}
        isOwner={true}
        phaseLabel="Phase:"
        lifecycleState="ACTIVE"
        lifecycleOptions={lifecycleOptions}
        onLifecycleChange={onLifecycleChange}
      />,
    );

    const select = screen.getByRole('combobox', { name: 'Phase:' });

    expect(select).toBeInTheDocument();
    expect(select).toHaveValue('ACTIVE');

    fireEvent.change(select, { target: { value: 'COMPLETED' } });

    expect(onLifecycleChange).toHaveBeenCalledWith('COMPLETED');
  });

  it('should render accepts applications checkbox and trigger onToggleAcceptsApplications', () => {
    const onToggleAcceptsApplications = vi.fn();

    render(
      <OpportunityDetail
        {...defaultProps}
        isOwner={true}
        acceptsApplications={true}
        acceptsApplicationsLabel="Accept applications"
        onToggleAcceptsApplications={onToggleAcceptsApplications}
      />,
    );

    const checkbox = screen.getByRole('checkbox', { name: 'Accept applications' });

    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);

    expect(onToggleAcceptsApplications).toHaveBeenCalledWith(false);
  });
});
