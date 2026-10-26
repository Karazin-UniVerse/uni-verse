import type { ReactNode } from 'react';

export type OpportunityLifecycleOption = {
  value: string;
  label: string;
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
  onOpenApplicants?: () => void;
  viewApplicantsText?: string;
  moderationComment?: string | null;
  moderationCommentTitle?: string;
  manageTitle?: string;
  phaseLabel?: string;
  lifecycleState?: string;
  lifecycleOptions?: OpportunityLifecycleOption[];
  onLifecycleChange?: (state: string) => void;
  acceptsApplications?: boolean;
  onToggleAcceptsApplications?: (accepts: boolean) => void;
  acceptsApplicationsLabel?: string;
  applicationsClosedText?: string;
  // Footer
  canApply?: boolean;
  applyText?: string;
  onOpenApply?: () => void;
  className?: string;
};
