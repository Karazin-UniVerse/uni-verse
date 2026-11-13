import { ConflictException } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role, TeachingType } from '@universe/database';
import type { PrismaService } from '../prisma/prisma.service';
import { TimetableRescheduleRequestsService } from '../timetable/timetable-reschedule-requests.service';
import { TimetableReschedulingService } from '../timetable/timetable-rescheduling.service';
import { TimetableService } from '../timetable/timetable.service';

describe('Timetable rescheduling concurrency (PostgreSQL integration)', () => {
  const testDbUrl = process.env.TIMETABLE_TEST_DATABASE_URL;

  if (!testDbUrl || new URL(testDbUrl).pathname.replace(/^\//, '') === 'test') {
    it('requires a dedicated TIMETABLE_TEST_DATABASE_URL not targeting local test DB', () => {
      throw new Error(
        'TIMETABLE_TEST_DATABASE_URL must be set to an isolated PostgreSQL database (never "test").',
      );
    });

    return;
  }

  let client1: PrismaClient;
  let client2: PrismaClient;
  let rescheduling1: TimetableReschedulingService;
  let rescheduling2: TimetableReschedulingService;
  let requests1: TimetableRescheduleRequestsService;
  let requests2: TimetableRescheduleRequestsService;
  let timetable1: TimetableService;

  const ids = {
    admin: 'pg-test-admin',
    teacher: 'pg-test-teacher',
    group1: '00000000-0000-4000-8000-000000000001',
    group2: '00000000-0000-4000-8000-000000000002',
    plan1: '00000000-0000-4000-8000-000000000011',
    plan2: '00000000-0000-4000-8000-000000000012',
    calendar: '00000000-0000-4000-8000-000000000021',
    assign1: '00000000-0000-4000-8000-000000000031',
    assign2: '00000000-0000-4000-8000-000000000032',
    ver1: '00000000-0000-4000-8000-000000000041',
    ver2: '00000000-0000-4000-8000-000000000042',
    evt1: '00000000-0000-4000-8000-000000000051',
    evt2: '00000000-0000-4000-8000-000000000052',
    evtDraft: '00000000-0000-4000-8000-000000000053',
  };

  async function cleanup(): Promise<void> {
    await client1.timetableRescheduleAudit.deleteMany({
      where: { eventId: { in: [ids.evt1, ids.evt2, ids.evtDraft] } },
    });
    await client1.timetableRescheduleOccurrence.deleteMany({
      where: { eventId: { in: [ids.evt1, ids.evt2, ids.evtDraft] } },
    });
    await client1.timetableRescheduleRequest.deleteMany({
      where: { eventId: { in: [ids.evt1, ids.evt2, ids.evtDraft] } },
    });
    await client1.timetableVersion.deleteMany({
      where: { id: { in: [ids.ver1, ids.ver2] } },
    });
    await client1.teachingAssignment.deleteMany({
      where: { id: { in: [ids.assign1, ids.assign2] } },
    });
    await client1.curriculumPlan.deleteMany({
      where: { id: { in: [ids.plan1, ids.plan2] } },
    });
    await client1.semesterCalendar.deleteMany({
      where: { id: ids.calendar },
    });
    await client1.academicGroup.deleteMany({
      where: { id: { in: [ids.group1, ids.group2] } },
    });
    await client1.user.deleteMany({
      where: { id: { in: [ids.admin, ids.teacher] } },
    });
  }

  async function seedBase(): Promise<void> {
    await client1.user.createMany({
      data: [
        {
          id: ids.admin,
          email: 'pg-admin@karazin.ua',
          name: 'Admin',
          password: 'hash',
          roles: [Role.ADMIN],
        },
        {
          id: ids.teacher,
          email: 'pg-teacher@karazin.ua',
          name: 'Teacher',
          password: 'hash',
          roles: [Role.INSTRUCTOR],
        },
      ],
    });
    await client1.academicGroup.createMany({
      data: [
        {
          id: ids.group1,
          code: 'PG-1',
          degreeLevel: 'BACHELOR',
          studyForm: 'FULL_TIME',
          entryYear: 2026,
          academicYear: '2028/2029',
        },
        {
          id: ids.group2,
          code: 'PG-2',
          degreeLevel: 'BACHELOR',
          studyForm: 'FULL_TIME',
          entryYear: 2026,
          academicYear: '2028/2029',
        },
      ],
    });
    await client1.semesterCalendar.create({
      data: {
        id: ids.calendar,
        academicYear: '2028/2029',
        semester: 1,
        startDate: new Date('2028-09-04'),
        teachingWeeks: 16,
        excludedDates: [],
        makeupSaturdays: [],
      },
    });
    await client1.curriculumPlan.createMany({
      data: [
        {
          id: ids.plan1,
          faculty: 'CS',
          title: 'Plan 1',
          academicYear: '2028/2029',
          semester: 1,
        },
        {
          id: ids.plan2,
          faculty: 'CS',
          title: 'Plan 2',
          academicYear: '2028/2029',
          semester: 1,
        },
      ],
    });
    await client1.teachingAssignment.createMany({
      data: [
        {
          id: ids.assign1,
          curriculumPlanId: ids.plan1,
          disciplineTitle: 'Course 1',
          teachingType: TeachingType.LECTURE,
          academicHours: 2,
          teacherId: ids.teacher,
          groupId: ids.group1,
        },
        {
          id: ids.assign2,
          curriculumPlanId: ids.plan2,
          disciplineTitle: 'Course 2',
          teachingType: TeachingType.LECTURE,
          academicHours: 2,
          teacherId: ids.teacher,
          groupId: ids.group2,
        },
      ],
    });
    await client1.timetableVersion.create({
      data: {
        id: ids.ver1,
        semesterCalendarId: ids.calendar,
        status: 'PUBLISHED',
        createdById: ids.admin,
        events: {
          create: [
            {
              id: ids.evt1,
              teachingAssignmentId: ids.assign1,
              stableKey: `${ids.assign1}:2028-09-04:1`,
              date: new Date('2028-09-04'),
              pair: 1,
              pairSpan: 1,
            },
            {
              id: ids.evt2,
              teachingAssignmentId: ids.assign2,
              stableKey: `${ids.assign2}:2028-09-05:1`,
              date: new Date('2028-09-05'),
              pair: 1,
              pairSpan: 1,
            },
          ],
        },
      },
    });
  }

  beforeAll(async () => {
    client1 = new PrismaClient({
      adapter: new PrismaPg({ connectionString: testDbUrl }),
    });
    client2 = new PrismaClient({
      adapter: new PrismaPg({ connectionString: testDbUrl }),
    });
    await client1.$connect();
    await client2.$connect();
    rescheduling1 = new TimetableReschedulingService(
      client1 as unknown as PrismaService,
    );
    rescheduling2 = new TimetableReschedulingService(
      client2 as unknown as PrismaService,
    );
    requests1 = new TimetableRescheduleRequestsService(
      client1 as unknown as PrismaService,
      rescheduling1,
    );
    requests2 = new TimetableRescheduleRequestsService(
      client2 as unknown as PrismaService,
      rescheduling2,
    );
    timetable1 = new TimetableService(client1 as unknown as PrismaService);
  });

  beforeEach(async () => {
    await cleanup();
    await seedBase();
  });

  afterAll(async () => {
    await cleanup();
    await client1.$disconnect();
    await client2.$disconnect();
  });

  it('allows only one of two concurrent moves into the same teacher slot', async () => {
    const outcomes = await Promise.allSettled([
      rescheduling1.reschedule(
        {
          eventId: ids.evt1,
          newDate: '2028-09-06',
          newPair: 2,
          scope: 'ONCE',
          reason: 'Move 1',
        },
        ids.admin,
      ),
      rescheduling2.reschedule(
        {
          eventId: ids.evt2,
          newDate: '2028-09-06',
          newPair: 2,
          scope: 'ONCE',
          reason: 'Move 2',
        },
        ids.admin,
      ),
    ]);

    expect(
      outcomes.filter((outcome) => outcome.status === 'fulfilled'),
    ).toHaveLength(1);
    const rejected = outcomes.filter(
      (outcome) => outcome.status === 'rejected',
    );

    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      ConflictException,
    );
    expect(await client1.timetableRescheduleAudit.count()).toBe(1);
  });

  it('serializes concurrent approve vs approve and approve vs reject with at most one decision', async () => {
    const reqA = await requests1.create(ids.teacher, {
      eventId: ids.evt1,
      newDate: '2028-09-06',
      newPair: 3,
      scope: 'ONCE',
      reason: 'Need Wednesday',
    });

    const outcomes = await Promise.allSettled([
      requests1.approve(reqA.id, ids.admin),
      requests2.reject(reqA.id, ids.admin, 'Cannot approve'),
    ]);

    expect(
      outcomes.filter((outcome) => outcome.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      outcomes.filter((outcome) => outcome.status === 'rejected'),
    ).toHaveLength(1);

    const saved = await client1.timetableRescheduleRequest.findUnique({
      where: { id: reqA.id },
    });
    const audits = await client1.timetableRescheduleAudit.count({
      where: { requestId: reqA.id },
    });

    expect(saved?.status === 'APPROVED' ? audits === 1 : audits === 0).toBe(
      true,
    );
  });

  it('serializes concurrent publication vs move and calendar shortening vs late move', async () => {
    await client1.timetableVersion.create({
      data: {
        id: ids.ver2,
        semesterCalendarId: ids.calendar,
        status: 'DRAFT',
        createdById: ids.admin,
        events: {
          create: [
            {
              id: ids.evtDraft,
              teachingAssignmentId: ids.assign2,
              stableKey: `${ids.assign2}:2028-09-06:4`,
              date: new Date('2028-09-06'),
              pair: 4,
              pairSpan: 1,
            },
          ],
        },
      },
    });

    const pubVsMove = await Promise.allSettled([
      timetable1.publishTimetableVersion(ids.ver2, ids.admin),
      rescheduling2.reschedule(
        {
          eventId: ids.evt1,
          newDate: '2028-09-06',
          newPair: 4,
          scope: 'ONCE',
          reason: 'Clash',
        },
        ids.admin,
      ),
    ]);

    expect(
      pubVsMove.filter((outcome) => outcome.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      pubVsMove.filter((outcome) => outcome.status === 'rejected'),
    ).toHaveLength(1);

    const shortenVsMove = await Promise.allSettled([
      timetable1.configureSemesterCalendar({
        academicYear: '2028/2029',
        semester: 1,
        startDate: '2028-09-04',
        teachingWeeks: 14,
      }),
      rescheduling2.reschedule(
        {
          eventId: ids.evt1,
          newDate: '2028-12-18',
          newPair: 1,
          scope: 'ONCE',
          reason: 'Late week 16',
        },
        ids.admin,
      ),
    ]);

    expect(
      shortenVsMove.filter((outcome) => outcome.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      shortenVsMove.filter((outcome) => outcome.status === 'rejected'),
    ).toHaveLength(1);
  });
});
