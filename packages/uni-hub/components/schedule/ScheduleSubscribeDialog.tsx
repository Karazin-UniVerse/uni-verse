import React from 'react';
import { Copy } from 'lucide-react';
import { Button, Modal, TextInput } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import dialog from '../timetable/dialog.module.scss';

type ScheduleSubscribeDialogProps = {
  open: boolean;
  feedUrl: string;
  isCopied: boolean;
  error: string | null;
  onCopy: () => void;
  onClose: () => void;
};

export const ScheduleSubscribeDialog: React.FC<ScheduleSubscribeDialogProps> = ({
  open,
  feedUrl,
  isCopied,
  error,
  onCopy,
  onClose,
}) => {
  const { formatMessage } = useLanguage();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={formatMessage('schedule.subscribeTitle')}
      description={formatMessage('schedule.subscribeDescription')}
      closeLabel={formatMessage('common.close')}
      width={560}
      footer={
        <Button type="button" variant="secondary" onClick={onClose}>
          {formatMessage('schedule.close')}
        </Button>
      }
    >
      <div className={dialog.form}>
        {error ? (
          <p className={dialog.alert} role="alert">
            {error}
          </p>
        ) : (
          <div className={dialog.copyRow}>
            <TextInput
              readOnly
              value={feedUrl}
              aria-label={formatMessage('schedule.subscribeTitle')}
              onFocus={(event) => event.target.select()}
            />
            <Button type="button" onClick={onCopy} disabled={!feedUrl}>
              <Copy size={16} aria-hidden="true" />{' '}
              {formatMessage(isCopied ? 'schedule.feedUrlCopied' : 'schedule.copyFeedUrl')}
            </Button>
          </div>
        )}
        <p className={dialog.hint}>{formatMessage('schedule.subscribeHint')}</p>
      </div>
    </Modal>
  );
};
