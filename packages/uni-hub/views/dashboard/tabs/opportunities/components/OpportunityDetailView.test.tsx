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

  it('allows owner to edit a PUBLISHED opportunity while hiding draft-only actions', async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();
    const publishedOpportunity = {
      ...buildOpportunity('published-1'),
      status: 'PUBLISHED' as const,
    };

    localStorage.setItem('universe-lang', 'uk');
    render(
      withLanguage(
        <OpportunityDetailView
          opportunity={publishedOpportunity}
          userId="owner-1"
          onBack={vi.fn()}
          onSendToReview={vi.fn()}
          onOpenApply={vi.fn()}
          onEdit={onEdit}
          onDelete={vi.fn()}
        />,
      ),
    );

    const editBtn = screen.getByRole('button', { name: 'Редагувати' });

    expect(editBtn).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Надіслати на модерацію' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Видалити' })).not.toBeInTheDocument();

    await user.click(editBtn);
    expect(onEdit).toHaveBeenCalledWith(publishedOpportunity);
  });

  it.each(['READY_FOR_REVIEW', 'REJECTED'] as const)(
    'hides edit button for owner when opportunity status is %s',
    (status) => {
      localStorage.setItem('universe-lang', 'uk');
      render(
        withLanguage(
          <OpportunityDetailView
            opportunity={{ ...buildOpportunity('opp-1'), status }}
            userId="owner-1"
            onBack={vi.fn()}
            onSendToReview={vi.fn()}
            onOpenApply={vi.fn()}
            onEdit={vi.fn()}
          />,
        ),
      );

      expect(screen.queryByRole('button', { name: 'Редагувати' })).not.toBeInTheDocument();
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

  it.each([
    ['DRAFT', true],
    ['REQUIRES_CHANGES', false],
  ] as const)('should show delete for %s only when it is a draft', (status, visible) => {
    localStorage.setItem('universe-lang', 'uk');
    render(
      withLanguage(
        <OpportunityDetailView
          opportunity={{ ...buildOpportunity('delete-1'), status }}
          userId="owner-1"
          onBack={vi.fn()}
          onSendToReview={vi.fn()}
          onOpenApply={vi.fn()}
          onDelete={vi.fn()}
        />,
      ),
    );

    expect(screen.queryByRole('button', { name: 'Видалити' }) !== null).toBe(visible);
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
            onOpenApply={vi.fn()}
          />,
        ),
      );
      await user.click(screen.getByRole('button', { name: 'Надіслати на модерацію' }));
      expect(onSendToReview).toHaveBeenCalledWith('revision-1');
    },
  );
});
