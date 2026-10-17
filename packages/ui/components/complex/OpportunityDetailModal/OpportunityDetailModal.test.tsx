import type React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OpportunityDetailModal } from './OpportunityDetailModal';
import type { OpportunityDetailModalProps } from './OpportunityDetailModal.types';

vi.mock('../../una/Modal', () => ({
  Modal: ({
    open,
    onClose,
    title,
    children,
    className,
  }: {
    open: boolean;
    onClose?: () => void;
    title?: string;
    children?: React.ReactNode;
    className?: string;
  }) =>
    open ? (
      <dialog open aria-label={title} className={className}>
        {title ? <h2>{title}</h2> : null}
        <button type="button" onClick={onClose} aria-label="Close dialog">
          Close
        </button>
        {children}
      </dialog>
    ) : null,
}));

describe('OpportunityDetailModal Component', () => {
  const defaultProps: OpportunityDetailModalProps = {
    open: true,
    onClose: vi.fn(),
    title: 'Research Assistant Position',
    closeText: 'Close',
    organizerLabel: 'Organizer:',
    organizerName: 'AI Research Lab',
    publishedDateText: 'Published on Oct 16, 2026',
    descriptionTitle: 'About this opportunity',
    descriptionText: 'We are seeking an undergraduate assistant for machine learning projects.',
  };

  it('should render modal when open is true with accessible dialog title and opportunity details', () => {
    render(<OpportunityDetailModal {...defaultProps} />);

    const dialog = screen.getByRole('dialog', { name: defaultProps.title });

    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: defaultProps.title })).toBeInTheDocument();
    expect(screen.getByText(defaultProps.organizerLabel!)).toBeInTheDocument();
    expect(screen.getByText(defaultProps.organizerName!)).toBeInTheDocument();
    expect(screen.getByText(defaultProps.publishedDateText!)).toBeInTheDocument();
    expect(screen.getByText(defaultProps.descriptionTitle!)).toBeInTheDocument();
    expect(screen.getByText(defaultProps.descriptionText!)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: defaultProps.closeText })).toBeInTheDocument();
  });

  it('should not render when open is false', () => {
    render(<OpportunityDetailModal {...defaultProps} open={false} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText(defaultProps.title)).not.toBeInTheDocument();
    expect(screen.queryByText(defaultProps.descriptionText!)).not.toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(<OpportunityDetailModal {...defaultProps} onClose={handleClose} />);

    const closeBtn = screen.getByRole('button', { name: defaultProps.closeText });

    await user.click(closeBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);

    const dialogCloseBtn = screen.getByRole('button', { name: 'Close dialog' });

    await user.click(dialogCloseBtn);

    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it('should call onApply when apply button is clicked', async () => {
    const handleApply = vi.fn();
    const user = userEvent.setup();

    render(
      <OpportunityDetailModal
        {...defaultProps}
        canApply={true}
        applyText="Apply Now"
        onOpenApply={handleApply}
      />,
    );

    const applyBtn = screen.getByRole('button', { name: 'Apply Now' });

    expect(applyBtn).toBeInTheDocument();

    await user.click(applyBtn);

    expect(handleApply).toHaveBeenCalledTimes(1);
  });

  it('should not render apply button when canApply is false or onOpenApply is omitted', () => {
    const { rerender } = render(
      <OpportunityDetailModal
        {...defaultProps}
        canApply={false}
        applyText="Apply Now"
        onOpenApply={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Apply Now' })).not.toBeInTheDocument();

    rerender(
      <OpportunityDetailModal
        {...defaultProps}
        canApply={true}
        applyText="Apply Now"
        onOpenApply={undefined}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Apply Now' })).not.toBeInTheDocument();
  });

  it('should render status tags/badges and contact details if available', () => {
    render(
      <OpportunityDetailModal
        {...defaultProps}
        paymentTagText="Paid ($20/hr)"
        paymentTone="success"
        statusBadge={<span data-testid="status-badge">Published</span>}
        lifecycleTagText="Active Recruitment"
        contactLabel="Contact Person:"
        contactValue="coordinator@lab.edu"
      />,
    );

    expect(screen.getByText('Paid ($20/hr)')).toBeInTheDocument();
    expect(screen.getByTestId('status-badge')).toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument();
    expect(screen.getByText('Active Recruitment')).toBeInTheDocument();
    expect(screen.getByText('Contact Person:')).toBeInTheDocument();
    expect(screen.getByText('coordinator@lab.edu')).toBeInTheDocument();
  });

  it('should render author management panel with edit, review actions and lifecycle selector when user is owner', async () => {
    const handleEdit = vi.fn();
    const handleSendToReview = vi.fn();
    const handleLifecycleChange = vi.fn();
    const user = userEvent.setup();
    const lifecycleOptions = [
      { value: 'draft', label: 'Draft' },
      { value: 'active', label: 'Active' },
      { value: 'closed', label: 'Closed' },
    ];

    render(
      <OpportunityDetailModal
        {...defaultProps}
        isOwner={true}
        manageTitle="Opportunity Management"
        canEdit={true}
        editText="Edit Details"
        onEdit={handleEdit}
        canSendToReview={true}
        sendToReviewText="Submit for Review"
        onSendToReview={handleSendToReview}
        phaseLabel="Recruitment Status"
        lifecycleState="draft"
        lifecycleOptions={lifecycleOptions}
        onLifecycleChange={handleLifecycleChange}
      />,
    );

    expect(screen.getByText('Opportunity Management')).toBeInTheDocument();

    const editBtn = screen.getByRole('button', { name: 'Edit Details' });
    const reviewBtn = screen.getByRole('button', { name: 'Submit for Review' });
    const select = screen.getByRole('combobox', { name: 'Recruitment Status' });

    expect(editBtn).toBeInTheDocument();
    expect(reviewBtn).toBeInTheDocument();
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue('draft');

    await user.click(editBtn);

    expect(handleEdit).toHaveBeenCalledTimes(1);

    await user.click(reviewBtn);

    expect(handleSendToReview).toHaveBeenCalledTimes(1);

    await user.selectOptions(select, 'active');

    expect(handleLifecycleChange).toHaveBeenCalledWith('active');
  });

  it('should not render author management controls when isOwner is false', () => {
    render(
      <OpportunityDetailModal
        {...defaultProps}
        isOwner={false}
        manageTitle="Opportunity Management"
        canEdit={true}
        editText="Edit Details"
        onEdit={vi.fn()}
        canSendToReview={true}
        sendToReviewText="Submit for Review"
        onSendToReview={vi.fn()}
        phaseLabel="Recruitment Status"
        lifecycleState="draft"
        lifecycleOptions={[{ value: 'draft', label: 'Draft' }]}
        onLifecycleChange={vi.fn()}
      />,
    );

    expect(screen.queryByText('Opportunity Management')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit Details' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Submit for Review' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Recruitment Status' })).not.toBeInTheDocument();
  });

  it('should render moderation feedback box when isOwner is true and moderationComment is present', () => {
    const { rerender } = render(
      <OpportunityDetailModal
        {...defaultProps}
        isOwner={true}
        moderationCommentTitle="Reviewer Comments"
        moderationComment="Please add more details to the requirements section."
      />,
    );

    expect(screen.getByText('Reviewer Comments')).toBeInTheDocument();
    expect(
      screen.getByText('Please add more details to the requirements section.'),
    ).toBeInTheDocument();

    rerender(
      <OpportunityDetailModal
        {...defaultProps}
        isOwner={false}
        moderationCommentTitle="Reviewer Comments"
        moderationComment="Please add more details to the requirements section."
      />,
    );

    expect(screen.queryByText('Reviewer Comments')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Please add more details to the requirements section.'),
    ).not.toBeInTheDocument();
  });

  it('should apply custom className when provided', () => {
    render(<OpportunityDetailModal {...defaultProps} className="custom-detail-modal" />);

    const dialog = screen.getByRole('dialog', { name: defaultProps.title });

    expect(dialog).toHaveClass('custom-detail-modal');
  });
});
