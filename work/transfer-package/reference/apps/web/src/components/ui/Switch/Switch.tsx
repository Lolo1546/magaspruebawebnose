"use client";

import { useId, type ReactNode } from "react";

import styles from "./Switch.module.css";

export type SwitchProps = {
  checked: boolean;
  className?: string;
  description?: ReactNode;
  disabled?: boolean;
  label: ReactNode;
  name?: string;
  onCheckedChange: (checked: boolean) => void;
};

export function Switch({
  checked,
  className,
  description,
  disabled = false,
  label,
  name,
  onCheckedChange,
}: SwitchProps) {
  const generatedId = useId();
  const labelId = `${generatedId}-label`;
  const descriptionId = description ? `${generatedId}-description` : undefined;
  const fieldClassName = [styles.field, className].filter(Boolean).join(" ");

  return (
    <div className={fieldClassName} data-disabled={disabled || undefined}>
      <span className={styles.copy}>
        <span className={styles.label} id={labelId}>
          {label}
        </span>
        {description ? (
          <span className={styles.description} id={descriptionId}>
            {description}
          </span>
        ) : null}
      </span>
      <button
        aria-checked={checked}
        aria-describedby={descriptionId}
        aria-labelledby={labelId}
        className={styles.switch}
        disabled={disabled}
        name={name}
        onClick={() => onCheckedChange(!checked)}
        role="switch"
        type="button"
      >
        <span aria-hidden="true" className={styles.thumb} />
      </button>
    </div>
  );
}
