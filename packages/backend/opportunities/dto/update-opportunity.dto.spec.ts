import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { OpportunityLifecycleState } from '@universe/database';
import { UpdateOpportunityDto } from './update-opportunity.dto';

describe('UpdateOpportunityDto', () => {
  it.each([null, 123, {}])(
    'should reject a non-string organizer contact %j',
    (ownerContactInfo) => {
      const dto = plainToInstance(UpdateOpportunityDto, { ownerContactInfo });

      expect(validateSync(dto)).toEqual([
        expect.objectContaining({ property: 'ownerContactInfo' }),
      ]);
    },
  );

  it('should accept clearing the organizer contact', () => {
    const dto = plainToInstance(UpdateOpportunityDto, { ownerContactInfo: '' });

    expect(validateSync(dto)).toEqual([]);
  });

  it('accepts an empty payload', () => {
    const dto = plainToInstance(UpdateOpportunityDto, {});

    expect(validateSync(dto)).toEqual([]);
  });

  it.each([undefined, ...Object.values(OpportunityLifecycleState)])(
    'accepts lifecycleState %s',
    (lifecycleState) => {
      const dto = plainToInstance(UpdateOpportunityDto, {
        lifecycleState,
      });

      expect(validateSync(dto)).toEqual([]);
    },
  );

  it('accepts paymentDetails: null', () => {
    const dto = plainToInstance(UpdateOpportunityDto, {
      paymentDetails: null,
    });

    expect(validateSync(dto)).toEqual([]);
  });

  it('accepts paymentDetails: null along with valid lifecycleState', () => {
    const dto = plainToInstance(UpdateOpportunityDto, {
      paymentDetails: null,
      lifecycleState: OpportunityLifecycleState.ACTIVE,
    });

    expect(validateSync(dto)).toEqual([]);
  });

  it.each([null, 'INVALID'])('rejects lifecycleState %s', (lifecycleState) => {
    const dto = plainToInstance(UpdateOpportunityDto, {
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
