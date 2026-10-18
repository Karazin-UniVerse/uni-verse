import { create } from 'zustand';
import { LinkMoodleMode } from '@uni-hub/components/auth';
import { safeStorage } from '@uni-hub/services/api';
import { isBrowser } from '@uni-hub/utils/browser';

type SortOrder = 'asc' | 'desc';

type MoodleState = {
  dateFrom: string;
  dateTo: string;
  sortOrder: SortOrder;
  hideCompleted: boolean;
  isMoodleLinked: boolean;
  linkModalMode: LinkMoodleMode;
  isLinkModalOpen: boolean;
  isUnlinkModalOpen: boolean;
  setDateFrom: (dateFrom: string) => void;
  setDateTo: (dateTo: string) => void;
  setSortOrder: (sortOrder: SortOrder) => void;
  setHideCompleted: (hideCompleted: boolean) => void;
  syncLinkedFromStorage: () => void;
  openLinkModal: (mode?: LinkMoodleMode) => void;
  closeLinkModal: () => void;
  openUnlinkModal: () => void;
  closeUnlinkModal: () => void;
  completeLink: () => void;
  completeUnlink: () => void;
};

const readLinkedFlag = (): boolean =>
  !isBrowser || safeStorage.getItem('isMoodleLinked') !== 'false';

export const useMoodleStore = create<MoodleState>()((set) => ({
  dateFrom: '',
  dateTo: '',
  sortOrder: 'asc',
  hideCompleted: false,
  isMoodleLinked: readLinkedFlag(),
  linkModalMode: LinkMoodleMode.CONNECT,
  isLinkModalOpen: false,
  isUnlinkModalOpen: false,

  setDateFrom: (dateFrom) => set({ dateFrom }),
  setDateTo: (dateTo) => set({ dateTo }),
  setSortOrder: (sortOrder) => set({ sortOrder }),
  setHideCompleted: (hideCompleted) => set({ hideCompleted }),

  syncLinkedFromStorage: () => set({ isMoodleLinked: readLinkedFlag() }),

  openLinkModal: (mode = LinkMoodleMode.CONNECT) =>
    set({ linkModalMode: mode, isLinkModalOpen: true }),
  closeLinkModal: () => set({ isLinkModalOpen: false }),
  openUnlinkModal: () => set({ isUnlinkModalOpen: true }),
  closeUnlinkModal: () => set({ isUnlinkModalOpen: false }),

  completeLink: () => {
    safeStorage.setItem('isMoodleLinked', 'true');
    set({ isLinkModalOpen: false, isMoodleLinked: true });
  },
  completeUnlink: () => {
    safeStorage.setItem('isMoodleLinked', 'false');
    safeStorage.removeItem('universe_dashboard_data');
    safeStorage.removeItem('universe_last_sync_time');
    set({ isUnlinkModalOpen: false, isMoodleLinked: false });
  },
}));
