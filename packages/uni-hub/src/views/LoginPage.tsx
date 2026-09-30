'use client';

import React, { useState } from 'react';
import { User, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@una/Button';
import { TextInput } from '@una/inputs/TextInput';
import { SimpleForm } from '@una/Form';
import { ThemeSwitcher } from '@uni-hub/theme/ThemeSwitcher';
import { useToast } from '@una/Toast';
import { authApi } from '@uni-hub/services/api/auth-api';
import { features } from '@uni-hub/config/features';
import { GoogleLoginButton } from '@uni-hub/components/GoogleLoginButton';
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
      setError('Будь ласка, введіть ім\'я користувача');

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
      localStorage.setItem('isLoggedIn', 'true');

      if (res.data?.token) {
        localStorage.setItem('moodleToken', res.data.token);
      }

      router.push('/');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Помилка входу. Перевірте облікові дані.';

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (idToken: string) => {
    setLoading(true);
    setError('');

    try {
      await authApi.loginWithGoogle(idToken);

      toast.success('Авторизація через Google успішна');
      router.push('/');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Помилка авторизації Google';

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const isMoodleAuth = features.auth.moodle;
  const isGoogleAuth = features.auth.google;

  const getLoginSubtitle = (): string => {
    if (isMoodleAuth && isGoogleAuth) {
      return 'Оберіть зручний спосіб входу';
    }

    if (isGoogleAuth) {
      return 'Вхід через корпоративний Google акаунт';
    }

    return 'Увійдіть у свій акаунт Moodle';
  };

  const loginSubtitle = getLoginSubtitle();

  return (
    <div className={styles.page}>
      <div className={styles.themeBar}>
        <ThemeSwitcher />
      </div>
      <div className={styles.center}>
        <SimpleForm variant="card" className={styles.card} action={handleLogin}>
          <div className={styles.brand}>
            <h1>UNiVerse</h1>
            <p>{loginSubtitle}</p>
          </div>

          {isMoodleAuth && (
            <>
              <label className={styles.field}>
                <span className={styles.label}>Ім&apos;я користувача</span>
                <div className={styles.inputWrap}>
                  <User size={16} className={styles.icon} />
                  <TextInput
                    name="username"
                    size="large"
                    placeholder="Ім'я користувача"
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
                  <TextInput
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

              <Button
                type="submit"
                variant="primary"
                size="large"
                disabled={loading}
                className={styles.submit}
              >
                {loading ? 'Вхід...' : 'Увійти'}
              </Button>
            </>
          )}

          {isMoodleAuth && isGoogleAuth && (
            <div className={styles.divider}>
              <span>або</span>
            </div>
          )}

          {isGoogleAuth && (
            <GoogleLoginButton
              onSuccess={handleGoogleSuccess}
              onError={(msg) => toast.error(msg)}
              disabled={loading}
            />
          )}

          {!isMoodleAuth && !isGoogleAuth && (
            <p className={styles.error}>
              Провайдери аутентифікації наразі вимкнені в конфігурації середовища.
            </p>
          )}
        </SimpleForm>
      </div>
    </div>
  );
};

export default LoginPage;
