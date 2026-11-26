import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { UpdateApplicationStatusDto } from './update-application-status.dto';

describe('UpdateApplicationStatusDto reapplyCount', () => {
  it.each([0, 2])('should accept the reviewed count %j', (reapplyCount) => {
    const dto = plainToInstance(UpdateApplicationStatusDto, {
      status: 'ACCEPTED',
      reapplyCount,
    });

    expect(validateSync(dto)).toEqual([]);
  });

  it.each([undefined, -1, 1.5, '1'])(
    'should reject a missing or invalid count %j',
    (reapplyCount) => {
      const dto = plainToInstance(UpdateApplicationStatusDto, {
        status: 'ACCEPTED',
        reapplyCount,
      });

      expect(validateSync(dto)).toEqual([
        expect.objectContaining({ property: 'reapplyCount' }),
      ]);
    },
  );
});
