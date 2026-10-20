import {
  BadgeCheck,
  CalendarDays,
  ExternalLink,
  Languages,
} from "lucide-react";
import Link from "next/link";

import { PageContainer } from "@/components/layout/PageContainer";
import { Chip } from "@/components/ui/Chip";
import type { ScanlationGroupDetail } from "@/data/scanlation-groups";

import styles from "./GroupDetailPage.module.css";

function formatDate(value: string | null): string {
  if (!value) return "No disponible";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No disponible";
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(date);
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

function mediaStyle(url: string | null) {
  return url ? { backgroundImage: `url(${JSON.stringify(url)})` } : undefined;
}

export function GroupDetailPageView({
  group,
}: {
  group: ScanlationGroupDetail;
}) {
  return (
    <PageContainer className={styles.page}>
      <Link className={styles.backLink} href="/grupos">
        ← Volver a grupos
      </Link>

      <header className={styles.hero}>
        <span
          aria-hidden="true"
          className={styles.banner}
          data-has-media={group.bannerUrl ? true : undefined}
          style={mediaStyle(group.bannerUrl)}
        />
        <div className={styles.heroContent}>
          <span
            aria-hidden="true"
            className={styles.logo}
            data-has-media={group.logoUrl ? true : undefined}
            style={mediaStyle(group.logoUrl)}
          >
            {group.logoUrl ? null : getInitials(group.name)}
          </span>
          <div>
            <div className={styles.eyebrow}>
              <span>Grupo de scanlation</span>
              {group.verified ? (
                <Chip variant="success">
                  <BadgeCheck aria-hidden="true" size={14} />
                  Verificado
                </Chip>
              ) : null}
            </div>
            <h1>{group.name}</h1>
            <p>{group.description ?? "Sin descripción pública."}</p>
          </div>
        </div>
      </header>

      <div className={styles.layout}>
        <main className={styles.mainContent}>
          <section
            aria-labelledby="group-overview-title"
            className={styles.panel}
          >
            <h2 id="group-overview-title">Actividad publicada</h2>
            <p>
              Estos conteos proceden directamente de las relaciones públicas del
              grupo. Los listados completos se habilitarán con un contrato
              dedicado.
            </p>
            <dl className={styles.stats}>
              <div>
                <dt>Miembros activos</dt>
                <dd>{group.memberCount}</dd>
              </div>
              <div>
                <dt>Proyectos</dt>
                <dd>{group.projectCount}</dd>
              </div>
              <div>
                <dt>Releases</dt>
                <dd>{group.releaseCount}</dd>
              </div>
            </dl>
          </section>
        </main>

        <aside aria-label="Información del grupo" className={styles.sidebar}>
          <section className={styles.panel}>
            <h2>Información</h2>
            <dl className={styles.facts}>
              <div>
                <dt>
                  <Languages aria-hidden="true" size={15} /> Idioma
                </dt>
                <dd>{group.language}</dd>
              </div>
              <div>
                <dt>
                  <CalendarDays aria-hidden="true" size={15} /> Registrado
                </dt>
                <dd>{formatDate(group.createdAt)}</dd>
              </div>
              <div>
                <dt>Verificado</dt>
                <dd>{formatDate(group.verifiedAt)}</dd>
              </div>
              <div>
                <dt>Actualizado</dt>
                <dd>{formatDate(group.updatedAt)}</dd>
              </div>
            </dl>
            {group.websiteUrl ? (
              <a
                className={styles.website}
                href={group.websiteUrl}
                rel="noreferrer"
                target="_blank"
              >
                Sitio web oficial
                <ExternalLink aria-hidden="true" size={15} />
              </a>
            ) : null}
          </section>
        </aside>
      </div>
    </PageContainer>
  );
}
