import type { Meta } from '@storybook/react';
import React, { useState } from 'react';
import CustomDateTime from '../inputs/CustomDateTime/CustomDateTime';
import SimpleDateTime from '../inputs/SimpleDateTime/SimpleDateTime';

const meta: Meta = {
  title: 'Slides/DateTime',
  tags: ['autodocs'],
};

export default meta;

const Labelled = ({ label, children }: { label: React.ReactNode; children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 260 }}>
    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</div>
    <div>{children}</div>
  </div>
);

export const Variants = () => {
  const [customDate, setCustomDate] = useState<Date | null>(new Date());
  const [simpleDate, setSimpleDate] = useState<Date | null>(new Date());

  return (
    <div style={{ padding: 24 }}>
      <h2>Date / Time — варианты</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Labelled label="CustomDateTime">
          <CustomDateTime selected={customDate} onChange={setCustomDate} />
        </Labelled>
        <Labelled label="SimpleDateTime">
          <SimpleDateTime selected={simpleDate} onChange={setSimpleDate} />
        </Labelled>
      </div>
    </div>
  );
};
