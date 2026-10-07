'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { SlidersHorizontal, RotateCcw } from 'lucide-react';
import { Button, Tag, Popover } from '@una';
import type { FeatureFlagKey } from '@core/constants/features';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { TranslationKey } from '@uni-hub/i18n/translations';
import { useFeatureControls } from './FeatureToggleContext';
import styles from './DevFeaturePanel.module.scss';

interface FeatureItemConfig {
  key: FeatureFlagKey;
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
}

const FEATURE_ITEMS: FeatureItemConfig[] = [
  {
    key: 'isMoodleIntegrationEnabled',
    labelKey: 'devPanel.moodleLabel',
    descriptionKey: 'devPanel.moodleDesc',
  },
  {
    key: 'isEDeanEnabled',
    labelKey: 'devPanel.eDeanLabel',
    descriptionKey: 'devPanel.eDeanDesc',
  },
  {
    key: 'isOpportunitiesPlatformEnabled',
    labelKey: 'devPanel.opportunitiesLabel',
    descriptionKey: 'devPanel.opportunitiesDesc',
  },
];

export const DevFeaturePanel: React.FC = () => {
  const { formatMessage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isReset, setIsReset] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const popoverId = useId();

  const { flags, activeOverrides, setFeatureOverride, resetFeatureOverrides, isOverridden } =
    useFeatureControls();

  const overrideCount = Object.keys(activeOverrides).length;

  const handleToggle = (): void => {
    setIsOpen((previous) => !previous);
  };

  const handleClose = (): void => {
    setIsOpen(false);
  };

  // Global toggle shortcut (Ctrl+Shift+F)
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        setIsOpen((previous) => !previous);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const handleFeatureToggle = (featureKey: FeatureFlagKey, checked: boolean) => {
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
    <div className={styles.containerWrap} ref={anchorRef}>
      <Button
        type="button"
        variant="secondary"
        size="medium"
        isTransparent
        onClick={handleToggle}
        aria-label={formatMessage('devPanel.openButton')}
        title={`${formatMessage('devPanel.title')} (Ctrl+Shift+F)`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={popoverId}
        className={styles.headerButton}
      >
        <SlidersHorizontal size={18} />
        {overrideCount > 0 && <span className={styles.overrideBadge}>{overrideCount}</span>}
      </Button>

      <Popover
        open={isOpen}
        onClose={handleClose}
        anchorRef={anchorRef}
        placement="bottom-end"
        width={360}
        title={
          <div className={styles.panelTitleGroup}>
            <SlidersHorizontal size={16} />
            <span>{formatMessage('devPanel.title')}</span>
            <Tag tone="info">{formatMessage('devPanel.devTag')}</Tag>
          </div>
        }
        closeLabel={formatMessage('devPanel.closeButton')}
      >
        <div className={styles.panelBody}>
          {FEATURE_ITEMS.map((item) => {
            const enabled = Boolean(flags[item.key]);
            const overridden = isOverridden(item.key);
            const label = formatMessage(item.labelKey);

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
                    onChange={(event) => handleFeatureToggle(item.key, event.target.checked)}
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
      </Popover>
    </div>
  );
};
