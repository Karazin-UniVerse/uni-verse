import type { Meta } from '@storybook/react';
import React from 'react';
import SimpleButton from '../buttons/SimpleButton/SimpleButton';

const meta: Meta = {
  title: 'Slides/Buttons',
  tags: ['autodocs'],
};

export default meta;

const Labelled = ({ label, children }: { label: React.ReactNode; children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 160 }}>
    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</div>
    <div>{children}</div>
  </div>
);

export const Variants = () => (
  <div style={{ padding: 24 }}>
    <h2>Buttons — все варианты</h2>
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
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
);
