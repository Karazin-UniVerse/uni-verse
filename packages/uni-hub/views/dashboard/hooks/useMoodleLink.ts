'use client';

import { useState, useCallback } from 'react';
import { safeStorage } from '@uni-hub/services/api';
import { isBrowser } from '@uni-hub/utils/browser';
import { LinkMoodleMode } from '@uni-hub/components/auth';
import type { NavKey } from '../types';

export interface UseMoodleLinkOptions {
  activeKey?: NavKey;
  setActiveKey?: (key: NavKey) => void;
  onLinkSuccess?: () => void;
  onUnlinkSuccess?: () => void;
}

export function useMoodleLink({
  activeKey,
  setActiveKey,
  onLinkSuccess,
  onUnlinkSuccess,
}: UseMoodleLinkOptions = {}) {
  const [linkModalMode, setLinkModalMode] = useState<LinkMoodleMode>(LinkMoodleMode.CONNECT);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isUnlinkModalOpen, setIsUnlinkModalOpen] = useState(false);
  const [isMoodleLinked, setIsMoodleLinked] = useState<boolean>(() => {
    if (!isBrowser) {
      return true;
    }

    return safeStorage.getItem('isMoodleLinked') !== 'false';
  });

  const openLinkModal = useCallback((mode: LinkMoodleMode = LinkMoodleMode.CONNECT) => {
    setLinkModalMode(mode);
    setIsLinkModalOpen(true);
  }, []);

  const closeLinkModal = useCallback(() => {
    setIsLinkModalOpen(false);
  }, []);

  const openUnlinkModal = useCallback(() => {
    setIsUnlinkModalOpen(true);
  }, []);

  const closeUnlinkModal = useCallback(() => {
    setIsUnlinkModalOpen(false);
  }, []);

  const handleLinkSuccess = useCallback(() => {
    setIsLinkModalOpen(false);
    setIsMoodleLinked(true);
    safeStorage.setItem('isMoodleLinked', 'true');

    if (activeKey === 'connectMoodle') {
      setActiveKey?.('overview');
    }

    onLinkSuccess?.();
  }, [activeKey, onLinkSuccess, setActiveKey]);

  const handleUnlinkSuccess = useCallback(() => {
    setIsUnlinkModalOpen(false);
    setIsMoodleLinked(false);
    safeStorage.setItem('isMoodleLinked', 'false');

    onUnlinkSuccess?.();
  }, [onUnlinkSuccess]);

  return {
    isMoodleLinked,
    setIsMoodleLinked,
    linkModalMode,
    isLinkModalOpen,
    isUnlinkModalOpen,
    openLinkModal,
    closeLinkModal,
    openUnlinkModal,
    closeUnlinkModal,
    handleLinkSuccess,
    handleUnlinkSuccess,
  };
}

export default useMoodleLink;
