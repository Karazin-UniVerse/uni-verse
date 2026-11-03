import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { OpportunityLifecycleState } from '@universe/database';
import { UpdateOpportunityDto } from './update-opportunity.dto';

describe('UpdateOpportunityDto', () => {
  it.each([42, null, {}, true])(
    'should reject a non-string tag entry %j on update',
    (entry) => {
      const dto = plainToInstance(UpdateOpportunityDto, {
        tags: ['react', entry],
      });

      expect(validateSync(dto)).toEqual([
        expect.objectContaining({
          property: 'tags',
          constraints: expect.objectContaining({
            isString: expect.any(String),
          }),
        }),
      ]);
    },
  );

  it('should retain normalized string tags on update', () => {
    const dto = plainToInstance(UpdateOpportunityDto, {
      tags: [' React ', 'react', '   '],
    });

    expect(validateSync(dto)).toEqual([]);
    expect(dto.tags).toEqual(['react']);
  });

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
