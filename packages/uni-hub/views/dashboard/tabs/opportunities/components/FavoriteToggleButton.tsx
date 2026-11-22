'use client';

import React from 'react';
import { Star } from 'lucide-react';
import { Button } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';

export interface FavoriteToggleButtonProps {
  isFavorite: boolean;
  onToggle: () => void;
  disabled?: boolean;
  className?: string;
}

/** Toggles whether an opportunity is saved to favorites. */
export function FavoriteToggleButton({
  isFavorite,
  onToggle,
  className,
  disabled = false,
}: Readonly<FavoriteToggleButtonProps>): React.JSX.Element {
  const { formatMessage } = useLanguage();

  return (
    <Button
      variant="secondary"
      className={className}
      disabled={disabled}
      aria-label={formatMessage(
        isFavorite ? 'opportunities.favorites.remove' : 'opportunities.favorites.add',
      )}
      onClick={onToggle}
    >
      <Star size={18} fill={isFavorite ? 'currentColor' : 'none'} aria-hidden="true" />
    </Button>
  );
}
