import Link from "next/link";

import { EmptyState } from "@/components/feedback/FeedbackState";

import styles from "./ReaderNotFound.module.css";

export default function ReaderNotFound() {
  return (
    <main className={styles.page} id="reader-content">
      <EmptyState
        description="El manga o capítulo solicitado no está disponible en el fixture local."
        primaryAction={
          <Link className={styles.action} href="/explorar">
            Volver a Explorar
          </Link>
        }
        title="Capítulo no encontrado"
      />
    </main>
  );
}
