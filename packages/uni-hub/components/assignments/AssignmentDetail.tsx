import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, ExternalLink } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, FileInput, Form, Spinner, Tag, useToast } from '@una';
import { BackButton } from '@ui';
import { hasLoadFailed } from '@uni-hub/queries/load-state';
import {
  assignmentStatusQueryOptions,
  courseContentsQueryOptions,
} from '@uni-hub/queries/moodle/queries';
import { moodleKeys } from '@uni-hub/queries/moodle/queryKeys';
import { moodleApi } from '@uni-hub/services/api.moodle';
import type { Assignment } from '@core/types/moodle';
import { useGamificationStore } from '@uni-hub/store/useGamificationStore';
import { BADGES } from '@uni-hub/constants/gamification';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { LoadErrorState } from '@uni-hub/components/common/LoadErrorState';
import type { TranslationKey } from '@uni-hub/i18n/translations';
import { STUDY_VIEW } from '@uni-hub/views/dashboard/constants';
import { getStudyHref } from '@uni-hub/views/dashboard/routes';
import {
  canSubmitAssignment,
  extractUploadedItemId,
  findAssignmentModule,
  readFileAsDataUrl,
} from './helpers';
import styles from './AssignmentDetail.module.scss';

interface SubmissionRequest {
  assignmentInstance: number;
  answerText: string;
  file: File | undefined;
}

interface AssignmentDetailProps {
  assignmentId: number;
  courseId: number | null;
  assignment: Assignment | undefined;
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
      return formatMessage('assignmentDetail.statusSubmitted');
    case 'graded':
      return formatMessage('assignmentDetail.statusGraded');
    case 'new':
      return formatMessage('assignmentDetail.statusNew');
    case 'draft':
      return formatMessage('assignmentDetail.statusDraft');
    default:
      return status;
  }
};

export const AssignmentDetail: React.FC<AssignmentDetailProps> = ({
  assignmentId,
  courseId,
  assignment,
}) => {
  const router = useRouter();
  const { formatMessage } = useLanguage();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [formError, setFormError] = useState('');

  const courseContentsQuery = useQuery({
    ...courseContentsQueryOptions(courseId ?? 0),
    enabled: courseId !== null,
  });
  const courseModule = findAssignmentModule([courseContentsQuery.data], assignmentId);
  const statusQuery = useQuery(assignmentStatusQueryOptions(assignmentId));
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

  const handleBack = (): void => router.push(getStudyHref(STUDY_VIEW.Assignments));

  const handleSubmit = async (): Promise<void> => {
    if (!text.trim() && files.length === 0) {
      setFormError(formatMessage('assignmentDetail.formRequired'));

      return;
    }

    setFormError('');

    try {
      await submitMutation.mutateAsync({
        assignmentInstance: assignmentId,
        answerText: text,
        file: files[0],
      });
      toast.success(formatMessage('assignmentDetail.submitSuccess'));
      useGamificationStore.getState().triggerCelebration();

      const deadline = assignment?.duedate ?? courseModule?.dueUnixSec ?? courseModule?.duedate;
      const nowSec = Math.floor(Date.now() / 1000);

      if (deadline !== null && deadline !== undefined && deadline > 0 && nowSec <= deadline) {
        if (useGamificationStore.getState().unlockBadge('DEADLINE_SNIPER')) {
          toast.success(
            `Ачивка: ${BADGES.DEADLINE_SNIPER.title} — ${BADGES.DEADLINE_SNIPER.description}`,
          );
        }
      }

      resetForm();
    } catch (error) {
      console.error(error);
      toast.error(formatMessage('assignmentDetail.submitError'));
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
    courseModule?.url || `https://moodle.universemvp.tech/mod/assign/view.php?a=${assignmentId}`;
  const description = courseModule?.description ?? assignment?.description;

  let statusContent: React.ReactNode;

  if (hasLoadFailed(statusQuery)) {
    statusContent = <LoadErrorState onRetry={() => void statusQuery.refetch()} />;
  } else if (status) {
    statusContent = (
      <div className={styles.box}>
        <div className={styles.statusRow}>
          <strong>{formatMessage('assignmentDetail.status')}: </strong>
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
            <strong>{formatMessage('assignmentDetail.grade')}: </strong>
            <span>{status.grade}</span>
          </div>
        )}
      </div>
    );
  } else {
    statusContent = (
      <p className={styles.muted}>{formatMessage('assignmentDetail.noStatusData')}</p>
    );
  }

  return (
    <div className={styles.page}>
      <BackButton label={formatMessage('assignmentPage.back')} onClick={handleBack} />

      <h3>
        {assignment?.name ?? courseModule?.name ?? formatMessage('assignmentDetail.defaultTitle')}
      </h3>

      {statusQuery.isLoading ? (
        <Spinner tip={formatMessage('assignmentDetail.loadingStatus')} />
      ) : (
        <div className={styles.content}>
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
              {formatMessage('assignmentDetail.openMoodle')}
            </Button>
          </div>

          {description && (
            <section>
              <h4>{formatMessage('assignmentDetail.description')}</h4>
              <div className={styles.box} style={{ whiteSpace: 'pre-wrap' }}>
                {stripHtml(description)}
              </div>
            </section>
          )}

          {courseModule?.contents && courseModule.contents.length > 0 && (
            <section>
              <h4>{formatMessage('assignmentDetail.attachedFiles')}</h4>
              <ul className={styles.fileList}>
                {courseModule.contents.map((file, idx: number) => {
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
                        <Download size={14} /> {formatMessage('assignmentDetail.download')}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section>
            <h4>{formatMessage('assignmentDetail.submissionStatus')}</h4>
            {statusContent}
          </section>

          {canSubmit && (
            <section>
              <h4>{formatMessage('assignmentDetail.submitTitle')}</h4>
              <Form variant="simple" action={handleSubmit} className={styles.form}>
                <label className={styles.field}>
                  <span>{formatMessage('assignmentDetail.answerText')}</span>
                  <textarea
                    className={styles.textarea}
                    rows={6}
                    placeholder={formatMessage('assignmentDetail.placeholder')}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    name="text"
                  />
                </label>

                <FileInput
                  label={formatMessage('assignmentDetail.attachFile')}
                  files={files}
                  onFilesChange={setFiles}
                  maxFiles={1}
                  size="small"
                  dragText={formatMessage('assignmentDetail.dragDrop')}
                  browseText={formatMessage('assignmentDetail.browse')}
                />

                {formError && <p className={styles.error}>{formError}</p>}

                <div className={styles.actions}>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleBack}
                    disabled={submitting}
                  >
                    {formatMessage('assignmentDetail.cancel')}
                  </Button>
                  <Button type="submit" variant="primary" disabled={submitting || uploadingFile}>
                    {uploadingFile
                      ? formatMessage('assignmentDetail.uploading')
                      : formatMessage('assignmentDetail.submit')}
                  </Button>
                </div>
              </Form>
            </section>
          )}
        </div>
      )}
    </div>
  );
};
