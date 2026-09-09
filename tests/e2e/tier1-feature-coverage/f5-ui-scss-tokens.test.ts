import { describe, it, expect } from 'vitest';
import { fileExists, readWorkspaceFile, readJsonFile } from '../test-helpers';

describe('Tier 1 - Feature 5: SCSS Design Tokens Public Exports (@universe/ui)', () => {
  it('F5-1: packages/ui/vars.scss file must exist and contain design tokens', () => {
    expect(fileExists('packages/ui/vars.scss')).toBe(true);
    const content = readWorkspaceFile('packages/ui/vars.scss');

    expect(content.length).toBeGreaterThan(100);
    expect(content).toMatch(/\$|--una-/);
  });

  it('F5-2: packages/ui/breakpoints.scss file must exist and define responsive breakpoints', () => {
    expect(fileExists('packages/ui/breakpoints.scss')).toBe(true);
    const content = readWorkspaceFile('packages/ui/breakpoints.scss');

    expect(content).toMatch(/breakpoint|screen|mobile|tablet|desktop|\$bp/i);
  });

  it('F5-3: packages/ui/package.json must expose ./vars.scss in exports field', () => {
    const pkg = readJsonFile<{ exports?: Record<string, string> }>('packages/ui/package.json');

    expect(pkg.exports).toBeDefined();
    expect(pkg.exports?.['./vars.scss']).toBe('./vars.scss');
  });

  it('F5-4: packages/ui/package.json must expose ./breakpoints.scss in exports field', () => {
    const pkg = readJsonFile<{ exports?: Record<string, string> }>('packages/ui/package.json');

    expect(pkg.exports).toBeDefined();
    expect(pkg.exports?.['./breakpoints.scss']).toBe('./breakpoints.scss');
  });

  it('F5-5: SCSS tokens should include primary color palette and spacing variables', () => {
    const content = readWorkspaceFile('packages/ui/vars.scss');

    expect(content).toMatch(/primary|color|space|radius|font/i);
  });
});
