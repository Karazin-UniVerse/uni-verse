import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { SimpleForm } from './SimpleForm';
import SimpleInput from '../inputs/TextInput/SimpleInput';
import Button from '../Button/Button';

const meta = {
  title: 'Components/Form',
  component: SimpleForm,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    action: { action: 'action' },
    onData: { action: 'onData' },
    variant: {
      control: { type: 'select' },
      options: ['simple', 'card'],
      description: 'Внешний вид формы',
    },
  },
} satisfies Meta<typeof SimpleForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Simple: Story = {
  args: {
    variant: 'simple',
    children: (
      <>
        <SimpleInput type="text" name="username" placeholder="Enter your username" required />
        <SimpleInput type="password" name="password" placeholder="Enter your password" required />
        <Button variant="primary" size="medium" type="submit">
          Login
        </Button>
      </>
    ),
    style: { width: '300px' } as React.CSSProperties,
  },
};

export const CustomGap: Story = {
  args: {
    variant: 'simple',
    children: (
      <>
        <SimpleInput type="email" name="email" placeholder="Email address" required />
        <SimpleInput type="text" name="subject" placeholder="Subject" />
        <Button variant="primary" size="medium" type="submit">
          Send Message
        </Button>
      </>
    ),
    style: {
      gap: 'var(--gap-large)',
      width: '400px',
    } as React.CSSProperties,
  },
};

export const CardForm: Story = {
  args: {
    variant: 'card',
    children: (
      <>
        <h3
          style={{
            margin: '0 0 var(--margin-small) 0',
            fontFamily: 'var(--font-family-heading)',
            fontSize: 'var(--font-xxl)',
            fontWeight: 'var(--font-weight-bold)',
            lineHeight: '1.2',
          }}
        >
          Subscribe
        </h3>
        <p
          style={{
            margin: '0 0 var(--margin-medium) 0',
            fontFamily: 'var(--font-family-regular)',
            fontSize: 'var(--font-md)',
            fontWeight: 'var(--font-weight-regular)',
            lineHeight: '1.5',
          }}
        >
          Get our latest news delivered to your inbox.
        </p>
        <SimpleInput
          type="email"
          name="newsletter_email"
          placeholder="Your email address"
          required
        />
        <Button variant="primary" size="medium" type="submit">
          Subscribe
        </Button>
      </>
    ),
    style: {
      width: '350px',
    } as React.CSSProperties,
  },
};
