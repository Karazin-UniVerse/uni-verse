import { createRef } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { FileInput } from './FileInput';

describe('UNA FileInput Component', () => {
  it('should render file input with accessible label or role', () => {
    render(<FileInput id="file-upload" label="Upload Resume" />);

    expect(screen.getByText('Upload Resume')).toBeInTheDocument();

    const input = screen.getByLabelText(/upload resume/i, { selector: 'input' });
    const button = screen.getByRole('button', { name: /upload resume/i });

    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'file');
    expect(input).toHaveAttribute('id', 'file-upload');
    expect(button).toBeInTheDocument();
  });

  it('should render default aria-label on dropzone when no label is provided', () => {
    render(<FileInput data-testid="unlabeled-file-input" />);

    const button = screen.getByRole('button', { name: 'File Upload' });
    const input = screen.getByTestId('unlabeled-file-input');

    expect(button).toBeInTheDocument();
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'file');
  });

  it('should handle file selection and trigger onChange', async () => {
    const handleChange = vi.fn();
    const handleFilesChange = vi.fn();
    const user = userEvent.setup();

    render(
      <FileInput
        id="resume-file"
        label="Select Resume"
        onChange={handleChange}
        onFilesChange={handleFilesChange}
      />,
    );

    const input = screen.getByLabelText(/select resume/i, { selector: 'input' });
    const file = new File(['file contents'], 'resume.pdf', { type: 'application/pdf' });

    await user.upload(input, file);

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleFilesChange).toHaveBeenCalledTimes(1);
    expect(handleFilesChange).toHaveBeenCalledWith([file]);
    expect(screen.getByText('resume.pdf')).toBeInTheDocument();
    expect(screen.getByText('Selected files (1)')).toBeInTheDocument();
  });

  it('should respect accept attribute and multiple selection if supported', async () => {
    const handleFilesChange = vi.fn();
    const user = userEvent.setup();

    render(
      <FileInput
        id="multi-images"
        label="Upload Images"
        accept="image/png,image/jpeg"
        multiple
        onFilesChange={handleFilesChange}
      />,
    );

    const input = screen.getByLabelText(/upload images/i, { selector: 'input' });
    const file1 = new File(['image-one'], 'image1.png', { type: 'image/png' });
    const file2 = new File(['image-two'], 'image2.jpg', { type: 'image/jpeg' });

    expect(input).toHaveAttribute('accept', 'image/png,image/jpeg');
    expect(input).toHaveAttribute('multiple');

    await user.upload(input, [file1, file2]);

    expect(handleFilesChange).toHaveBeenCalledWith([file1, file2]);
    expect(screen.getByText('image1.png')).toBeInTheDocument();
    expect(screen.getByText('image2.jpg')).toBeInTheDocument();
    expect(screen.getByText('Selected files (2)')).toBeInTheDocument();
  });

  it('should replace files on subsequent selection when multiple is false', async () => {
    const handleFilesChange = vi.fn();
    const user = userEvent.setup();

    render(
      <FileInput
        id="single-file"
        label="Single File"
        multiple={false}
        onFilesChange={handleFilesChange}
      />,
    );

    const input = screen.getByLabelText(/single file/i, { selector: 'input' });
    const file1 = new File(['content1'], 'first.txt', { type: 'text/plain' });
    const file2 = new File(['content2'], 'second.txt', { type: 'text/plain' });

    await user.upload(input, file1);

    expect(screen.getByText('first.txt')).toBeInTheDocument();

    await user.upload(input, file2);

    expect(screen.getByText('second.txt')).toBeInTheDocument();
    expect(screen.queryByText('first.txt')).not.toBeInTheDocument();
  });

  it('should be disabled when disabled prop is true', async () => {
    const handleChange = vi.fn();
    const handleFilesChange = vi.fn();
    const user = userEvent.setup();

    render(
      <FileInput
        id="disabled-input"
        label="Disabled Upload"
        disabled
        onChange={handleChange}
        onFilesChange={handleFilesChange}
      />,
    );

    const input = screen.getByLabelText(/disabled upload/i, { selector: 'input' });
    const button = screen.getByRole('button', { name: /disabled upload/i });
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });

    expect(input).toBeDisabled();
    expect(button).toBeDisabled();

    await user.upload(input, file);

    expect(handleChange).not.toHaveBeenCalled();
    expect(handleFilesChange).not.toHaveBeenCalled();
    expect(screen.queryByText('test.txt')).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<FileInput label="Styled Input" className="custom-test-class" />);

    const button = screen.getByRole('button', { name: /styled input/i });

    expect(button.className).toContain('custom-test-class');
  });

  it('should apply variant and size classes', () => {
    const { rerender } = render(
      <FileInput label="Variant Test" variant="secondary" size="large" />,
    );

    const button = screen.getByRole('button', { name: /variant test/i });

    expect(button.className).toContain('secondary');
    expect(button.className).toContain('large');

    rerender(<FileInput label="Variant Test" variant="primary" size="small" />);

    expect(button.className).toContain('primary');
    expect(button.className).toContain('small');
  });

  it('should handle drag and drop file uploads', () => {
    const handleFilesChange = vi.fn();

    render(<FileInput label="Drop Area" onFilesChange={handleFilesChange} />);

    const dropzone = screen.getByRole('button', { name: /drop area/i });
    const droppedFile = new File(['drop content'], 'dropped.csv', { type: 'text/csv' });

    fireEvent.dragOver(dropzone);
    expect(dropzone.className).toContain('isDragging');

    fireEvent.dragLeave(dropzone);
    expect(dropzone.className).not.toContain('isDragging');

    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [droppedFile],
      },
    });

    expect(dropzone.className).not.toContain('isDragging');
    expect(handleFilesChange).toHaveBeenCalledWith([droppedFile]);
    expect(screen.getByText('dropped.csv')).toBeInTheDocument();
  });

  it('should remove a file when clicking remove button', async () => {
    const handleFilesChange = vi.fn();
    const user = userEvent.setup();

    render(
      <FileInput
        id="remove-test"
        label="Remove File Test"
        multiple
        onFilesChange={handleFilesChange}
      />,
    );

    const input = screen.getByLabelText(/remove file test/i, { selector: 'input' });
    const file1 = new File(['a'], 'file1.txt', { type: 'text/plain' });
    const file2 = new File(['b'], 'file2.txt', { type: 'text/plain' });

    await user.upload(input, [file1, file2]);

    expect(screen.getByText('file1.txt')).toBeInTheDocument();
    expect(screen.getByText('file2.txt')).toBeInTheDocument();

    const removeButton1 = screen.getByRole('button', { name: 'Remove file1.txt' });

    await user.click(removeButton1);

    expect(screen.queryByText('file1.txt')).not.toBeInTheDocument();
    expect(screen.getByText('file2.txt')).toBeInTheDocument();
    expect(handleFilesChange).toHaveBeenLastCalledWith([file2]);
  });

  it('should clear all files when clicking clear all button', async () => {
    const handleFilesChange = vi.fn();
    const user = userEvent.setup();

    render(
      <FileInput
        id="clear-all-test"
        label="Clear All Test"
        multiple
        onFilesChange={handleFilesChange}
      />,
    );

    const input = screen.getByLabelText(/clear all test/i, { selector: 'input' });
    const file1 = new File(['a'], 'doc1.pdf', { type: 'application/pdf' });
    const file2 = new File(['b'], 'doc2.pdf', { type: 'application/pdf' });

    await user.upload(input, [file1, file2]);

    expect(screen.getByText('Selected files (2)')).toBeInTheDocument();

    const clearAllButton = screen.getByRole('button', { name: 'Clear all' });

    await user.click(clearAllButton);

    expect(handleFilesChange).toHaveBeenLastCalledWith([]);
    expect(screen.queryByText('doc1.pdf')).not.toBeInTheDocument();
    expect(screen.queryByText('doc2.pdf')).not.toBeInTheDocument();
  });

  it('should display validation error when file exceeds maxSize', async () => {
    const user = userEvent.setup();

    render(<FileInput id="max-size-test" label="Size Test" maxSize={1024} />);

    const input = screen.getByLabelText(/size test/i, { selector: 'input' });
    const largeContent = new Uint8Array(2048);
    const largeFile = new File([largeContent], 'heavy.png', { type: 'image/png' });

    await user.upload(input, largeFile);

    expect(
      screen.getByText('File "heavy.png" exceeds maximum allowed size of 1 KB.'),
    ).toBeInTheDocument();
  });

  it('should enforce maxFiles limit and display error', async () => {
    const user = userEvent.setup();

    render(<FileInput id="max-files-test" label="Count Test" maxFiles={1} multiple />);

    const input = screen.getByLabelText(/count test/i, { selector: 'input' });
    const file1 = new File(['1'], 'file1.txt', { type: 'text/plain' });
    const file2 = new File(['2'], 'file2.txt', { type: 'text/plain' });

    await user.upload(input, [file1, file2]);

    expect(screen.getByText('Maximum 1 file allowed.')).toBeInTheDocument();
    expect(screen.getByText('file1.txt')).toBeInTheDocument();
    expect(screen.queryByText('file2.txt')).not.toBeInTheDocument();
  });

  it('should display external error and hint text', () => {
    render(
      <FileInput
        label="Profile Picture"
        error="File format is not supported"
        hint="PNG or JPEG up to 5MB"
      />,
    );

    expect(screen.getByText('File format is not supported')).toBeInTheDocument();
    expect(screen.getByText('PNG or JPEG up to 5MB')).toBeInTheDocument();
  });

  it('should not display file list when showFileList is false', async () => {
    const user = userEvent.setup();

    render(<FileInput id="hidden-list" label="Hidden List" showFileList={false} />);

    const input = screen.getByLabelText(/hidden list/i, { selector: 'input' });
    const file = new File(['content'], 'sample.txt', { type: 'text/plain' });

    await user.upload(input, file);

    expect(screen.queryByText('sample.txt')).not.toBeInTheDocument();
    expect(screen.queryByText(/selected files/i)).not.toBeInTheDocument();
  });

  it('should trigger input click when dropzone is clicked or activated by keyboard', async () => {
    const user = userEvent.setup();

    render(<FileInput id="interactive-dropzone" label="Interactive Dropzone" />);

    const input = screen.getByLabelText(/interactive dropzone/i, { selector: 'input' });
    const clickSpy = vi.spyOn(input, 'click');
    const button = screen.getByRole('button', { name: /interactive dropzone/i });

    await user.click(button);

    expect(clickSpy).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(button, { key: 'Enter' });

    expect(clickSpy).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(button, { key: ' ' });

    expect(clickSpy).toHaveBeenCalledTimes(3);
  });

  it('should support controlled files prop', () => {
    const initialFile = new File(['alpha'], 'alpha.pdf', { type: 'application/pdf' });
    const nextFile = new File(['beta'], 'beta.pdf', { type: 'application/pdf' });

    const { rerender } = render(<FileInput label="Controlled Files" files={[initialFile]} />);

    expect(screen.getByText('alpha.pdf')).toBeInTheDocument();
    expect(screen.queryByText('beta.pdf')).not.toBeInTheDocument();

    rerender(<FileInput label="Controlled Files" files={[nextFile]} />);

    expect(screen.getByText('beta.pdf')).toBeInTheDocument();
    expect(screen.queryByText('alpha.pdf')).not.toBeInTheDocument();
  });

  it('should forward ref to the underlying file input element', () => {
    const ref = createRef<HTMLInputElement>();

    render(<FileInput ref={ref} label="Ref Target" />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current?.type).toBe('file');
  });

  it('should customize drag and browse text', () => {
    render(<FileInput label="Custom Text" dragText="Drag your assets," browseText="select file" />);

    expect(screen.getByText(/drag your assets,/i)).toBeInTheDocument();
    expect(screen.getByText('select file')).toBeInTheDocument();
  });
});
