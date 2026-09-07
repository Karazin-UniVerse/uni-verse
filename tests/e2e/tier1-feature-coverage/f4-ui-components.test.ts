import { describe, it, expect } from 'vitest';
import { fileExists, readWorkspaceFile } from '../test-helpers';

describe('Tier 1 - Feature 4: Design System 11 Component Public Exports (@universe/ui)', () => {
  it('F4-1: packages/ui/index.ts should exist as entry point', () => {
    expect(fileExists('packages/ui/index.ts')).toBe(true);
  });

  it('F4-2: packages/ui/index.ts should export Button and Modal components', async () => {
    const content = readWorkspaceFile('packages/ui/index.ts');

    expect(content).toMatch(/export\s*\{[^}]*\bButton\b[^}]*\}/);
    expect(content).toMatch(/export\s*\{[^}]*\bModal\b[^}]*\}/);
  });

  it('F4-3: packages/ui/index.ts should export ProgressBar and Tag components', async () => {
    const content = readWorkspaceFile('packages/ui/index.ts');

    expect(content).toMatch(/export\s*\{[^}]*\bProgressBar\b[^}]*\}/);
    expect(content).toMatch(/export\s*\{[^}]*\bTag\b[^}]*\}/);
  });

  it('F4-4: packages/ui/index.ts should export Select, Input, and Form components', async () => {
    const content = readWorkspaceFile('packages/ui/index.ts');

    expect(content).toMatch(/export\s*\{[^}]*\bSelect\b[^}]*\}/);
    expect(content).toMatch(/export\s*\{[^}]*(\bInput\b|TextInput as Input)[^}]*\}/);
    expect(content).toMatch(/export\s*\{[^}]*(\bForm\b|SimpleForm as Form)[^}]*\}/);
  });

  it('F4-5: packages/ui/index.ts should export Spinner, Skeleton, Toast, and Empty components', async () => {
    const content = readWorkspaceFile('packages/ui/index.ts');

    expect(content).toMatch(/export\s*\{[^}]*\bSpinner\b[^}]*\}/);
    expect(content).toMatch(/export\s*\{[^}]*\bSkeleton\b[^}]*\}/);
    expect(content).toMatch(/export\s*\{[^}]*\bToast\b[^}]*\}/);
    expect(content).toMatch(/export\s*\{[^}]*\bEmpty\b[^}]*\}/);
  });

  it('F4-6: packages/ui package.json should expose "." in exports field', () => {
    const pkg = JSON.parse(readWorkspaceFile('packages/ui/package.json'));

    expect(pkg.exports).toBeDefined();
    expect(pkg.exports['.']).toBe('./index.ts');
  });
});
