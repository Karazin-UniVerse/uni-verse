import type { Meta } from '@storybook/react';
import React from 'react';
import CustomDateTime from '../una/inputs/DateTimePicker/CustomDateTime';
import SimpleDateTime from '../una/inputs/DateTimePicker/SimpleDateTime';

const meta: Meta = {
  title: 'Slides/DateTime',
  tags: ['autodocs'],
};

export default meta;

const Labelled = ({ label, children }: { label: React.ReactNode; children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 260 }}>
    <div style={{ fontSize: 12, color: '#333' }}>{label}</div>
    <div>{children}</div>
  </div>
);

export const Variants = () => (
  <div style={{ padding: 24 }}>
    <h2>Date / Time — варианты</h2>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Labelled label="CustomDateTime">
        <CustomDateTime />
      </Labelled>
      <Labelled label="SimpleDateTime">
        <SimpleDateTime />
      </Labelled>
    </div>
  </div>
);
