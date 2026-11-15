import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { withLanguage } from '@uni-hub/utils/test-utils';
import { DraftResults } from './DraftResults';

describe('draft compensation days', () => {
  it('shows the source weekday and parity for the selected candidate', () => {
    render(
      withLanguage(
        <DraftResults
          draft={{
            versionId: 'draft',
            diagnostics: { statesExplored: 1, timeMs: 1 },
            candidates: [
              {
                events: [],
                penaltyScore: 0,
                automaticMakeupDays: [
                  { date: '2026-09-12', sourceDate: '2026-12-14' },
                  { date: '2026-09-19', sourceDate: '2026-12-21' },
                ],
              },
            ],
          }}
          semesterStartDate="2026-09-07"
          selectedIndex={0}
          executionTimeMs={1}
          scheduledEventsCount={0}
          teachers={[]}
          academicGroups={[]}
          isPublished={false}
          isPublishing={false}
          isGenerating={false}
          onSelect={vi.fn()}
          onRegenerate={vi.fn()}
          onPublish={vi.fn()}
          onAdjust={vi.fn()}
        />,
      ),
    );

    const region = screen.getByRole('region', { name: 'Суботи відпрацювань' });
    const items = within(region).getAllByRole('listitem');

    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('2026-09-12');
    expect(items[0]).toHaveTextContent('чисельник');
    expect(items[0]).toHaveTextContent('2026-12-14');
    expect(items[1]).toHaveTextContent('знаменник');
    expect(items[1]).toHaveTextContent('2026-12-21');
  });
});
