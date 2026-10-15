import type { Opportunity } from '@core/types/opportunities';

export function buildOpportunity(id: string): Opportunity {
  return {
    id,
    title: `Opportunity ${id}`,
    description: 'Description',
    ownerContactInfo: 'owner@example.com',
    status: 'READY_FOR_REVIEW',
    lifecycleState: 'START',
    paymentType: 'UNPAID',
    ownerId: 'owner-1',
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
  };
}
