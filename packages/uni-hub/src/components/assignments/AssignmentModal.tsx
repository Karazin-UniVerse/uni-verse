import React, { useState, useEffect } from 'react';
import { Download, ExternalLink } from 'lucide-react';
import { Button as SimpleButton, FileInput, SimpleForm, Modal, Spinner, Tag, useToast } from '@una';
import { moodleApi } from '@uni-hub/services/api';
import type { CourseModule } from '@uni-hub/types';
import { useGamificationStore } from '@uni-hub/store/useGamificationStore';
import { BADGES } from '@uni-hub/constants/gamification';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { TranslationKey } from '@uni-hub/i18n/translations';
import styles from './AssignmentModal.module.scss';

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

export const ASSIGNMENT_STATUS_LABELS: Record<string, string> = {
  submitted: 'Здано на перевірку',
  graded: 'Оцінено',
  new: 'Немає спроби',
  draft: 'Чернетка',
};

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
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [status, setStatus] = useState<{ status?: string; grade?: string } | null>(null);
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [formError, setFormError] = useState('');
  const toast = useToast();

  const fetchStatus = async () => {
    if (!module?.instance) return;

    setLoading(true);

    try {
      const response = await moodleApi.getAssignmentStatus(module.instance);

      setStatus(response.data as { status?: string; grade?: string } | null);
    } catch (error) {
      console.error(error);
      toast.error(formatMessage('assignmentModal.loadStatusError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    if (visible && module?.instance) {
      const currentInstance = module.instance;

      queueMicrotask(() => {
        if (!cancelled) {
          setLoading(true);
        }
      });

      moodleApi
        .getAssignmentStatus(currentInstance)
        .then((response) => {
          if (!cancelled) {
            setStatus(response.data as { status?: string; grade?: string } | null);
          }
        })
        .catch((error) => {
          if (!cancelled) {
            console.error(error);
            toast.error(formatMessage('assignmentModal.loadStatusError'));
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
    } else {
      queueMicrotask(() => {
        if (!cancelled) {
          setStatus(null);
          setText('');
          setFiles([]);
          setFormError('');
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, [visible, module?.instance, formatMessage, toast]);

  const handleSubmit = async () => {
    if (!module?.instance) return;

    if (!text.trim() && files.length === 0) {
      setFormError(formatMessage('assignmentModal.formRequired'));

      return;
    }

    setFormError('');
    setSubmitting(true);
    let fileItemId: number | undefined;

    try {
      if (files.length > 0) {
        setUploadingFile(true);
        const actualFile = files[0];
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();

          reader.readAsDataURL(actualFile);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () =>
            reject(reader.error ?? new Error('Failed to read file as data URL'));
        });

        const uploadRes = await moodleApi.uploadFile(actualFile.name, base64);
        const uploaded = uploadRes.data as Array<{ itemid?: number }> | undefined;

        if (Array.isArray(uploaded) && uploaded.length > 0) {
          fileItemId = uploaded[0].itemid;
        }
      }

      await moodleApi.submitAssignment(module.instance, text, fileItemId);
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

      fetchStatus();
      setText('');
      setFiles([]);
    } catch (error) {
      console.error(error);
      toast.error(formatMessage('assignmentModal.submitError'));
    } finally {
      setUploadingFile(false);
      setSubmitting(false);
    }
  };

  const tokenStr =
    typeof window !== 'undefined'
      ? localStorage.getItem('accessToken') || localStorage.getItem('moodleToken')
      : null;
  const canSubmit = !status || status.status === 'new' || status.status === 'draft';

  const statusLabel =
    (status?.status && getAssignmentStatusLabel(status.status, formatMessage)) || status?.status;

  const moodleUrl =
    module?.url ||
    (module?.instance
      ? `https://moodle.universemvp.tech/mod/assign/view.php?a=${module.instance}`
      : undefined);

  return (
    <Modal
      open={visible}
      onClose={onClose}
      title={module?.name || formatMessage('assignmentModal.defaultTitle')}
    >
      {loading ? (
        <Spinner tip={formatMessage('assignmentModal.loadingStatus')} />
      ) : (
        <div className={styles.content}>
          {moodleUrl && (
            <div className={styles.moodleActionRow}>
              <SimpleButton
                isLink
                href={moodleUrl}
                target="_blank"
                rel="noopener noreferrer"
                variant="secondary"
                size="small"
              >
                <ExternalLink size={14} style={{ marginRight: 6 }} />{' '}
                {formatMessage('assignmentModal.openMoodle')}
              </SimpleButton>
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
                      <SimpleButton
                        isLink
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="primary"
                        size="small"
                      >
                        <Download size={14} /> {formatMessage('assignmentModal.download')}
                      </SimpleButton>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section>
            <h4>{formatMessage('assignmentModal.submissionStatus')}</h4>
            {status ? (
              <div className={styles.box}>
                <div className={styles.statusRow}>
                  <strong>{formatMessage('assignmentModal.status')}: </strong>
                  <Tag
                    tone={
                      status.status === 'submitted' || status.status === 'graded'
                        ? 'success'
                        : 'warning'
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
            ) : (
              <p className={styles.muted}>{formatMessage('assignmentModal.noStatusData')}</p>
            )}
          </section>

          {canSubmit && (
            <section>
              <h4>{formatMessage('assignmentModal.submitTitle')}</h4>
              <SimpleForm variant="simple" action={handleSubmit} className={styles.form}>
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
                  <SimpleButton
                    type="button"
                    variant="secondary"
                    size="medium"
                    onClick={onClose}
                    disabled={submitting}
                  >
                    {formatMessage('assignmentModal.cancel')}
                  </SimpleButton>
                  <SimpleButton
                    type="submit"
                    variant="primary"
                    size="medium"
                    disabled={submitting || uploadingFile}
                  >
                    {uploadingFile
                      ? formatMessage('assignmentModal.uploading')
                      : formatMessage('assignmentModal.submit')}
                  </SimpleButton>
                </div>
              </SimpleForm>
            </section>
          )}
        </div>
      )}
    </Modal>
  );
};

export default AssignmentModal;
