import type { NavKey } from '@uni-hub/views/dashboard/constants';

export interface MobileBottomNavProps {
  activeKey: NavKey;
  onSelectKey: (key: NavKey) => void;
  soundEnabled: boolean;
  isMoodleLinked?: boolean;
  onLogout?: () => void;
  onToggleSound?: () => void;
}
