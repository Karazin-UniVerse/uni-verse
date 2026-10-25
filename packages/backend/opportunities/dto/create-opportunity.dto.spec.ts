import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { OpportunityLifecycleState, PaymentType } from '@universe/database';
import { CreateOpportunityDto } from './create-opportunity.dto';

describe('CreateOpportunityDto', () => {
  const validPayload = {
    title: 'Research assistant',
    description: 'Research project',
    ownerContactInfo: '@research_lab',
    paymentType: PaymentType.UNPAID,
  };

  it.each([undefined, ...Object.values(OpportunityLifecycleState)])(
    'accepts lifecycleState %s',
    (lifecycleState) => {
      const dto = plainToInstance(CreateOpportunityDto, {
        ...validPayload,
        lifecycleState,
      });

      expect(validateSync(dto)).toEqual([]);
    },
  );

  it.each([null, 'INVALID'])('rejects lifecycleState %s', (lifecycleState) => {
    const dto = plainToInstance(CreateOpportunityDto, {
      ...validPayload,
      lifecycleState,
    });

    expect(validateSync(dto)).toEqual([
      expect.objectContaining({
        property: 'lifecycleState',
        constraints: { isEnum: expect.any(String) },
      }),
    ]);
  });
});
