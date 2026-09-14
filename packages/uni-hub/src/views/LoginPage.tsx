'use client';

import React, { useState } from 'react';
import { User, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button, TextInput, SimpleForm, useToast } from '@una';
import { ThemeSwitcher } from '@uni-hub/theme/ThemeSwitcher';
import { authApi } from '@uni-hub/services/api';
import styles from './LoginPage.module.scss';

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
      setError('Пожалуйста, введите имя пользователя');

      return;
    }

    if (!password) {
      setError('Пожалуйста, введите пароль');

      return;
    }

    setLoading(true);

    try {
      const res = await authApi.login(username, password);

      toast.success('Вход выполнен успешно');
      localStorage.setItem('isLoggedIn', 'true');

      if (res.data?.token) {
        localStorage.setItem('moodleToken', res.data.token);
      }

      router.push('/');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Ошибка входа. Проверьте учетные данные.';

      toast.error(message);
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
            <p>Войдите в свой аккаунт Moodle</p>
          </div>

          <label className={styles.field}>
            <span className={styles.label}>Имя пользователя</span>
            <div className={styles.inputWrap}>
              <User size={16} className={styles.icon} />
              <TextInput
                name="username"
                size="large"
                placeholder="Имя пользователя"
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
                placeholder="Пароль"
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
            {loading ? 'Вхід...' : 'Войти'}
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="large"
            onClick={() => {
              localStorage.setItem('isLoggedIn', 'true');
              localStorage.setItem('accessToken', 'demo-token');
              localStorage.setItem('username', 'Барсуков Родіон Сергійович');
              toast.success('Вхід у демо-режимі');
              router.push('/');
            }}
            className={styles.submit}
            style={{ marginTop: '8px' }}
          >
            Демо-режим (огляд інтерфейсу)
          </Button>
        </SimpleForm>
      </div>
    </div>
  );
};

export default LoginPage;
