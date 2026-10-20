import { PageContainer } from "../PageContainer";
import styles from "./PlaceholderPage.module.css";

export type PlaceholderPageProps = {
  title: string;
};

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <PageContainer className={styles.container}>
      <section aria-labelledby="placeholder-title" className={styles.panel}>
        <p className={styles.eyebrow}>Sección MangaZone</p>
        <h1 id="placeholder-title">{title}</h1>
        <p className={styles.status}>Próximamente</p>
      </section>
    </PageContainer>
  );
}
