'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import styles from './GoogleLoginButton.module.scss';
import { useTheme } from '@uni-hub/theme/ThemeContext';
import { useLanguage } from '@uni-hub/i18n/LanguageContext';
import { resolveGoogleButtonWidth } from './helpers';

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
  const currentWidthRef = useRef<number | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(
    () => typeof window !== 'undefined' && Boolean(window.google?.accounts?.id),
  );
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const { theme } = useTheme();
  const { formatMessage, language } = useLanguage();

  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const errorTextRef = useRef(formatMessage('login.googleError'));

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
    errorTextRef.current = formatMessage('login.googleError');
  });

  const renderGoogleButton = useCallback(
    (width: number) => {
      if (!clientId || !containerRef.current || !window.google?.accounts?.id) {
        return;
      }

      try {
        containerRef.current.innerHTML = '';

        window.google.accounts.id.renderButton(containerRef.current, {
          theme: theme === 'light' ? 'outline' : 'filled_black',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          width,
          locale: language,
        });

        currentWidthRef.current = width;
      } catch (err: unknown) {
        onErrorRef.current?.((err as Error).message || errorTextRef.current);
      }
    },
    [clientId, theme, language],
  );

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
    } catch (err: unknown) {
      onErrorRef.current?.((err as Error).message || errorTextRef.current);

      return;
    }

    const container = containerRef.current;
    const initialWidth = resolveGoogleButtonWidth(container.clientWidth);

    renderGoogleButton(initialWidth);

    const handleResize = (measuredWidth: number) => {
      const nextWidth = resolveGoogleButtonWidth(measuredWidth);

      if (nextWidth !== currentWidthRef.current) {
        renderGoogleButton(nextWidth);
      }
    };

    if (typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];

        if (entry) {
          const width = entry.contentRect?.width || container.clientWidth;

          handleResize(width);
        }
      });

      resizeObserver.observe(container);

      return () => {
        resizeObserver.disconnect();
      };
    }

    const onWindowResize = () => {
      handleResize(container.clientWidth);
    };

    window.addEventListener('resize', onWindowResize);

    return () => {
      window.removeEventListener('resize', onWindowResize);
    };
  }, [scriptLoaded, clientId, renderGoogleButton]);

  return (
    <div className={styles.wrapper}>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => setScriptLoaded(true)}
        onError={() => onErrorRef.current?.(errorTextRef.current)}
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
