import React, {
  forwardRef,
  useState,
  useRef,
  useEffect,
  useImperativeHandle,
  type DragEvent,
  type ChangeEvent,
} from 'react';
import clsx from 'clsx';
import css from './FileInput.module.scss';

import type { FileInputProps } from './FileInput.types';

export type { FileInputProps } from './FileInput.types';

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export const FileInput = forwardRef<HTMLInputElement, FileInputProps>(
  (
    {
      variant = 'primary',
      size = 'medium',
      label,
      hint,
      dragText = 'Drag & drop files here, or',
      browseText = 'browse',
      error: externalError,
      maxSize,
      maxFiles,
      files: controlledFiles,
      onFilesChange,
      onChange,
      showFileList = true,
      multiple = false,
      disabled = false,
      accept,
      className,
      id,
      ...props
    },
    ref,
  ) => {
    const [internalFiles, setInternalFiles] = useState<File[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    const currentFiles = controlledFiles !== undefined ? controlledFiles : internalFiles;

    const updateFiles = (newFiles: File[]) => {
      if (controlledFiles === undefined) {
        setInternalFiles(newFiles);
      }
      onFilesChange?.(newFiles);

      // Synchronize native input's FileList
      if (inputRef.current && newFiles.length === 0) {
        inputRef.current.value = '';
      }
    };

    // Synchronize native input when currentFiles changes
    useEffect(() => {
      if (inputRef.current && currentFiles.length === 0) {
        inputRef.current.value = '';
      }
    }, [currentFiles]);

    const validateAndFilterFiles = (
      incomingFiles: File[],
    ): { validFiles: File[]; error: string | null } => {
      let err: string | null = null;

      // Filter size-invalid files first
      const valid: File[] = [];
      for (const file of incomingFiles) {
        if (maxSize && file.size > maxSize) {
          err = `File "${file.name}" exceeds maximum allowed size of ${formatBytes(maxSize)}.`;
        } else {
          valid.push(file);
        }
      }

      // Apply file-count limit after size filtering
      if (maxFiles !== undefined) {
        const remaining = maxFiles - currentFiles.length;
        if (remaining <= 0) {
          err = `Maximum ${maxFiles} file${maxFiles > 1 ? 's' : ''} allowed.`;
          return { validFiles: [], error: err };
        }
        if (valid.length > remaining) {
          err = `Maximum ${maxFiles} file${maxFiles > 1 ? 's' : ''} allowed.`;
          return { validFiles: valid.slice(0, remaining), error: err };
        }
      }

      return { validFiles: valid, error: err };
    };

    const handleFilesAdded = (incomingList: FileList | File[]) => {
      if (disabled) return;
      const incomingArray = Array.from(incomingList);
      if (incomingArray.length === 0) return;

      const filesToProcess = multiple ? incomingArray : [incomingArray[0]];
      const { validFiles, error } = validateAndFilterFiles(filesToProcess);

      setValidationError(error);

      if (validFiles.length > 0) {
        if (multiple) {
          updateFiles([...currentFiles, ...validFiles]);
        } else {
          updateFiles(validFiles);
        }
      }
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFilesAdded(e.target.files);
      }
      onChange?.(e);
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (!disabled && e.dataTransfer.files) {
        handleFilesAdded(e.dataTransfer.files);
      }
    };

    const handleRemoveFile = (indexToRemove: number) => {
      if (disabled) return;
      const updated = currentFiles.filter((_, idx) => idx !== indexToRemove);
      updateFiles(updated);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    };

    const handleClearAll = () => {
      if (disabled) return;
      updateFiles([]);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    };

    const handleDropzoneClick = () => {
      if (!disabled && inputRef.current) {
        inputRef.current.click();
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
        e.preventDefault();
        inputRef.current?.click();
      }
    };

    const displayError = externalError || validationError;
    const isInvalid = Boolean(displayError);

    const dropzoneClasses = clsx(
      css.dropzone,
      css[variant],
      css[size],
      isDragging && css.isDragging,
      isInvalid && css.isInvalid,
      disabled && css.disabled,
      className,
    );

    return (
      <div className={css.wrapper}>
        {label && (
          <label htmlFor={id} className={css.label}>
            <span>{label}</span>
          </label>
        )}

        <div
          className={dropzoneClasses}
          onClick={handleDropzoneClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onKeyDown={handleKeyDown}
          tabIndex={disabled ? -1 : 0}
          role="button"
          aria-disabled={disabled}
          aria-label={typeof label === 'string' ? label : 'File Upload'}
        >
          <input
            {...props}
            id={id}
            ref={inputRef}
            type="file"
            multiple={multiple}
            disabled={disabled}
            accept={accept}
            onChange={handleInputChange}
            className={css.hiddenInput}
            tabIndex={-1}
          />

          <div className={css.iconContainer}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>

          <div className={css.dropzoneText}>
            <span className={css.mainText}>
              {dragText} <span className={css.browseLink}>{browseText}</span>
            </span>
            {hint && <span className={css.hintText}>{hint}</span>}
          </div>
        </div>

        {displayError && <div className={css.errorText}>{displayError}</div>}

        {showFileList && currentFiles.length > 0 && (
          <div className={css.fileListWrapper}>
            <div className={css.fileListHeader}>
              <span className={css.fileListTitle}>Selected files ({currentFiles.length})</span>
              {currentFiles.length > 1 && !disabled && (
                <button type="button" className={css.clearAllBtn} onClick={handleClearAll}>
                  Clear all
                </button>
              )}
            </div>
            <ul className={css.fileList}>
              {currentFiles.map((file, idx) => (
                <li key={`${file.name}-${idx}`} className={css.fileItem}>
                  <div className={css.fileInfo}>
                    <div className={css.fileIcon}>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <div className={css.fileMeta}>
                      <span className={css.fileName} title={file.name}>
                        {file.name}
                      </span>
                      <span className={css.fileSize}>{formatBytes(file.size)}</span>
                    </div>
                  </div>
                  {!disabled && (
                    <button
                      type="button"
                      className={css.removeButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile(idx);
                      }}
                      title="Remove file"
                      aria-label={`Remove ${file.name}`}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  },
);

FileInput.displayName = 'FileInput';

export default FileInput;
export { FileInput as CustomFileInput };
