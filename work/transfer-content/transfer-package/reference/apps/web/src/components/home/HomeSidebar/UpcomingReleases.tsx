import Image from "next/image";
import Link from "next/link";

import type { UpcomingRelease } from "@/types/home";

import { SidebarWidget } from "./SidebarWidget";
import styles from "./UpcomingReleases.module.css";

type UpcomingReleasesProps = {
  releases: readonly UpcomingRelease[];
};

export function UpcomingReleases({ releases }: UpcomingReleasesProps) {
  return (
    <SidebarWidget title="Próximos lanzamientos">
      {releases.length === 0 ? (
        <p className={styles.empty}>No hay próximos lanzamientos disponibles.</p>
      ) : (
        <ul className={styles.list}>
          {releases.map((release) => (
            <li key={release.id}>
              <Link className={styles.release} href={`/manga/${release.slug}`}>
                <span className={styles.cover}>
                  <Image
                    alt={`Portada demo de ${release.title}`}
                    height={54}
                    loading="lazy"
                    src={release.cover}
                    width={38}
                  />
                  <span
                    aria-hidden="true"
                    className={`${styles.coverTone} ${styles[release.coverTone]}`}
                  />
                </span>
                <span className={styles.info}>
                  <span className={styles.title}>{release.title}</span>
                  <span className={styles.chapter}>Cap. {release.chapter}</span>
                </span>
                <span className={styles.when}>{release.timeLabel}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SidebarWidget>
  );
}
