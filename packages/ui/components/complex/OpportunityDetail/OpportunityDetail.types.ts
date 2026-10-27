import type { ReactNode } from 'react';

export type OpportunityLifecycleOption = {
  label: string;
  value: string;
};

export type OpportunityDetailProps = {
  onBack: () => void;
  backText: string;
  title: string;
  paymentTagText?: string;
  paymentTone?: 'success' | 'neutral';
  statusBadge?: ReactNode;
  lifecycleTagText?: string;
  organizerLabel?: string;
  organizerName?: string;
  publishedDateText?: string;
  descriptionTitle?: string;
  descriptionText?: string;
  contactLabel?: string;
  contactValue?: string;
  emailLabel?: string;
  emailValue?: string;
  // Author controls
  isOwner?: boolean;
  canEdit?: boolean;
  onEdit?: () => void;
  editText?: string;
  canSendToReview?: boolean;
  sendToReviewDisabled?: boolean;
  sendToReviewHint?: string;
  onSendToReview?: () => void;
  sendToReviewText?: string;
  canDelete?: boolean;
  onDelete?: () => void;
  deleteText?: string;
  onOpenApplicants?: () => void;
  viewApplicantsText?: string;
  moderationComment?: string | null;
  moderationCommentTitle?: string;
  manageTitle?: string;
  // Candidate application status
  acceptsApplications?: boolean;
  applicationsClosedText?: string;
  // Candidate actions
  canApply?: boolean;
  applyText?: string;
  onOpenApply?: () => void;
  className?: string;
};
