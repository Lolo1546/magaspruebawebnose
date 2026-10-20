import Link from "next/link";
import { fetchAdminDashboard } from "@/data/admin.server";
import styles from "./AdminShell.module.css";

export default async function AdministrationPage() {
  const data = await fetchAdminDashboard();
  return (
    <>
      <header className={styles.heading}>
        <span className={styles.eyebrow}>Control global</span>
        <h1 className={styles.title}>Resumen administrativo</h1>
        <p className={styles.subtitle}>
          Estado operativo real de MangaZone, sin datos de demostración.
        </p>
      </header>
      <section className={styles.stats} aria-label="Métricas principales">
        <article className={styles.card}>
          <small>Usuarios</small>
          <strong>{data.users.total}</strong>
        </article>
        <article className={styles.card}>
          <small>Comunidades activas</small>
          <strong>{data.activeCommunities}</strong>
        </article>
        <article className={styles.card}>
          <small>Grupos verificados</small>
          <strong>{data.verifiedScanlationGroups}</strong>
        </article>
        <article className={styles.card}>
          <small>Solicitudes por atender</small>
          <strong>{data.creationRequests.attentionRequired}</strong>
        </article>
      </section>
      <section className={styles.quick} aria-label="Accesos rápidos">
        <Link href="/administracion/usuarios">Explorar usuarios</Link>
        <Link href="/administracion/comunidades">Revisar comunidades</Link>
        <Link href="/administracion/solicitudes">Atender solicitudes</Link>
      </section>
    </>
  );
}
