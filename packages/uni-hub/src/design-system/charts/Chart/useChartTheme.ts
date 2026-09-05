import { useCallback, useEffect, useState } from 'react';

const CHART_TOKEN_KEYS = [
  '--chart-grid',
  '--chart-tick',
  '--chart-axis',
  '--chart-series-1',
  '--chart-series-2',
  '--chart-series-3',
  '--chart-series-4',
  '--chart-series-5',
] as const;

export type ChartThemeTokens = {
  themeKey: string;
  grid: string;
  tick: string;
  axis: string;
  series: string[];
};

const FALLBACK: ChartThemeTokens = {
  themeKey: 'light',
  grid: '#e9ecef',
  tick: '#868e96',
  axis: '#dee2e6',
  series: ['#164bd7', '#22c55e', '#f59e0b', '#ef4444', '#3466e7'],
};

function readThemeKey(): string {
  return document.documentElement.getAttribute('data-theme') || 'light';
}

function readVar(styles: CSSStyleDeclaration, name: string, fallback: string): string {
  const value = styles.getPropertyValue(name).trim();

  return value || fallback;
}

/**
 * Resolves chart CSS tokens to concrete colors for Recharts SVG attrs,
 * and re-reads them whenever `data-theme` changes.
 */
export function useChartTheme(container: HTMLElement | null): ChartThemeTokens {
  const [tokens, setTokens] = useState<ChartThemeTokens>(FALLBACK);

  const resolve = useCallback(() => {
    if (!container) return;

    const styles = getComputedStyle(container);

    setTokens({
      themeKey: readThemeKey(),
      grid: readVar(styles, CHART_TOKEN_KEYS[0], FALLBACK.grid),
      tick: readVar(styles, CHART_TOKEN_KEYS[1], FALLBACK.tick),
      axis: readVar(styles, CHART_TOKEN_KEYS[2], FALLBACK.axis),
      series: [
        readVar(styles, CHART_TOKEN_KEYS[3], FALLBACK.series[0]),
        readVar(styles, CHART_TOKEN_KEYS[4], FALLBACK.series[1]),
        readVar(styles, CHART_TOKEN_KEYS[5], FALLBACK.series[2]),
        readVar(styles, CHART_TOKEN_KEYS[6], FALLBACK.series[3]),
        readVar(styles, CHART_TOKEN_KEYS[7], FALLBACK.series[4]),
      ],
    });
  }, [container]);

  useEffect(() => {
    const handle = requestAnimationFrame(resolve);

    const observer = new MutationObserver(resolve);

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => {
      cancelAnimationFrame(handle);
      observer.disconnect();
    };
  }, [resolve]);

  return tokens;
}

/** Resolve `var(--token)` / raw color against a container's computed styles. */
export function resolveCssColor(
  container: HTMLElement | null,
  color: string | undefined,
  fallback: string,
): string {
  if (!color) return fallback;

  if (!container) return color.startsWith('var(') ? fallback : color;

  if (color.startsWith('var(')) {
    const match = color.match(/^var\(\s*([^),\s]+)/);

    if (!match) return fallback;

    const value = getComputedStyle(container).getPropertyValue(match[1]).trim();

    return value || fallback;
  }

  return color;
}
