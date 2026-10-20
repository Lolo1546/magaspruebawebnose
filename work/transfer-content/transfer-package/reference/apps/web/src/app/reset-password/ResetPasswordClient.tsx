'use client';

import { useState, useEffect, useRef, useReducer } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Eye, EyeOff } from 'lucide-react';
import styles from './ResetPasswordClient.module.css';

interface ResetPasswordClientProps {
  apiBaseUrl: string | null;
}

function parseTokenFromFragment(rawFragment: string): string | null {
  try {
    const searchParams = new URLSearchParams(rawFragment);
    const tokenValue = searchParams.get('token');

    if (!tokenValue) {
      return null;
    }

    const trimmed = tokenValue.trim();
    if (trimmed.length !== 43 || !/^[A-Za-z0-9_-]+$/.test(trimmed)) {
      return null;
    }

    return trimmed;
  } catch {
    return null;
  }
}

type ResetState = 'idle' | 'loading' | 'success' | 'invalid' | 'error';

interface StateObj {
  status: ResetState;
  errorMessage: string | React.ReactNode;
  token: string | null;
  isInitializing: boolean;
}

type Action =
  | { type: 'INIT_SUCCESS'; payload: string }
  | { type: 'INIT_INVALID' }
  | { type: 'INIT_ERROR'; payload: string | React.ReactNode }
  | { type: 'SET_STATUS'; payload: ResetState }
  | { type: 'SET_ERROR'; payload: string | React.ReactNode }
  | { type: 'SUCCESS' };

function reducer(state: StateObj, action: Action): StateObj {
  switch (action.type) {
    case 'INIT_SUCCESS':
      return { ...state, token: action.payload, isInitializing: false };
    case 'INIT_INVALID':
      return { ...state, status: 'invalid', isInitializing: false };
    case 'INIT_ERROR':
      return { ...state, status: 'error', errorMessage: action.payload, isInitializing: false };
    case 'SET_STATUS':
      return { ...state, status: action.payload };
    case 'SET_ERROR':
      return { ...state, status: 'error', errorMessage: action.payload };
    case 'SUCCESS':
      return { ...state, status: 'success', token: null };
    default:
      return state;
  }
}

export function ResetPasswordClient({ apiBaseUrl }: ResetPasswordClientProps) {
  const [state, dispatch] = useReducer(reducer, {
    status: 'idle',
    errorMessage: '',
    token: null,
    isInitializing: true,
  });

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationError, setValidationError] = useState('');

  const fragmentInitializedRef = useRef(false);

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

      const parsedToken = parseTokenFromFragment(rawFragment);

      if (!parsedToken) {
        dispatch({ type: 'INIT_INVALID' });
      } else if (!apiBaseUrl) {
        dispatch({ type: 'INIT_ERROR', payload: 'Error de configuración del sistema.' });
      } else {
        dispatch({ type: 'INIT_SUCCESS', payload: parsedToken });
      }
    }
  }, [apiBaseUrl]);

  const validatePassword = () => {
    const codePointLength = Array.from(password).length;
    if (codePointLength < 15 || codePointLength > 128) {
      return 'La contraseña debe tener entre 15 y 128 caracteres.';
    }
    if (password !== confirmPassword) {
      return 'Las contraseñas no coinciden.';
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state.status === 'loading' || !state.token || !apiBaseUrl) return;

    const error = validatePassword();
    if (error) {
      setValidationError(error);
      return;
    }
    setValidationError('');
    dispatch({ type: 'SET_STATUS', payload: 'loading' });

    try {
      const response = await fetch(`${apiBaseUrl}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: state.token, newPassword: password }),
        credentials: 'omit',
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        if (data && data.completed === true) {
          setPassword('');
          setConfirmPassword('');
          dispatch({ type: 'SUCCESS' });
        } else {
          dispatch({ type: 'SET_ERROR', payload: 'Ocurrió un problema técnico. Inténtalo nuevamente más tarde.' });
        }
      } else if (response.status === 400) {
        dispatch({
          type: 'SET_ERROR',
          payload: (
            <>
              No pudimos actualizar la contraseña. Verifica que tenga entre 15 y 128 caracteres o solicita un{' '}
              <Link href="/forgot-password" style={{ color: 'inherit', textDecoration: 'underline' }}>
                nuevo enlace de recuperación
              </Link>.
            </>
          )
        });
      } else {
        dispatch({ type: 'SET_ERROR', payload: 'Ocurrió un problema técnico. Inténtalo nuevamente más tarde.' });
      }
    } catch {
      dispatch({ type: 'SET_ERROR', payload: 'Ocurrió un problema técnico. Inténtalo nuevamente más tarde.' });
    }
  };

  if (state.isInitializing) {
    return null;
  }

  if (state.status === 'success') {
    return (
      <div className={styles.container} aria-live="polite">
        <div className={styles.textCenter}>
          <h1 className={`${styles.title} ${styles.successTitle}`}>Contraseña actualizada</h1>
          <p className={styles.description}>
            Tu contraseña fue actualizada correctamente. Ya puedes iniciar sesión.
          </p>
          <Link href="/login" style={{ textDecoration: 'none', width: '100%', display: 'block' }}>
            <Button variant="primary" className={styles.fullWidth}>Ir a Iniciar Sesión</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (state.status === 'invalid') {
    return (
      <div className={styles.container} aria-live="polite">
        <div className={styles.textCenter}>
          <h1 className={`${styles.title} ${styles.errorTitle}`}>Enlace no válido</h1>
          <p className={styles.description}>
            El enlace de recuperación es inválido o ha expirado.
          </p>
          <Link href="/forgot-password" style={{ textDecoration: 'none', width: '100%', display: 'block' }}>
            <Button variant="primary" className={styles.fullWidth}>Solicitar nuevo enlace</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container} aria-live="polite">
      <div className={styles.textCenter}>
        <h1 className={styles.title}>Nueva Contraseña</h1>
        <p className={styles.description}>
          Ingresa tu nueva contraseña para acceder a tu cuenta.
        </p>
      </div>

      {state.status === 'error' && (
        <div className={styles.globalError} role="alert">
          {state.errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className={styles.formGroup}>
          <label htmlFor="passwordInput" className={styles.label}>
            Nueva contraseña
          </label>
          <div className={styles.inputWrapper}>
            <input
              id="passwordInput"
              type={showPassword ? "text" : "password"}
              className={`${styles.input} ${validationError && password !== confirmPassword === false ? styles.inputError : ''}`}
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (validationError) setValidationError('');
              }}
              disabled={state.status === 'loading'}
              required
              minLength={15}
              maxLength={128}
              aria-invalid={!!validationError}
            />
            <button
              type="button"
              className={styles.toggleButton}
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              disabled={state.status === 'loading'}
            >
              {showPassword ? <EyeOff className={styles.icon} /> : <Eye className={styles.icon} />}
            </button>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="confirmPasswordInput" className={styles.label}>
            Confirmar nueva contraseña
          </label>
          <div className={styles.inputWrapper}>
            <input
              id="confirmPasswordInput"
              type={showConfirmPassword ? "text" : "password"}
              className={`${styles.input} ${validationError && password !== confirmPassword ? styles.inputError : ''}`}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (validationError) setValidationError('');
              }}
              disabled={state.status === 'loading'}
              required
              minLength={15}
              maxLength={128}
              aria-invalid={password !== confirmPassword && !!validationError}
              aria-describedby={validationError ? "passwordError" : undefined}
            />
            <button
              type="button"
              className={styles.toggleButton}
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              disabled={state.status === 'loading'}
            >
              {showConfirmPassword ? <EyeOff className={styles.icon} /> : <Eye className={styles.icon} />}
            </button>
          </div>
          {validationError && (
            <span id="passwordError" className={styles.errorMessage} role="alert">
              {validationError}
            </span>
          )}
        </div>

        <Button
          type="submit"
          variant="primary"
          className={styles.fullWidth}
          disabled={state.status === 'loading'}
        >
          {state.status === 'loading' ? 'Guardando...' : 'Guardar contraseña'}
        </Button>
      </form>
    </div>
  );
}
