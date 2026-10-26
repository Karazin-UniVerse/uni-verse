import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { withLanguage } from '@uni-hub/utils/test-utils';
import { OpportunityDetailView } from './OpportunityDetailView';
import { buildOpportunity } from '../test-utils';

describe('OpportunityDetailView resubmission', () => {
  it.each(['', '   ', '@organizer'])(
    'should show profile email and only a supplied alternative contact %j',
    (ownerContactInfo) => {
      localStorage.setItem('universe-lang', 'uk');
      render(
        withLanguage(
          <OpportunityDetailView
            opportunity={{
              ...buildOpportunity('contact-1'),
              owner: { id: 'owner-1', name: 'Organizer', email: 'profile@example.com' },
              ownerContactInfo,
            }}
            userId="candidate"
            onBack={vi.fn()}
            onSendToReview={vi.fn()}
            onLifecycleChange={vi.fn()}
            onOpenApply={vi.fn()}
          />,
        ),
      );

      expect(screen.getByText('profile@example.com')).toBeInTheDocument();
      expect(screen.getByText('Електронна пошта:')).toBeInTheDocument();

      if (ownerContactInfo.trim()) {
        expect(screen.getByText('@organizer')).toBeInTheDocument();
        expect(screen.getByText('Альтернативний контакт:')).toBeInTheDocument();
      } else {
        expect(screen.queryByText('Альтернативний контакт:')).not.toBeInTheDocument();
      }
    },
  );

  it('should keep unchanged revisions disabled and explain the required edit', async () => {
    const onSendToReview = vi.fn();
    const user = userEvent.setup();

    localStorage.setItem('universe-lang', 'uk');
    render(
      withLanguage(
        <OpportunityDetailView
          opportunity={{ ...buildOpportunity('revision-1'), status: 'REQUIRES_CHANGES' }}
          userId="owner-1"
          onBack={vi.fn()}
          onSendToReview={onSendToReview}
          onLifecycleChange={vi.fn()}
          onOpenApply={vi.fn()}
        />,
      ),
    );

    const button = screen.getByRole('button', { name: 'Надіслати на модерацію' });

    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription(
      'Перед повторним надсиланням змініть назву, опис, контакти або умови оплати можливості.',
    );
    await user.click(button);
    expect(onSendToReview).not.toHaveBeenCalled();
  });

  it.each(['DRAFT', 'REQUIRES_CHANGES'] as const)(
    'should allow submitting %s when revisions are satisfied',
    async (status) => {
      const onSendToReview = vi.fn();
      const user = userEvent.setup();

      localStorage.setItem('universe-lang', 'uk');
      render(
        withLanguage(
          <OpportunityDetailView
            opportunity={{ ...buildOpportunity('revision-1'), status, canResubmit: true }}
            userId="owner-1"
            onBack={vi.fn()}
            onSendToReview={onSendToReview}
            onLifecycleChange={vi.fn()}
            onOpenApply={vi.fn()}
          />,
        ),
      );
      await user.click(screen.getByRole('button', { name: 'Надіслати на модерацію' }));
      expect(onSendToReview).toHaveBeenCalledWith('revision-1');
    },
  );
});
