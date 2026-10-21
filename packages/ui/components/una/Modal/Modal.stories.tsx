import type { Meta, StoryObj } from '@storybook/react-vite';

import { FixedCell } from '../../../storybook/FixedCell/FixedCell';
import { VariantMatrix } from '../../../storybook/VariantMatrix/VariantMatrix';
import { Modal } from './Modal';
import type { ModalProps } from './Modal.types';
import { noop } from '@core/utils/fn';

type MatrixTitle = 'with title' | 'without title';
type MatrixClose = 'with close button' | 'without close button';

const MATRIX_TITLES: Record<MatrixTitle, Pick<ModalProps, 'title' | 'ariaLabel'>> = {
  'with title': { title: 'Title' },
  'without title': { ariaLabel: 'Content' },
};
const MATRIX_CLOSE: Record<MatrixClose, Pick<ModalProps, 'closeButton'>> = {
  'with close button': {},
  'without close button': { closeButton: false },
};

const meta = {
  title: 'Una/Feedback/Modal',
  component: Modal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    open: {
      control: 'boolean',
      description: 'Стан видимості модального вікна',
    },
    title: {
      control: 'text',
      description: 'Заголовок модального вікна',
    },
    width: {
      control: 'text',
      description: 'Ширина модального вікна (число в пікселях або CSS-рядок)',
    },
    closeLabel: {
      control: 'text',
      description: 'Текст aria-label та підказка для кнопки закриття',
    },
    closeButton: {
      control: 'boolean',
      description: 'Відображати кнопку закриття (хрестик) у шапці',
    },
  },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Matrix: Story = {
  args: {
    open: true,
    onClose: noop,
    children: null,
  },
  parameters: {
    layout: 'padded',
  },
  render: () => (
    <VariantMatrix
      rows={Object.keys(MATRIX_TITLES) as MatrixTitle[]}
      columns={Object.keys(MATRIX_CLOSE) as MatrixClose[]}
      renderCell={(title: MatrixTitle, close: MatrixClose) => (
        <FixedCell width={380} height={220}>
          <Modal
            open
            onClose={noop}
            closeLabel="Close"
            closeOnClickOutside={false}
            closeOnEscape={false}
            lockScroll={false}
            restoreFocus={false}
            trapFocus={false}
            width={320}
            {...MATRIX_TITLES[title]}
            {...MATRIX_CLOSE[close]}
          >
            Modal content
          </Modal>
        </FixedCell>
      )}
    />
  ),
};
