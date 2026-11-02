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

  it.each([null, 123, {}])(
    'should reject a non-string organizer contact %j',
    (ownerContactInfo) => {
      const dto = plainToInstance(CreateOpportunityDto, {
        ...validPayload,
        ownerContactInfo,
      });

      expect(validateSync(dto)).toEqual([
        expect.objectContaining({ property: 'ownerContactInfo' }),
      ]);
    },
  );

  it('should retain unrestricted organizer contact text', () => {
    const dto = plainToInstance(CreateOpportunityDto, {
      ...validPayload,
      ownerContactInfo: 'Contact our department reception',
    });

    expect(validateSync(dto)).toEqual([]);
  });

  it.each([undefined, '', '   '])(
    'should accept an optional organizer contact %s',
    (ownerContactInfo) => {
      const dto = plainToInstance(CreateOpportunityDto, {
        ...validPayload,
        ownerContactInfo,
      });

      expect(validateSync(dto)).toEqual([]);
    },
  );

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

  it('accepts paymentDetails: null', () => {
    const dto = plainToInstance(CreateOpportunityDto, {
      ...validPayload,
      paymentDetails: null,
    });

    expect(validateSync(dto)).toEqual([]);
  });

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
