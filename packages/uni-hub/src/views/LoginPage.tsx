'use client';

import React, { useState } from 'react';
import { User, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button, TextInput, SimpleForm, useToast } from '@una';
import { ThemeSwitcher } from '@uni-hub/theme/ThemeSwitcher';
import { authApi } from '@uni-hub/services/api';
import styles from './LoginPage.module.scss';

function extractErrorMessage(err: unknown): string {
  const responseData = (err as { response?: { data?: { error?: string; message?: string } } })
    ?.response?.data;

  return responseData?.message || responseData?.error || 'Помилка входу. Перевірте облікові дані.';
}

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const toast = useToast();

  const handleLogin = async () => {
    setError('');

    if (!username.trim()) {
      setError('Будь ласка, введіть імʼя користувача або email');

      return;
    }

    if (!password) {
      setError('Будь ласка, введіть пароль');

      return;
    }

    setLoading(true);

    try {
      const res = await authApi.login(username, password);

      toast.success('Вхід виконано успішно');

      if (res.data?.token) {
        localStorage.setItem('moodleToken', res.data.token);
      }

      router.push('/');
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.themeBar}>
        <ThemeSwitcher />
      </div>
      <div className={styles.center}>
        <SimpleForm variant="card" className={styles.card} action={handleLogin}>
          <div className={styles.brand}>
            <h1>UNiVerse</h1>
            <p>Увійдіть у свій акаунт Moodle</p>
          </div>

          <label className={styles.field}>
            <span className={styles.label}>Імʼя користувача або корпоративний email</span>
            <div className={styles.inputWrap}>
              <User size={16} className={styles.icon} />
              <TextInput
                name="username"
                size="large"
                placeholder="melnyk.bogdan@student.karazin.ua"
                value={username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Пароль</span>
            <div className={styles.inputWrap}>
              <Lock size={16} className={styles.icon} />
              <TextInput
                name="password"
                type="password"
                size="large"
                placeholder="Введіть пароль"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <Button
            type="submit"
            variant="primary"
            size="large"
            disabled={loading}
            className={styles.submit}
          >
            {loading ? 'Вхід...' : 'Увійти'}
          </Button>
        </SimpleForm>
      </div>
    </div>
  );
};

export default LoginPage;
