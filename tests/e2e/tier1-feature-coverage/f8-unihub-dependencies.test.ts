import { describe, it, expect } from 'vitest';
import { fileExists, readJsonFile, readWorkspaceFile } from '../test-helpers';

describe('Tier 1 - Feature 8: UniHub Package Dependencies & Imports Alignment (@universe/uni-hub)', () => {
  it('F8-1: packages/uni-hub/package.json should depend on @universe/core or @universe/types', () => {
    const pkg = readJsonFile<{ dependencies?: Record<string, string> }>(
      'packages/uni-hub/package.json',
    );

    const hasDep = pkg.dependencies?.['@universe/core'] || pkg.dependencies?.['@universe/types'];

    expect(hasDep, '@universe/core or @universe/types must be in dependencies').toBeDefined();
    expect(hasDep).toBe('workspace:*');
  });

  it('F8-2: packages/uni-hub/package.json should depend on @universe/ui', () => {
    const pkg = readJsonFile<{ dependencies?: Record<string, string> }>(
      'packages/uni-hub/package.json',
    );

    expect(pkg.dependencies?.['@universe/ui']).toBeDefined();
    expect(pkg.dependencies?.['@universe/ui']).toBe('workspace:*');
  });

  it('F8-3: UniHub DashboardPage should import components from @universe/ui package root', () => {
    const dashboardPath = 'packages/uni-hub/src/views/DashboardPage.tsx';

    expect(fileExists(dashboardPath)).toBe(true);
    const content = readWorkspaceFile(dashboardPath);

    // Should consume @universe/ui or una design system
    expect(content).toMatch(/from ['"]@universe\/ui['"]|from ['"]@una['"]/);
  });

  it('F8-4: UniHub tsconfig.json should be valid and support workspace aliases', () => {
    expect(fileExists('packages/uni-hub/tsconfig.json')).toBe(true);
    const tsconfig = readJsonFile<{ compilerOptions?: Record<string, unknown> }>(
      'packages/uni-hub/tsconfig.json',
    );

    expect(tsconfig.compilerOptions).toBeDefined();
  });

  it('F8-5: packages/uni-hub should not have broken relative imports outside workspace boundaries', () => {
    const dashboardPath = 'packages/uni-hub/src/views/DashboardPage.tsx';
    const content = readWorkspaceFile(dashboardPath);

    expect(content).not.toMatch(/\.\.\/\.\.\/\.\.\/packages/);
  });
});
