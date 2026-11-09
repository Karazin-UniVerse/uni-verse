import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ValidationPipe } from '@nestjs/common';
import {
  OpportunityLifecycleState,
  OpportunityTag,
  PaymentType,
} from '@universe/database';
import { CreateOpportunityDto } from './create-opportunity.dto';

describe('CreateOpportunityDto', () => {
  const validPayload = {
    title: 'Research assistant',
    description: 'Research project',
    ownerContactInfo: '@research_lab',
    paymentType: PaymentType.UNPAID,
  };

  it.each(['react', 'it', 42, null, {}, true])(
    'should reject a tag %j outside the predefined list',
    (entry) => {
      const dto = plainToInstance(CreateOpportunityDto, {
        ...validPayload,
        tags: [OpportunityTag.IT, entry],
      });

      expect(validateSync(dto)).toEqual([
        expect.objectContaining({
          property: 'tags',
          constraints: { isEnum: expect.any(String) },
        }),
      ]);
    },
  );

  it('should return HTTP 400 for unknown tags through the application validation pipe', async () => {
    const pipe = new ValidationPipe({ whitelist: true, transform: true });

    await expect(
      pipe.transform(
        { ...validPayload, tags: ['custom'] },
        { type: 'body', metatype: CreateOpportunityDto },
      ),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('should accept any number of predefined tags and deduplicate them', () => {
    const allTags = Object.values(OpportunityTag);
    const dto = plainToInstance(CreateOpportunityDto, {
      ...validPayload,
      tags: [...allTags, OpportunityTag.IT],
    });

    expect(validateSync(dto)).toEqual([]);
    expect(dto.tags).toEqual(allTags);
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
