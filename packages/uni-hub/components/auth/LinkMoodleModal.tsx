'use client';

import React, { useState } from 'react';
import { Lock, User } from 'lucide-react';
import { Modal, Button, Form, useToast } from '@una';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { useLinkMoodle } from '@uni-hub/hooks/useAuthMutations';
import { AuthField } from './AuthField';
import {
  type AuthErrorState,
  LinkMoodleMode,
  formatAuthError,
  getLinkMoodleContentKeys,
  resolveAuthError,
} from './helpers';
import styles from './LinkMoodleModal.module.scss';

export interface LinkMoodleModalProps {
  onClose: () => void;
  onSuccess: () => void;
  open: boolean;
  mode?: LinkMoodleMode;
}

export const LinkMoodleModal: React.FC<LinkMoodleModalProps> = ({
  onClose,
  onSuccess,
  open,
  mode = LinkMoodleMode.CONNECT,
}) => {
  const { formatMessage } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<AuthErrorState>(null);
  const [prevOpen, setPrevOpen] = useState(open);

  if (prevOpen !== open) {
    setPrevOpen(open);

    if (!open) {
      setError(null);
    }
  }

  const linkMoodle = useLinkMoodle();
  const loading = linkMoodle.isPending;
  const toast = useToast();

  const handleClose = (): void => {
    setError(null);
    onClose();
  };

  const contentKeys = getLinkMoodleContentKeys(mode);
  const title = formatMessage(contentKeys.titleKey);
  const hint = formatMessage(contentKeys.hintKey);
  const submitLabel = formatMessage(contentKeys.submitKey);
  const displayedError = formatAuthError(error, formatMessage);

  const handleLink = async (): Promise<void> => {
    setError(null);

    if (!username.trim()) {
      setError({ key: 'login.linkMoodleEnterUsername' });

      return;
    }

    if (!password) {
      setError({ key: 'login.linkMoodleEnterPassword' });

      return;
    }

    try {
      await linkMoodle.mutateAsync({ username: username.trim(), password });

      toast.success(formatMessage(contentKeys.successKey));
      setError(null);
      onSuccess();
    } catch (err: unknown) {
      const authError = resolveAuthError(err, 'login.linkMoodleError');

      setError(authError);
      toast.error(formatAuthError(authError, formatMessage));
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      closeLabel={formatMessage('modal.close')}
      width={400}
    >
      <Form variant="simple" action={handleLink} className={styles.modalContent}>
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
          key={open ? 'open' : 'closed'}
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

        {displayedError && <p className={styles.error}>{displayedError}</p>}

        <div className={styles.actions}>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            {formatMessage('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? formatMessage('login.linkMoodleLoading') : submitLabel}
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default LinkMoodleModal;
