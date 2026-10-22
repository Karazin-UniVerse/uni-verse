'use client';

import React, { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import styles from './GoogleLoginButton.module.scss';
import { Button } from '@una';
import { FaGoogle } from 'react-icons/fa';

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
    if (!clientId || !scriptLoaded || !window.google) {
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response?.credential) {
            onSuccessRef.current(response.credential);
          } else {
            onErrorRef.current?.('Не вдалося отримати токен від Google');
          }
        },
      });
    } catch (err: unknown) {
      onErrorRef.current?.((err as Error).message);
    }
  }, [scriptLoaded, clientId]);

  const handleClick = (): void => {
    if (!window.google?.accounts?.id) {
      onErrorRef.current?.('Сервіс Google ще завантажується, спробуйте ще раз');
      return;
    }

    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed()) {
        onErrorRef.current?.(
          'Не вдалося відкрити вхід через Google. Перевірте блокування cookie або спробуйте ще раз',
        );
      }
    });
  };

  return (
    <div className={styles.wrapper}>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => setScriptLoaded(true)}
      />
      <Button
        variant="secondary"
        size="large"
        className={styles.customButton}
        disabled={disabled || !scriptLoaded}
        onClick={handleClick}
      >
        <span className={styles.iconWrapper}>
          <FaGoogle size={18} />
        </span>
        <span>Продовжити з Google</span>
      </Button>
    </div>
  );
};

export default GoogleLoginButton;
