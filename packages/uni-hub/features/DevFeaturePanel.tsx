'use client';

import React, { useEffect, useRef, useState } from 'react';
import { SlidersHorizontal, X, RotateCcw } from 'lucide-react';
import { Button, Tag } from '@una';
import type { FeatureFlagKey } from '@core/constants/features';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { TranslationKey } from '@uni-hub/i18n/translations';
import { useFeatureControls } from './FeatureToggleContext';
import { useDevPanelModal } from './useDevPanelModal';
import styles from './DevFeaturePanel.module.scss';

interface FeatureItemConfig {
  key: FeatureFlagKey;
  labelKey?: TranslationKey;
  labelFallback: string;
  descriptionKey: TranslationKey;
}

const FEATURE_ITEMS: FeatureItemConfig[] = [
  {
    key: 'isMoodleIntegrationEnabled',
    labelFallback: 'Moodle LMS',
    descriptionKey: 'devPanel.moodleDesc',
  },
  {
    key: 'isEDeanEnabled',
    labelFallback: 'e-Dean',
    descriptionKey: 'devPanel.eDeanDesc',
  },
  {
    key: 'isOpportunitiesPlatformEnabled',
    labelKey: 'devPanel.opportunitiesLabel',
    labelFallback: 'Opportunities',
    descriptionKey: 'devPanel.opportunitiesDesc',
  },
];

export const DevFeaturePanel: React.FC = () => {
  const { formatMessage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isReset, setIsReset] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDialogElement>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { flags, activeOverrides, setFeatureOverride, resetFeatureOverrides, isOverridden } =
    useFeatureControls();

  const overrideCount = Object.keys(activeOverrides).length;

  useDevPanelModal({
    isOpen,
    setIsOpen,
    containerRef,
    panelRef,
  });

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const handleToggle = (featureKey: FeatureFlagKey, checked: boolean) => {
    setFeatureOverride(featureKey, checked);
  };

  const handleReset = () => {
    resetFeatureOverrides();
    setIsReset(true);

    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }

    resetTimerRef.current = setTimeout(() => {
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
        aria-label={formatMessage('devPanel.openButton')}
        title={`${formatMessage('devPanel.title')} (Ctrl+Shift+F)`}
        className={styles.headerButton}
      >
        <SlidersHorizontal size={18} />
        {overrideCount > 0 && <span className={styles.overrideBadge}>{overrideCount}</span>}
      </Button>

      {isOpen && (
        <dialog
          ref={panelRef}
          className={styles.panelOverlay}
          open
          aria-label={formatMessage('devPanel.title')}
        >
          <div className={styles.panelHeader}>
            <div className={styles.panelTitleGroup}>
              <SlidersHorizontal size={16} />
              <h4>{formatMessage('devPanel.title')}</h4>
              <Tag tone="info">Dev</Tag>
            </div>
            <button
              type="button"
              className={styles.closeButton}
              onClick={() => setIsOpen(false)}
              aria-label={formatMessage('devPanel.closeButton')}
            >
              <X size={16} />
            </button>
          </div>

          <div className={styles.panelBody}>
            {FEATURE_ITEMS.map((item) => {
              const enabled = Boolean(flags[item.key]);
              const overridden = isOverridden(item.key);
              const label = item.labelKey ? formatMessage(item.labelKey) : item.labelFallback;

              return (
                <div key={item.key} className={styles.toggleRow}>
                  <div className={styles.toggleInfo}>
                    <div className={styles.toggleLabel}>
                      <span>{label}</span>
                      {overridden && (
                        <Tag tone="warning">{formatMessage('devPanel.overrideTag')}</Tag>
                      )}
                    </div>
                    <span className={styles.toggleDescription}>
                      {formatMessage(item.descriptionKey)}
                    </span>
                  </div>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(event) => handleToggle(item.key, event.target.checked)}
                      aria-label={label}
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
              <RotateCcw size={14} className={styles.btnIcon} />
              {isReset ? formatMessage('devPanel.resetSuccess') : formatMessage('devPanel.reset')}
            </Button>
          </div>
        </dialog>
      )}
    </div>
  );
};
