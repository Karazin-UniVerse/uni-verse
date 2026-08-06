import type { Meta } from '@storybook/react';
import React from 'react';
import Button from '../buttons/SimpleButton/Button';

const meta: Meta = {
  title: 'Slides/Buttons',
  tags: ['autodocs'],
};

export default meta;

const Labelled = ({ label, children }: { label: React.ReactNode; children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 160 }}>
    <div style={{ fontSize: 12, color: '#333' }}>{label}</div>
    <div>{children}</div>
  </div>
);

export const Variants = () => (
  <div style={{ padding: 24 }}>
    <h2>Buttons — все варианты</h2>
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      <Labelled label="Primary">
        <Button variant="primary" size="medium">
          Primary
        </Button>
      </Labelled>
      <Labelled label="Secondary">
        <Button variant="secondary" size="medium">
          Secondary
        </Button>
      </Labelled>
      <Labelled label="Large">
        <Button variant="primary" size="large">
          Large
        </Button>
      </Labelled>
      <Labelled label="Small">
        <Button variant="primary" size="small">
          Small
        </Button>
      </Labelled>
      <Labelled label="Link">
        <Button variant="primary" isLink href="#">
          Link
        </Button>
      </Labelled>
      <Labelled label="Transparent">
        <Button variant="primary" isTransparent>
          Transparent
        </Button>
      </Labelled>
    </div>
  </div>
);
