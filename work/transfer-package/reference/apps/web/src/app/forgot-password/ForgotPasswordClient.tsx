'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import styles from './ForgotPasswordClient.module.css';

function isAcceptedResponse(value: unknown): value is { accepted: true } {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    'accepted' in value &&
    (value as Record<string, unknown>).accepted === true
  );
}

interface ForgotPasswordClientProps {
  apiBaseUrl: string | null;
}

export function ForgotPasswordClient({ apiBaseUrl }: ForgotPasswordClientProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [validationError, setValidationError] = useState('');

  const validateEmail = (value: string) => {
    if (!value) return 'El correo electrónico es obligatorio.';
    if (value.length > 254) return 'El correo electrónico no puede superar los 254 caracteres.';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return 'El formato del correo electrónico no es válido.';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'loading') return;

    const error = validateEmail(email);
    if (error) {
      setValidationError(error);
      return;
    }
    setValidationError('');

    if (!apiBaseUrl) {
      setStatus('error');
      setErrorMessage('Error de configuración del sistema.');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      const response = await fetch(`${apiBaseUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        credentials: 'omit',
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        if (isAcceptedResponse(data)) {
          setStatus('success');
        } else {
          setStatus('error');
          setErrorMessage('No pudimos procesar la solicitud en este momento. Inténtalo nuevamente más tarde.');
        }
      } else {
        setStatus('error');
        setErrorMessage('No pudimos procesar la solicitud en este momento. Inténtalo nuevamente más tarde.');
      }
    } catch {
      setStatus('error');
      setErrorMessage('No pudimos procesar la solicitud en este momento. Inténtalo nuevamente más tarde.');
    }
  };

  if (status === 'success') {
    return (
      <div className={styles.container} aria-live="polite">
        <div className={styles.textCenter}>
          <h1 className={`${styles.title} ${styles.successTitle}`}>Revisa tu correo</h1>
          <p className={styles.description}>
            Si existe una cuenta asociada a ese correo, recibirás un enlace para restablecer tu contraseña.
          </p>
          <Link href="/login" className={styles.link}>
            Volver a Iniciar Sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container} aria-live="polite">
      <div className={styles.textCenter}>
        <h1 className={styles.title}>Recuperar Contraseña</h1>
        <p className={styles.description}>
          Ingresa tu correo electrónico y te enviaremos instrucciones para restablecer tu contraseña.
        </p>
      </div>

      {status === 'error' && (
        <div className={styles.globalError} role="alert">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className={styles.formGroup}>
          <label htmlFor="emailInput" className={styles.label}>
            Correo electrónico
          </label>
          <input
            id="emailInput"
            type="email"
            className={`${styles.input} ${validationError ? styles.inputError : ''}`}
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (validationError) setValidationError('');
            }}
            disabled={status === 'loading'}
            required
            maxLength={254}
            aria-invalid={!!validationError}
            aria-describedby={validationError ? "emailError" : undefined}
          />
          {validationError && (
            <span id="emailError" className={styles.errorMessage} role="alert">
              {validationError}
            </span>
          )}
        </div>

        <Button
          type="submit"
          variant="primary"
          className={styles.fullWidth}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? 'Enviando...' : 'Enviar enlace'}
        </Button>
      </form>

      <div className={styles.textCenter}>
        <p className={styles.footerText}>
          ¿Recordaste tu contraseña? <Link href="/login" className={styles.link}>Iniciar sesión</Link>
        </p>
      </div>
    </div>
  );
}
