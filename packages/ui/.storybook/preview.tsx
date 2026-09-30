import '../vars.scss';
import React from 'react';
import type { Decorator, Preview } from '@storybook/react-vite';

const preview: Preview = {
  parameters: {
    options: {
      storySort: {
        order: ['Components', 'Complex'],
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
      items: [
        { value: 'light', title: 'Light' },
        { value: 'dark', title: 'Dark' },
        { value: 'cyberpunk', title: 'Cyberpunk' },
      ],
    },
  },
};

export const decorators: Decorator[] = [
  (Story, context) => {
    const theme = (context.globals?.theme as string) ?? 'light';

    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }

    return <Story />;
  },
];
