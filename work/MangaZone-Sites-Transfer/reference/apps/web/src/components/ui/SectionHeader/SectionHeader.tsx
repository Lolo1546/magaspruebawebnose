import type { ReactNode } from "react";

import styles from "./SectionHeader.module.css";

export type SectionHeaderProps = {
  action?: ReactNode;
  className?: string;
  subtitle?: string;
  title: string;
};

export function SectionHeader({
  action,
  className,
  subtitle,
  title,
}: SectionHeaderProps) {
  const headerClassName = [styles.header, className]
    .filter(Boolean)
    .join(" ");

  return (
    <header className={headerClassName}>
      <div className={styles.headingGroup}>
        <span className={styles.accent} aria-hidden="true" />
        <div className={styles.copy}>
          <h2 className={styles.title}>{title}</h2>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        </div>
      </div>
      {action ? <div className={styles.action}>{action}</div> : null}
    </header>
  );
}
