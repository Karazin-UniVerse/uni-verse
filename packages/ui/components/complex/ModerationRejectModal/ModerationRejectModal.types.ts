export type ModerationRejectModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  comment: string;
  onCommentChange: (comment: string) => void;
  commentLabel?: string;
  placeholder?: string;
  cancelText?: string;
  reviseText?: string;
  rejectText?: string;
  onRevise: () => void;
  onReject: () => void;
  isSubmitting?: boolean;
  className?: string;
};
