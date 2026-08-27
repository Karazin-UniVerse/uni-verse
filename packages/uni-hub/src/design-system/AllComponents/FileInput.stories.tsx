import type { Meta } from '@storybook/react';
import React from 'react';
import FileInput from '../inputs/FileInput/FileInput';

const meta: Meta = {
  title: 'Slides/FileInput',
  tags: ['autodocs'],
};

export default meta;

const Labelled = ({ label, children }: { label: React.ReactNode; children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 260 }}>
    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</div>
    <div>{children}</div>
  </div>
);

export const Variants = () => (
  <div style={{ padding: 24 }}>
    <h2>FileInput — состояния</h2>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 520 }}>
      <Labelled label="Default">
        <FileInput label="Upload" />
      </Labelled>
      <Labelled label="Disabled">
        <FileInput label="Upload" disabled />
      </Labelled>
      <Labelled label="With error">
        <FileInput label="Upload" error="File too big" />
      </Labelled>
    </div>
  </div>
);
