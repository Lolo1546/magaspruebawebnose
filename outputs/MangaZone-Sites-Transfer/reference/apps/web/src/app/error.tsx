"use client";

import Link from "next/link";

import { ErrorState } from "@/components/feedback/FeedbackState";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";

import styles from "./GlobalState.module.css";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <PageContainer className={styles.page}>
      <ErrorState
        description="Ocurrió un problema inesperado. Puedes intentarlo de nuevo o volver a una ruta segura."
        eyebrow="Error de aplicación"
        headingLevel={1}
        primaryAction={<Button onClick={reset}>Reintentar</Button>}
        secondaryAction={(
          <Link className={styles.link} href="/">
            Ir al inicio
          </Link>
        )}
        title="Algo salió mal"
      />
    </PageContainer>
  );
}
