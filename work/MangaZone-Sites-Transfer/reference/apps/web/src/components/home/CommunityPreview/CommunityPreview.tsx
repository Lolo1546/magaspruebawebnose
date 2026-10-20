"use client";

import { Eye, Heart, MessageCircle, ShieldAlert } from "lucide-react";
import Link from "next/link";
import type { KeyboardEvent } from "react";
import { useId, useRef, useState } from "react";

import { HomeEmptyState } from "@/components/home/HomeEmptyState";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { CommunityFeed, CommunityPost } from "@/types/home";

import styles from "./CommunityPreview.module.css";

const feedLabels: Record<CommunityFeed, string> = {
  featured: "Destacados",
  recent: "Recientes",
};

const feeds = Object.keys(feedLabels) as CommunityFeed[];

type CommunityPreviewProps = {
  posts: readonly CommunityPost[];
};

export function CommunityPreview({ posts }: CommunityPreviewProps) {
  const [activeFeed, setActiveFeed] = useState<CommunityFeed>("featured");
  const [revealedSpoilers, setRevealedSpoilers] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const tabListId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const visiblePosts = (
    activeFeed === "featured"
      ? posts.filter((post) => post.isFeatured)
      : [
          ...posts.filter((post) => !post.isFeatured),
          ...posts.filter((post) => post.isFeatured),
        ]
  ).slice(0, 4);

  function revealSpoiler(postId: string) {
    setRevealedSpoilers((current) => {
      const next = new Set(current);
      next.add(postId);
      return next;
    });
  }

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) {
    let nextIndex = currentIndex;

    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % feeds.length;
    else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + feeds.length) % feeds.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = feeds.length - 1;
    else return;

    event.preventDefault();
    const nextFeed = feeds[nextIndex];
    setActiveFeed(nextFeed);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <section aria-label="Comunidad" className={styles.section} id="comunidad-home">
      <SectionHeader
        action={<Link href="/comunidades">Ver comunidad →</Link>}
        subtitle="Preview demo del ecosistema MangaZone"
        title="Comunidad"
      />

      <div aria-label="Orden de publicaciones" className={styles.tabs} role="tablist">
        {feeds.map((feed, index) => (
          <button
            aria-controls={`${tabListId}-panel`}
            aria-selected={activeFeed === feed}
            className={styles.tab}
            id={`${tabListId}-${feed}`}
            key={feed}
            onClick={() => setActiveFeed(feed)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            role="tab"
            tabIndex={activeFeed === feed ? 0 : -1}
            type="button"
          >
            {feedLabels[feed]}
          </button>
        ))}
      </div>

      <div
        aria-labelledby={`${tabListId}-${activeFeed}`}
        id={`${tabListId}-panel`}
        role="tabpanel"
      >
        {visiblePosts.length === 0 ? (
          <HomeEmptyState message="No hay publicaciones disponibles." />
        ) : (
          <div className={styles.grid}>
            {visiblePosts.map((post) => {
              const spoilerIsHidden =
                post.isSpoiler && !revealedSpoilers.has(post.id);

              return (
                <article className={styles.post} key={post.id}>
                  <header className={styles.postHeader}>
                    <span className={`${styles.avatar} ${styles[post.avatarTone]}`}>
                      {post.avatarInitials}
                    </span>
                    <span className={styles.identity}>
                      <span className={styles.username}>@{post.username}</span>
                      <span className={styles.time}>{post.timeLabel}</span>
                    </span>
                  </header>

                  <h3 className={styles.title}>{post.title}</h3>

                  {spoilerIsHidden ? (
                    <div className={styles.spoiler}>
                      <ShieldAlert aria-hidden="true" size={18} />
                      <span>Contiene spoilers</span>
                      <button
                        className={styles.revealButton}
                        onClick={() => revealSpoiler(post.id)}
                        type="button"
                      >
                        <Eye aria-hidden="true" size={14} />
                        Mostrar contenido
                      </button>
                    </div>
                  ) : (
                    <p className={styles.excerpt}>{post.excerpt}</p>
                  )}

                  <footer className={styles.metrics}>
                    <span>
                      <Heart aria-hidden="true" size={14} />
                      {post.likes.toLocaleString("es-ES")}
                    </span>
                    <span>
                      <MessageCircle aria-hidden="true" size={14} />
                      {post.comments.toLocaleString("es-ES")}
                    </span>
                  </footer>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
