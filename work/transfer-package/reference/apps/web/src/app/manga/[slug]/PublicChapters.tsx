"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BookOpen, Layers3 } from "lucide-react";

import type { MangaDetail } from "@/data/manga-detail";
import { fetchReleaseProgressBatches, releaseReadLabel, type ReleaseProgress } from "@/data/release-progress";
import type {
  ApiChapterIndexItem,
  ApiChapterIndexResponse,
  ApiChapterReleaseSummary,
} from "./api.server";
import type { MangaDetailQuery } from "./manga-detail-query";
import styles from "./MangaDetailPanels.module.css";

type Props = {
  manga: MangaDetail;
  query: MangaDetailQuery;
  initialIndex: ApiChapterIndexResponse;
  readingUserId?: string | null;
};

function readerHref(
  slug: string,
  chapter: ApiChapterIndexItem,
  release: ApiChapterReleaseSummary,
) {
  return `/manga/${encodeURIComponent(slug)}/capitulo/${encodeURIComponent(chapter.readerKey)}?release=${encodeURIComponent(release.id)}`;
}

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Fecha no disponible"
    : date.toLocaleDateString("es-PE", {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      });
}

function groupLabel(release: ApiChapterReleaseSummary) {
  return (
    release.groups.map((group) => group.name).join(" & ") ||
    "Grupo no disponible"
  );
}

function thumbnailSrc(chapter: ApiChapterIndexItem, cover: string) {
  if (!chapter.thumbnailUrl?.startsWith("/media/chapters/")) return cover;
  const origin = process.env.NEXT_PUBLIC_API_URL;
  return origin
    ? `${origin.replace(/\/+$/, "")}${chapter.thumbnailUrl}`
    : cover;
}

function ChapterThumbnail({
  chapter,
  cover,
  title,
}: {
  chapter: ApiChapterIndexItem;
  cover: string;
  title: string;
}) {
  const [failed, setFailed] = useState(false);
  const candidate = thumbnailSrc(chapter, cover);
  const custom = !failed && candidate !== cover;
  return (
    <Image
      unoptimized
      width={76}
      height={55}
      className={styles.chapterThumb}
      src={custom ? candidate : cover}
      alt={
        custom
          ? `Miniatura de ${chapter.displayLabel}`
          : `Portada de ${title} usada como respaldo de ${chapter.displayLabel}`
      }
      onError={() => setFailed(true)}
    />
  );
}

export function PublicChapters({ manga, query, initialIndex, readingUserId = null }: Props) {
  const [items, setItems] = useState(initialIndex.items);
  const [pagination, setPagination] = useState(initialIndex.pagination);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const request = useRef<AbortController | null>(null);
  const [personal, setPersonal] = useState<{ scope: string; items: ReleaseProgress[] } | null>(null);
  const releaseIds = [...new Set(items.flatMap((chapter) => chapter.releases.map((release) => release.id)))].join(",");
  const scope = `${readingUserId}:${releaseIds}`;
  const progress = new Map(
    (readingUserId && personal?.scope === scope ? personal.items : []).map((item) => [item.chapterReleaseId, item]),
  );

  useEffect(() => {
    const origin = process.env.NEXT_PUBLIC_API_URL;
    if (!readingUserId || !origin || !releaseIds) return;
    const controller = new AbortController();
    void fetchReleaseProgressBatches(origin, releaseIds.split(","), {
      credentials: "include",
      signal: controller.signal,
    }).then((items) => {
      if (!controller.signal.aborted) setPersonal({ scope, items });
    }).catch(() => {
      if (!controller.signal.aborted) setPersonal({ scope, items: [] });
    });
    return () => controller.abort();
  }, [readingUserId, releaseIds, scope]);

  useEffect(() => () => request.current?.abort(), []);

  async function loadMore() {
    if (inFlight.current || pagination.page >= pagination.pageCount) return;
    const origin = process.env.NEXT_PUBLIC_API_URL;
    if (!origin) {
      setError("No se pudieron cargar más capítulos.");
      return;
    }
    inFlight.current = true;
    setLoading(true);
    setError("");
    const controller = new AbortController();
    request.current = controller;
    try {
      const params = new URLSearchParams({
        page: String(pagination.page + 1),
        pageSize: "10",
        sort: query.chapterSort,
      });
      if (query.chapterQuery) params.set("q", query.chapterQuery);
      if (query.group !== "all") params.set("group", query.group);
      const response = await fetch(
        `${origin.replace(/\/+$/, "")}/manga/${encodeURIComponent(manga.slug)}/chapters?${params}`,
        { signal: controller.signal },
      );
      if (!response.ok) throw new Error("No se pudieron cargar más capítulos.");
      const next = (await response.json()) as ApiChapterIndexResponse;
      if (controller.signal.aborted) return;
      setItems((current) => {
        const existing = new Set(current.map((chapter) => chapter.id));
        return [
          ...current,
          ...next.items.filter((chapter) => !existing.has(chapter.id)),
        ];
      });
      setPagination(next.pagination);
    } catch {
      if (!controller.signal.aborted)
        setError("No se pudieron cargar más capítulos. Inténtalo de nuevo.");
    } finally {
      if (!controller.signal.aborted) {
        inFlight.current = false;
        setLoading(false);
        request.current = null;
      }
    }
  }

  return (
    <section aria-labelledby="chapters-heading" className={styles.panel}>
      <header className={styles.panelHeading}>
        <h2 id="chapters-heading">Capítulos · {pagination.total}</h2>
        <p>Cada capítulo reúne sus publicaciones disponibles.</p>
      </header>
      <form
        aria-label="Buscar capítulos"
        className={styles.chapterToolbar}
        method="get"
        role="search"
      >
        <label>
          Buscar capítulo
          <input
            name="chapterQuery"
            type="search"
            maxLength={60}
            defaultValue={query.chapterQuery}
            placeholder="Número o título"
          />
        </label>
        <label>
          Grupo
          <select name="group" defaultValue={query.group}>
            <option value="all">Todos los grupos</option>
            {initialIndex.groups.map((group) => (
              <option value={group.slug} key={group.slug}>
                {group.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Orden
          <select name="chapterSort" defaultValue={query.chapterSort}>
            <option value="desc">Más recientes</option>
            <option value="asc">Más antiguos</option>
          </select>
        </label>
        <button type="submit">Aplicar</button>
      </form>
      {items.length ? (
        <ol aria-label="Capítulos disponibles" className={styles.chapterList}>
          {items.map((chapter) => {
            const primary = chapter.releases[0];
            const alternatives = chapter.releases.slice(1);
            if (!primary) return null;
            const open = !!expanded[chapter.id];
            const alternativeLabel =
              alternatives.length === 1
                ? "otra publicación"
                : `otras ${alternatives.length} publicaciones`;
            const chapterLabel =
              chapter.number === null
                ? chapter.displayLabel
                : `capítulo ${chapter.number}`;
            return (
              <li key={chapter.id}>
                <article className={styles.chapterRow}>
                  <div className={styles.chapterMain}>
                    <ChapterThumbnail
                      chapter={chapter}
                      cover={manga.cover}
                      title={manga.title}
                    />
                    <div className={styles.chapterCopy}>
                      <h3>
                        {chapter.displayLabel}
                        {chapter.title ? ` · ${chapter.title}` : ""}
                      </h3>
                      <p>
                        {groupLabel(primary)} · {primary.language} ·{" "}
                        <time dateTime={primary.publishedAt}>
                          {dateLabel(primary.publishedAt)}
                        </time>
                      </p>
                    </div>
                    <div className={styles.chapterActions}>
                      <Link
                        className={styles.readLink}
                        href={readerHref(manga.slug, chapter, primary)}
                      >
                        <BookOpen aria-hidden="true" size={16} /> {releaseReadLabel(progress.get(primary.id))}
                      </Link>
                      {alternatives.length > 0 && (
                        <button
                          className={styles.alternativesToggle}
                          type="button"
                          aria-expanded={open}
                          aria-controls={`alternatives-${chapter.id}`}
                          aria-label={`${open ? "Ocultar" : "Ver"} ${alternativeLabel} del ${chapterLabel}`}
                          onClick={() =>
                            setExpanded((current) => ({
                              ...current,
                              [chapter.id]: !current[chapter.id],
                            }))
                          }
                        >
                          <Layers3 size={16} aria-hidden="true" />
                          <span aria-hidden="true">{alternatives.length}</span>
                        </button>
                      )}
                    </div>
                  </div>
                  {alternatives.length > 0 && (
                    <div
                      id={`alternatives-${chapter.id}`}
                      className={styles.alternatives}
                      hidden={!open}
                    >
                      <h4>Otras publicaciones</h4>
                      <ul>
                        {alternatives.map((release) => (
                          <li key={release.id}>
                            <span>
                              {groupLabel(release)} · {release.language} ·{" "}
                              <time dateTime={release.publishedAt}>
                                {dateLabel(release.publishedAt)}
                              </time>
                            </span>
                            <Link
                              className={styles.readLink}
                              href={readerHref(manga.slug, chapter, release)}
                            >
                              {releaseReadLabel(progress.get(release.id))}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </article>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className={styles.emptyChapters}>
          No hay capítulos públicos para esta búsqueda.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {loading && <p role="status">Cargando más capítulos…</p>}
      {pagination.page < pagination.pageCount && (
        <button
          className={styles.loadMore}
          type="button"
          disabled={loading}
          onClick={() => void loadMore()}
        >
          {loading ? "Cargando capítulos…" : "Mostrar más capítulos"}
        </button>
      )}
    </section>
  );
}
