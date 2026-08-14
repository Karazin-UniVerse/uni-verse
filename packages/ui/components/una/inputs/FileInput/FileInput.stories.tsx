import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import FileInput from './FileInput';

const meta: Meta<typeof FileInput> = {
  title: 'Components/Inputs/FileInput',
  component: FileInput,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['small', 'medium', 'large'],
    },
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary'],
    },
    disabled: {
      control: { type: 'boolean' },
    },
    multiple: {
      control: { type: 'boolean' },
    },
    showFileList: {
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof FileInput>;

const InteractiveTemplate = (args: any) => {
  const [files, setFiles] = useState<File[]>([]);
  return (
    <div style={{ maxWidth: '500px', padding: '20px' }}>
      <FileInput {...args} files={files} onFilesChange={setFiles} />
    </div>
  );
};

export const Primary: Story = {
  render: InteractiveTemplate,
  args: {
    label: 'Upload Document',
    hint: 'PNG, JPG, PDF up to 10MB',
    size: 'medium',
    variant: 'primary',
  },
};

export const MultipleFiles: Story = {
  render: InteractiveTemplate,
  args: {
    label: 'Upload Multiple Attachments',
    hint: 'Drag & drop multiple files',
    multiple: true,
    size: 'medium',
  },
};

export const Small: Story = {
  render: InteractiveTemplate,
  args: {
    label: 'Compact File Upload',
    size: 'small',
    hint: 'SVG or PNG only',
  },
};

export const Large: Story = {
  render: InteractiveTemplate,
  args: {
    label: 'Large Dropzone',
    size: 'large',
    hint: 'Supports high resolution images',
    multiple: true,
  },
};

export const Secondary: Story = {
  render: InteractiveTemplate,
  args: {
    label: 'Secondary Variant',
    variant: 'secondary',
    hint: 'Subtle background style',
  },
};

export const Disabled: Story = {
  render: InteractiveTemplate,
  args: {
    label: 'Disabled File Upload',
    disabled: true,
    hint: 'Uploading is disabled',
  },
};

export const ErrorState: Story = {
  render: InteractiveTemplate,
  args: {
    label: 'Upload with Error',
    error: 'File size exceeds maximum limit of 5MB',
  },
};

export const WithInitialFiles: Story = {
  render: () => {
    const sampleFile1 = new File(['hello'], 'document.pdf', { type: 'application/pdf' });
    const sampleFile2 = new File(['image content'], 'avatar.png', { type: 'image/png' });
    const [files, setFiles] = useState<File[]>([sampleFile1, sampleFile2]);

    return (
      <div style={{ maxWidth: '500px', padding: '20px' }}>
        <FileInput label="Project Files" multiple files={files} onFilesChange={setFiles} />
      </div>
    );
  },
};
