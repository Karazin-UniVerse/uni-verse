import { PrismaClient } from '@universe/database';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

interface SeedOpportunity {
  id: string;
  title: string;
  description: string;
  ownerContactInfo: string;
  status: 'PUBLISHED' | 'READY_FOR_REVIEW';
  lifecycleState: 'START' | 'ACTIVE';
  paymentType: 'PAID' | 'UNPAID';
  paymentDetails?: string;
  legacyTitles?: string[];
}

const SEED_OPPORTUNITIES: SeedOpportunity[] = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    title: 'Frontend-розробник для освітнього стартапу',
    description:
      'Запрошуємо React-розробника до участі у створенні освітнього стартапу для студентів. Стек технологій: React, Next.js, TypeScript, компонентна архітектура та взаємодія з REST API.',
    ownerContactInfo: '@edutech_karazin',
    status: 'PUBLISHED',
    lifecycleState: 'ACTIVE',
    paymentType: 'PAID',
    paymentDetails: '500$ на місяць',
    legacyTitles: ['Frontend Developer for Edu Startup'],
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    title: 'Стажер з Data Science (Лабораторія машинного навчання)',
    description:
      'Лабораторія машинного навчання ННІ КН та ШІ запрошує студентів на науково-виробничу практику. Програма передбачає первинний аналіз та візуалізацію академічних даних за допомогою Python, Pandas та Scikit-learn.',
    ownerContactInfo: 'ds_lab@karazin.ua',
    status: 'PUBLISHED',
    lifecycleState: 'START',
    paymentType: 'UNPAID',
    legacyTitles: ['Data Science Intern'],
  },
  {
    id: '10000000-0000-4000-8000-000000000003',
    title: 'SMM-координатор студентських медіапроєктів',
    description:
      'Шукаємо відповідального фахівця для розвитку та підтримки інформаційних каналів Студентської ради в Instagram і Telegram. Обов’язки включають створення анонсів, взаємодію з аудиторією та висвітлення університетських подій.',
    ownerContactInfo: '@student_council',
    status: 'PUBLISHED',
    lifecycleState: 'ACTIVE',
    paymentType: 'UNPAID',
    legacyTitles: ['SMM-менеджер для проєкту'],
  },
  {
    id: '10000000-0000-4000-8000-000000000004',
    title: 'Junior QA Engineer (Тестувальник ПЗ)',
    description:
      'Потрібен студент для тестування нових сервісів університетської платформи. Базові знання тестування веб-додатків, робота з DevTools, вміння оформлювати баг-репорти.',
    ownerContactInfo: 'qa_team@karazin.ua',
    status: 'READY_FOR_REVIEW',
    lifecycleState: 'START',
    paymentType: 'PAID',
    paymentDetails: '400$ на місяць',
  },
  {
    id: '10000000-0000-4000-8000-000000000005',
    title: 'UI/UX Дизайнер для студентського порталу',
    description:
      'Розробка інтерфейсів для веб та мобільної версії студентського кабінету. Знання Figma, UI-kit, принципів адаптивного дизайну.',
    ownerContactInfo: '@karazin_design',
    status: 'READY_FOR_REVIEW',
    lifecycleState: 'START',
    paymentType: 'UNPAID',
  },
  {
    id: '10000000-0000-4000-8000-000000000006',
    title: 'Волонтер-організатор Наукового Хакатону',
    description:
      "Допомога в координації команд, зв'язку зі спікерами та суддями хакатону, підготовка роздаткових матеріалів.",
    ownerContactInfo: 'hackathon@karazin.ua',
    status: 'READY_FOR_REVIEW',
    lifecycleState: 'START',
    paymentType: 'UNPAID',
  },
];

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/postgres';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  const users = await prisma.user.findMany({ take: 2 });
  const user = await prisma.user.upsert({
    where: { email: 'test@karazin.ua' },
    update: {},
    create: {
      email: 'test@karazin.ua',
      name: 'Test Owner',
      password: 'hash',
      role: 'STUDENT',
    },
  });

  const owner = users.length > 0 ? users[0] : user;

  for (const item of SEED_OPPORTUNITIES) {
    const existing = await prisma.opportunity.findFirst({
      where: {
        OR: [
          { id: item.id },
          {
            ownerId: owner.id,
            OR: [
              { title: item.title },
              ...(item.legacyTitles?.map((legacyTitle) => ({
                title: legacyTitle,
              })) ?? []),
            ],
          },
        ],
      },
    });

    if (existing) {
      await prisma.opportunity.update({
        where: { id: existing.id },
        data: {
          title: item.title,
          description: item.description,
          ownerContactInfo: item.ownerContactInfo,
          status: item.status,
          lifecycleState: item.lifecycleState,
          paymentType: item.paymentType,
          paymentDetails: item.paymentDetails ?? null,
          ownerId: owner.id,
        },
      });
    } else {
      await prisma.opportunity.create({
        data: {
          id: item.id,
          title: item.title,
          description: item.description,
          ownerContactInfo: item.ownerContactInfo,
          status: item.status,
          lifecycleState: item.lifecycleState,
          paymentType: item.paymentType,
          paymentDetails: item.paymentDetails ?? null,
          ownerId: owner.id,
        },
      });
    }
  }

  console.info(
    'Seeded opportunities (including READY_FOR_REVIEW for moderation)',
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
