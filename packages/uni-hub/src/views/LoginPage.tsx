'use client';

import React, { useState } from 'react';
import { User, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SimpleButton, SimpleInput, SimpleForm } from '../design-system';
import { ThemeSwitcher } from '../theme/ThemeSwitcher';
import { useToast } from '../components/ui/Toast';
import { authApi } from '../services/api';
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
              <SimpleInput
                name="username"
                size="large"
                placeholder="Имя пользователя"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Пароль</span>
            <div className={styles.inputWrap}>
              <Lock size={16} className={styles.icon} />
              <SimpleInput
                name="password"
                type="password"
                size="large"
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <SimpleButton
            type="submit"
            variant="primary"
            size="large"
            disabled={loading}
            className={styles.submit}
          >
            {loading ? 'Вход...' : 'Войти'}
          </SimpleButton>
        </SimpleForm>
      </div>
    </div>
  );
};

export default LoginPage;
