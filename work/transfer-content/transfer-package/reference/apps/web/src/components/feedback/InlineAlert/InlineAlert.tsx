import {
  CircleAlert,
  CircleCheck,
  Info,
  TriangleAlert,
} from "lucide-react";
import type { ReactNode } from "react";

import styles from "./InlineAlert.module.css";

export type InlineAlertTone = "error" | "info" | "success" | "warning";

export type InlineAlertProps = {
  children: ReactNode;
  className?: string;
  title?: string;
  tone?: InlineAlertTone;
};

export function InlineAlert({
  children,
  className,
  title,
  tone = "info",
}: InlineAlertProps) {
  const alertClassName = [styles.alert, styles[tone], className]
    .filter(Boolean)
    .join(" ");
  const icons: Record<InlineAlertTone, ReactNode> = {
    error: <CircleAlert size={20} />,
    info: <Info size={20} />,
    success: <CircleCheck size={20} />,
    warning: <TriangleAlert size={20} />,
  };

  return (
    <div
      aria-atomic="true"
      aria-live={tone === "error" ? "assertive" : "polite"}
      className={alertClassName}
      role={tone === "error" ? "alert" : "status"}
    >
      <span aria-hidden="true" className={styles.icon}>
        {icons[tone]}
      </span>
      <div className={styles.copy}>
        {title ? <strong className={styles.title}>{title}</strong> : null}
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
