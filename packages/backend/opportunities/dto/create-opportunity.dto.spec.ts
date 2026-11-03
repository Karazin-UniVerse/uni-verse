import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ValidationPipe } from '@nestjs/common';
import { OpportunityLifecycleState, PaymentType } from '@universe/database';
import { CreateOpportunityDto } from './create-opportunity.dto';

describe('CreateOpportunityDto', () => {
  const validPayload = {
    title: 'Research assistant',
    description: 'Research project',
    ownerContactInfo: '@research_lab',
    paymentType: PaymentType.UNPAID,
  };

  it.each([42, null, {}, true])(
    'should reject a non-string tag entry %j without silently dropping it',
    (entry) => {
      const dto = plainToInstance(CreateOpportunityDto, {
        ...validPayload,
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

  it('should return HTTP 400 for mixed-type tags through the application validation pipe', async () => {
    const pipe = new ValidationPipe({ whitelist: true, transform: true });

    await expect(
      pipe.transform(
        { ...validPayload, tags: ['react', 42] },
        { type: 'body', metatype: CreateOpportunityDto },
      ),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('should preserve normalization and deduplication for valid string tag input', () => {
    const dto = plainToInstance(CreateOpportunityDto, {
      ...validPayload,
      tags: ['  React Native  ', 'REACT NATIVE', '', '   ', 'research,design'],
    });

    expect(validateSync(dto)).toEqual([]);
    expect(dto.tags).toEqual(['react native', 'research,design']);
  });

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
