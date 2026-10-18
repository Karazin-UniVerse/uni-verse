'use client';

import { LinkMoodleMode } from '@uni-hub/components/auth';
import { useMoodleStore } from '@uni-hub/store/useMoodleStore';
import { ConnectMoodleTab } from '@uni-hub/views/dashboard';

export default function Page() {
  const openLinkModal = useMoodleStore((state) => state.openLinkModal);

  return <ConnectMoodleTab onConnect={() => openLinkModal(LinkMoodleMode.CONNECT)} />;
}
