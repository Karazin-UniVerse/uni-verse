'use client';

import React, { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import styles from './GoogleLoginButton.module.scss';
import { useTheme } from '@uni-hub/theme/ThemeContext';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';

export interface GoogleLoginButtonProps {
  onSuccess: (idToken: string) => void;
  disabled?: boolean;
  onError?: (error: string) => void;
}

export const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({
  onSuccess,
  disabled,
  onError,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(
    () => typeof window !== 'undefined' && Boolean(window.google?.accounts?.id),
  );
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const { theme } = useTheme();
  const { formatMessage } = useLanguage();

  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const errorTextRef = useRef(formatMessage('login.googleError'));

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
    errorTextRef.current = formatMessage('login.googleError');
  });

  useEffect(() => {
    if (!clientId || !scriptLoaded || !window.google || !containerRef.current) {
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response?.credential) {
            onSuccessRef.current(response.credential);
          } else {
            onErrorRef.current?.(errorTextRef.current);
          }
        },
      });

      containerRef.current.innerHTML = '';

      window.google.accounts.id.renderButton(containerRef.current, {
        theme: theme === 'light' ? 'outline' : 'filled_black',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        width: 336,
        locale: 'uk',
      });
    } catch (err: unknown) {
      onErrorRef.current?.((err as Error).message || errorTextRef.current);
    }
  }, [scriptLoaded, clientId, theme]);

  return (
    <div className={styles.wrapper}>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => setScriptLoaded(true)}
      />
      <div
        ref={containerRef}
        inert={disabled}
        className={`${styles.buttonContainer} ${disabled ? styles.disabled : ''}`}
      />
    </div>
  );
};

export default GoogleLoginButton;
