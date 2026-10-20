"use client";

import { Check, Moon, RotateCcw, Smartphone, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/Button";
import {
  DEFAULT_THEME,
  parseTheme,
  type Theme,
  THEME_STORAGE_KEY,
  THEME_VALUES,
} from "@/utils/theme";

import styles from "./AppearancePage.module.css";

const themeDetails: Readonly<Record<Theme, {
  description: string;
  icon: typeof Moon;
  label: string;
}>> = {
  dark: {
    description: "Superficies oscuras equilibradas para el uso diario.",
    icon: Moon,
    label: "Oscuro",
  },
  light: {
    description: "Fondos claros con contraste cómodo para espacios luminosos.",
    icon: Sun,
    label: "Claro",
  },
  amoled: {
    description: "Negro profundo con superficies diferenciadas para pantallas OLED.",
    icon: Smartphone,
    label: "AMOLED",
  },
};

const themeListeners = new Set<() => void>();

function subscribeToTheme(listener: () => void) {
  themeListeners.add(listener);
  return () => {
    themeListeners.delete(listener);
  };
}

function getThemeSnapshot(): Theme {
  return parseTheme(document.documentElement.dataset.theme);
}

function getServerThemeSnapshot(): Theme {
  return DEFAULT_THEME;
}

function notifyThemeChange() {
  themeListeners.forEach((listener) => listener());
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // The visual change remains active for this session when storage is blocked.
  }

  notifyThemeChange();
}

function resetTheme() {
  document.documentElement.dataset.theme = DEFAULT_THEME;

  try {
    localStorage.removeItem(THEME_STORAGE_KEY);
  } catch {
    // Resetting the active theme does not depend on persistent storage.
  }

  notifyThemeChange();
}

function ThemePreview({ theme }: { theme: Theme }) {
  const previewThemeClassName = {
    dark: styles.previewDark,
    light: styles.previewLight,
    amoled: styles.previewAmoled,
  }[theme];

  return (
    <span
      aria-hidden="true"
      className={`${styles.preview} ${previewThemeClassName}`}
    >
      <span className={styles.previewBar} />
      <span className={styles.previewBody}>
        <span className={styles.previewSidebar} />
        <span className={styles.previewContent}>
          <span className={styles.previewAccent} />
          <span />
          <span />
        </span>
      </span>
    </span>
  );
}

export function ThemeSelector() {
  const selectedTheme = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );

  return (
    <div className={styles.selector}>
      <fieldset className={styles.fieldset}>
        <legend>Tema de la interfaz</legend>
        <div className={styles.themeGrid}>
          {THEME_VALUES.map((theme) => {
            const details = themeDetails[theme];
            const Icon = details.icon;
            const isSelected = selectedTheme === theme;

            return (
              <label
                className={`${styles.themeOption} ${isSelected ? styles.selected : ""}`}
                key={theme}
              >
                <span className={styles.optionHeading}>
                  <span className={styles.optionName}>
                    <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
                    {details.label}
                  </span>
                  <input
                    checked={isSelected}
                    name="theme"
                    onChange={() => applyTheme(theme)}
                    type="radio"
                    value={theme}
                  />
                </span>
                <ThemePreview theme={theme} />
                <span className={styles.optionDescription}>{details.description}</span>
                <span aria-hidden="true" className={styles.selectedMark}>
                  <Check size={15} strokeWidth={2.2} /> Seleccionado
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className={styles.selectorFooter}>
        <p>
          El cambio se aplica de inmediato y se conserva solo en este navegador.
        </p>
        <Button onClick={resetTheme} variant="secondary">
          <RotateCcw aria-hidden="true" size={16} />
          Restablecer oscuro
        </Button>
      </div>
    </div>
  );
}
