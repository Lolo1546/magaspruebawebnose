import styles from "./CommunityModerationPanel.module.css";

export default function CommunityModerationLoading() {
  return (
    <main className={styles.page}>
      <div aria-busy="true" className={styles.state} role="status">
        <span className={styles.spinner} />
        <h1>Cargando contenido oculto</h1>
        <p>Estamos consultando tus comunidades autorizadas.</p>
      </div>
    </main>
  );
}
