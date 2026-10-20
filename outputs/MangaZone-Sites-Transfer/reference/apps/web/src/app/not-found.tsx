import { FileQuestion } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/feedback/FeedbackState";
import { PageContainer } from "@/components/layout/PageContainer";

import styles from "./GlobalState.module.css";

export default function NotFound() {
  return (
    <PageContainer className={styles.page}>
      <EmptyState
        description="El enlace puede haber cambiado o el contenido ya no está disponible."
        eyebrow="Error 404"
        headingLevel={1}
        icon={<FileQuestion size={30} />}
        primaryAction={(
          <Link className={`${styles.link} ${styles.primaryLink}`} href="/">
            Volver al inicio
          </Link>
        )}
        secondaryAction={(
          <Link className={styles.link} href="/explorar">
            Explorar manga
          </Link>
        )}
        title="No encontramos esta página"
      />
    </PageContainer>
  );
}
