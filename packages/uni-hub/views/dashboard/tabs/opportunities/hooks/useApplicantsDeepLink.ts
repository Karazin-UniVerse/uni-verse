import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Opportunity } from '@core/types/opportunities';

interface ApplicantsDeepLinkOptions {
  opportunity: Opportunity;
  userId: string | null;
  openApplicants: (opportunity: Opportunity) => void;
  closeApplicants: () => void;
}

export function useApplicantsDeepLink({
  opportunity,
  userId,
  openApplicants,
  closeApplicants,
}: ApplicantsDeepLinkOptions): void {
  const searchParams = useSearchParams();
  const handledRequest = useRef<string | null>(null);
  const request =
    searchParams.get('view') === 'applicants'
      ? `${opportunity.id}?${searchParams.toString()}`
      : null;

  useEffect(
    () => () => {
      handledRequest.current = null;
      closeApplicants();
    },
    [opportunity.id, opportunity.ownerId, userId, closeApplicants],
  );

  useEffect(() => {
    if (request === null) {
      handledRequest.current = null;

      return;
    }

    if (handledRequest.current !== request && userId === opportunity.ownerId) {
      handledRequest.current = request;
      openApplicants(opportunity);
    }
  }, [request, userId, opportunity, openApplicants]);
}
