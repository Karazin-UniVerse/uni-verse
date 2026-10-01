import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  FeatureToggleProvider,
  useFeature,
  useFeatures,
  useFeatureControls,
  FeatureGate,
  DevFeaturePanel,
} from './index';

describe('FeatureToggleContext and Components', () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_FEATURE_MOODLE;
    delete process.env.NEXT_PUBLIC_FEATURE_EDEAN;
    delete process.env.NEXT_PUBLIC_FEATURE_OPPORTUNITIES;
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_FEATURE_MOODLE;
    delete process.env.NEXT_PUBLIC_FEATURE_EDEAN;
    delete process.env.NEXT_PUBLIC_FEATURE_OPPORTUNITIES;
  });

  it('renders children with default feature flags in SSR', () => {
    const TestConsumer = () => {
      const flags = useFeatures();

      return React.createElement(
        'div',
        null,
        React.createElement('span', { id: 'moodle' }, String(flags.isMoodleIntegrationEnabled)),
        React.createElement('span', { id: 'edean' }, String(flags.isEDeanEnabled)),
        React.createElement('span', { id: 'opps' }, String(flags.isOpportunitiesPlatformEnabled)),
      );
    };

    const tree = React.createElement(
      FeatureToggleProvider,
      null,
      React.createElement(TestConsumer),
    );

    const html = renderToString(tree);

    expect(html).toContain('id="moodle">false</span>');
    expect(html).toContain('id="edean">true</span>');
    expect(html).toContain('id="opps">false</span>');
  });

  it('applies initialFlags overrides correctly', () => {
    const TestConsumer = () => {
      const isMoodle = useFeature('isMoodleIntegrationEnabled');
      const isEDean = useFeature('isEDeanEnabled');

      return React.createElement(
        'div',
        null,
        React.createElement('span', { id: 'moodle' }, String(isMoodle)),
        React.createElement('span', { id: 'edean' }, String(isEDean)),
      );
    };

    const tree = React.createElement(
      FeatureToggleProvider,
      { initialFlags: { isMoodleIntegrationEnabled: true, isEDeanEnabled: false } },
      React.createElement(TestConsumer),
    );

    const html = renderToString(tree);

    expect(html).toContain('id="moodle">true</span>');
    expect(html).toContain('id="edean">false</span>');
  });

  it('FeatureGate conditionally renders based on flag state', () => {
    const tree = React.createElement(
      FeatureToggleProvider,
      { initialFlags: { isMoodleIntegrationEnabled: false, isEDeanEnabled: true } },
      React.createElement(
        'div',
        null,
        React.createElement(
          FeatureGate,
          { feature: 'isEDeanEnabled' },
          React.createElement('span', { id: 'edean-active' }, 'Schedule Available'),
        ),
        React.createElement(
          FeatureGate,
          {
            feature: 'isMoodleIntegrationEnabled',
            fallback: React.createElement('span', { id: 'moodle-disabled' }, 'Moodle Offline'),
          },
          React.createElement('span', { id: 'moodle-active' }, 'Grades Available'),
        ),
      ),
    );

    const html = renderToString(tree);

    expect(html).toContain('Schedule Available');
    expect(html).toContain('Moodle Offline');
    expect(html).not.toContain('Grades Available');
  });

  it('FeatureGate supports inverted prop', () => {
    const tree = React.createElement(
      FeatureToggleProvider,
      { initialFlags: { isOpportunitiesPlatformEnabled: false } },
      React.createElement(
        FeatureGate,
        { feature: 'isOpportunitiesPlatformEnabled', inverted: true },
        React.createElement('span', { id: 'coming-soon' }, 'Opportunities Coming Soon'),
      ),
    );

    const html = renderToString(tree);

    expect(html).toContain('Opportunities Coming Soon');
  });

  it('useFeatureControls returns defaults and helper methods', () => {
    const TestConsumer = () => {
      const controls = useFeatureControls();

      return React.createElement(
        'div',
        null,
        React.createElement('span', { id: 'is-overridden' }, String(controls.isOverridden())),
        React.createElement(
          'span',
          { id: 'has-override-fn' },
          String(typeof controls.setFeatureOverride === 'function'),
        ),
        React.createElement(
          'span',
          { id: 'has-reset-fn' },
          String(typeof controls.resetFeatureOverrides === 'function'),
        ),
      );
    };

    const tree = React.createElement(
      FeatureToggleProvider,
      null,
      React.createElement(TestConsumer),
    );

    const html = renderToString(tree);

    expect(html).toContain('id="is-overridden">false</span>');
    expect(html).toContain('id="has-override-fn">true</span>');
    expect(html).toContain('id="has-reset-fn">true</span>');
  });

  it('renders DevFeaturePanel floating trigger button in SSR', () => {
    const tree = React.createElement(
      FeatureToggleProvider,
      null,
      React.createElement(DevFeaturePanel),
    );

    const html = renderToString(tree);

    expect(html).toContain('Toggles');
  });
});
