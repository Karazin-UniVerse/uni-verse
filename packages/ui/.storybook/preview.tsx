import '../vars.scss';
import React from 'react';
import type { Decorator, Preview } from '@storybook/react-vite';
import { APP_THEMES, THEME_COLOR_SCHEME, type AppTheme } from '@universe/core/constants/themes';

const THEME_TITLES: Record<AppTheme, string> = {
  light: 'Light',
  dark: 'Dark',
  cyberpunk: 'Cyberpunk',
  karazinClassic: 'Karazin Classic',
  universeSpace: 'UniVerse Space',
  karazinGold: 'Karazin Gold',
};

const preview: Preview = {
  parameters: {
    options: {
      storySort: {
        order: ['Una', 'Complex'],
      },
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo',
    },
  },
};

export default preview;

// Theme toolbar -------------------------------------------------------------
export const globalTypes = {
  theme: {
    name: 'Theme',
    description: 'Global theme for components',
    defaultValue: 'light',
    toolbar: {
      icon: 'circlehollow',
      items: APP_THEMES.map((theme: AppTheme) => ({ value: theme, title: THEME_TITLES[theme] })),
    },
  },
};

export const decorators: Decorator[] = [
  (Story, context) => {
    const theme = (context.globals?.theme as AppTheme | undefined) ?? 'light';

    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      document.documentElement.setAttribute('data-color-scheme', THEME_COLOR_SCHEME[theme]);
    }

    return <Story />;
  },
];
