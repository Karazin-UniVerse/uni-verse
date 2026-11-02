import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TagInput } from './TagInput';
import type { TagInputProps } from './TagInput.types';

function ControlledTagInput({
  initialValue = [],
  ...props
}: Omit<TagInputProps, 'value' | 'onChange'> & { initialValue?: string[] }): React.ReactElement {
  const [value, setValue] = useState<string[]>(initialValue);

  return <TagInput {...props} value={value} onChange={setValue} />;
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

  it('should close the suggestion list on Escape', async () => {
    const user = userEvent.setup();
    const loadSuggestions = vi.fn().mockResolvedValue(['react']);

    render(<ControlledTagInput loadSuggestions={loadSuggestions} debounceMs={0} />);

    await user.type(screen.getByRole('combobox'), 'rea');
    await screen.findByRole('listbox');
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
