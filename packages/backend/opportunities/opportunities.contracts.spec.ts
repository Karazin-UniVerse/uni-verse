import {
  ApplicationStatus,
  OpportunityLifecycleState,
  OpportunityStatus,
  PaymentType,
} from '@universe/database';
import {
  OPPORTUNITY_APP_STATUS,
  OPPORTUNITY_LIFECYCLE,
  OPPORTUNITY_PAYMENT_TYPE,
  OPPORTUNITY_STATUS,
} from '@universe/core/constants/opportunities';

describe('opportunity contracts match the Prisma schema', () => {
  it.each([
    ['OpportunityStatus', OpportunityStatus, OPPORTUNITY_STATUS],
    [
      'OpportunityLifecycleState',
      OpportunityLifecycleState,
      OPPORTUNITY_LIFECYCLE,
    ],
    ['PaymentType', PaymentType, OPPORTUNITY_PAYMENT_TYPE],
    ['ApplicationStatus', ApplicationStatus, OPPORTUNITY_APP_STATUS],
  ])(
    '%s has the same values as the core constant',
    (_enumName, prismaEnum, coreConstant) => {
      expect(Object.values(prismaEnum).sort()).toEqual(
        Object.values(coreConstant).sort(),
      );
    },
  );
});
