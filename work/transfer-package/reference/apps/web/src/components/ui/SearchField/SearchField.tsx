import { Search } from "lucide-react";
import { useId, type InputHTMLAttributes } from "react";

import styles from "./SearchField.module.css";

export type SearchFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  description?: string;
  error?: string;
  label: string;
  visuallyHideLabel?: boolean;
};

export function SearchField({
  "aria-describedby": ariaDescribedBy,
  className,
  description,
  disabled,
  error,
  id,
  label,
  visuallyHideLabel = false,
  ...props
}: SearchFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = description ? `${inputId}-description` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [ariaDescribedBy, descriptionId, errorId]
    .filter(Boolean)
    .join(" ");
  const fieldClassName = [styles.field, className].filter(Boolean).join(" ");

  return (
    <div className={fieldClassName} data-disabled={disabled || undefined}>
      <label
        className={visuallyHideLabel ? styles.visuallyHidden : styles.label}
        htmlFor={inputId}
      >
        {label}
      </label>
      <div className={styles.control}>
        <Search aria-hidden="true" className={styles.icon} size={18} />
        <input
          aria-describedby={describedBy || undefined}
          aria-invalid={error ? true : undefined}
          className={styles.input}
          disabled={disabled}
          id={inputId}
          type="search"
          {...props}
        />
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
