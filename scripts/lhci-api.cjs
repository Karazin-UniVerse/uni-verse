const http = require('node:http');

const mockOpportunities = [
  {
    id: 'lhci-demo-1',
    title: 'Frontend React & Next.js Developer in Student Lab',
    description:
      'Join the Karazin UniVerse student development lab to build modern educational web applications using Next.js 16, React 19, TypeScript, and the Una design system.',
    ownerContactInfo: '@karazin_dev_lab',
    partnerInfo: 'Karazin University IT Lab',
    status: 'PUBLISHED',
    lifecycleState: 'ACTIVE',
    acceptsApplications: true,
    paymentType: 'PAID',
    paymentDetails: '15 000 UAH / month',
    details: null,
    moderationComment: null,
    createdAt: '2026-10-15T10:00:00.000Z',
    updatedAt: '2026-10-15T10:00:00.000Z',
    ownerId: 'owner-1',
    owner: {
      id: 'owner-1',
      name: 'Кафедра теоретичної та прикладної інформатики',
      email: 'tpi@karazin.ua',
    },
  },
  {
    id: 'lhci-demo-2',
    title: 'AI & Data Science Research Assistant',
    description:
      'Participate in machine learning research projects focused on natural language processing and academic analytics.',
    ownerContactInfo: '+380501234567',
    partnerInfo: null,
    status: 'PUBLISHED',
    lifecycleState: 'START',
    acceptsApplications: true,
    paymentType: 'UNPAID',
    paymentDetails: null,
    details: null,
    moderationComment: null,
    createdAt: '2026-10-16T12:00:00.000Z',
    updatedAt: '2026-10-16T12:00:00.000Z',
    ownerId: 'owner-2',
    owner: {
      id: 'owner-2',
      name: 'Лабораторія штучного інтелекту',
      email: 'ai.lab@karazin.ua',
    },
  },
  {
    id: 'lhci-demo-3',
    title: 'UI/UX Designer for Campus Mobile Experience',
    description:
      'Design intuitive mobile interfaces, interactive prototypes, and design system tokens for university digital services.',
    ownerContactInfo: '@karazin_design',
    partnerInfo: null,
    status: 'PUBLISHED',
    lifecycleState: 'ACTIVE',
    acceptsApplications: false,
    paymentType: 'PAID',
    paymentDetails: '12 000 UAH / project',
    details: null,
    moderationComment: null,
    createdAt: '2026-10-17T09:30:00.000Z',
    updatedAt: '2026-10-17T09:30:00.000Z',
    ownerId: 'owner-1',
    owner: {
      id: 'owner-1',
      name: 'Кафедра теоретичної та прикладної інформатики',
      email: 'tpi@karazin.ua',
    },
  },
];

function createMockApiServer() {
  return http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();

      return;
    }

    const url = (req.url || '/').split('?')[0];

    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    if (req.method !== 'GET') {
      res.writeHead(405);
      res.end(JSON.stringify({ message: 'Method not allowed' }));

      return;
    }

    if (url === '/opportunities/my/applications') {
      res.writeHead(200);
      res.end(JSON.stringify([]));

      return;
    }

    if (url === '/opportunities/my') {
      res.writeHead(200);
      res.end(JSON.stringify([mockOpportunities[0]]));

      return;
    }

    const found = mockOpportunities.find(
      (opportunity) => url === `/opportunities/${opportunity.id}`,
    );

    if (found) {
      res.writeHead(200);
      res.end(JSON.stringify(found));

      return;
    }

    if (url === '/opportunities') {
      res.writeHead(200);
      res.end(JSON.stringify(mockOpportunities));

      return;
    }

    if (url === '/notifications') {
      res.writeHead(200);
      res.end(JSON.stringify([]));

      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ message: 'Not found' }));
  });
}

module.exports = { createMockApiServer, mockOpportunities };
