import { describe, it, expect } from 'vitest';
import { fileExists, readWorkspaceFile } from '../test-helpers';

describe('Tier 1 - Feature 4: Design System 11 Component Public Exports (@universe/ui)', () => {
  const unaIndexPath = 'packages/ui/components/una/index.ts';

  it('F4-1: packages/ui/index.ts and una/index.ts should exist as entry points', () => {
    expect(fileExists('packages/ui/index.ts')).toBe(true);
    expect(fileExists(unaIndexPath)).toBe(true);
  });

  it('F4-2: una/index.ts should export Button and Modal components', () => {
    const content = readWorkspaceFile(unaIndexPath);

    expect(content).toMatch(/export\s*\*\s*from\s*['"]\.\/Button['"]/);
    expect(content).toMatch(/export\s*\*\s*from\s*['"]\.\/Modal['"]/);
  });

  it('F4-3: una/index.ts should export ProgressBar and Tag components', () => {
    const content = readWorkspaceFile(unaIndexPath);

    expect(content).toMatch(/export\s*\*\s*from\s*['"]\.\/ProgressBar['"]/);
    expect(content).toMatch(/export\s*\*\s*from\s*['"]\.\/Tag['"]/);
  });

  it('F4-4: una/index.ts should export Select, Input, and Form components', () => {
    const content = readWorkspaceFile(unaIndexPath);

    expect(content).toMatch(/export\s*\*\s*from\s*['"]\.\/Select['"]/);
    expect(content).toMatch(/export\s*\*\s*from\s*['"]\.\/inputs['"]/);
    expect(content).toMatch(/export\s*\*\s*from\s*['"]\.\/Form['"]/);
  });

  it('F4-5: una/index.ts should export Spinner, Skeleton, Toast, and Empty components', () => {
    const content = readWorkspaceFile(unaIndexPath);

    expect(content).toMatch(/export\s*\*\s*from\s*['"]\.\/Spinner['"]/);
    expect(content).toMatch(/export\s*\*\s*from\s*['"]\.\/Skeleton['"]/);
    expect(content).toMatch(/export\s*\*\s*from\s*['"]\.\/Toast['"]/);
    expect(content).toMatch(/export\s*\*\s*from\s*['"]\.\/Empty['"]/);
  });

  it('F4-6: packages/ui package.json should expose "." and "./una" in exports field', () => {
    const pkg = JSON.parse(readWorkspaceFile('packages/ui/package.json'));

    expect(pkg.exports).toBeDefined();
    expect(pkg.exports['.']).toBe('./index.ts');
    expect(pkg.exports['./una']).toBe('./components/una/index.ts');
  });
});
