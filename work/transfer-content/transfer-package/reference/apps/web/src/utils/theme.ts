export const THEME_VALUES = ["dark", "light", "amoled"] as const;

export type Theme = (typeof THEME_VALUES)[number];

export const DEFAULT_THEME: Theme = "dark";
export const THEME_STORAGE_KEY = "mangazone:theme";

type ThemeDatasetTarget = {
  dataset: {
    theme?: string;
  };
};

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string"
    && THEME_VALUES.some((theme) => theme === value);
}

export function parseTheme(value: unknown): Theme {
  return isTheme(value) ? value : DEFAULT_THEME;
}

export function resolveStoredTheme(readStoredTheme: () => unknown): Theme {
  try {
    return parseTheme(readStoredTheme());
  } catch {
    return DEFAULT_THEME;
  }
}

export function applyStoredTheme(
  target: ThemeDatasetTarget,
  readStoredTheme: () => unknown,
): Theme {
  const theme = resolveStoredTheme(readStoredTheme);
  target.dataset.theme = theme;
  return theme;
}

const serializedThemes = JSON.stringify(THEME_VALUES);
const serializedDefaultTheme = JSON.stringify(DEFAULT_THEME);
const serializedStorageKey = JSON.stringify(THEME_STORAGE_KEY);

export const THEME_BOOTSTRAP_SCRIPT = `(()=>{const root=document.documentElement;let theme=${serializedDefaultTheme};try{const stored=localStorage.getItem(${serializedStorageKey});if(${serializedThemes}.includes(stored)){theme=stored}}catch{}root.dataset.theme=theme})();`;
