"use client";

import styles from "./CommunityModerationPanel.module.css";

export default function CommunityModerationError({ reset }: { reset: () => void }) {
  return (
    <main className={styles.page}>
      <div className={styles.state} role="alert">
        <h1>No pudimos cargar la moderación</h1>
        <p>Ninguna acción fue aplicada. Inténtalo nuevamente.</p>
        <button className={styles.primaryButton} onClick={reset} type="button">
          Reintentar
        </button>
      </div>
    </main>
  );
}
