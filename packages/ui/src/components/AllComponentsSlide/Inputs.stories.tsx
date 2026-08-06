import type { Meta } from '@storybook/react';
import React from 'react';
import SimpleInput from '../una/inputs/TextInput/SimpleInput';

const meta: Meta = {
  title: 'Slides/Inputs',
  tags: ['autodocs'],
};

export default meta;

const Labelled = ({ label, children }: { label: React.ReactNode; children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 220 }}>
    <div style={{ fontSize: 12, color: '#333' }}>{label}</div>
    <div>{children}</div>
  </div>
);

export const Variants = () => (
  <div style={{ padding: 24 }}>
    <h2>Inputs — все варианты</h2>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 480 }}>
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
);
