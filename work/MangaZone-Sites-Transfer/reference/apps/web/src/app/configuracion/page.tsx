import type { Metadata } from "next";
import { Palette, ShieldCheck } from "lucide-react";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";

import styles from "./AppearancePage.module.css";
import { ThemeSelector } from "./ThemeSelector";

export const metadata: Metadata = {
  title: "Configuración visual | MangaZone",
  description:
    "Elige el tema oscuro, claro o AMOLED de MangaZone y guárdalo localmente en este dispositivo.",
};

export default function SettingsPage() {
  return (
    <PageContainer className={styles.page}>
      <PageHero
        description={(
          <p>
            Ajusta la apariencia de MangaZone sin cambiar el contenido ni la
            configuración de tu cuenta.
          </p>
        )}
        eyebrow="Preferencia local"
        title="Configuración visual"
      />

      <div className={styles.layout}>
        <section aria-labelledby="appearance-heading" className={styles.panel}>
          <div className={styles.heading}>
            <span aria-hidden="true" className={styles.headingIcon}>
              <Palette size={20} strokeWidth={1.8} />
            </span>
            <div>
              <h2 id="appearance-heading">Apariencia</h2>
              <p>Selecciona el tema general de la interfaz.</p>
            </div>
          </div>

          <ThemeSelector />
        </section>

        <aside className={styles.localNote}>
          <ShieldCheck aria-hidden="true" size={22} strokeWidth={1.8} />
          <div>
            <h2>Preferencia privada del dispositivo</h2>
            <p>
              Solo se guarda el nombre del tema en este navegador. No se envía
              información a una cuenta ni a un servidor.
            </p>
          </div>
        </aside>
      </div>
    </PageContainer>
  );
}
