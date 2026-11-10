import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { OpportunityTag } from '@core/constants/tags';
import type { MultiSelectGroup } from '../../una/inputs/MultiSelect';
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
  tagsPlaceholder: 'Select tags',
  removeTag: 'Remove',
  apply: 'Apply',
};

const tagGroups: MultiSelectGroup<OpportunityTag>[] = [
  {
    label: 'Field',
    options: [
      { value: 'IT', label: 'IT' },
      { value: 'LAW', label: 'Law' },
    ],
  },
];

const emptyValue: OpportunityFilterValue = { paymentType: '', isRecruiting: false, tags: [] };

describe('OpportunityFilterPanel', () => {
  it('should keep the panel closed until the trigger is clicked', async () => {
    const user = userEvent.setup();

    render(
      <OpportunityFilterPanel
        value={emptyValue}
        onApply={vi.fn()}
        labels={labels}
        tagGroups={tagGroups}
      />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open filters' }));

    expect(screen.getByRole('dialog', { name: 'Filters' })).toBeInTheDocument();
  });

  it('should show the number of active filters on the trigger', () => {
    render(
      <OpportunityFilterPanel
        value={{ paymentType: 'PAID', isRecruiting: true, tags: ['IT'] }}
        onApply={vi.fn()}
        labels={labels}
        tagGroups={tagGroups}
      />,
    );

    expect(screen.getByRole('button', { name: 'Open filters' })).toHaveTextContent('3');
  });

  it('should apply the draft only after pressing Apply and close the panel', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();

    render(
      <OpportunityFilterPanel
        value={emptyValue}
        onApply={onApply}
        labels={labels}
        tagGroups={tagGroups}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Open filters' }));
    await user.click(screen.getByRole('checkbox', { name: 'Recruitment is underway' }));
    await user.click(screen.getByRole('button', { name: 'Tags' }));
    await user.click(screen.getByRole('checkbox', { name: 'Law' }));

    expect(onApply).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onApply).toHaveBeenCalledExactlyOnceWith({
      paymentType: '',
      isRecruiting: true,
      tags: ['LAW'],
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should discard unapplied changes when the panel is reopened', async () => {
    const user = userEvent.setup();

    render(
      <OpportunityFilterPanel
        value={emptyValue}
        onApply={vi.fn()}
        labels={labels}
        tagGroups={tagGroups}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Open filters' }));
    await user.click(screen.getByRole('checkbox', { name: 'Recruitment is underway' }));
    await user.click(screen.getByRole('button', { name: 'Close filters' }));
    await user.click(screen.getByRole('button', { name: 'Open filters' }));

    expect(screen.getByRole('checkbox', { name: 'Recruitment is underway' })).not.toBeChecked();
  });
});
