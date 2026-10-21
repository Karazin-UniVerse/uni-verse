import type { RefObject } from 'react';
import type { NavKey } from '@uni-hub/views/dashboard/constants';
import type { NavItemConfig } from '@uni-hub/views/dashboard/layout/DashboardSidebar';

export interface MobileMoreSheetProps {
  activeKey: NavKey;
  onClose: () => void;
  onSelectKey: (key: NavKey) => void;
  open: boolean;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
  secondaryItems: NavItemConfig[];
  soundEnabled: boolean;
  onLogout?: () => void;
  onToggleSound?: () => void;
}
