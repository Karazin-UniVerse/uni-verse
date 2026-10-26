import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { OpportunityLifecycleState } from '@universe/database';
import { UpdateOpportunityDto } from './update-opportunity.dto';

describe('UpdateOpportunityDto', () => {
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
