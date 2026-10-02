# Quality: Accessibility, SonarCloud, Runtime Compatibility

## Accessible interactive elements

- Never attach `onClick` to a `<div>` or `<span>`. Use a semantic `<button type="button">`.
- Use native `<dialog open ...>` instead of `<div role="dialog">` for popups and pickers.
- Toggles carry `aria-expanded={isOpen}`; popup triggers link to the popup with `aria-controls={popupId}`.
- Radio groups use `role="radiogroup"` with an `aria-label`.
- Every input has an associated label or an `aria-label`. Modal dialogs specify a `title` and an accessible close button.

## Modal lifecycle and focus trap

When implementing or changing a modal (for example `Modal.tsx`):

1. **Initial focus**: on open, move focus into the modal via `requestAnimationFrame` (first focusable child, or the dialog container itself with `tabIndex={-1}`).
2. **Focus Restoration**: save `document.activeElement` before opening and restore it when the modal closes.
3. **Topmost Escape**: with stacked modals or sheets, `Escape` closes ONLY the topmost one:

   ```ts
   if (event.key === 'Escape') {
     if (modalStack.at(-1) === modalId) {
       onCloseRef.current();
     }

     return;
   }
   ```

4. **Tab focus trap**: cycle Tab and Shift+Tab between `firstFocusable` and `lastElement`.

## SonarCloud rules

| Rule       | Requirement                           | Pattern to use                                                                                                            |
| :--------- | :------------------------------------ | :------------------------------------------------------------------------------------------------------------------------ |
| **S3358**  | No nested ternaries in JSX            | Extract nested conditional rendering into a `const emptyState = ...` before `return`.                                     |
| **S1854**  | No redundant assignments / dead store | Use an immutable `const` with a direct ternary instead of a `let` reassigned to a default.                                |
| **S4323**  | No redundant union types              | Avoid `string \| Breakpoint` when `Breakpoint` is already a subtype of `string`. Use overloads for type narrowing.        |
| **S7763**  | Clean re-exports                      | Avoid `import { X } from 'y'; export { X };`. Use `export { X } from 'y';` or `export * from 'y';`.                       |
| **S2245**  | No insecure PRNG                      | Never use `Math.random()` for keys, IDs, tokens or mock data. Use deterministic index math or `crypto.getRandomValues()`. |
| **S6847**  | Use native HTML elements              | Use `<dialog>` instead of `role="dialog"` on a `<div>`.                                                                   |
| **ES2022** | Modern array indexing                 | Prefer `array.at(-1)` over `array[array.length - 1]`.                                                                     |

When re-exporting shared types from a library or service, use `export * from '@universe/core/types'`. It avoids both ESLint `no-duplicate-imports` and Sonar S7763.

## Node.js 22+ type-stripping

TypeScript `enum` fails in Node strip-only mode (`SyntaxError: TypeScript enum is not supported in strip-only mode`). Use the const object plus type pattern:

```ts
export const Status = {
  Active: 'active',
  Archived: 'archived',
} as const;

export type Status = (typeof Status)[keyof typeof Status];
```
