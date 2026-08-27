import type { Meta } from '@storybook/react';
import React from 'react';
import { SimpleForm } from '../SimpleForm/SimpleForm';
import SimpleInput from '../inputs/SimpleInput/SimpleInput';
import SimpleButton from '../buttons/SimpleButton/SimpleButton';

const meta: Meta = {
  title: 'Slides/SimpleForm',
  tags: ['autodocs'],
};

export default meta;

export const Variants = () => (
  <div style={{ padding: 24 }}>
    <h2>SimpleForm — пример</h2>
    <SimpleForm onData={(d) => console.info('form data', d)} style={{ maxWidth: 520 }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <SimpleInput name="name" placeholder="Name" />
        <SimpleInput name="email" placeholder="Email" />
      </div>
      <div>
        <SimpleButton variant="primary" size="medium" type="submit">
          Submit
        </SimpleButton>
      </div>
    </SimpleForm>
  </div>
);
