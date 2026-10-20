import type { ReactNode } from "react";

import styles from "./HomeContentLayout.module.css";

type HomeContentLayoutProps = {
  children: ReactNode;
  sidebar: ReactNode;
};

export function HomeContentLayout({
  children,
  sidebar,
}: HomeContentLayoutProps) {
  return (
    <div className={styles.layout}>
      <div className={styles.mainColumn}>{children}</div>
      <div className={styles.sidebarColumn}>{sidebar}</div>
    </div>
  );
}
