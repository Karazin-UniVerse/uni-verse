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
  t: (key: TranslationKey) => string,
): string => {
  switch (status) {
    case 'submitted':
      return t('assignmentModal.statusSubmitted');
    case 'graded':
      return t('assignmentModal.statusGraded');
    case 'new':
      return t('assignmentModal.statusNew');
    case 'draft':
      return t('assignmentModal.statusDraft');
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
  const { t } = useLanguage();
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
      toast.error(t('assignmentModal.loadStatusError'));
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
            toast.error(t('assignmentModal.loadStatusError'));
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
  }, [visible, module?.instance, t, toast]);

  const handleSubmit = async () => {
    if (!module?.instance) return;

    if (!text.trim() && files.length === 0) {
      setFormError(t('assignmentModal.formRequired'));

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
      toast.success(t('assignmentModal.submitSuccess'));
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
      toast.error(t('assignmentModal.submitError'));
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
    (status?.status && getAssignmentStatusLabel(status.status, t)) || status?.status;

  const moodleUrl =
    module?.url ||
    (module?.instance
      ? `https://moodle.universemvp.tech/mod/assign/view.php?a=${module.instance}`
      : undefined);

  return (
    <Modal
      open={visible}
      onClose={onClose}
      title={module?.name || t('assignmentModal.defaultTitle')}
    >
      {loading ? (
        <Spinner tip={t('assignmentModal.loadingStatus')} />
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
                {t('assignmentModal.openMoodle')}
              </SimpleButton>
            </div>
          )}

          {module?.description && (
            <section>
              <h4>{t('assignmentModal.description')}</h4>
              <div className={styles.box} style={{ whiteSpace: 'pre-wrap' }}>
                {stripHtml(module.description)}
              </div>
            </section>
          )}

          {module?.contents && module.contents.length > 0 && (
            <section>
              <h4>{t('assignmentModal.attachedFiles')}</h4>
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
                        <Download size={14} /> {t('assignmentModal.download')}
                      </SimpleButton>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section>
            <h4>{t('assignmentModal.submissionStatus')}</h4>
            {status ? (
              <div className={styles.box}>
                <div className={styles.statusRow}>
                  <strong>{t('assignmentModal.status')}: </strong>
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
                    <strong>{t('assignmentModal.grade')}: </strong>
                    <span>{status.grade}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className={styles.muted}>{t('assignmentModal.noStatusData')}</p>
            )}
          </section>

          {canSubmit && (
            <section>
              <h4>{t('assignmentModal.submitTitle')}</h4>
              <SimpleForm variant="simple" action={handleSubmit} className={styles.form}>
                <label className={styles.field}>
                  <span>{t('assignmentModal.answerText')}</span>
                  <textarea
                    className={styles.textarea}
                    rows={6}
                    placeholder={t('assignmentModal.placeholder')}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    name="text"
                  />
                </label>

                <FileInput
                  label={t('assignmentModal.attachFile')}
                  files={files}
                  onFilesChange={setFiles}
                  maxFiles={1}
                  size="small"
                  dragText={t('assignmentModal.dragDrop')}
                  browseText={t('assignmentModal.browse')}
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
                    {t('assignmentModal.cancel')}
                  </SimpleButton>
                  <SimpleButton
                    type="submit"
                    variant="primary"
                    size="medium"
                    disabled={submitting || uploadingFile}
                  >
                    {uploadingFile ? t('assignmentModal.uploading') : t('assignmentModal.submit')}
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
