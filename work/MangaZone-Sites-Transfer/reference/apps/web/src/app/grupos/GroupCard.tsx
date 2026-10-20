import { BadgeCheck, CalendarDays, Languages } from "lucide-react";
import Link from "next/link";

import type { ScanlationGroup } from "@/data/scanlation-groups";

import styles from "./GroupCard.module.css";

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
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

export function GroupCard({
  group,
  view,
}: {
  group: ScanlationGroup;
  view: "grid" | "list";
}) {
  return (
    <article className={styles.card} data-view={view}>
      <Link
        aria-label={`Ver grupo ${group.name}`}
        className={styles.cardLink}
        href={`/grupos/${group.slug}`}
      >
        <span className={styles.identity}>
          <span
            aria-hidden="true"
            className={styles.avatar}
            data-has-media={group.logoUrl ? true : undefined}
            style={mediaStyle(group.logoUrl)}
          >
            {group.logoUrl ? null : getInitials(group.name)}
          </span>
          <span className={styles.titleBlock}>
            <span className={styles.titleLine}>
              <span className={styles.title}>{group.name}</span>
              {group.verified ? (
                <span aria-label="Grupo verificado" className={styles.verified}>
                  <BadgeCheck aria-hidden="true" size={16} />
                  Verificado
                </span>
              ) : null}
            </span>
            <span className={styles.language}>
              <Languages aria-hidden="true" size={14} />
              {group.language}
            </span>
          </span>
        </span>

        <span className={styles.copy}>
          <span className={styles.description}>
            {group.description ?? "Sin descripción pública."}
          </span>
        </span>

        <span className={styles.stats}>
          <span>
            <strong>{group.memberCount}</strong>
            <small>Miembros</small>
          </span>
          <span>
            <strong>{group.projectCount}</strong>
            <small>Proyectos</small>
          </span>
          <span>
            <strong>{group.releaseCount}</strong>
            <small>Releases</small>
          </span>
        </span>

        <span className={styles.footer}>
          <span>
            <CalendarDays aria-hidden="true" size={14} />
            Registrado {formatDate(group.createdAt)}
          </span>
          <span className={styles.openLabel}>Ver perfil</span>
        </span>
      </Link>
    </article>
  );
}
