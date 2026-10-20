import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Tag } from '../../una/Tag';
import { OpportunityDetail } from './OpportunityDetail';
import type { OpportunityDetailProps } from './OpportunityDetail.types';

const defaultLifecycleOptions = [
  { value: 'START', label: 'Початок' },
  { value: 'ACTIVE', label: 'Активна' },
  { value: 'PAUSED', label: 'Призупинена' },
  { value: 'COMPLETED', label: 'Завершена' },
  { value: 'CANCELLED', label: 'Скасована' },
];

const meta = {
  title: 'Complex/OpportunityDetail',
  component: OpportunityDetail,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  args: {
    onBack: () => {},
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
    contactValue: 'biolab@karazin.ua | +380501234567',
    applyText: 'Подати заявку',
    organizerLabel: 'Організатор:',
    descriptionTitle: 'Опис можливості',
    contactLabel: 'Контакти:',
    sendToReviewText: 'Відправити на модерацію',
    editText: 'Редагувати',
    manageTitle: 'Керування можливістю (автор)',
    phaseLabel: 'Фаза:',
    lifecycleOptions: defaultLifecycleOptions,
    lifecycleState: 'ACTIVE',
    acceptsApplications: true,
    acceptsApplicationsLabel: 'Приймати нові відгуки',
    applicationsClosedText: 'Прийом заявок призупинено автором',
  },
} satisfies Meta<typeof OpportunityDetail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AuthorView: Story = {
  render: (args) => {
    const InteractiveWrapper = (props: OpportunityDetailProps) => {
      const [state, setState] = useState(props.lifecycleState ?? 'ACTIVE');
      const [accepts, setAccepts] = useState(props.acceptsApplications ?? true);

      return (
        <OpportunityDetail
          {...props}
          isOwner={true}
          canApply={false}
          canSendToReview={false}
          lifecycleState={state}
          onLifecycleChange={setState}
          acceptsApplications={accepts}
          onToggleAcceptsApplications={setAccepts}
        />
      );
    };

    return <InteractiveWrapper {...args} />;
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
    onSendToReview: () => {},
    lifecycleState: 'START',
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
    onEdit: () => {},
    canSendToReview: true,
    onSendToReview: () => {},
    moderationCommentTitle: 'Зауваження модератора',
    moderationComment: 'Будь ласка, уточніть стек технологій та очікуване тижневе навантаження.',
    lifecycleState: 'START',
  },
};
