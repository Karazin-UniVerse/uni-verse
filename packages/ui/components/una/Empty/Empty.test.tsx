import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Empty } from './Empty';

describe('UNA Empty Component', () => {
  it('should render default description when none is provided', () => {
    const html = renderToString(<Empty />);

    expect(html).toContain('Нет данных');
    expect(html).toContain('<svg');
  });

  it('should render custom description text', () => {
    const html = renderToString(<Empty description="Список курсів порожній" />);

    expect(html).toContain('Список курсів порожній');
  });
});
