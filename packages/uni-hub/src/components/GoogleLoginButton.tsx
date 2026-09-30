'use client';

import React, { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { Button } from '@una/Button';
import styles from './GoogleLoginButton.module.scss';

export interface GoogleLoginButtonProps {
  onSuccess?: (credential: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

export const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({
  onSuccess,
  onError,
  disabled = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(
    () => typeof window !== 'undefined' && Boolean(window.google?.accounts?.id),
  );
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    if (!clientId || !scriptLoaded || !window.google?.accounts?.id || !containerRef.current) {
      return;
    }

    try {
      const googleAccounts = window.google.accounts;

      googleAccounts.id.initialize({
        client_id: clientId,
        callback: (response: { credential?: string }) => {
          if (response?.credential) {
            onSuccessRef.current?.(response.credential);
          } else {
            onErrorRef.current?.('Не вдалося отримати токен від Google');
          }
        },
      });

      containerRef.current.innerHTML = '';
      googleAccounts.id.renderButton(containerRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        width: 320,
        locale: 'uk',
      });
    } catch (err: unknown) {
      onErrorRef.current?.((err as Error).message);
    }
  }, [scriptLoaded, clientId]);

  return (
    <div className={styles.wrapper}>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => setScriptLoaded(true)}
      />
      <div className={styles.fallbackButtonWrap}>
        <Button
          variant="secondary"
          size="large"
          className={styles.fallbackButton}
          disabled={disabled}
        >
          <svg className={styles.googleIcon} viewBox="0 0 24 24" width="18" height="18">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Продовжити з Google</span>
        </Button>
      </div>
      <div
        ref={containerRef}
        className={`${styles.gsiContainer} ${disabled ? styles.disabled : ''}`}
      />
    </div>
  );
};

export default GoogleLoginButton;
