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

  it('should wrap Tab to first element when focus is on a non-tabbable element at the end of the container', async () => {
    const trailingPanel = document.createElement('div');

    trailingPanel.tabIndex = -1;
    container.appendChild(trailingPanel);

    const ref = { current: container };

    renderHook(() => useFocusTrap(ref, { enabled: true }));

    await new Promise((resolve) => requestAnimationFrame(resolve));
    trailingPanel.focus();
    expect(document.activeElement).toBe(trailingPanel);

    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });

    document.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(btn1);
  });

  it('should wrap Shift+Tab to last element when focus is on a non-tabbable element before any tabbable child', async () => {
    const leadingPanel = document.createElement('div');

    leadingPanel.tabIndex = -1;
    container.insertBefore(leadingPanel, btn1);

    const ref = { current: container };

    renderHook(() => useFocusTrap(ref, { enabled: true }));

    await new Promise((resolve) => requestAnimationFrame(resolve));
    leadingPanel.focus();
    expect(document.activeElement).toBe(leadingPanel);

    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });

    document.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(btn2);
  });

  it('should keep default Tab/Shift+Tab order when a tabbable element exists in that direction from a non-tabbable element', async () => {
    const middlePanel = document.createElement('div');

    middlePanel.tabIndex = -1;
    container.insertBefore(middlePanel, btn2);

    const ref = { current: container };

    renderHook(() => useFocusTrap(ref, { enabled: true }));

    await new Promise((resolve) => requestAnimationFrame(resolve));
    middlePanel.focus();

    const forwardEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });

    document.dispatchEvent(forwardEvent);
    expect(forwardEvent.defaultPrevented).toBe(false);

    const backwardEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });

    document.dispatchEvent(backwardEvent);
    expect(backwardEvent.defaultPrevented).toBe(false);
  });
});
