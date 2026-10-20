import type { HTMLAttributes } from "react";

import styles from "./Chip.module.css";

export type ChipVariant =
  | "default"
  | "danger"
  | "success"
  | "warning"
  | "gold"
  | "glass";

export type ChipProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: ChipVariant;
};

export function Chip({
  className,
  variant = "default",
  ...props
}: ChipProps) {
  const chipClassName = [styles.chip, styles[variant], className]
    .filter(Boolean)
    .join(" ");

  return <span className={chipClassName} {...props} />;
}
