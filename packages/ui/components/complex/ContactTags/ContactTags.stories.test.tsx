import { composeStories } from '@storybook/react-vite';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as stories from './ContactTags.stories';

const { Matrix } = composeStories(stories);

describe('ContactTags stories', () => {
  it('should show all contact examples together in the overview', () => {
    render(<Matrix />);

    const table = within(screen.getByRole('table'));
    const defaultRow = within(table.getByRole('row', { name: /Default/ }));
    const emailOnlyRow = within(table.getByRole('row', { name: /Profile email only/ }));
    const phoneRow = within(table.getByRole('row', { name: /Phone/ }));
    const longContactRow = within(table.getByRole('row', { name: /Long contact/ }));

    expect(defaultRow.getByTitle('Електронна пошта')).toHaveTextContent('student@example.com');
    expect(defaultRow.getByTitle('Альтернативний контакт')).toHaveTextContent('@student_dev');
    expect(emailOnlyRow.getByTitle('Електронна пошта')).toHaveTextContent('student@example.com');
    expect(emailOnlyRow.queryByTitle('Альтернативний контакт')).not.toBeInTheDocument();
    expect(phoneRow.getByTitle('Альтернативний контакт')).toHaveTextContent('+380671234567');
    expect(longContactRow.getByTitle('Альтернативний контакт')).toHaveTextContent(
      'Please contact the department reception for further information about this opportunity.',
    );
  });
});
