"use client";

import styles from "./Workflow.module.css";

export default function ProjectsError({ reset }: { error: Error; reset: () => void }) {
  return <main className={styles.page}><h1>No pudimos cargar el área editorial</h1><p>Comprueba tu conexión y vuelve a intentarlo.</p><button className={styles.primary} type="button" onClick={reset}>Reintentar</button></main>;
}
