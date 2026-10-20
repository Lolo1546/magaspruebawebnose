'use client';

import { useEffect, useRef, useReducer, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import styles from './VerifyEmailClient.module.css';

type VerifyState = 'verifying' | 'success' | 'invalid' | 'error';

interface VerifyStateObj {
  status: VerifyState;
  isConfigurationError: boolean;
}

type VerifyAction =
  | { type: 'SET_STATUS'; payload: VerifyState }
  | { type: 'SET_CONFIG_ERROR'; payload: boolean };

function verifyReducer(state: VerifyStateObj, action: VerifyAction): VerifyStateObj {
  switch (action.type) {
    case 'SET_STATUS':
      return { ...state, status: action.payload };
    case 'SET_CONFIG_ERROR':
      return { ...state, isConfigurationError: action.payload };
    default:
      return state;
  }
}

function parseTokenFromFragment(rawFragment: string): string | null {
  try {
    const searchParams = new URLSearchParams(rawFragment);

    const allTokens = searchParams.getAll('token');
    if (allTokens.length !== 1) {
      return null;
    }

    const tokenValue = allTokens[0];
    if (!tokenValue || tokenValue.trim().length === 0) {
      return null;
    }

    return tokenValue;
  } catch {
    return null;
  }
}

export function VerifyEmailClient({ apiBaseUrl }: { apiBaseUrl: string | null }) {
  const [state, dispatch] = useReducer(verifyReducer, {
    status: 'verifying',
    isConfigurationError: false
  });

  const { status, isConfigurationError } = state;

  const tokenRef = useRef<string | null>(null);
  const fragmentInitializedRef = useRef(false);
  const activeControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
      if (activeControllerRef.current) {
        activeControllerRef.current.abort();
        activeControllerRef.current = null;
      }
    };
  }, []);

  const runVerification = useCallback((currentToken: string, controller: AbortController) => {
    if (!apiBaseUrl) return;

    const currentRequestId = requestIdRef.current;

    fetch(`${apiBaseUrl}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: currentToken }),
      credentials: 'omit',
      cache: 'no-store',
      signal: controller.signal,
    })
      .then((response) => {
        if (controller.signal.aborted || currentRequestId !== requestIdRef.current) return;

        if (response.status === 204) {
          dispatch({ type: 'SET_STATUS', payload: 'success' });
          return;
        }

        if (response.status === 400) {
          response.json().then((body) => {
            if (controller.signal.aborted || currentRequestId !== requestIdRef.current) return;

            if (body && body.code === 'EMAIL_VERIFICATION_TOKEN_INVALID') {
              dispatch({ type: 'SET_STATUS', payload: 'invalid' });
            } else {
              dispatch({ type: 'SET_STATUS', payload: 'error' });
            }
          }).catch(() => {
            if (controller.signal.aborted || currentRequestId !== requestIdRef.current) return;
            dispatch({ type: 'SET_STATUS', payload: 'error' });
          });
          return;
        }

        dispatch({ type: 'SET_STATUS', payload: 'error' });
      })
      .catch(() => {
        if (controller.signal.aborted || currentRequestId !== requestIdRef.current) return;
        dispatch({ type: 'SET_STATUS', payload: 'error' });
      });
  }, [apiBaseUrl]);

  useEffect(() => {
    if (!fragmentInitializedRef.current) {
      fragmentInitializedRef.current = true;

      const hash = window.location.hash;

      let rawFragment = '';
      if (hash && hash.startsWith('#')) {
        rawFragment = hash.substring(1);
      }

      window.history.replaceState(
        null,
        '',
        window.location.pathname + window.location.search
      );

      tokenRef.current = parseTokenFromFragment(rawFragment);
    }

    const token = tokenRef.current;

    if (!token) {
      dispatch({ type: 'SET_STATUS', payload: 'invalid' });
      return;
    }

    if (!apiBaseUrl) {
      dispatch({ type: 'SET_CONFIG_ERROR', payload: true });
      dispatch({ type: 'SET_STATUS', payload: 'error' });
      return;
    }

    requestIdRef.current += 1;
    const controller = new AbortController();
    activeControllerRef.current = controller;

    runVerification(token, controller);

    return () => {
      controller.abort();
      if (activeControllerRef.current === controller) {
        activeControllerRef.current = null;
      }
    };
  }, [apiBaseUrl, runVerification]);

  const handleRetry = useCallback(() => {
    if (!tokenRef.current || !apiBaseUrl) return;
    if (status === 'verifying') return;

    requestIdRef.current += 1;
    if (activeControllerRef.current) {
      activeControllerRef.current.abort();
    }

    dispatch({ type: 'SET_STATUS', payload: 'verifying' });

    const controller = new AbortController();
    activeControllerRef.current = controller;

    runVerification(tokenRef.current, controller);
  }, [apiBaseUrl, runVerification, status]);

  return (
    <div className={styles.container} aria-live="polite">
      {status === 'verifying' && (
        <div className={styles.textCenter}>
          <div className={styles.spinnerContainer} aria-hidden="true">
            <svg
              className={styles.spinner}
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          </div>
          <h1 className={styles.title}>Estamos verificando tu correo...</h1>
          <p className={styles.description}>Por favor, espera un momento.</p>
        </div>
      )}

      {status === 'success' && (
        <div className={styles.textCenter}>
          <h1 className={`${styles.title} ${styles.successTitle}`}>Correo verificado</h1>
          <p className={styles.description}>Tu cuenta fue activada correctamente.</p>
          <Link href="/login" style={{ textDecoration: 'none', width: '100%', display: 'block' }}>
            <Button variant="primary" className={styles.fullWidth}>Ir a Iniciar Sesión</Button>
          </Link>
        </div>
      )}

      {status === 'invalid' && (
        <div className={styles.textCenter}>
          <h1 className={`${styles.title} ${styles.errorTitle}`}>Enlace no v&aacute;lido</h1>
          <p className={styles.description}>
            El enlace de verificaci&oacute;n no es v&aacute;lido o ha expirado.
            Puedes iniciar sesi&oacute;n y solicitar un nuevo enlace desde tu perfil.
          </p>
          <Link href="/login" style={{ textDecoration: 'none', width: '100%', display: 'block' }}>
            <Button variant="primary" className={styles.fullWidth}>Ir a Iniciar Sesión</Button>
          </Link>
        </div>
      )}

      {status === 'error' && (
        <div className={styles.textCenter}>
          <h1 className={`${styles.title} ${styles.errorTitle}`}>No pudimos verificar tu correo</h1>
          <p className={styles.description}>Ocurri&oacute; un problema al verificar tu correo. Int&eacute;ntalo nuevamente m&aacute;s tarde.</p>
          {!isConfigurationError && (
            <Button variant="primary" onClick={handleRetry} className={styles.fullWidth}>Reintentar</Button>
          )}
        </div>
      )}
    </div>
  );
}
