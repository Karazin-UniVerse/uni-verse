import { describe, it, expect } from 'vitest';
import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MultiSelect } from './MultiSelect';
import type { MultiSelectGroup } from './MultiSelect.types';

type Fruit = 'APPLE' | 'PEAR' | 'KALE';

const GROUPS: MultiSelectGroup<Fruit>[] = [
  {
    label: 'Fruits',
    tone: 'success',
    options: [
      { value: 'APPLE', label: 'Apple' },
      { value: 'PEAR', label: 'Pear' },
    ],
  },
  { label: 'Vegetables', options: [{ value: 'KALE', label: 'Kale' }] },
];

function ControlledMultiSelect({
  disabled,
  initialValue = [],
}: {
  initialValue?: Fruit[];
  disabled?: boolean;
}): React.ReactElement {
  const [value, setValue] = useState<Fruit[]>(initialValue);

  return (
    <>
      <span data-testid="value">{value.join(',')}</span>
      <MultiSelect
        groups={GROUPS}
        value={value}
        onChange={setValue}
        placeholder="Pick items"
        removeLabel="Remove"
        disabled={disabled}
      />
    </>
  );
}

describe('UNA MultiSelect Component', () => {
  it('should list options grouped by category and keep selection in group order', async () => {
    const user = userEvent.setup();

    render(<ControlledMultiSelect />);

    const trigger = screen.getByRole('button', { name: 'Pick items' });

    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    const vegetables = screen.getByRole('group', { name: 'Vegetables' });

    await user.click(within(vegetables).getByRole('checkbox', { name: 'Kale' }));
    await user.click(
      within(screen.getByRole('group', { name: 'Fruits' })).getByRole('checkbox', {
        name: 'Apple',
      }),
    );

    expect(screen.getByTestId('value')).toHaveTextContent('APPLE,KALE');
  });

  it('should uncheck a selected option and remove a chip', async () => {
    const user = userEvent.setup();

    render(<ControlledMultiSelect initialValue={['PEAR', 'KALE']} />);

    await user.click(screen.getByRole('button', { name: 'Remove Kale' }));

    expect(screen.getByTestId('value').textContent).toBe('PEAR');

    await user.click(screen.getByRole('button', { name: 'Pick items' }));
    await user.click(screen.getByRole('checkbox', { name: 'Pear' }));

    expect(screen.getByTestId('value')).toBeEmptyDOMElement();
    expect(screen.queryByRole('button', { name: /^Remove/ })).not.toBeInTheDocument();
  });

  it('should close the panel on Escape and return focus to the trigger', async () => {
    const user = userEvent.setup();

    render(<ControlledMultiSelect />);

    const trigger = screen.getByRole('button', { name: 'Pick items' });

    await user.click(trigger);
    await user.click(screen.getByRole('checkbox', { name: 'Apple' }));
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('should block changes when disabled', () => {
    render(<ControlledMultiSelect initialValue={['APPLE']} disabled />);

    expect(screen.getByRole('button', { name: 'Pick items' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove Apple' })).toBeDisabled();
  });
});
