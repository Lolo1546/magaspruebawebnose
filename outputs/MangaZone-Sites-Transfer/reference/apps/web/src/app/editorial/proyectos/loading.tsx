import styles from "./Workflow.module.css";

export default function ProjectsLoading() {
  return <main className={styles.page} aria-busy="true"><p role="status">Cargando proyectos editoriales…</p></main>;
}
