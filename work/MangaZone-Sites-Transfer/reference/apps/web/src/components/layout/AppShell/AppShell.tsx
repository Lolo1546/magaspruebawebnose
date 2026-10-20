import type { ReactNode } from "react";

import { Header } from "../Header";
import { MobileBottomNav } from "../MobileBottomNav";
import { Sidebar } from "../Sidebar";
import styles from "./AppShell.module.css";

export type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#main-content">
        Ir al contenido
      </a>
      <Header />
      <Sidebar />
      <main className={styles.main} id="main-content" tabIndex={-1}>
        {children}
      </main>
      <MobileBottomNav />
    </div>
  );
}
