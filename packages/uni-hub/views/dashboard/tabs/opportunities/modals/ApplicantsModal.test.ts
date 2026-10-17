import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { LanguageProvider } from '@uni-hub/i18n/LanguageContext';
import type { OpportunityApplication } from '@core/types/opportunities';
import { ApplicantsModal } from './ApplicantsModal';

describe('ApplicantsModal', () => {
  const mockApplication: OpportunityApplication = {
    id: 'app-1',
    opportunityId: 'opp-1',
    applicantId: 'user-2',
    applicantName: 'Student Name',
    contactInfo: '@student_tg',
    motivation: 'Motivated to participate',
    status: 'SUBMITTED',
    createdAt: '2026-10-01T11:00:00.000Z',
    updatedAt: '2026-10-01T11:00:00.000Z',
    applicant: {
      name: 'Student Name',
      email: 'student@example.com',
    },
  };

  it('renders both applicant email and direct contactInfo without masking', () => {
    const html = renderToString(
      React.createElement(
        LanguageProvider,
        null,
        React.createElement(ApplicantsModal, {
          open: true,
          onClose: () => {},
          loading: false,
          isError: false,
          onRetry: () => {},
          applications: [mockApplication],
          onUpdateStatus: () => {},
        }),
      ),
    );

    expect(html).toContain('student@example.com');
    expect(html).toContain('@student_tg');
    expect(html).toContain('Student Name');
  });
});
