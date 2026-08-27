import type { Meta } from '@storybook/react';
import React, { useState } from 'react';

import SimpleButton from '../buttons/SimpleButton/SimpleButton';
import SimpleInput from '../inputs/SimpleInput/SimpleInput';
import FileInput from '../inputs/FileInput/FileInput';
import CustomDateTime from '../inputs/CustomDateTime/CustomDateTime';
import SimpleDateTime from '../inputs/SimpleDateTime/SimpleDateTime';
import CheckBox from '../inputs/CheckBox/CheckBox';
import RadioButton from '../inputs/RadioButton/RadioButton';
import Chart from '../charts/Chart/Chart';
import { SimpleForm } from '../SimpleForm/SimpleForm';
import {
  GradeSimulator,
  GradeSimulatorTrigger,
} from '../../components/gamification/GradeSimulator';
import type { Assignment, Grade } from '../../types';

const mockGrades: Grade[] = [
  { course_name: 'Математический анализ', grade: '92.00', rawgrade: 92 },
  { course_name: 'Программирование', grade: '78.00', rawgrade: 78 },
  { course_name: 'Физика', grade: '45.00', rawgrade: 45 },
];

const mockAssignments: Assignment[] = [
  {
    id: 1,
    courseName: 'Математический анализ',
    name: 'Экзаменационная контрольная работа',
    duedate: Math.floor(Date.now() / 1000) + 86400 * 5,
    description: '',
  },
  {
    id: 2,
    courseName: 'Математический анализ',
    name: 'Индивидуальное домашнее задание 2',
    duedate: Math.floor(Date.now() / 1000) + 86400 * 10,
    description: '',
  },
  {
    id: 3,
    courseName: 'Программирование',
    name: 'Финальный проект по курсу',
    duedate: Math.floor(Date.now() / 1000) + 86400 * 3,
    description: '',
  },
];

const meta: Meta = {
  title: 'Slides/All Components',
  tags: ['autodocs'],
};

export default meta;

const Labelled = ({ label, children }: { label: React.ReactNode; children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 180 }}>
    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</div>
    <div>{children}</div>
  </div>
);

export const All = () => {
  const [customDate, setCustomDate] = useState<Date | null>(new Date());
  const [simpleDate, setSimpleDate] = useState<Date | null>(new Date());
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

  return (
    <div
      style={{
        padding: 24,
        display: 'grid',
        gridTemplateColumns: 'repeat(2,1fr)',
        gap: 24,
        alignItems: 'start',
      }}
    >
      <div>
        <h2>Buttons</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Labelled label="Primary">
            <SimpleButton variant="primary" size="medium">
              Primary
            </SimpleButton>
          </Labelled>
          <Labelled label="Secondary">
            <SimpleButton variant="secondary" size="medium">
              Secondary
            </SimpleButton>
          </Labelled>
          <Labelled label="Large">
            <SimpleButton variant="primary" size="large">
              Large
            </SimpleButton>
          </Labelled>
          <Labelled label="Small">
            <SimpleButton variant="primary" size="small">
              Small
            </SimpleButton>
          </Labelled>
          <Labelled label="Link">
            <SimpleButton variant="primary" size="medium" isLink href="#">
              Link
            </SimpleButton>
          </Labelled>
          <Labelled label="Transparent">
            <SimpleButton variant="primary" size="medium" isTransparent>
              Transparent
            </SimpleButton>
          </Labelled>
        </div>
      </div>

      <div>
        <h2>Inputs</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Labelled label="Primary">
            <SimpleInput variant="primary" size="medium" placeholder="Primary" />
          </Labelled>
          <Labelled label="Secondary">
            <SimpleInput variant="secondary" size="medium" placeholder="Secondary" />
          </Labelled>
          <Labelled label="Large">
            <SimpleInput variant="primary" size="large" placeholder="Large" />
          </Labelled>
          <Labelled label="Small">
            <SimpleInput variant="primary" size="small" placeholder="Small" />
          </Labelled>
          <Labelled label="Transparent">
            <SimpleInput variant="primary" size="medium" isTransparent placeholder="Transparent" />
          </Labelled>
          <Labelled label="Disabled">
            <SimpleInput variant="primary" size="medium" disabled placeholder="Disabled" />
          </Labelled>
        </div>
      </div>

      <div>
        <h2>File Input</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Labelled label="Default">
            <FileInput label="Upload" />
          </Labelled>
          <Labelled label="Disabled">
            <FileInput label="Upload" disabled />
          </Labelled>
          <Labelled label="Error">
            <FileInput label="Upload" error="File too big" />
          </Labelled>
        </div>
      </div>

      <div>
        <h2>Date / Time</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Labelled label="CustomDateTime">
            <CustomDateTime selected={customDate} onChange={setCustomDate} />
          </Labelled>
          <Labelled label="SimpleDateTime">
            <SimpleDateTime selected={simpleDate} onChange={setSimpleDate} />
          </Labelled>
        </div>
      </div>

      <div>
        <h2>Checkbox / Radio</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Labelled label="Checkbox (unchecked)">
            <CheckBox variant="primary" checked={false} readOnly />
          </Labelled>
          <Labelled label="Checkbox (checked)">
            <CheckBox variant="primary" checked readOnly />
          </Labelled>
          <Labelled label="Radio (unchecked)">
            <RadioButton variant="primary" checked={false} readOnly />
          </Labelled>
          <Labelled label="Radio (checked)">
            <RadioButton variant="primary" checked readOnly />
          </Labelled>
        </div>
      </div>

      <div>
        <h2>Charts</h2>
        <Chart
          type="donut"
          title="Статус заданий"
          height={220}
          data={[
            { name: 'Выполнено', value: 8, color: 'var(--chart-success)' },
            { name: 'Просрочено', value: 2, color: 'var(--chart-danger)' },
            { name: 'В процессе', value: 5, color: 'var(--chart-info)' },
          ]}
        />
      </div>

      <div>
        <h2>Grade Simulator («Что, если?»)</h2>
        <Labelled label="Нажмите для открытия симулятора">
          <GradeSimulatorTrigger onOpen={() => setIsSimulatorOpen(true)} />
        </Labelled>
        <GradeSimulator
          open={isSimulatorOpen}
          onClose={() => setIsSimulatorOpen(false)}
          grades={mockGrades}
          assignments={mockAssignments}
        />
      </div>

      <div style={{ gridColumn: '1 / -1' }}>
        <h2>Forms</h2>
        <Labelled label="SimpleForm">
          <SimpleForm onData={(d) => console.info('form data', d)} style={{ maxWidth: 520 }}>
            <SimpleInput name="name" placeholder="Name" />
            <SimpleInput name="email" placeholder="Email" />
            <SimpleButton variant="primary" size="medium" type="submit">
              Submit
            </SimpleButton>
          </SimpleForm>
        </Labelled>
      </div>
    </div>
  );
};
