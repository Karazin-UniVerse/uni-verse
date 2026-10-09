import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Tag } from '../../una/Tag';
import { OpportunityDetailModal } from './OpportunityDetailModal';
import type { OpportunityDetailModalProps } from './OpportunityDetailModal.types';

const defaultLifecycleOptions = [
  { value: 'START', label: 'Початок' },
  { value: 'ACTIVE', label: 'Активна' },
  { value: 'PAUSED', label: 'Призупинена' },
  { value: 'COMPLETED', label: 'Завершена' },
  { value: 'CANCELLED', label: 'Скасована' },
];

const meta = {
  title: 'Complex/OpportunityDetailModal',
  component: OpportunityDetailModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    open: true,
    onClose: () => {},
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
    closeText: 'Закрити',
    applyText: 'Подати заявку',
    organizerLabel: 'Організатор:',
    descriptionTitle: 'Опис можливості',
    contactLabel: 'Контакти:',
    sendToReviewText: 'Відправити на модерацію',
    manageTitle: 'Керування можливістю (автор)',
    phaseLabel: 'Фаза:',
    lifecycleOptions: defaultLifecycleOptions,
    lifecycleState: 'ACTIVE',
  },
} satisfies Meta<typeof OpportunityDetailModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AuthorView: Story = {
  render: (args) => {
    const InteractiveWrapper = (props: OpportunityDetailModalProps) => {
      const [state, setState] = useState(props.lifecycleState ?? 'ACTIVE');

      return (
        <OpportunityDetailModal
          {...props}
          isOwner={true}
          canApply={false}
          canSendToReview={false}
          lifecycleState={state}
          onLifecycleChange={setState}
        />
      );
    };

    return <InteractiveWrapper {...args} />;
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
