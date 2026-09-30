'use client';

import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button, SimpleForm, useToast } from '@una';
import { ThemeSwitcher } from '@uni-hub/theme/ThemeSwitcher';
import { LanguageSwitcher } from '@uni-hub/components/common/LanguageSwitcher';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { authApi, getErrorMessage } from '@uni-hub/services/api';
import { GoogleLoginButton, AuthField } from '@uni-hub/components/auth';
import { motion } from 'framer-motion';
import styles from './LoginPage.module.scss';

const LoginPage: React.FC = () => {
  const { formatMessage } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [linkUsername, setLinkUsername] = useState('');
  const [linkPassword, setLinkPassword] = useState('');
  const [error, setError] = useState('');
  const [isLinkingMoodle, setIsLinkingMoodle] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const handleGoogleSuccess = async (idToken: string) => {
    setLoading(true);
    setError('');

    try {
      const res = await authApi.loginWithGoogle(idToken);

      if (res.data?.isLinked) {
        toast.success(formatMessage('login.success'));
        router.push('/');
      } else {
        setIsLinkingMoodle(true);
      }
    } catch (err: unknown) {
      const message = getErrorMessage(err, formatMessage('login.googleError'));

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setError('');

    if (!username.trim()) {
      setError(formatMessage('login.enterUsernameError'));

      return;
    }

    if (!password) {
      setError(formatMessage('login.enterPasswordError'));

      return;
    }

    setLoading(true);

    try {
      const res = await authApi.login(username, password);

      toast.success(formatMessage('login.success'));
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('username', username.trim());

      if (res.data?.token) {
        localStorage.setItem('moodleToken', res.data.token);
      }

      router.push('/');
    } catch (err: unknown) {
      const message = getErrorMessage(err, formatMessage('login.invalidCredentials'));

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkMoodle = async () => {
    setError('');

    if (!linkUsername.trim()) {
      setError(formatMessage('login.linkMoodleEnterUsername'));

      return;
    }

    if (!linkPassword) {
      setError(formatMessage('login.linkMoodleEnterPassword'));

      return;
    }

    setLoading(true);

    try {
      await authApi.linkMoodleAccount(linkUsername.trim(), linkPassword);

      toast.success(formatMessage('login.linkMoodleSuccess'));
      toast.success(formatMessage('login.success'));
      localStorage.setItem('username', linkUsername.trim());
      router.push('/');
    } catch (err: unknown) {
      const message = getErrorMessage(err, formatMessage('login.linkMoodleError'));

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelLink = () => {
    setIsLinkingMoodle(false);
    setLinkUsername('');
    setLinkPassword('');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('isLoggedIn');
    setError(formatMessage('login.linkMoodleRequired'));
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
        {isLinkingMoodle ? (
          <SimpleForm className={styles.card} action={handleLinkMoodle}>
            <div className={styles.brand}>
              <h1>{formatMessage('login.title')}</h1>
              <p>{formatMessage('login.linkMoodleTitle')}</p>
            </div>

            <div className={styles.hintBox}>
              <p>{formatMessage('login.linkMoodleHint')}</p>
            </div>

            <AuthField
              id="link-moodle-username"
              name="moodleUsername"
              label={formatMessage('login.linkMoodleUsername')}
              placeholder={formatMessage('login.linkMoodleUsernamePlaceholder')}
              value={linkUsername}
              onChange={(e) => setLinkUsername(e.target.value)}
              autoComplete="username"
              icon={<User size={16} />}
            />

            <AuthField
              id="link-moodle-password"
              name="moodlePassword"
              type="password"
              label={formatMessage('login.linkMoodlePassword')}
              placeholder={formatMessage('login.linkMoodlePasswordPlaceholder')}
              value={linkPassword}
              onChange={(e) => setLinkPassword(e.target.value)}
              autoComplete="current-password"
              icon={<Lock size={16} />}
            />

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.cardActions}>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="submit"
                  variant="primary"
                  size="large"
                  disabled={loading}
                  className={styles.submit}
                >
                  {loading
                    ? formatMessage('login.linkMoodleLoading')
                    : formatMessage('login.linkMoodleSubmit')}
                </Button>
              </motion.div>

              <Button
                type="button"
                variant="secondary"
                size="large"
                disabled={loading}
                className={styles.submit}
                onClick={handleCancelLink}
              >
                {formatMessage('login.linkMoodleBack')}
              </Button>
            </div>
          </SimpleForm>
        ) : (
          <SimpleForm className={styles.card} action={handleLogin}>
            <div className={styles.brand}>
              <h1>{formatMessage('login.title')}</h1>
              <p>{formatMessage('login.subtitle')}</p>
            </div>

            {Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) && (
              <>
                <div className={styles.googleSection}>
                  <GoogleLoginButton
                    onSuccess={handleGoogleSuccess}
                    onError={(msg) => setError(msg)}
                    disabled={loading}
                  />
                </div>

                <div className={styles.divider}>
                  <span>{formatMessage('login.orMoodle')}</span>
                </div>
              </>
            )}

            <AuthField
              id="login-username"
              name="username"
              label={formatMessage('login.usernameOrEmail')}
              placeholder={formatMessage('login.usernameOrEmail')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              icon={<User size={16} />}
            />

            <AuthField
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              label={formatMessage('login.password')}
              placeholder={formatMessage('login.password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              icon={<Lock size={16} />}
              rightElement={
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={
                    showPassword
                      ? formatMessage('login.hidePassword')
                      : formatMessage('login.showPassword')
                  }
                  title={
                    showPassword
                      ? formatMessage('login.hidePassword')
                      : formatMessage('login.showPassword')
                  }
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />

            {error && <p className={styles.error}>{error}</p>}

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

            <div style={{ textAlign: 'center', marginTop: '12px' }}>
              <Button
                type="button"
                variant="secondary"
                size="medium"
                onClick={async () => {
                  await authApi.login('demo', 'demo');
                  toast.success(formatMessage('login.demoSuccess'));
                  router.push('/');
                }}
                style={{ width: '100%', fontSize: '0.875rem', opacity: 0.85 }}
              >
                {formatMessage('login.tryDemo')}
              </Button>
            </div>
          </SimpleForm>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
