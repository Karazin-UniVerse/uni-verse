'use client';

import React, { useState } from 'react';
import { User, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button, TextInput, SimpleForm, useToast } from '@una';
import { ThemeSwitcher } from '@uni-hub/theme/ThemeSwitcher';
import { authApi } from '@uni-hub/services/api';
import { GoogleLoginButton, LinkMoodleModal } from '@uni-hub/components/auth';
import { motion } from 'framer-motion';
import styles from './LoginPage.module.scss';

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showLinkModal, setShowLinkModal] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const handleGoogleSuccess = async (idToken: string) => {
    setLoading(true);
    setError('');

    try {
      const res = await authApi.loginWithGoogle(idToken);

      if (res.data?.isLinked) {
        toast.success('Вхід успішно виконано');
        router.push('/');
      } else {
        setShowLinkModal(true);
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data
          ?.message ||
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        (err as Error).message ||
        'Помилка входу через Google';

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setError('');

    if (!username.trim()) {
      setError('Будь ласка, введіть ім’я користувача');

      return;
    }

    if (!password) {
      setError('Будь ласка, введіть пароль');

      return;
    }

    setLoading(true);

    try {
      const res = await authApi.login(username, password);

      toast.success('Вхід успішно виконано');
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

  return (
    <div className={styles.page}>
      <div className={styles.themeBar}>
        <ThemeSwitcher compact />
      </div>
      <div className={styles.center}>
        <SimpleForm className={styles.card} action={handleLogin}>
          <div className={styles.brand}>
            <h1>UNiHub</h1>
            <p>Увійдіть у свій акаунт Moodle</p>
          </div>

          <div className={styles.googleSection}>
            <GoogleLoginButton
              onSuccess={handleGoogleSuccess}
              onError={(msg) => setError(msg)}
              disabled={loading}
            />
          </div>

          <div className={styles.divider}>
            <span>або за допомогою логіна Moodle</span>
          </div>

          <label htmlFor="login-username" className={styles.field}>
            <span className={styles.label}>Ім’я користувача або email</span>
            <div className={styles.inputWrap}>
              <User size={16} className={styles.icon} />
              <TextInput
                id="login-username"
                name="username"
                size="large"
                placeholder="Ім’я користувача або email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
          </label>

          <label htmlFor="login-password" className={styles.field}>
            <span className={styles.label}>Пароль</span>
            <div className={styles.inputWrap}>
              <Lock size={16} className={styles.icon} />
              <TextInput
                id="login-password"
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

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              type="submit"
              variant="primary"
              size="large"
              disabled={loading}
              className={styles.submit}
            >
              {loading ? 'Вхід...' : 'Увійти'}
            </Button>
          </motion.div>
        </SimpleForm>

        <LinkMoodleModal
          open={showLinkModal}
          onClose={() => setShowLinkModal(false)}
          onSuccess={() => {
            setShowLinkModal(false);
            router.push('/');
          }}
        />
      </div>
    </div>
  );
};

export default LoginPage;
