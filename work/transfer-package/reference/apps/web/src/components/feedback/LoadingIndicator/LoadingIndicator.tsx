import type { HTMLAttributes } from "react";

import styles from "./LoadingIndicator.module.css";

export type LoadingIndicatorSize = "md" | "sm";

export type LoadingIndicatorProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> & {
  label?: string;
  size?: LoadingIndicatorSize;
};

export function LoadingIndicator({
  className,
  label = "Cargando",
  size = "md",
  ...props
}: LoadingIndicatorProps) {
  const indicatorClassName = [styles.indicator, styles[size], className]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      {...props}
      aria-atomic="true"
      aria-live="polite"
      className={indicatorClassName}
      role="status"
    >
      <span aria-hidden="true" className={styles.spinner} />
      <span className={styles.label}>{label}</span>
    </div>
  );
}
