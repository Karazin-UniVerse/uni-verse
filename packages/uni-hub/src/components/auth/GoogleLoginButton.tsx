'use client';

import React, { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import styles from './GoogleLoginButton.module.scss';

export interface GoogleLoginButtonProps {
  onSuccess: (idToken: string) => void;
  disabled?: boolean;
  onError?: (error: string) => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: string | number;
              locale?: string;
            },
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({
  onSuccess,
  disabled,
  onError,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const clientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    '245056089040-eq6f7b9acb941b28hkhc0a500vebvr7a.apps.googleusercontent.com';

  useEffect(() => {
    if (!scriptLoaded || !window.google || !containerRef.current) {
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response?.credential) {
            onSuccess(response.credential);
          } else {
            onError?.('Не вдалося отримати токен від Google');
          }
        },
      });

      if (containerRef.current) {
        containerRef.current.innerHTML = '';

        window.google.accounts.id.renderButton(containerRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          width: 336,
          locale: 'uk',
        });
      }
    } catch (err: unknown) {
      onError?.((err as Error).message);
    }
  }, [scriptLoaded, clientId, onSuccess, onError]);

  return (
    <div className={styles.wrapper}>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />
      <div ref={containerRef} className={disabled ? styles.disabled : styles.buttonContainer} />
    </div>
  );
};

export default GoogleLoginButton;
