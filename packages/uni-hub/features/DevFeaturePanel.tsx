'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { SlidersHorizontal, RotateCcw } from 'lucide-react';
import { Button, Popover, Tag } from '@una';
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

export const DevFeaturePanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isReset, setIsReset] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverId = useId();

  const { flags, activeOverrides, setFeatureOverride, resetFeatureOverrides, isOverridden } =
    useFeatureControls();

  const overrideCount = Object.keys(activeOverrides).length;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        setIsOpen((previous) => !previous);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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
    <div className={styles.container}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.floatingTrigger}
        onClick={() => setIsOpen((previous) => !previous)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={popoverId}
        aria-label="Відкрити панель фіча-тоґлів"
        title="Feature Toggles (Ctrl+Shift+F)"
      >
        <SlidersHorizontal size={15} />
        <span>Toggles</span>
        {overrideCount > 0 && <span className={styles.overrideBadge}>{overrideCount}</span>}
      </button>

      <Popover
        id={popoverId}
        open={isOpen}
        onClose={() => setIsOpen(false)}
        anchorRef={triggerRef}
        placement="top-start"
        width={360}
        closeButton
        closeLabel="Закрити панель фіча-тоґлів"
        title={
          <div className={styles.panelTitleGroup}>
            <SlidersHorizontal size={16} />
            <span>Feature Toggles</span>
            <Tag tone="info">Dev</Tag>
          </div>
        }
        footer={
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
        }
      >
        <div className={styles.toggleList}>
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
      </Popover>
    </div>
  );
};

export default DevFeaturePanel;
