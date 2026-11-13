import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  RescheduleRequestDto,
  RejectRescheduleRequestDto,
  ListRescheduleRequestsDto,
} from './reschedule-request.dto';

describe('rescheduling request validation', () => {
  const valid = {
    eventId: '8ec5db6a-98ae-4f88-a7d8-bd645e53404d',
    newDate: '2027-10-05',
    newPair: 2,
    scope: 'ONCE',
    reason: 'Conference',
  };

  it.each([
    { reason: '   ' },
    { reason: 'x'.repeat(1001) },
    { newPair: 8 },
    { scope: 'ALL' },
    { newDate: '2027-02-30' },
    { eventId: 'invalid' },
  ])('rejects invalid proposal %o', async (change) => {
    const errors = await validate(
      plainToInstance(RescheduleRequestDto, { ...valid, ...change }),
    );

    expect(errors.length).toBeGreaterThan(0);
  });

  it('accepts and trims a valid proposal', async () => {
    const dto = plainToInstance(RescheduleRequestDto, {
      ...valid,
      reason: ' Conference ',
    });

    expect(await validate(dto)).toEqual([]);
    expect(dto.reason).toBe('Conference');
  });

  it('requires a rejection explanation and bounds pagination', async () => {
    expect(
      (
        await validate(
          plainToInstance(RejectRescheduleRequestDto, { explanation: '  ' }),
        )
      ).length,
    ).toBeGreaterThan(0);
    expect(
      (
        await validate(
          plainToInstance(ListRescheduleRequestsDto, {
            page: 0,
            pageSize: 101,
          }),
        )
      ).length,
    ).toBeGreaterThan(0);
  });
});
