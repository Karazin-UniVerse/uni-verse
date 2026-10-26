import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tag } from '../../una/Tag';
import { OpportunityDetail } from './OpportunityDetail';
import { noop } from '@core/utils/fn';

const meta = {
  title: 'Complex/OpportunityDetail',
  component: OpportunityDetail,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  args: {
    onBack: noop,
    backText: 'Назад до можливостей',
    title: 'Стажування у лабораторії біоінформатики',
    paymentTagText: 'Оплачувана • 15 000 грн/міс',
    paymentTone: 'success',
    statusBadge: <Tag tone="success">Опубліковано</Tag>,
    lifecycleTagText: 'Стан: Активна',
    organizerName: 'Кафедра прикладної математики',
    publishedDateText: '09.10.2026',
    descriptionText:
      'Запрошуємо студентів 3-4 курсів та магістрантів до участі у дослідницькому проєкті з моделювання геномних послідовностей.',
    emailValue: 'biolab@karazin.ua',
    emailLabel: 'Електронна пошта:',
    contactValue: '+380501234567',
    applyText: 'Подати заявку',
    organizerLabel: 'Організатор:',
    descriptionTitle: 'Опис можливості',
    contactLabel: 'Альтернативний контакт:',
    sendToReviewText: 'Відправити на модерацію',
    editText: 'Редагувати',
    deleteText: 'Видалити',
    manageTitle: 'Керування можливостю (автор)',
    acceptsApplications: true,
    applicationsClosedText: 'Прийом заявок призупинено автором',
  },
} satisfies Meta<typeof OpportunityDetail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ProfileEmailOnly: Story = {
  args: { contactValue: '' },
};

export const AuthorView: Story = {
  args: {
    isOwner: true,
    canApply: false,
    canEdit: true,
    onEdit: noop,
    canSendToReview: true,
    onSendToReview: noop,
    canDelete: true,
    onDelete: noop,
  },
};

export const CandidateApplicationsClosed: Story = {
  args: {
    canApply: false,
    acceptsApplications: false,
    applicationsClosedText: 'Прийом заявок призупинено автором',
  },
};

export const DraftUnderReview: Story = {
  args: {
    title: 'Волонтерство на дні відкритих дверей',
    paymentTagText: 'Без оплати / волонтерство',
    paymentTone: 'neutral',
    statusBadge: <Tag tone="info">Очікує перевірки</Tag>,
    lifecycleTagText: 'Стан: Початок',
    isOwner: true,
    canApply: false,
    canSendToReview: true,
    onSendToReview: noop,
  },
};

export const AuthorDraftWithRevision: Story = {
  args: {
    title: 'Розробник сайту факультету',
    paymentTagText: 'Оплачувана',
    paymentTone: 'success',
    statusBadge: <Tag tone="warning">Потребує змін</Tag>,
    lifecycleTagText: 'Стан: Початок',
    isOwner: true,
    canEdit: true,
    onEdit: noop,
    canSendToReview: true,
    sendToReviewDisabled: true,
    sendToReviewHint:
      'Перед повторним надсиланням змініть назву, опис, контакти або умови оплати можливості.',
    onSendToReview: noop,
  },
};
