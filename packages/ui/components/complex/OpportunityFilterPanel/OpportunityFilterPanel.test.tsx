import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OpportunityFilterPanel } from './OpportunityFilterPanel';
import type {
  OpportunityFilterPanelLabels,
  OpportunityFilterValue,
} from './OpportunityFilterPanel.types';

const labels: OpportunityFilterPanelLabels = {
  open: 'Open filters',
  close: 'Close filters',
  title: 'Filters',
  paymentType: 'Payment',
  paymentAll: 'All',
  paymentPaid: 'Paid',
  paymentUnpaid: 'Unpaid',
  recruiting: 'Recruitment is underway',
  tags: 'Tags',
  tagsPlaceholder: 'Add a tag',
  removeTag: 'Remove',
  apply: 'Apply',
  formatCreateTag: (tag) => `Create ${tag}`,
};

const emptyValue: OpportunityFilterValue = { paymentType: '', isRecruiting: false, tags: [] };

describe('OpportunityFilterPanel', () => {
  it('should keep the panel closed until the trigger is clicked', async () => {
    const user = userEvent.setup();

    render(<OpportunityFilterPanel value={emptyValue} onApply={vi.fn()} labels={labels} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open filters' }));

    expect(screen.getByRole('dialog', { name: 'Filters' })).toBeInTheDocument();
  });

  it('should show the number of active filters on the trigger', () => {
    render(
      <OpportunityFilterPanel
        value={{ paymentType: 'PAID', isRecruiting: true, tags: ['react'] }}
        onApply={vi.fn()}
        labels={labels}
      />,
    );

    expect(screen.getByRole('button', { name: 'Open filters' })).toHaveTextContent('3');
  });

  it('should apply the draft only after pressing Apply and close the panel', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();

    render(<OpportunityFilterPanel value={emptyValue} onApply={onApply} labels={labels} />);

    await user.click(screen.getByRole('button', { name: 'Open filters' }));
    await user.click(screen.getByRole('checkbox', { name: 'Recruitment is underway' }));
    await user.type(screen.getByLabelText('Tags'), 'react{Enter}');

    expect(onApply).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onApply).toHaveBeenCalledWith({ paymentType: '', isRecruiting: true, tags: ['react'] });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it.each([
    { input: '3D', expectedTag: '3d' },
    { input: '  React   Native  ', expectedTag: 'react native' },
  ])(
    'should include the pending tag $input when Apply is clicked without Enter',
    async ({ input, expectedTag }) => {
      const user = userEvent.setup();
      const onApply = vi.fn();

      render(<OpportunityFilterPanel value={emptyValue} onApply={onApply} labels={labels} />);

      await user.click(screen.getByRole('button', { name: 'Open filters' }));
      await user.type(screen.getByLabelText('Tags'), input);
      await user.click(screen.getByRole('button', { name: 'Apply' }));

      expect(onApply).toHaveBeenCalledExactlyOnceWith({
        paymentType: '',
        isRecruiting: false,
        tags: [expectedTag],
      });
    },
  );

  it('should discard unapplied changes when the panel is reopened', async () => {
    const user = userEvent.setup();

    render(<OpportunityFilterPanel value={emptyValue} onApply={vi.fn()} labels={labels} />);

    await user.click(screen.getByRole('button', { name: 'Open filters' }));
    await user.click(screen.getByRole('checkbox', { name: 'Recruitment is underway' }));
    await user.click(screen.getByRole('button', { name: 'Close filters' }));
    await user.click(screen.getByRole('button', { name: 'Open filters' }));

    expect(screen.getByRole('checkbox', { name: 'Recruitment is underway' })).not.toBeChecked();
  });

  it('should include a composition completed after submission-related blur in the applied filters', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();

    render(<OpportunityFilterPanel value={emptyValue} onApply={onApply} labels={labels} />);
    await user.click(screen.getByRole('button', { name: 'Open filters' }));

    const input = screen.getByLabelText('Tags');
    const apply = screen.getByRole('button', { name: 'Apply' });

    await user.click(input);
    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: '日本語' } });
    await user.pointer({ target: apply, keys: '[MouseLeft>]' });
    expect(onApply).not.toHaveBeenCalled();
    fireEvent.compositionEnd(input, { data: '日本語' });
    await user.pointer({ target: apply, keys: '[/MouseLeft]' });

    expect(onApply).toHaveBeenCalledExactlyOnceWith({ ...emptyValue, tags: ['日本語'] });
  });
});
