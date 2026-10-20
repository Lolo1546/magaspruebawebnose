import { CalendarDays, MessageCircle, UsersRound } from "lucide-react";
import Link from "next/link";

import { PageContainer } from "@/components/layout/PageContainer";
import type { SelfCommunityMembership } from "@/data/community-memberships";
import type {
  PublicCommunityDetail,
  PublicCommunityPostsPage,
} from "@/data/communities.public";

import { CommunityMembershipAction } from "./CommunityMembershipAction";
import { CommunityPost } from "./CommunityPost";
import { CommunityPostComposer } from "./CommunityPostComposer";
import { createCommunityDetailHref } from "./community-detail";
import styles from "./CommunityDetailPage.module.css";

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";
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

export function CommunityDetailPageView({
  community,
  csrfToken,
  currentUsername,
  initialMembership,
  membershipUnavailable,
  posts,
}: {
  community: PublicCommunityDetail;
  csrfToken: string | null;
  currentUsername: string | null;
  initialMembership: SelfCommunityMembership | null;
  membershipUnavailable: boolean;
  posts: PublicCommunityPostsPage;
}) {
  const canParticipate = Boolean(
    csrfToken &&
    initialMembership?.status === "ACTIVE" &&
    initialMembership.leftAt === null,
  );
  return (
    <PageContainer className={styles.page}>
      <Link className={styles.backLink} href="/comunidades">
        ← Volver a comunidades
      </Link>
      <header className={styles.hero}>
        <span
          aria-hidden="true"
          className={styles.banner}
          data-has-media={community.bannerUrl ? true : undefined}
          style={mediaStyle(community.bannerUrl)}
        />
        <div className={styles.heroContent}>
          <span
            aria-hidden="true"
            className={styles.avatar}
            data-has-media={community.avatarUrl ? true : undefined}
            style={mediaStyle(community.avatarUrl)}
          >
            {community.avatarUrl ? null : getInitials(community.name)}
          </span>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Comunidad pública</p>
            <h1>{community.name}</h1>
            <p>{community.description ?? "Sin descripción pública."}</p>
          </div>
          <div className={styles.membershipAction}>
            <CommunityMembershipAction
              csrfToken={csrfToken}
              initialMembership={initialMembership}
              key={`${initialMembership?.membershipId ?? "none"}:${initialMembership?.role ?? "none"}:${membershipUnavailable}`}
              membershipUnavailable={membershipUnavailable}
              slug={community.slug}
            />
          </div>
        </div>
      </header>

      <div className={styles.layout}>
        <main className={styles.mainContent}>
          <section
            aria-labelledby="community-posts-title"
            className={styles.panel}
          >
            <div className={styles.sectionHeading}>
              <div>
                <p>Conversaciones públicas</p>
                <h2 id="community-posts-title">Publicaciones</h2>
              </div>
              {posts.total > 0 ? (
                <span>
                  Página {posts.page} de {posts.pageCount}
                </span>
              ) : null}
            </div>
            <CommunityPostComposer
              csrfToken={csrfToken}
              membership={initialMembership}
              membershipUnavailable={membershipUnavailable}
              slug={community.slug}
            />
            {posts.items.length ? (
              <div className={styles.postList}>
                {posts.items.map((post) => (
                  <CommunityPost
                    canParticipate={canParticipate}
                    csrfToken={csrfToken}
                    currentUsername={currentUsername}
                    key={post.id}
                    post={post}
                  />
                ))}
              </div>
            ) : (
              <p className={styles.noPosts}>
                Esta comunidad todavía no tiene publicaciones públicas.
              </p>
            )}
            {posts.pageCount > 1 ? (
              <nav
                aria-label="Paginación de publicaciones"
                className={styles.pagination}
              >
                {posts.page > 1 ? (
                  <Link
                    href={createCommunityDetailHref(
                      community.slug,
                      posts.page - 1,
                    )}
                  >
                    Anterior
                  </Link>
                ) : (
                  <span aria-disabled="true">Anterior</span>
                )}
                <span>
                  Página {posts.page} de {posts.pageCount}
                </span>
                {posts.page < posts.pageCount ? (
                  <Link
                    href={createCommunityDetailHref(
                      community.slug,
                      posts.page + 1,
                    )}
                  >
                    Siguiente
                  </Link>
                ) : (
                  <span aria-disabled="true">Siguiente</span>
                )}
              </nav>
            ) : null}
          </section>
        </main>

        <aside
          aria-label="Información de la comunidad"
          className={styles.sidebar}
        >
          <section className={styles.panel}>
            <h2>Información</h2>
            <dl className={styles.stats}>
              <div>
                <dt>
                  <UsersRound aria-hidden="true" size={15} /> Miembros
                </dt>
                <dd>{community.memberCount}</dd>
              </div>
              <div>
                <dt>
                  <MessageCircle aria-hidden="true" size={15} /> Publicaciones
                </dt>
                <dd>{community.postCount}</dd>
              </div>
            </dl>
            {community.relatedManga ? (
              <p className={styles.related}>
                Obra relacionada{" "}
                <Link
                  href={`/manga/${encodeURIComponent(community.relatedManga.slug)}`}
                >
                  {community.relatedManga.title}
                </Link>
              </p>
            ) : null}
            <dl className={styles.dates}>
              <div>
                <dt>
                  <CalendarDays aria-hidden="true" size={15} /> Creada
                </dt>
                <dd>{formatDate(community.createdAt)}</dd>
              </div>
              <div>
                <dt>Actualizada</dt>
                <dd>{formatDate(community.updatedAt)}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </PageContainer>
  );
}
