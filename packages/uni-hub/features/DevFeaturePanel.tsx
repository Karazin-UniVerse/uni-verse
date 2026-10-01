'use client';

import React, { useEffect, useState } from 'react';
import { SlidersHorizontal, X, RotateCcw, Copy, Check } from 'lucide-react';
import { Button, Tag } from '@una';
import { FEATURE_QUERY_PARAMS, type FeatureFlagKey } from '@core/constants/features';
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
  const [isCopied, setIsCopied] = useState(false);
  const [isReset, setIsReset] = useState(false);

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
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
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

  const handleCopyTestUrl = async () => {
    if (typeof window === 'undefined') {
      return;
    }

    const url = new URL(window.location.href);

    for (const item of FEATURE_ITEMS) {
      const paramName = FEATURE_QUERY_PARAMS[item.key];

      url.searchParams.set(paramName, String(flags[item.key]));
    }

    try {
      await navigator.clipboard.writeText(url.toString());
      setIsCopied(true);

      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch {
      // Ignore clipboard write failures in headless environments
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        className={styles.floatingTrigger}
        onClick={() => setIsOpen(true)}
        aria-label="Відкрити панель фіча-тоґлів"
        title="Feature Toggles (Ctrl+Shift+F)"
      >
        <SlidersHorizontal size={15} />
        <span>Toggles</span>
        {overrideCount > 0 && <span className={styles.overrideBadge}>{overrideCount}</span>}
      </button>
    );
  }

  return (
    <div className={styles.panelOverlay} role="dialog" aria-modal="true">
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
        <Button type="button" variant="primary" size="small" onClick={handleCopyTestUrl}>
          {isCopied ? (
            <Check size={14} style={{ marginRight: 6 }} />
          ) : (
            <Copy size={14} style={{ marginRight: 6 }} />
          )}
          {isCopied ? 'Скопійовано!' : 'Копіювати URL'}
        </Button>
      </div>
    </div>
  );
};
