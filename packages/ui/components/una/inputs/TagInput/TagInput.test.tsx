import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TagInput } from './TagInput';
import type { TagInputProps } from './TagInput.types';

function ControlledTagInput({
  initialValue = [],
  ...props
}: Omit<TagInputProps, 'value' | 'onChange' | 'removeLabel'> & {
  initialValue?: string[];
  removeLabel?: string;
}): React.ReactElement {
  const [value, setValue] = useState<string[]>(initialValue);

  return (
    <TagInput
      {...props}
      removeLabel={props.removeLabel ?? 'Remove tag'}
      value={value}
      onChange={setValue}
    />
  );
}

describe('UNA TagInput Component', () => {
  it('should add a normalized tag on Enter and clear the field', async () => {
    const user = userEvent.setup();

    render(<ControlledTagInput />);

    const input = screen.getByRole('combobox');

    await user.type(input, '  React   Native {Enter}');

    expect(screen.getByText('react native')).toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  it('should add a new tag on comma and clear the field', async () => {
    const user = userEvent.setup();

    render(<ControlledTagInput />);

    const input = screen.getByRole('combobox');

    await user.type(input, 'vue,');

    expect(screen.getByRole('button', { name: 'Remove tag vue' })).toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  it('should add a tag on comma and ignore duplicates', async () => {
    const user = userEvent.setup();

    render(<ControlledTagInput initialValue={['react']} />);

    await user.type(screen.getByRole('combobox'), 'React,');

    expect(screen.getAllByText('react')).toHaveLength(1);
  });

  it('should remove the last tag on Backspace in an empty field', async () => {
    const user = userEvent.setup();

    render(<ControlledTagInput initialValue={['one', 'two']} />);

    await user.type(screen.getByRole('combobox'), '{Backspace}');

    expect(screen.queryByText('two')).not.toBeInTheDocument();
    expect(screen.getByText('one')).toBeInTheDocument();
  });

  it('should remove a tag with its labelled remove button', async () => {
    const user = userEvent.setup();

    render(<ControlledTagInput initialValue={['react']} removeLabel="Delete" />);

    await user.click(screen.getByRole('button', { name: 'Delete react' }));

    expect(screen.queryByText('react')).not.toBeInTheDocument();
  });

  it('should stop accepting input when the tag limit is reached', () => {
    render(<ControlledTagInput initialValue={['a1', 'b2']} maxTags={2} />);

    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('should focus the enabled input after removing a chip at the tag limit', async () => {
    const user = userEvent.setup();

    render(<ControlledTagInput initialValue={['react', 'typescript']} maxTags={2} />);

    const input = screen.getByRole('combobox');

    expect(input).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Remove tag typescript' }));

    expect(input).toBeEnabled();
    expect(input).toHaveFocus();
    await user.keyboard('vue{Enter}');
    expect(screen.getByRole('button', { name: 'Remove tag vue' })).toBeInTheDocument();
  });

  it('should show only one option for suggestions equal after normalization', async () => {
    const user = userEvent.setup();
    const loadSuggestions = vi.fn().mockResolvedValue(['React', ' react ', 'reactive']);

    render(<ControlledTagInput loadSuggestions={loadSuggestions} debounceMs={0} />);

    await user.type(screen.getByRole('combobox'), 'rea');
    await screen.findByRole('option', { name: 'reactive' });

    expect(screen.getAllByRole('option', { name: 'react' })).toHaveLength(1);
  });

  it('should not request suggestions below the minimum query length', async () => {
    const user = userEvent.setup();
    const loadSuggestions = vi.fn().mockResolvedValue([]);

    render(<ControlledTagInput loadSuggestions={loadSuggestions} debounceMs={0} />);

    await user.type(screen.getByRole('combobox'), 're');

    expect(loadSuggestions).not.toHaveBeenCalled();
  });

  it('should suggest existing tags and offer to create a new one', async () => {
    const user = userEvent.setup();
    const loadSuggestions = vi.fn().mockResolvedValue(['react', 'reactive']);

    render(
      <ControlledTagInput
        loadSuggestions={loadSuggestions}
        debounceMs={0}
        formatCreateLabel={(tag) => `Create ${tag}`}
      />,
    );

    await user.type(screen.getByRole('combobox'), 'rea');

    expect(await screen.findByRole('option', { name: 'react' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'reactive' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Create rea' })).toBeInTheDocument();
    expect(loadSuggestions).toHaveBeenCalledWith('rea');
  });

  it('should add a suggestion on mouse click and close the listbox', async () => {
    const user = userEvent.setup();
    const loadSuggestions = vi.fn().mockResolvedValue(['react']);

    render(<ControlledTagInput loadSuggestions={loadSuggestions} debounceMs={0} />);

    await user.type(screen.getByRole('combobox'), 'rea');

    const option = await screen.findByRole('option', { name: 'react' });

    await user.click(within(option).getByRole('button', { name: 'react' }));

    expect(screen.getByRole('button', { name: 'Remove tag react' })).toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('should select a suggestion with the keyboard', async () => {
    const user = userEvent.setup();
    const loadSuggestions = vi.fn().mockResolvedValue(['react']);

    render(<ControlledTagInput loadSuggestions={loadSuggestions} debounceMs={0} />);

    await user.type(screen.getByRole('combobox'), 'rea');
    await screen.findByRole('option', { name: 'react' });
    await user.keyboard('{ArrowDown}{Enter}');

    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('should close the suggestion list on Escape without propagating', async () => {
    const user = userEvent.setup();
    const loadSuggestions = vi.fn().mockResolvedValue(['react']);
    const parentEscapeHandler = vi.fn();

    render(
      <div
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            parentEscapeHandler();
          }
        }}
      >
        <ControlledTagInput loadSuggestions={loadSuggestions} debounceMs={0} />
      </div>,
    );

    await user.type(screen.getByRole('combobox'), 'rea');
    await screen.findByRole('listbox');
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(parentEscapeHandler).not.toHaveBeenCalled();
  });

  it('should propagate Escape to parent when the suggestion panel is not visible', async () => {
    const user = userEvent.setup();
    const parentEscapeHandler = vi.fn();

    render(
      <div
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            parentEscapeHandler();
          }
        }}
      >
        <ControlledTagInput />
      </div>,
    );

    const input = screen.getByRole('combobox');

    await user.click(input);
    await user.keyboard('{Escape}');

    expect(parentEscapeHandler).toHaveBeenCalledTimes(1);
  });

  it('should not add an open suggestion after the field becomes disabled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const loadSuggestions = vi.fn().mockResolvedValue(['react']);
    const props: TagInputProps = {
      removeLabel: 'Remove',
      value: [],
      onChange,
      loadSuggestions,
      debounceMs: 0,
    };
    const { rerender } = render(<TagInput {...props} />);

    await user.type(screen.getByRole('combobox'), 'rea');
    await screen.findByRole('option', { name: 'react' });

    rerender(<TagInput {...props} disabled />);

    const option = screen.getByRole('option', { name: 'react' });

    await user.click(within(option).getByRole('button', { name: 'react' }));

    expect(screen.getByRole('combobox')).toBeDisabled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it.each([
    { key: 'Enter', keyCode: 13, isComposing: true },
    { key: ',', keyCode: 188, isComposing: true },
    { key: 'Enter', keyCode: 229, isComposing: false },
  ])('should preserve composed text for $key with keyCode $keyCode', (keyboardEvent) => {
    const onChange = vi.fn();

    render(<TagInput removeLabel="Remove" value={[]} onChange={onChange} />);

    const input = screen.getByRole('combobox');

    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.keyDown(input, keyboardEvent);

    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveValue('test');
  });

  it('should exclude suggestions longer than maxTagLength', async () => {
    const user = userEvent.setup();
    const loadSuggestions = vi.fn().mockResolvedValue(['tagged', 'verylongtagnameexceedinglimit']);

    render(
      <ControlledTagInput loadSuggestions={loadSuggestions} debounceMs={0} maxTagLength={10} />,
    );

    await user.type(screen.getByRole('combobox'), 'tag');
    await screen.findByRole('option', { name: 'tagged' });

    expect(
      screen.queryByRole('option', { name: 'verylongtagnameexceedinglimit' }),
    ).not.toBeInTheDocument();
  });

  it('should render option buttons with tabIndex -1 so they do not take tab focus', async () => {
    const user = userEvent.setup();
    const loadSuggestions = vi.fn().mockResolvedValue(['react']);

    render(<ControlledTagInput loadSuggestions={loadSuggestions} debounceMs={0} />);

    await user.type(screen.getByRole('combobox'), 'rea');

    const option = await screen.findByRole('option', { name: 'react' });
    const optionButton = within(option).getByRole('button', { name: 'react' });

    expect(optionButton).toHaveAttribute('tabIndex', '-1');
  });
});
