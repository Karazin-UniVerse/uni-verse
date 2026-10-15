import type { ReactNode } from 'react';

export type OpportunityLifecycleOption = {
  value: string;
  label: string;
};

export type OpportunityDetailModalProps = {
  open: boolean;
  onClose: () => void;
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
  onSendToReview?: () => void;
  sendToReviewText?: string;
  moderationComment?: string | null;
  moderationCommentTitle?: string;
  manageTitle?: string;
  phaseLabel?: string;
  lifecycleState?: string;
  lifecycleOptions?: OpportunityLifecycleOption[];
  onLifecycleChange?: (state: string) => void;
  // Footer
  closeText: string;
  canApply?: boolean;
  applyText?: string;
  onOpenApply?: () => void;
  className?: string;
};
