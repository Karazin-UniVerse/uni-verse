import React, { useState } from 'react';
import { Download, ExternalLink } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, FileInput, Form, Modal, Spinner, Tag, useToast } from '@una';
import { hasLoadFailed } from '@uni-hub/queries/load-state';
import { assignmentStatusQueryOptions } from '@uni-hub/queries/moodle/queries';
import { moodleKeys } from '@uni-hub/queries/moodle/queryKeys';
import { moodleApi } from '@uni-hub/services/api.moodle';
import type { CourseModule } from '@core/types/moodle';
import { useGamificationStore } from '@uni-hub/store/useGamificationStore';
import { BADGES } from '@uni-hub/constants/gamification';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { LoadErrorState } from '@uni-hub/components/common/LoadErrorState';
import type { TranslationKey } from '@uni-hub/i18n/translations';
import {
  canSubmitAssignment,
  extractUploadedItemId,
  readFileAsDataUrl,
} from './assignment-submission.helpers';
import styles from './AssignmentModal.module.scss';

interface SubmissionRequest {
  assignmentInstance: number;
  answerText: string;
  file: File | undefined;
}

interface AssignmentModalProps {
  visible: boolean;
  onClose: () => void;
  module: CourseModule | null;
  /** Unix seconds deadline for DEADLINE_SNIPER unlock */
  dueUnixSec?: number;
}

function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  return (doc.body.textContent ?? '').trim();
}

export const getAssignmentStatusLabel = (
  status: string,
  formatMessage: (key: TranslationKey) => string,
): string => {
  switch (status) {
    case 'submitted':
      return formatMessage('assignmentModal.statusSubmitted');
    case 'graded':
      return formatMessage('assignmentModal.statusGraded');
    case 'new':
      return formatMessage('assignmentModal.statusNew');
    case 'draft':
      return formatMessage('assignmentModal.statusDraft');
    default:
      return status;
  }
};

const AssignmentModal: React.FC<AssignmentModalProps> = ({
  visible,
  onClose,
  module,
  dueUnixSec,
}) => {
  const { formatMessage } = useLanguage();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [formError, setFormError] = useState('');

  const instance = module?.instance;
  const statusQuery = useQuery({
    ...assignmentStatusQueryOptions(instance ?? 0),
    enabled: visible && instance !== undefined,
  });
  const status = statusQuery.data;

  const submitMutation = useMutation({
    mutationFn: async ({ assignmentInstance, answerText, file }: SubmissionRequest) => {
      const uploaded = file
        ? await moodleApi.uploadFile(file.name, await readFileAsDataUrl(file))
        : undefined;

      await moodleApi.submitAssignment(
        assignmentInstance,
        answerText,
        extractUploadedItemId(uploaded?.data),
      );
    },
    onSuccess: (_result, request) =>
      queryClient.invalidateQueries({
        queryKey: moodleKeys.assignmentStatus(request.assignmentInstance),
      }),
  });

  const submitting = submitMutation.isPending;
  const uploadingFile = submitting && files.length > 0;

  const resetForm = (): void => {
    setText('');
    setFiles([]);
    setFormError('');
  };

  const handleClose = (): void => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (instance === undefined) return;

    if (!text.trim() && files.length === 0) {
      setFormError(formatMessage('assignmentModal.formRequired'));

      return;
    }

    setFormError('');

    try {
      await submitMutation.mutateAsync({
        assignmentInstance: instance,
        answerText: text,
        file: files[0],
      });
      toast.success(formatMessage('assignmentModal.submitSuccess'));
      useGamificationStore.getState().triggerCelebration();

      const deadline = dueUnixSec ?? module?.dueUnixSec ?? module?.duedate;
      const nowSec = Math.floor(Date.now() / 1000);

      if (deadline !== null && deadline !== undefined && deadline > 0 && nowSec <= deadline) {
        if (useGamificationStore.getState().unlockBadge('DEADLINE_SNIPER')) {
          toast.success(
            `Ачивка: ${BADGES.DEADLINE_SNIPER.title} — ${BADGES.DEADLINE_SNIPER.description}`,
          );
        }
      }

      setText('');
      setFiles([]);
    } catch (error) {
      console.error(error);
      toast.error(formatMessage('assignmentModal.submitError'));
    }
  };

  const tokenStr =
    typeof window !== 'undefined'
      ? localStorage.getItem('accessToken') || localStorage.getItem('moodleToken')
      : null;
  const canSubmit = canSubmitAssignment(status);

  const statusLabel =
    (status?.status && getAssignmentStatusLabel(status.status, formatMessage)) || status?.status;

  const moodleUrl =
    module?.url ||
    (module?.instance
      ? `https://moodle.universemvp.tech/mod/assign/view.php?a=${module.instance}`
      : undefined);

  let statusContent: React.ReactNode;

  if (hasLoadFailed(statusQuery)) {
    statusContent = <LoadErrorState onRetry={() => void statusQuery.refetch()} />;
  } else if (status) {
    statusContent = (
      <div className={styles.box}>
        <div className={styles.statusRow}>
          <strong>{formatMessage('assignmentModal.status')}: </strong>
          <Tag
            tone={
              status.status === 'submitted' || status.status === 'graded' ? 'success' : 'warning'
            }
          >
            {statusLabel}
          </Tag>
        </div>
        {status.grade && (
          <div>
            <strong>{formatMessage('assignmentModal.grade')}: </strong>
            <span>{status.grade}</span>
          </div>
        )}
      </div>
    );
  } else {
    statusContent = <p className={styles.muted}>{formatMessage('assignmentModal.noStatusData')}</p>;
  }

  return (
    <Modal
      open={visible}
      onClose={handleClose}
      title={module?.name || formatMessage('assignmentModal.defaultTitle')}
    >
      {statusQuery.isLoading ? (
        <Spinner tip={formatMessage('assignmentModal.loadingStatus')} />
      ) : (
        <div className={styles.content}>
          {moodleUrl && (
            <div className={styles.moodleActionRow}>
              <Button
                isLink
                href={moodleUrl}
                target="_blank"
                rel="noopener noreferrer"
                variant="secondary"
                size="small"
              >
                <ExternalLink size={14} style={{ marginRight: 6 }} />{' '}
                {formatMessage('assignmentModal.openMoodle')}
              </Button>
            </div>
          )}

          {module?.description && (
            <section>
              <h4>{formatMessage('assignmentModal.description')}</h4>
              <div className={styles.box} style={{ whiteSpace: 'pre-wrap' }}>
                {stripHtml(module.description)}
              </div>
            </section>
          )}

          {module?.contents && module.contents.length > 0 && (
            <section>
              <h4>{formatMessage('assignmentModal.attachedFiles')}</h4>
              <ul className={styles.fileList}>
                {module.contents.map((file, idx: number) => {
                  const url = (file.fileurl || '') + (tokenStr ? `?token=${tokenStr}` : '');

                  return (
                    <li key={`${file.filename}-${idx}`} className={styles.fileItem}>
                      <span>{file.filename}</span>
                      <Button
                        isLink
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="primary"
                        size="small"
                      >
                        <Download size={14} /> {formatMessage('assignmentModal.download')}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section>
            <h4>{formatMessage('assignmentModal.submissionStatus')}</h4>
            {statusContent}
          </section>

          {canSubmit && (
            <section>
              <h4>{formatMessage('assignmentModal.submitTitle')}</h4>
              <Form variant="simple" action={handleSubmit} className={styles.form}>
                <label className={styles.field}>
                  <span>{formatMessage('assignmentModal.answerText')}</span>
                  <textarea
                    className={styles.textarea}
                    rows={6}
                    placeholder={formatMessage('assignmentModal.placeholder')}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    name="text"
                  />
                </label>

                <FileInput
                  label={formatMessage('assignmentModal.attachFile')}
                  files={files}
                  onFilesChange={setFiles}
                  maxFiles={1}
                  size="small"
                  dragText={formatMessage('assignmentModal.dragDrop')}
                  browseText={formatMessage('assignmentModal.browse')}
                />

                {formError && <p className={styles.error}>{formError}</p>}

                <div className={styles.actions}>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleClose}
                    disabled={submitting}
                  >
                    {formatMessage('assignmentModal.cancel')}
                  </Button>
                  <Button type="submit" variant="primary" disabled={submitting || uploadingFile}>
                    {uploadingFile
                      ? formatMessage('assignmentModal.uploading')
                      : formatMessage('assignmentModal.submit')}
                  </Button>
                </div>
              </Form>
            </section>
          )}
        </div>
      )}
    </Modal>
  );
};

export default AssignmentModal;
