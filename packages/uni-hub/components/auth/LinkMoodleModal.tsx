'use client';

import React, { useState } from 'react';
import { User, Lock } from 'lucide-react';
import { Modal, Button, SimpleForm, useToast } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { authApi, getErrorMessage } from '@uni-hub/services/api';
import { AuthField } from './AuthField';
import styles from './LinkMoodleModal.module.scss';

export interface LinkMoodleModalProps {
  mode?: 'connect' | 'change';
  onClose: () => void;
  onSuccess: () => void;
  open: boolean;
}

export const LinkMoodleModal: React.FC<LinkMoodleModalProps> = ({
  onClose,
  onSuccess,
  open,
  mode = 'connect',
}) => {
  const { formatMessage } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  const isChangeMode = mode === 'change';
  const title = formatMessage(isChangeMode ? 'login.changeMoodleTitle' : 'login.linkMoodleTitle');
  const hint = formatMessage(isChangeMode ? 'login.changeMoodleHint' : 'login.linkMoodleHint');
  const submitLabel = formatMessage(
    isChangeMode ? 'login.changeMoodleSubmit' : 'login.linkMoodleSubmit',
  );

  const handleLink = async () => {
    setError('');

    if (!username.trim()) {
      setError(formatMessage('login.linkMoodleEnterUsername'));

      return;
    }

    if (!password) {
      setError(formatMessage('login.linkMoodleEnterPassword'));

      return;
    }

    setLoading(true);

    try {
      await authApi.linkMoodleAccount(username.trim(), password);

      toast.success(
        formatMessage(isChangeMode ? 'login.changeMoodleSuccess' : 'login.linkMoodleSuccess'),
      );
      onSuccess();
    } catch (err: unknown) {
      const message = getErrorMessage(err, formatMessage('login.linkMoodleError'));

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      closeLabel={formatMessage('modal.close')}
      width={400}
    >
      <SimpleForm variant="simple" action={handleLink} className={styles.modalContent}>
        <p className={styles.description}>{hint}</p>

        <AuthField
          id="modal-link-moodle-username"
          name="moodleUsername"
          label={formatMessage('login.linkMoodleUsername')}
          placeholder={formatMessage('login.linkMoodleUsernamePlaceholder')}
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          icon={<User size={16} />}
        />

        <AuthField
          id="modal-link-moodle-password"
          name="moodlePassword"
          type="password"
          label={formatMessage('login.linkMoodlePassword')}
          placeholder={formatMessage('login.linkMoodlePasswordPlaceholder')}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          icon={<Lock size={16} />}
        />

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {formatMessage('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? formatMessage('login.linkMoodleLoading') : submitLabel}
          </Button>
        </div>
      </SimpleForm>
    </Modal>
  );
};

export default LinkMoodleModal;
