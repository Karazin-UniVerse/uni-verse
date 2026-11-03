import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { FindOpportunitiesDto } from './find-opportunities.dto';

describe('FindOpportunitiesDto recruitment filter', () => {
  it.each(['garbage', ['true', 'false'], {}])(
    'should reject an invalid supplied recruitment filter: %j',
    (isRecruiting) => {
      const dto = plainToInstance(FindOpportunitiesDto, { isRecruiting });

      expect(validateSync(dto)).toEqual([
        expect.objectContaining({
          property: 'isRecruiting',
          constraints: { isBoolean: expect.any(String) },
        }),
      ]);
    },
  );

  it('should accept an omitted recruitment filter', () => {
    const dto = plainToInstance(FindOpportunitiesDto, {});

    expect(validateSync(dto)).toEqual([]);
    expect(dto.isRecruiting).toBeUndefined();
  });

  it.each([
    { value: 'true', expected: true },
    { value: 'false', expected: false },
  ])('should parse $value without losing false', ({ value, expected }) => {
    const dto = plainToInstance(FindOpportunitiesDto, { isRecruiting: value });

    expect(validateSync(dto)).toEqual([]);
    expect(dto.isRecruiting).toBe(expected);
  });
});
