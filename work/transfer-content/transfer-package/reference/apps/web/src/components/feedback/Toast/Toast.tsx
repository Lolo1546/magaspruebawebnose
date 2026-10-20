"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

import styles from "./Toast.module.css";

export type ToastTone = "error" | "info" | "success" | "warning";

export type ToastProps = {
  children: ReactNode;
  className?: string;
  onDismiss?: () => void;
  title?: string;
  tone?: ToastTone;
};

export function Toast({
  children,
  className,
  onDismiss,
  title,
  tone = "info",
}: ToastProps) {
  const toastClassName = [styles.toast, styles[tone], className]
    .filter(Boolean)
    .join(" ");
  const isAssertive = tone === "error";

  return (
    <div
      aria-atomic="true"
      aria-live={isAssertive ? "assertive" : "polite"}
      className={toastClassName}
      role={isAssertive ? "alert" : "status"}
    >
      <div className={styles.copy}>
        {title ? <strong className={styles.title}>{title}</strong> : null}
        <div className={styles.content}>{children}</div>
      </div>
      {onDismiss ? (
        <button
          aria-label="Cerrar notificación"
          className={styles.dismiss}
          onClick={onDismiss}
          type="button"
        >
          <X aria-hidden="true" size={18} />
        </button>
      ) : null}
    </div>
  );
}
