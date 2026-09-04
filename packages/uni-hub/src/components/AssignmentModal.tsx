import React, { useState, useEffect } from 'react';
import { Download, ExternalLink } from 'lucide-react';
import { SimpleButton, FileInput, SimpleForm } from '../design-system';
import { moodleApi } from '../services/api';
import type { CourseModule } from '../types';
import { Modal } from './ui/Modal';
import { Spinner } from './ui/Spinner';
import { Tag } from './ui/Tag';
import { useToast } from './ui/Toast';
import { useGamificationStore } from '../store/useGamificationStore';
import { BADGES } from '../constants/gamification';
import styles from './AssignmentModal.module.scss';

interface AssignmentModalProps {
  visible: boolean;
  onClose: () => void;
  module: CourseModule | null;
  /** Unix seconds deadline for DEADLINE_SNIPER unlock */
  dueUnixSec?: number;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>?/gm, '').trim();
}

const AssignmentModal: React.FC<AssignmentModalProps> = ({
  visible,
  onClose,
  module,
  dueUnixSec,
}) => {
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
      toast.error('Не удалось загрузить статус задания');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    if (visible && module?.instance) {
      const currentInstance = module.instance;
      setLoading(true);
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
            toast.error('Не удалось загрузить статус задания');
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
    } else {
      setStatus(null);
      setText('');
      setFiles([]);
      setFormError('');
    }

    return () => {
      cancelled = true;
    };
  }, [visible, module?.instance, toast]);

  const handleSubmit = async () => {
    if (!module?.instance) return;

    if (!text.trim() && files.length === 0) {
      setFormError('Пожалуйста, введите текст решения или прикрепите файл');
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
          reader.onerror = (error) => reject(error);
        });

        const uploadRes = await moodleApi.uploadFile(actualFile.name, base64);
        const uploaded = uploadRes.data as Array<{ itemid?: number }> | undefined;
        if (Array.isArray(uploaded) && uploaded.length > 0) {
          fileItemId = uploaded[0].itemid;
        }
      }

      await moodleApi.submitAssignment(module.instance, text, fileItemId);
      toast.success('Решение успешно отправлено');
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
      toast.error('Ошибка при отправке решения');
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
    status?.status === 'submitted'
      ? 'Сдано на проверку'
      : status?.status === 'graded'
        ? 'Оценено'
        : status?.status === 'new'
          ? 'Нет попытки'
          : status?.status;

  const moodleUrl =
    module?.url ||
    (module?.instance
      ? `https://moodle.karazin.ua/mod/assign/view.php?a=${module.instance}`
      : undefined);

  return (
    <Modal open={visible} onClose={onClose} title={module?.name || 'Задание'}>
      {loading ? (
        <Spinner tip="Загрузка статуса..." />
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
                <ExternalLink size={14} style={{ marginRight: 6 }} /> Открыть оригинальное задание
                на Moodle
              </SimpleButton>
            </div>
          )}

          {module?.description && (
            <section>
              <h4>Описание</h4>
              <div className={styles.box} style={{ whiteSpace: 'pre-wrap' }}>
                {stripHtml(module.description)}
              </div>
            </section>
          )}

          {module?.contents && module.contents.length > 0 && (
            <section>
              <h4>Прикрепленные файлы</h4>
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
                        <Download size={14} /> Скачать
                      </SimpleButton>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section>
            <h4>Статус сдачи</h4>
            {status ? (
              <div className={styles.box}>
                <div className={styles.statusRow}>
                  <strong>Статус: </strong>
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
                    <strong>Оценка: </strong>
                    <span>{status.grade}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className={styles.muted}>Нет данных о статусе</p>
            )}
          </section>

          {canSubmit && (
            <section>
              <h4>Отправить решение</h4>
              <SimpleForm variant="simple" action={handleSubmit} className={styles.form}>
                <label className={styles.field}>
                  <span>Текст ответа</span>
                  <textarea
                    className={styles.textarea}
                    rows={6}
                    placeholder="Введите ваш ответ здесь..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    name="text"
                  />
                </label>

                <FileInput
                  label="Прикрепить файл"
                  files={files}
                  onFilesChange={setFiles}
                  maxFiles={1}
                  size="small"
                  dragText="Перетащите файл сюда или"
                  browseText="выберите"
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
                    Отмена
                  </SimpleButton>
                  <SimpleButton
                    type="submit"
                    variant="primary"
                    size="medium"
                    disabled={submitting || uploadingFile}
                  >
                    {uploadingFile ? 'Загрузка файла...' : 'Отправить'}
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
