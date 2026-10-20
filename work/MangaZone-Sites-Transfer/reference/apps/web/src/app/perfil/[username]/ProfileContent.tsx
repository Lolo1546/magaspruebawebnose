import { BookOpenCheck, MessageSquareText, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { EmptyState } from "@/components/feedback/FeedbackState";
import { MangaCardGrid } from "@/components/manga/MangaCard";
import { Chip } from "@/components/ui/Chip";
import { publicCommunities } from "@/data/communities";
import { getExploreManga } from "@/data/explore";
import { publicGroups } from "@/data/groups";
import type {
  PublicProfile,
  PublicProfileTab,
} from "@/data/public-profiles";

import styles from "./PublicProfile.module.css";

function resolveManga(slugs: readonly string[]) {
  return slugs.flatMap((slug) => {
    const manga = getExploreManga(slug);
    return manga ? [manga] : [];
  });
}

function SectionHeading({ description, id, title }: { description: string; id?: string; title: string }) {
  return (
    <div className={styles.sectionHeading}>
      <h2 id={id}>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

function ActivityPanel({ profile }: { profile: PublicProfile }) {
  return (
    <section aria-labelledby="profile-activity-heading">
      <SectionHeading description="Acciones públicas compartidas por el perfil." id="profile-activity-heading" title="Actividad reciente" />
      {profile.activity.length ? <ol className={styles.activityList}>
        {profile.activity.map((activity) => {
          const manga = activity.mangaSlug ? getExploreManga(activity.mangaSlug) : undefined;
          return (
            <li className={styles.activityCard} key={activity.id}>
              <div className={styles.activityIcon}><BookOpenCheck aria-hidden="true" size={18} /></div>
              <div>
                <div className={styles.activityTopline}>
                  <h3>{activity.title}</h3>
                  <time>{activity.timeLabel}</time>
                </div>
                <p>{activity.detail}</p>
                {manga ? (
                  <Link className={styles.activityTarget} href={`/manga/${manga.slug}`}>
                    <span className={styles.activityCover}>
                      <Image alt="" fill sizes="52px" src={manga.cover} />
                    </span>
                    <span><strong>{manga.title}</strong><small>Ver ficha del manga</small></span>
                  </Link>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol> : (
        <EmptyState description="Este perfil todavía no comparte actividad." title="Sin actividad pública" />
      )}
    </section>
  );
}

function LibraryPanel({ profile }: { profile: PublicProfile }) {
  const mangas = resolveManga(profile.favoriteMangaSlugs);
  return (
    <section>
      <SectionHeading description="Obras que el perfil mantiene visibles." title="Biblioteca pública" />
      {mangas.length ? <MangaCardGrid ariaLabel="Mangas públicos favoritos" items={mangas} /> : (
        <EmptyState description="Este perfil todavía no comparte obras." title="Biblioteca vacía" />
      )}
    </section>
  );
}

function ListsPanel({ profile }: { profile: PublicProfile }) {
  return (
    <section>
      <SectionHeading description={`Colecciones compartidas por ${profile.displayName}.`} title="Listas públicas" />
      {profile.publicLists.length ? <ul aria-label="Listas públicas" className={styles.listGrid}>
        {profile.publicLists.map((list) => {
          const mangas = resolveManga(list.mangaSlugs).slice(0, 4);
          return (
            <li className={styles.publicListCard} key={list.id}>
              <div aria-hidden="true" className={styles.listPreview}>
                {mangas.map((manga) => (
                  <span key={manga.slug}><Image alt="" fill sizes="100px" src={manga.cover} /></span>
                ))}
              </div>
              <div className={styles.listBody}>
                <Chip variant="success">Pública</Chip>
                <h3>{list.name}</h3>
                <p>{list.description}</p>
                <span>{list.mangaSlugs.length} mangas</span>
              </div>
            </li>
          );
        })}
      </ul> : (
        <EmptyState description="Este perfil todavía no comparte colecciones." title="Sin listas públicas" />
      )}
    </section>
  );
}

function ReviewsPanel({ profile }: { profile: PublicProfile }) {
  return (
    <section>
      <SectionHeading description="Opiniones públicas sobre lecturas del catálogo." title="Reviews" />
      {profile.reviews.length ? <ul aria-label="Reviews públicas" className={styles.contributionGrid}>
        {profile.reviews.map((review) => {
          const manga = getExploreManga(review.mangaSlug);
          if (!manga) return null;
          return (
            <li className={styles.contributionCard} key={review.id}>
              <span className={styles.reviewScore}><Star aria-hidden="true" fill="currentColor" size={16} />{review.score}/10</span>
              <h3><Link href={`/manga/${manga.slug}`}>{manga.title}</Link></h3>
              <p>{review.excerpt}</p>
            </li>
          );
        })}
      </ul> : (
        <EmptyState description="Este perfil todavía no comparte opiniones." title="Sin reseñas públicas" />
      )}
    </section>
  );
}

function PostsPanel({ profile }: { profile: PublicProfile }) {
  return (
    <section>
      <SectionHeading description="Contribuciones demo publicadas en comunidades." title="Publicaciones" />
      {profile.posts.length ? <ul aria-label="Publicaciones públicas" className={styles.contributionGrid}>
        {profile.posts.map((post) => {
          const community = publicCommunities.find((item) => item.slug === post.communitySlug);
          if (!community) return null;
          return (
            <li className={styles.contributionCard} key={post.id}>
              <MessageSquareText aria-hidden="true" className={styles.postIcon} size={20} />
              <h3>{community.name}</h3>
              <p>{post.text}</p>
              <div className={styles.postMeta}><span>{post.timeLabel} · {post.repliesLabel}</span><Link href="/comunidades">Ver comunidades</Link></div>
            </li>
          );
        })}
      </ul> : (
        <EmptyState description="Este perfil todavía no comparte publicaciones." title="Sin publicaciones públicas" />
      )}
    </section>
  );
}

export function ProfileContent({ profile, tab }: { profile: PublicProfile; tab: PublicProfileTab }) {
  if (tab === "library") return <LibraryPanel profile={profile} />;
  if (tab === "lists") return <ListsPanel profile={profile} />;
  if (tab === "reviews") return <ReviewsPanel profile={profile} />;
  if (tab === "posts") return <PostsPanel profile={profile} />;
  return <ActivityPanel profile={profile} />;
}

export function ProfileSidebar({ profile }: { profile: PublicProfile }) {
  const affiliations = profile.affiliations.flatMap((affiliation) => {
    const entity = affiliation.kind === "group"
      ? publicGroups.find((group) => group.slug === affiliation.slug)
      : publicCommunities.find((community) => community.slug === affiliation.slug);
    return entity ? [{ ...affiliation, entity }] : [];
  });

  return (
    <aside aria-label="Información complementaria del perfil" className={styles.sidebar}>
      <section className={styles.sideCard}>
        <h2>Badges</h2>
        <ul className={styles.badgeList}>
          {profile.badges.map((badge) => <li key={badge}>{badge}</li>)}
        </ul>
        <p>Badges visuales del fixture; no representan permisos ni verificación real.</p>
      </section>
      <section className={styles.sideCard}>
        <h2>Grupos y comunidades</h2>
        <ul className={styles.affiliationList}>
          {affiliations.map((affiliation) => (
            <li key={`${affiliation.kind}-${affiliation.slug}`}>
              <span aria-hidden="true">{affiliation.entity.initials}</span>
              <div><strong>{affiliation.entity.name}</strong><small>{affiliation.role}</small></div>
            </li>
          ))}
        </ul>
        <div className={styles.directoryLinks}>
          <Link href="/grupos">Ver grupos</Link>
          <Link href="/comunidades">Ver comunidades</Link>
        </div>
      </section>
    </aside>
  );
}
