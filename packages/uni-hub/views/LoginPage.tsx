'use client';

import React, { useState } from 'react';
import { Info, Lock, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button, Form, useToast } from '@una';
import { ThemeSwitcher } from '@uni-hub/theme/ThemeSwitcher';
import { LanguageSwitcher } from '@uni-hub/components/common/LanguageSwitcher';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { useQueryClient } from '@tanstack/react-query';
import { getErrorMessage, safeStorage } from '@uni-hub/services/api';
import { endSession } from '@uni-hub/services/api.session';
import { useGoogleLogin, useLinkMoodle } from '@uni-hub/hooks/useAuthMutations';
import {
  GoogleLoginButton,
  AuthField,
  parseGoogleClaims,
  extractGoogleDisplayName,
} from '@uni-hub/components/auth';
import { useFeatures } from '@uni-hub/features';
import { useMoodleStore } from '@uni-hub/store/useMoodleStore';
import { motion } from 'framer-motion';
import { STUDENT_PROFILE_STORAGE_KEY } from './dashboard/constants';
import styles from './LoginPage.module.scss';

const LoginPage: React.FC = () => {
  const { formatMessage } = useLanguage();
  const { isMoodleIntegrationEnabled } = useFeatures();
  const [linkUsername, setLinkUsername] = useState('');
  const [linkPassword, setLinkPassword] = useState('');
  const [googleUserName, setGoogleUserName] = useState('');
  const [error, setError] = useState('');
  const [isLinkingMoodle, setIsLinkingMoodle] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const googleLogin = useGoogleLogin();
  const linkMoodle = useLinkMoodle();
  const loading = googleLogin.isPending || linkMoodle.isPending;

  const handleGoogleSuccess = async (idToken: string): Promise<void> => {
    setError('');

    try {
      const claims = parseGoogleClaims(idToken);
      const displayName = extractGoogleDisplayName(claims) || claims.email?.split('@')[0] || '';

      if (displayName) {
        setGoogleUserName(displayName);
      }

      if (claims.email) {
        safeStorage.setItem('userEmail', claims.email);
      }

      const res = await googleLogin.mutateAsync(idToken);

      safeStorage.removeItem(STUDENT_PROFILE_STORAGE_KEY);
      safeStorage.setItem('authProvider', 'google');

      if (claims.email) {
        safeStorage.setItem('userEmail', claims.email);
      } else {
        safeStorage.removeItem('userEmail');
      }

      if (res.data?.isLinked || !isMoodleIntegrationEnabled) {
        safeStorage.setItem('isLoggedIn', 'true');
        useMoodleStore.getState().setLinked(Boolean(res.data?.isLinked));

        if (displayName) {
          safeStorage.setItem('username', displayName);
        }

        toast.success(formatMessage('login.success'));
        router.push('/');
      } else {
        useMoodleStore.getState().setLinked(false);
        setIsLinkingMoodle(true);
      }
    } catch (err: unknown) {
      setGoogleUserName('');
      safeStorage.removeItem('username');
      safeStorage.removeItem('userEmail');
      const message = getErrorMessage(err, formatMessage('login.googleError'));

      setError(message);
      toast.error(message);
    }
  };

  const handleLinkMoodle = async (): Promise<void> => {
    setError('');

    if (!linkUsername.trim()) {
      setError(formatMessage('login.linkMoodleEnterUsername'));

      return;
    }

    if (!linkPassword) {
      setError(formatMessage('login.linkMoodleEnterPassword'));

      return;
    }

    try {
      await linkMoodle.mutateAsync({ username: linkUsername.trim(), password: linkPassword });

      toast.success(formatMessage('login.linkMoodleSuccess'));
      toast.success(formatMessage('login.success'));
      safeStorage.setItem('isLoggedIn', 'true');
      useMoodleStore.getState().setLinked(true);

      const resolvedUserName = googleUserName || linkUsername.trim();

      safeStorage.setItem('username', resolvedUserName);
      router.push('/');
    } catch (err: unknown) {
      const message = getErrorMessage(err, formatMessage('login.linkMoodleError'));

      setError(message);
      toast.error(message);
    }
  };

  const handleSkipLinkMoodle = (): void => {
    safeStorage.setItem('isLoggedIn', 'true');
    useMoodleStore.getState().setLinked(false);

    if (googleUserName) {
      safeStorage.setItem('username', googleUserName);
    }

    toast.success(formatMessage('login.success'));
    router.push('/');
  };

  const handleCancelLink = (): void => {
    setIsLinkingMoodle(false);
    setGoogleUserName('');
    setLinkUsername('');
    setLinkPassword('');
    endSession(queryClient);
  };

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const ssoAction = googleClientId ? (
    <div className={styles.googleSection}>
      <GoogleLoginButton
        onSuccess={handleGoogleSuccess}
        onError={(msg) => setError(msg)}
        disabled={loading}
      />
    </div>
  ) : (
    <div className={styles.configWarning}>
      <p>{formatMessage('login.googleClientMissing')}</p>
    </div>
  );

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <LanguageSwitcher variant="glass" />
        <ThemeSwitcher compact className={styles.themeTrigger} />
      </div>

      <div className={styles.center}>
        {isLinkingMoodle ? (
          <Form className={styles.card} action={handleLinkMoodle}>
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
              onChange={(event) => setLinkUsername(event.target.value)}
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
              onChange={(event) => setLinkPassword(event.target.value)}
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
                onClick={handleSkipLinkMoodle}
              >
                {formatMessage('login.linkMoodleSkip')}
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="large"
                isTransparent
                disabled={loading}
                className={styles.submit}
                onClick={handleCancelLink}
              >
                {formatMessage('login.linkMoodleBack')}
              </Button>
            </div>
          </Form>
        ) : (
          <section className={styles.card} aria-labelledby="login-title">
            <div className={styles.brand}>
              <h1 id="login-title">{formatMessage('login.title')}</h1>
              <p>{formatMessage('login.subtitle')}</p>
            </div>

            <div className={styles.noticeBox} role="note">
              <Info size={16} className={styles.noticeIcon} aria-hidden />
              <p>{formatMessage('login.corporateNotice')}</p>
            </div>

            {ssoAction}

            {error && <p className={styles.error}>{error}</p>}
          </section>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
