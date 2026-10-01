'use client';

import React from 'react';
import type { FeatureFlagKey } from '@core/constants/features';
import { useFeature } from './FeatureToggleContext';

export interface FeatureGateProps {
  feature: FeatureFlagKey;
  children?: React.ReactNode;
  fallback?: React.ReactNode;
  inverted?: boolean;
}

/**
 * Conditionally renders children if a given feature toggle is enabled.
 */
export const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  children,
  fallback = null,
  inverted = false,
}) => {
  const isEnabled = useFeature(feature);
  const shouldRender = inverted ? !isEnabled : isEnabled;

  if (!shouldRender) {
    return fallback as React.ReactElement | null;
  }

  return children as React.ReactElement | null;
};
