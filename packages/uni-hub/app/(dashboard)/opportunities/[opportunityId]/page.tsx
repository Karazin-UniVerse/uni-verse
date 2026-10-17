'use client';

import { useParams } from 'next/navigation';
import { OpportunityDetailPage } from '@uni-hub/views/dashboard/tabs/opportunities';

export default function Page() {
  const params = useParams<{ opportunityId: string }>();

  return <OpportunityDetailPage opportunityId={params.opportunityId} />;
}
