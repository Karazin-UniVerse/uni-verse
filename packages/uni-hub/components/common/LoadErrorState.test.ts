import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { LanguageProvider } from '@uni-hub/i18n/LanguageContext';
import { LoadErrorState } from './LoadErrorState';
import { noop } from '@core/utils/fn';

describe('LoadErrorState', () => {
  it('shows the failure message and a retry button', () => {
    const html = renderToString(
      React.createElement(
        LanguageProvider,
        null,
        React.createElement(LoadErrorState, { onRetry: noop }),
      ),
    );

    expect(html).toContain('Не вдалося завантажити дані');
    expect(html).toContain('Спробувати знову');
  });
});
