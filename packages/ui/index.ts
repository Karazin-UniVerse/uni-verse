// Public exports for @universe/ui design system

import { Button, type ButtonProps } from './components/una/Button';
import { Modal, type ModalProps } from './components/una/Modal';
import { ProgressBar, type ProgressBarProps } from './components/una/ProgressBar';
import { Tag, type TagProps } from './components/una/Tag';
import { Select, type SelectProps, type Option } from './components/una/Select';
import { TextInput, type TextInputProps } from './components/una/inputs/TextInput';
import { SimpleForm, type SimpleFormProps } from './components/una/Form';
import { Spinner, type SpinnerProps } from './components/una/Spinner';
import { Skeleton, type SkeletonProps } from './components/una/Skeleton';
import {
  Toast,
  ToastProvider,
  useToast,
  type ToastApi,
  type ToastItem,
  type ToastKind,
  type ToastProviderProps,
  type ToastProps,
} from './components/una/Toast';
import { Empty, type EmptyProps } from './components/una/Empty';

// Additional input primitives
export * from './components/una/inputs/CheckBox';
export * from './components/una/inputs/DateTimePicker';
export * from './components/una/inputs/FileInput';
export * from './components/una/inputs/RadioButton';
export * from './components/una/inputs/SimpleSlider';

// 1. Button
export { Button, type ButtonProps };

// 2. Modal
export { Modal, type ModalProps };

// 3. ProgressBar
export { ProgressBar, type ProgressBarProps };

// 4. Tag
export { Tag, type TagProps };

// 5. Select
export { Select, type SelectProps, type Option };

// 6. Input and TextInput
export { TextInput as Input, TextInput, type TextInputProps as InputProps, type TextInputProps };

// 7. Form and SimpleForm
export { SimpleForm as Form, SimpleForm, type SimpleFormProps as FormProps, type SimpleFormProps };

// 8. Spinner
export { Spinner, type SpinnerProps };

// 9. Skeleton
export { Skeleton, type SkeletonProps };

// 10. Toast, ToastProvider, useToast
export {
  Toast,
  ToastProvider,
  useToast,
  type ToastApi,
  type ToastItem,
  type ToastKind,
  type ToastProviderProps,
  type ToastProps,
};

// 11. Empty
export { Empty, type EmptyProps };
