import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ConnectMoodleTab } from './ConnectMoodleTab';

describe('ConnectMoodleTab component', () => {
  it('renders hero title and feature cards', () => {
    const html = renderToString(
      React.createElement(ConnectMoodleTab, {
        onConnect: vi.fn(),
      }),
    );

    expect(html).toContain('Підключення акаунту Moodle LMS');
    expect(html).toContain('Підключити Moodle зараз');
    expect(html).toContain('Синхронізація оцінок');
    expect(html).toContain('Дедлайни та завдання');
    expect(html).toContain('Матеріали та курси');
  });
});
