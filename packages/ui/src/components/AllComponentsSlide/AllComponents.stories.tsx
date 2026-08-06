import type { Meta } from '@storybook/react';
import React from 'react';

import Button from '../una/Button/Button';
import SimpleInput from '../una/inputs/TextInput/SimpleInput';
import FileInput from '../una/inputs/FileInput/FileInput';
import CustomDateTime from '../una/inputs/DateTimePicker/CustomDateTime';
import SimpleDateTime from '../una/inputs/DateTimePicker/SimpleDateTime';
import CheckBox from '../una/inputs/CheckBox/CheckBox';
import RadioButton from '../una/inputs/RadioButton/RadioButton';
import { SimpleForm } from '../una/Form/SimpleForm';

const meta: Meta = {
  title: 'Slides/All Components',
  tags: ['autodocs'],
};

export default meta;

const Labelled = ({ label, children }: { label: React.ReactNode; children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 180 }}>
    <div style={{ fontSize: 12, color: '#333' }}>{label}</div>
    <div>{children}</div>
  </div>
);

export const All = () => (
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
          <Button variant="primary" size="medium" isLink href="#">
            Link
          </Button>
        </Labelled>
        <Labelled label="Transparent">
          <Button variant="primary" size="medium" isTransparent>
            Transparent
          </Button>
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
        <Labelled label="SimpleDateTime">
          <SimpleDateTime />
        </Labelled>
        <Labelled label="SimpleDateTime (secondary)">
          <SimpleDateTime />
        </Labelled>
      </div>
    </div>

    <div>
      <h2>Checkbox / Radio</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Labelled label="Checkbox (unchecked)">
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <CheckBox variant="primary" checked={false} />
            <span>Check me</span>
          </label>
        </Labelled>
        <Labelled label="Checkbox (checked)">
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <CheckBox variant="primary" checked={true} />
            <span>Checked</span>
          </label>
        </Labelled>
        <Labelled label="Radio (unchecked)">
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <RadioButton variant="primary" checked={false} name="allcomp" />
            <span>Option A</span>
          </label>
        </Labelled>
        <Labelled label="Radio (checked)">
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <RadioButton variant="primary" checked={true} name="allcomp" />
            <span>Option B</span>
          </label>
        </Labelled>
      </div>
    </div>

    <div style={{ gridColumn: '1 / -1' }}>
      <h2>Forms</h2>
      <Labelled label="SimpleForm">
        <SimpleForm />
      </Labelled>
    </div>
  </div>
);
