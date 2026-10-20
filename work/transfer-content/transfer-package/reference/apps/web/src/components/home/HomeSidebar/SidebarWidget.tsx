import type { ReactNode } from "react";

import styles from "./SidebarWidget.module.css";

type SidebarWidgetProps = {
  action?: ReactNode;
  children: ReactNode;
  title: string;
};

export function SidebarWidget({ action, children, title }: SidebarWidgetProps) {
  return (
    <section className={styles.widget}>
      <header className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        {action ? <div className={styles.action}>{action}</div> : null}
      </header>
      <div className={styles.body}>{children}</div>
    </section>
  );
}
