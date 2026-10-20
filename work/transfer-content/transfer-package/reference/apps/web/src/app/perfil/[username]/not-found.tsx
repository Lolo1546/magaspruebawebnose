import Link from "next/link";

import { EmptyState } from "@/components/feedback/FeedbackState";
import { PageContainer } from "@/components/layout/PageContainer";

import styles from "./PublicProfile.module.css";

export default function PublicProfileNotFound() {
  return (
    <PageContainer className={styles.notFound}>
      <EmptyState
        description="El perfil solicitado no existe en el directorio público local."
        primaryAction={<Link className={styles.notFoundAction} href="/">Volver al inicio</Link>}
        title="Perfil no encontrado"
      />
    </PageContainer>
  );
}
