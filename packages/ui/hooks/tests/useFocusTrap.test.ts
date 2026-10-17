import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFocusTrap } from '../useFocusTrap';

describe('useFocusTrap', () => {
  let container: HTMLDivElement;
  let btn1: HTMLButtonElement;
  let btn2: HTMLButtonElement;
  let outsideBtn: HTMLButtonElement;

  beforeEach(() => {
    container = document.createElement('div');
    btn1 = document.createElement('button');
    btn1.textContent = 'First';
    btn2 = document.createElement('button');
    btn2.textContent = 'Second';
    outsideBtn = document.createElement('button');
    outsideBtn.textContent = 'Outside';

    container.appendChild(btn1);
    container.appendChild(btn2);
    document.body.appendChild(outsideBtn);
    document.body.appendChild(container);

    outsideBtn.focus();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should export useFocusTrap function', () => {
    expect(typeof useFocusTrap).toBe('function');
  });

  it('should focus the first focusable element when enabled', async () => {
    const ref = { current: container };

    renderHook(() => useFocusTrap(ref, { enabled: true }));

    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(document.activeElement).toBe(btn1);
  });

  it('should wrap focus to first element when Tab is pressed on last element', async () => {
    const ref = { current: container };

    renderHook(() => useFocusTrap(ref, { enabled: true }));

    await new Promise((resolve) => requestAnimationFrame(resolve));
    btn2.focus();
    expect(document.activeElement).toBe(btn2);

    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });

    document.dispatchEvent(event);

    expect(document.activeElement).toBe(btn1);
  });

  it('should wrap focus to last element when Shift+Tab is pressed on first element', async () => {
    const ref = { current: container };

    renderHook(() => useFocusTrap(ref, { enabled: true }));

    await new Promise((resolve) => requestAnimationFrame(resolve));
    btn1.focus();
    expect(document.activeElement).toBe(btn1);

    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });

    document.dispatchEvent(event);

    expect(document.activeElement).toBe(btn2);
  });
});
