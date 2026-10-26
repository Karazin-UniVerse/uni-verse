import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { withLanguage } from '@uni-hub/utils/test-utils';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { Opportunity } from '@core/types/opportunities';
import { buildOpportunity } from '../test-utils';
import { OpportunityCatalogMetaRow } from './OpportunityCatalogMetaRow';

function CatalogContacts({ opportunity }: { opportunity: Opportunity }): React.ReactElement {
  const { formatMessage } = useLanguage();

  return <OpportunityCatalogMetaRow opportunity={opportunity} formatMessage={formatMessage} />;
}

describe('OpportunityCatalogMetaRow contacts', () => {
  it.each(['', '   ', '@organizer'])(
    'should keep the profile email with alternative contact %j',
    (ownerContactInfo) => {
      render(
        withLanguage(
          <CatalogContacts
            opportunity={{
              ...buildOpportunity('contact-1'),
              owner: { id: 'owner-1', name: 'Organizer', email: 'profile@example.com' },
              ownerContactInfo,
            }}
          />,
        ),
      );

      expect(screen.getByText('profile@example.com')).toBeInTheDocument();

      if (ownerContactInfo.trim()) {
        expect(screen.getByText('@organizer')).toBeInTheDocument();
      } else {
        expect(screen.queryByTitle('Альтернативний контакт')).not.toBeInTheDocument();
      }
    },
  );
});
