'use client';

import { LinkMoodleMode } from '@uni-hub/components/auth';
import { ConnectMoodleTab, useDashboard } from '@uni-hub/views/dashboard';

export default function Page() {
  const { openLinkModal } = useDashboard();

  return <ConnectMoodleTab onConnect={() => openLinkModal(LinkMoodleMode.CONNECT)} />;
}
