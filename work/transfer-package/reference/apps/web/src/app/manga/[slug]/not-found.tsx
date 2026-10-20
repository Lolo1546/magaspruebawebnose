import Link from "next/link";

import { EmptyState } from "@/components/feedback/FeedbackState";
import { PageContainer } from "@/components/layout/PageContainer";

import styles from "./NotFound.module.css";

export default function MangaNotFound() {
  return (
    <PageContainer className={styles.page}>
      <EmptyState
        description="La obra solicitada no está disponible en el catálogo local."
        primaryAction={
          <Link className={styles.action} href="/explorar">
            Volver a Explorar
          </Link>
        }
        title="Manga no encontrado"
      />
    </PageContainer>
  );
}
