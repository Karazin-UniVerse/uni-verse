import { PrismaClient } from '@universe/database';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany({ take: 2 });
  if (users.length === 0) {
    console.log('No users in DB, creating a dummy user');
    const user = await prisma.user.create({
      data: {
        email: 'test@karazin.ua',
        name: 'Test Owner',
        password: 'hash',
        role: 'STUDENT'
      }
    });
    users.push(user);
  }

  const owner = users[0];

  await prisma.opportunity.createMany({
    data: [
      {
        title: 'Frontend Developer for Edu Startup',
        description: 'Ищем React разработчика для участия в разработке стартапа для студентов. Нужно знать React, Next.js, TypeScript.',
        ownerContactInfo: '@test_tg',
        status: 'PUBLISHED',
        lifecycleState: 'ACTIVE',
        paymentType: 'PAID',
        paymentDetails: '500$ в месяц',
        ownerId: owner.id,
      },
      {
        title: 'Data Science Intern',
        description: 'Лаборатория машинного обучения приглашает на практику. Будем анализировать данные. Python, Pandas, Scikit-learn.',
        ownerContactInfo: 'ds_lab@karazin.ua',
        status: 'PUBLISHED',
        lifecycleState: 'START',
        paymentType: 'UNPAID',
        ownerId: owner.id,
      },
      {
        title: 'SMM-менеджер для проекта',
        description: 'Нужен человек для ведения Instagram и Telegram канала студенческого совета.',
        ownerContactInfo: '@student_council',
        status: 'PUBLISHED',
        lifecycleState: 'ACTIVE',
        paymentType: 'UNPAID',
        ownerId: owner.id,
      },
      {
        title: 'Junior QA Engineer (Тестувальник ПЗ)',
        description: 'Потрібен студент для тестування нових сервісів університетської платформи. Базові знання тестування веб-додатків, робота з DevTools, вміння оформлювати баг-репорти.',
        ownerContactInfo: 'qa_team@karazin.ua',
        status: 'READY_FOR_REVIEW',
        lifecycleState: 'START',
        paymentType: 'PAID',
        paymentDetails: '400$ на місяць',
        ownerId: owner.id,
      },
      {
        title: 'UI/UX Дизайнер для студентського порталу',
        description: 'Розробка інтерфейсів для веб та мобільної версії студентського кабінету. Знання Figma, UI-kit, принципів адаптивного дизайну.',
        ownerContactInfo: '@karazin_design',
        status: 'READY_FOR_REVIEW',
        lifecycleState: 'START',
        paymentType: 'UNPAID',
        ownerId: owner.id,
      },
      {
        title: 'Волонтер-організатор Наукового Хакатону',
        description: 'Допомога в координації команд, зв\'язку зі спікерами та суддями хакатону, підготовка роздаткових матеріалів.',
        ownerContactInfo: 'hackathon@karazin.ua',
        status: 'READY_FOR_REVIEW',
        lifecycleState: 'START',
        paymentType: 'UNPAID',
        ownerId: owner.id,
      }
    ]
  });

  console.log('Seeded opportunities (including READY_FOR_REVIEW for moderation)');
}

main().catch(console.error).finally(() => prisma.$disconnect());
