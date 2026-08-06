import type { Meta } from '@storybook/react';
import React from 'react';
import CheckBox from '../una/inputs/CheckBox/CheckBox';
import RadioButton from '../una/inputs/RadioButton/RadioButton';

const meta: Meta = {
  title: 'Slides/CheckAndRadio',
  tags: ['autodocs'],
};

export default meta;

const LabeledRow = ({ label, control }: { label: React.ReactNode; control: React.ReactNode }) => (
  <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
    {control}
    <span>{label}</span>
  </label>
);

export const Variants = () => (
  <div style={{ padding: 24 }}>
    <h2>Checkbox & Radio — варианты</h2>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <LabeledRow
        label="Checkbox unchecked"
        control={<CheckBox variant="primary" checked={false} />}
      />
      <LabeledRow
        label="Checkbox checked"
        control={<CheckBox variant="primary" checked={true} />}
      />
      <LabeledRow
        label="Radio unchecked"
        control={<RadioButton variant="primary" checked={false} />}
      />
      <LabeledRow
        label="Radio checked"
        control={<RadioButton variant="primary" checked={true} />}
      />
    </div>
  </div>
);
