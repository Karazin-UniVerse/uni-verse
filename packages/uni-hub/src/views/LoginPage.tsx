'use client';

import React, { useState } from 'react';
import { User, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button, TextInput, SimpleForm, useToast } from '@una';
import { ThemeSwitcher } from '@uni-hub/theme/ThemeSwitcher';
import { LanguageSwitcher } from '@uni-hub/components/common/LanguageSwitcher';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import type { TranslationKey } from '@uni-hub/i18n/translations';
import { authApi } from '@uni-hub/services/api';
import { motion } from 'framer-motion';
import styles from './LoginPage.module.scss';

const LoginPage: React.FC = () => {
  const { formatMessage } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);
  const router = useRouter();
  const toast = useToast();

  const handleLogin = async () => {
    setErrorKey(null);

    if (!username.trim()) {
      setErrorKey('login.enterUsernameError');

      return;
    }

    if (!password) {
      setErrorKey('login.enterPasswordError');

      return;
    }

    setLoading(true);

    try {
      const res = await authApi.login(username, password);

      toast.success(formatMessage('login.success'));
      localStorage.setItem('isLoggedIn', 'true');

      if (res.data?.token) {
        localStorage.setItem('moodleToken', res.data.token);
      }

      router.push('/');
    } catch (err: unknown) {
      const serverError = (err as { response?: { data?: { error?: string } } })?.response?.data
        ?.error;
      const message = serverError || formatMessage('login.invalidCredentials');

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
      <div className={styles.languageBar}>
        <LanguageSwitcher variant="glass" placement="bottom-up" />
      </div>
      <div className={styles.center}>
        <SimpleForm className={styles.card} action={handleLogin}>
          <div className={styles.brand}>
            <h1>{formatMessage('login.title')}</h1>
            <p>{formatMessage('login.subtitle')}</p>
          </div>

          <label htmlFor="login-username" className={styles.field}>
            <span className={styles.label}>{formatMessage('login.username')}</span>
            <div className={styles.inputWrap}>
              <User size={16} className={styles.icon} />
              <TextInput
                id="login-username"
                name="username"
                size="large"
                placeholder={formatMessage('login.username')}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
          </label>

          <label htmlFor="login-password" className={styles.field}>
            <span className={styles.label}>{formatMessage('login.password')}</span>
            <div className={styles.inputWrap}>
              <Lock size={16} className={styles.icon} />
              <TextInput
                id="login-password"
                name="password"
                type="password"
                size="large"
                placeholder={formatMessage('login.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
          </label>

          {errorKey && <p className={styles.error}>{formatMessage(errorKey)}</p>}

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              type="submit"
              variant="primary"
              size="large"
              disabled={loading}
              className={styles.submit}
            >
              {loading ? formatMessage('login.loading') : formatMessage('login.submit')}
            </Button>
          </motion.div>
        </SimpleForm>
      </div>
    </div>
  );
};

export default LoginPage;
