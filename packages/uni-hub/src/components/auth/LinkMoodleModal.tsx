'use client';

import React, { useState } from 'react';
import { User, Lock } from 'lucide-react';
import { Modal, Button, SimpleForm, useToast } from '@una';
import { authApi } from '@uni-hub/services/api';
import { AuthField } from './AuthField';
import styles from './LinkMoodleModal.module.scss';

export interface LinkMoodleModalProps {
  onClose: () => void;
  onSuccess: () => void;
  open: boolean;
}

export const LinkMoodleModal: React.FC<LinkMoodleModalProps> = ({ onClose, onSuccess, open }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  const handleLink = async () => {
    setError('');

    if (!username.trim()) {
      setError('Будь ласка, введіть логін або email у Moodle');

      return;
    }

    if (!password) {
      setError('Будь ласка, введіть пароль від Moodle');

      return;
    }

    setLoading(true);

    try {
      await authApi.linkMoodleAccount(username.trim(), password);

      toast.success('Moodle-акаунт успішно прив’язано!');
      onSuccess();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data
          ?.message ||
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        (err as Error).message ||
        'Помилка прив’язки акаунта. Перевірте логін та пароль.';

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Прив'язка облікового запису Moodle" width={440}>
      <SimpleForm action={handleLink} className={styles.modalContent}>
        <p className={styles.description}>
          Щоб завантажити ваші курси, розклад та оцінки, введіть логін і пароль від Moodle. Це
          необхідно зробити лише один раз — надалі вхід виконуватиметься через Google в один клік.
        </p>

        <AuthField
          id="link-moodle-username"
          name="moodleUsername"
          label="Логін або email у Moodle"
          placeholder="Логін у Moodle"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          icon={<User size={16} />}
        />

        <AuthField
          id="link-moodle-password"
          name="moodlePassword"
          type="password"
          label="Пароль у Moodle"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          icon={<Lock size={16} />}
        />

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Скасувати
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Прив’язка...' : 'Прив’язати Moodle'}
          </Button>
        </div>
      </SimpleForm>
    </Modal>
  );
};

export default LinkMoodleModal;
