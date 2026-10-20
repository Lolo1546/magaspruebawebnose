import Link from "next/link";

import type { PublicCommunity } from "@/data/communities.public";
import { formatCompactCount } from "@/utils/format-compact-count";

import type { CommunitiesView } from "./communities-catalog";
import styles from "./CommunityCard.module.css";

function getInitials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join("").toUpperCase();
}

function mediaStyle(url: string | null) {
  return url ? { backgroundImage: `url(${JSON.stringify(url)})` } : undefined;
}

export function CommunityCard({ community, view }: { community: PublicCommunity; view: CommunitiesView }) {
  const href = `/comunidades/${encodeURIComponent(community.slug)}`;
  return (
    <article className={styles.card} data-view={view}>
      <span aria-hidden="true" className={styles.banner} data-has-media={community.bannerUrl ? true : undefined} style={mediaStyle(community.bannerUrl)} />
      <div className={styles.body}>
        <div className={styles.identity}>
          <span aria-hidden="true" className={styles.avatar} data-has-media={community.avatarUrl ? true : undefined} style={mediaStyle(community.avatarUrl)}>{community.avatarUrl ? null : getInitials(community.name)}</span>
          <div className={styles.titleBlock}><h3><Link href={href}>{community.name}</Link></h3><p>c/{community.slug}</p></div>
        </div>
        <p className={styles.description}>{community.description ?? "Sin descripción pública."}</p>
        {community.relatedManga ? <p className={styles.related}>Obra relacionada: <Link href={`/manga/${encodeURIComponent(community.relatedManga.slug)}`}>{community.relatedManga.title}</Link></p> : null}
        <dl className={styles.stats}><div><dt>Miembros</dt><dd>{formatCompactCount(community.memberCount)}</dd></div><div><dt>Publicaciones</dt><dd>{formatCompactCount(community.postCount)}</dd></div></dl>
        <footer className={styles.footer}><Link href={href}>Ver comunidad <span aria-hidden="true">→</span></Link></footer>
      </div>
    </article>
  );
}
