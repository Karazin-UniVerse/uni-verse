import type { Prisma } from '@universe/database';

/** All semester writers take the same ordered row locks before reading occupancy. */
export async function lockTimetableWrites(
  tx: Prisma.TransactionClient,
): Promise<void> {
  await tx.$queryRaw`SELECT "id" FROM "SemesterCalendar" ORDER BY "id" FOR UPDATE`;
}
