import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { VariantMatrix } from '../../../../storybook/VariantMatrix/VariantMatrix';
import FileInput from './FileInput';
import type { FileInputProps } from './FileInput.types';

type MatrixRow = 'primary' | 'secondary' | 'disabled' | 'error';
type MatrixSize = NonNullable<FileInputProps['size']>;

const MATRIX_ROWS: Record<MatrixRow, Pick<FileInputProps, 'variant' | 'disabled' | 'error'>> = {
  primary: { variant: 'primary' },
  secondary: { variant: 'secondary' },
  disabled: { disabled: true },
  error: { error: 'File is too large' },
};
const MATRIX_SIZES: readonly MatrixSize[] = ['small', 'medium', 'large'];

const meta: Meta<typeof FileInput> = {
  title: 'Una/Inputs/FileInput',
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

const WithInitialFilesComponent = () => {
  const sampleFile1 = new File(['hello'], 'document.pdf', { type: 'application/pdf' });
  const sampleFile2 = new File(['image content'], 'avatar.png', { type: 'image/png' });
  const [files, setFiles] = useState<File[]>([sampleFile1, sampleFile2]);

  return (
    <div style={{ maxWidth: '500px', padding: '20px' }}>
      <FileInput label="Project Files" multiple files={files} onFilesChange={setFiles} />
    </div>
  );
};

export const WithInitialFiles: Story = {
  render: () => <WithInitialFilesComponent />,
};

export const Matrix: Story = {
  parameters: {
    layout: 'padded',
  },
  render: () => (
    <VariantMatrix
      rows={Object.keys(MATRIX_ROWS) as MatrixRow[]}
      columns={MATRIX_SIZES}
      renderCell={(row: MatrixRow, size: MatrixSize) => (
        <div style={{ width: '240px' }}>
          <FileInput size={size} label="Upload" hint="PNG or PDF" {...MATRIX_ROWS[row]} />
        </div>
      )}
    />
  ),
};
