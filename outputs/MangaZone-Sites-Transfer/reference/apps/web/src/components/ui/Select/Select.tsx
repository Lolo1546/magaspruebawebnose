import { ChevronDown } from "lucide-react";
import { useId, type SelectHTMLAttributes } from "react";

import styles from "./Select.module.css";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  description?: string;
  error?: string;
  label: string;
  visuallyHideLabel?: boolean;
};

export function Select({
  "aria-describedby": ariaDescribedBy,
  children,
  className,
  description,
  disabled,
  error,
  id,
  label,
  visuallyHideLabel = false,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const descriptionId = description ? `${selectId}-description` : undefined;
  const errorId = error ? `${selectId}-error` : undefined;
  const describedBy = [ariaDescribedBy, descriptionId, errorId]
    .filter(Boolean)
    .join(" ");
  const fieldClassName = [styles.field, className].filter(Boolean).join(" ");

  return (
    <div className={fieldClassName} data-disabled={disabled || undefined}>
      <label
        className={visuallyHideLabel ? styles.visuallyHidden : styles.label}
        htmlFor={selectId}
      >
        {label}
      </label>
      <div className={styles.control}>
        <select
          aria-describedby={describedBy || undefined}
          aria-invalid={error ? true : undefined}
          className={styles.select}
          disabled={disabled}
          id={selectId}
          {...props}
        >
          {children}
        </select>
        <ChevronDown aria-hidden="true" className={styles.icon} size={17} />
      </div>
      {description ? (
        <p className={styles.description} id={descriptionId}>
          {description}
        </p>
      ) : null}
      {error ? (
        <p className={styles.error} id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
