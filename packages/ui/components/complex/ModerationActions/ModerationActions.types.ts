export interface ModerationActionsProps {
  onApprove: () => void;
  onOpenRejectModal: () => void;
  approveText: string;
  reviseText: string;
  rejectText: string;
  disabled?: boolean;
}
