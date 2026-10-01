'use client';

import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { SlidersHorizontal, X, RotateCcw } from 'lucide-react';
import { Button, Tag } from '@una';
import type { FeatureFlagKey } from '@core/constants/features';
import { useFeatureControls } from './FeatureToggleContext';
import styles from './DevFeaturePanel.module.scss';

interface FeatureItemConfig {
  key: FeatureFlagKey;
  label: string;
  description: string;
}

const FEATURE_ITEMS: FeatureItemConfig[] = [
  {
    key: 'isMoodleIntegrationEnabled',
    label: 'Moodle LMS',
    description: 'Курси, оцінки, завдання, GPA',
  },
  {
    key: 'isEDeanEnabled',
    label: 'Е-Деканат',
    description: 'Розклад занять, студентська картка',
  },
  {
    key: 'isOpportunitiesPlatformEnabled',
    label: 'Можливості (OP-104)',
    description: 'Дошка проектів та стажувань',
  },
];

const emptySubscribe = () => () => {};

export const DevFeaturePanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isReset, setIsReset] = useState(false);
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const { flags, activeOverrides, setFeatureOverride, resetFeatureOverrides, isOverridden } =
    useFeatureControls();

  const overrideCount = Object.keys(activeOverrides).length;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }

      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        setIsOpen((previous) => !previous);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = (featureKey: FeatureFlagKey, checked: boolean) => {
    setFeatureOverride(featureKey, checked);
  };

  const handleReset = () => {
    resetFeatureOverrides();
    setIsReset(true);

    setTimeout(() => {
      setIsReset(false);
    }, 2000);
  };

  return (
    <div className={styles.containerWrap} ref={containerRef}>
      <Button
        type="button"
        variant="secondary"
        size="medium"
        isTransparent
        onClick={() => setIsOpen((previous) => !previous)}
        aria-label="Відкрити панель фіча-тоґлів"
        title="Feature Toggles (Ctrl+Shift+F)"
        className={styles.headerButton}
      >
        <SlidersHorizontal size={18} />
        {isMounted && overrideCount > 0 && (
          <span className={styles.overrideBadge}>{overrideCount}</span>
        )}
      </Button>

      {isOpen && (
        <dialog className={styles.panelOverlay} open aria-label="Feature Toggles">
          <div className={styles.panelHeader}>
            <div className={styles.panelTitleGroup}>
              <SlidersHorizontal size={16} />
              <h4>Feature Toggles</h4>
              <Tag tone="info">Dev</Tag>
            </div>
            <button
              type="button"
              className={styles.closeButton}
              onClick={() => setIsOpen(false)}
              aria-label="Закрити панель фіча-тоґлів"
            >
              <X size={16} />
            </button>
          </div>

          <div className={styles.panelBody}>
            {FEATURE_ITEMS.map((item) => {
              const enabled = Boolean(flags[item.key]);
              const overridden = isOverridden(item.key);

              return (
                <div key={item.key} className={styles.toggleRow}>
                  <div className={styles.toggleInfo}>
                    <div className={styles.toggleLabel}>
                      <span>{item.label}</span>
                      {overridden && <Tag tone="warning">Override</Tag>}
                    </div>
                    <span className={styles.toggleDescription}>{item.description}</span>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(event) => handleToggle(item.key, event.target.checked)}
                      aria-label={item.label}
                    />
                    <span className={styles.slider} />
                  </label>
                </div>
              );
            })}
          </div>

          <div className={styles.panelFooter}>
            <Button
              type="button"
              variant="secondary"
              size="small"
              onClick={handleReset}
              disabled={overrideCount === 0}
            >
              <RotateCcw size={14} style={{ marginRight: 6 }} />
              {isReset ? 'Скинуто!' : 'Скинути'}
            </Button>
          </div>
        </dialog>
      )}
    </div>
  );
};

export default DevFeaturePanel;
