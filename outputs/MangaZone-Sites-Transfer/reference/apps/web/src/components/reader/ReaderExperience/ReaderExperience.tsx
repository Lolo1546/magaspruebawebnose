"use client";

import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Expand,
  HelpCircle,
  List,
  Maximize2,
  Minimize2,
  Search,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { ReaderOverlay } from "@/components/reader/ReaderOverlay";
import type { ReaderChapterData } from "@/data/reader";

import {
  calculateReaderProgress,
  findCurrentReaderPage,
  getReaderScrollPosition,
  isEditableReaderTarget,
  normalizeReaderSearch,
} from "./reader-interactions";
import styles from "./ReaderExperience.module.css";
import { useReaderFullscreen } from "./useReaderFullscreen";
import { ReaderPersistenceConfig, useReaderPersistence } from "./useReaderPersistence";

export type ReaderWidth = "comfortable" | "narrow" | "wide";

export type ReaderExperienceProps = {
  readonly persistenceConfig?: ReaderPersistenceConfig | null;
  readonly initialPage: number;
  readonly reader: ReaderChapterData;
};

const widthOptions: readonly { label: string; value: ReaderWidth }[] = [
  { label: "Estrecho", value: "narrow" },
  { label: "Cómodo", value: "comfortable" },
  { label: "Amplio", value: "wide" },
];

type OpenOverlay = "chapters" | "help" | null;

export function ReaderExperience({ persistenceConfig, initialPage, reader }: ReaderExperienceProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const pageElementsRef = useRef(new Map<number, HTMLElement>());
  const pageRatiosRef = useRef(new Map<number, number>());
  const lastScrollYRef = useRef(0);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const [chapterQuery, setChapterQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [headerHidden, setHeaderHidden] = useState(false);
  const [openOverlay, setOpenOverlay] = useState<OpenOverlay>(null);
  const [readerWidth, setReaderWidth] =
    useState<ReaderWidth>("comfortable");
  const { isFullscreen, isSupported, toggleFullscreen } =
    useReaderFullscreen(rootRef);

  const closeOverlay = useCallback(() => setOpenOverlay(null), []);
  const progress = calculateReaderProgress(currentPage, reader.pages.length);
  const filteredChapters = useMemo(() => {
    const normalizedQuery = normalizeReaderSearch(chapterQuery);
    if (!normalizedQuery) return reader.chapterLinks;

    return reader.chapterLinks.filter((chapter) => {
      const searchable = normalizeReaderSearch(
        `${chapter.displayLabel} ${chapter.title ?? ""}`,
      );

      return searchable.includes(normalizedQuery);
    });
  }, [chapterQuery, reader.chapterLinks]);

  useReaderPersistence({
    config: persistenceConfig,
    currentPage,
  });

  useEffect(() => {
    if (initialPage > 1) {
      const el = document.querySelector(`[data-reader-page="${initialPage}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "instant", block: "start" });
      }
    }
  }, [initialPage]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const pageNumber = Number(
            (entry.target as HTMLElement).dataset.readerPage,
          );
          pageRatiosRef.current.set(
            pageNumber,
            entry.isIntersecting ? entry.intersectionRatio : 0,
          );
        }

        const current = findCurrentReaderPage(pageRatiosRef.current);
        if (current !== undefined) setCurrentPage(current);
      },
      { threshold: [0.2, 0.55, 0.8] },
    );

    for (const element of pageElementsRef.current.values()) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [reader.pages]);

  useEffect(() => {
    const scrollTarget = isFullscreen ? rootRef.current : window;
    if (!scrollTarget) return;

    lastScrollYRef.current = getReaderScrollPosition(scrollTarget);

    const handleScroll = () => {
      if (animationFrameRef.current !== undefined) return;

      animationFrameRef.current = window.requestAnimationFrame(() => {
        const currentScrollY = getReaderScrollPosition(scrollTarget);
        const isMovingDown = currentScrollY > lastScrollYRef.current;
        setHeaderHidden(isMovingDown && currentScrollY > 120);
        lastScrollYRef.current = currentScrollY;
        animationFrameRef.current = undefined;
      });
    };

    scrollTarget.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      scrollTarget.removeEventListener("scroll", handleScroll);
      if (animationFrameRef.current !== undefined) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
    };
  }, [isFullscreen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        openOverlay ||
        isEditableReaderTarget(event.target) ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      ) {
        return;
      }

      if (event.key === "ArrowLeft" && reader.previousHref) {
        event.preventDefault();
        router.push(reader.previousHref);
      } else if (event.key === "ArrowRight" && reader.nextHref) {
        event.preventDefault();
        router.push(reader.nextHref);
      } else if (event.key.toLocaleLowerCase("en") === "f" && isSupported) {
        event.preventDefault();
        void toggleFullscreen();
      } else if (event.key.toLocaleLowerCase("en") === "c") {
        event.preventDefault();
        setOpenOverlay("chapters");
      } else if (event.key === "?") {
        event.preventDefault();
        setOpenOverlay("help");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSupported, openOverlay, reader.nextHref, reader.previousHref, router, toggleFullscreen]);

  const registerPage = (number: number, element: HTMLElement | null) => {
    if (element) pageElementsRef.current.set(number, element);
    else pageElementsRef.current.delete(number);
  };

  return (
    <div
      className={styles.reader}
      data-overlay-open={openOverlay ? true : undefined}
      data-width={readerWidth}
      onPointerMove={(event) => {
        if (event.clientY < 72) setHeaderHidden(false);
      }}
      ref={rootRef}
    >
      <a className={styles.skipLink} href="#reader-pages">
        Ir a las páginas
      </a>

      <div
        aria-label={`Progreso del capítulo: ${Math.round(progress)}%`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={Math.round(progress)}
        className={styles.progressRail}
        role="progressbar"
      >
        <span
          className={styles.progressFill}
          style={{ transform: `scaleX(${progress / 100})` }}
        />
      </div>

      <header
        className={`${styles.header} ${headerHidden ? styles.headerHidden : ""}`}
        data-autohide-hidden={headerHidden ? "true" : undefined}
        onFocusCapture={() => setHeaderHidden(false)}
      >
        <Link
          aria-label={`Volver a la ficha de ${reader.manga.title}`}
          className={styles.iconControl}
          href={`/manga/${reader.manga.slug}`}
        >
          <ArrowLeft aria-hidden="true" size={20} />
        </Link>

        <div className={styles.heading}>
          <span>{reader.manga.title}</span>
          <strong>
            {reader.chapter.displayLabel}
            {reader.chapter.title && reader.chapter.title !== reader.chapter.displayLabel
              ? ` · ${reader.chapter.title}`
              : ""}
          </strong>
        </div>

        <div className={styles.headerActions}>
          <button
            aria-label={`Cambiar ancho de lectura. Actual: ${widthOptions.find((option) => option.value === readerWidth)?.label}`}
            className={styles.iconControl}
            onClick={() => {
              setReaderWidth((current) =>
                current === "narrow"
                  ? "comfortable"
                  : current === "comfortable"
                    ? "wide"
                    : "narrow",
              );
            }}
            title="Cambiar ancho de lectura"
            type="button"
          >
            <Expand aria-hidden="true" size={19} />
          </button>
          <button
            aria-label={
              isFullscreen ? "Salir de pantalla completa" : "Entrar en pantalla completa"
            }
            className={styles.iconControl}
            disabled={!isSupported}
            onClick={() => void toggleFullscreen()}
            title={isSupported ? "Pantalla completa (F)" : "Pantalla completa no disponible"}
            type="button"
          >
            {isFullscreen ? (
              <Minimize2 aria-hidden="true" size={19} />
            ) : (
              <Maximize2 aria-hidden="true" size={19} />
            )}
          </button>
          <button
            aria-label="Ver ayuda de teclado"
            className={styles.iconControl}
            onClick={() => setOpenOverlay("help")}
            title="Atajos de teclado (?)"
            type="button"
          >
            <HelpCircle aria-hidden="true" size={19} />
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <section aria-labelledby="reader-title" className={styles.intro}>
          <p>{reader.manga.title}</p>
          <h1 id="reader-title">
            {reader.chapter.displayLabel}
            {reader.chapter.title && reader.chapter.title !== reader.chapter.displayLabel
              ? `: ${reader.chapter.title}`
              : ""}
          </h1>
          <span>
            {reader.chapter.group} · {reader.chapter.language} · {reader.chapter.publishedAtLabel}
          </span>
          <div aria-label="Ancho de lectura" className={styles.widthControls} role="group">
            {widthOptions.map((option) => (
              <button
                aria-pressed={readerWidth === option.value}
                key={option.value}
                onClick={() => setReaderWidth(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <section
          aria-label={`Páginas de ${reader.chapter.displayLabel}`}
          className={styles.pages}
          id="reader-pages"
          tabIndex={-1}
        >
          {reader.pages.map((page, index) => (
            <figure
              className={styles.page}
              data-reader-page={page.number}
              key={page.id}
              ref={(element) => registerPage(page.number, element)}
            >
              <Image
                alt={page.alt}
                fill
                priority={index === 0}
                sizes="(max-width: 600px) 100vw, (max-width: 1024px) 92vw, 920px"
                src={page.src}
                unoptimized
              />
              <figcaption>
                {page.number} / {reader.pages.length}
              </figcaption>
            </figure>
          ))}
        </section>

        <section aria-labelledby="chapter-complete" className={styles.chapterEnd}>
          <p>Capítulo completado</p>
          <h2 id="chapter-complete">
            Llegaste al final de {reader.chapter.displayLabel}
          </h2>
          <span>{persistenceConfig ? "Tu progreso se guarda para esta publicación." : "Inicia sesión para guardar tu progreso entre visitas."}</span>
          <div className={styles.endActions}>
            {reader.previousHref ? (
              <Link href={reader.previousHref}>
                <ChevronLeft aria-hidden="true" size={18} />
                {reader.previousLabel}
              </Link>
            ) : (
              <span aria-disabled="true">No hay capítulo anterior</span>
            )}
            {reader.nextHref ? (
              <Link className={styles.nextAction} href={reader.nextHref}>
                {reader.nextLabel}
                <ChevronRight aria-hidden="true" size={18} />
              </Link>
            ) : (
              <span aria-disabled="true">No hay capítulo siguiente</span>
            )}
          </div>
        </section>
      </main>

      <nav aria-label="Navegación del capítulo" className={styles.floatingControls}>
        {reader.previousHref ? (
          <Link aria-label={`Ir a ${reader.previousLabel}`} href={reader.previousHref}>
            <ChevronLeft aria-hidden="true" size={20} />
          </Link>
        ) : (
          <button aria-label="No hay capítulo anterior" disabled type="button">
            <ChevronLeft aria-hidden="true" size={20} />
          </button>
        )}
        <button
          aria-label="Abrir lista de capítulos"
          className={styles.chapterButton}
          onClick={() => setOpenOverlay("chapters")}
          type="button"
        >
          <List aria-hidden="true" size={17} />
          <span aria-live="polite">
            {reader.chapter.displayLabel} · pág. {currentPage}/{reader.pages.length}
          </span>
        </button>
        {reader.nextHref ? (
          <Link aria-label={`Ir a ${reader.nextLabel}`} href={reader.nextHref}>
            <ChevronRight aria-hidden="true" size={20} />
          </Link>
        ) : (
          <button aria-label="No hay capítulo siguiente" disabled type="button">
            <ChevronRight aria-hidden="true" size={20} />
          </button>
        )}
      </nav>

      {openOverlay === "chapters" ? (
        <ReaderOverlay
          description={`${reader.manga.title} · ${reader.chapterLinks.length} capítulos disponibles`}
          isOpen
          onClose={closeOverlay}
          title="Capítulos"
          variant="drawer"
        >
          <label className={styles.chapterSearch}>
            <span className={styles.visuallyHidden}>Buscar capítulo</span>
            <Search aria-hidden="true" size={17} />
            <input
              onChange={(event) => setChapterQuery(event.target.value)}
              placeholder="Número o título"
              type="search"
              value={chapterQuery}
            />
          </label>
          <div className={styles.chapterList}>
            {filteredChapters.length ? (
              filteredChapters.map((chapter) => (
                <Link
                  aria-current={chapter.isCurrent ? "page" : undefined}
                  href={chapter.href}
                  key={chapter.readerKey}
                  onClick={closeOverlay}
                >
                  <strong>{chapter.displayLabel}</strong>
                  {chapter.title && chapter.title !== chapter.displayLabel ? <span>{chapter.title}</span> : null}
                </Link>
              ))
            ) : (
              <p className={styles.noChapters}>
                No hay capítulos que coincidan con la búsqueda.
              </p>
            )}
          </div>
        </ReaderOverlay>
      ) : null}

      {openOverlay === "help" ? (
        <ReaderOverlay
          description="Los atajos se desactivan mientras escribes en un campo."
          isOpen
          onClose={closeOverlay}
          title="Atajos del lector"
          variant="dialog"
        >
          <dl className={styles.shortcutList}>
            <div><dt><kbd>←</kbd></dt><dd>Capítulo anterior</dd></div>
            <div><dt><kbd>→</kbd></dt><dd>Capítulo siguiente</dd></div>
            <div><dt><kbd>C</kbd></dt><dd>Abrir capítulos</dd></div>
            <div><dt><kbd>F</kbd></dt><dd>Alternar pantalla completa</dd></div>
            <div><dt><kbd>?</kbd></dt><dd>Mostrar esta ayuda</dd></div>
            <div><dt><kbd>Esc</kbd></dt><dd>Cerrar el overlay activo</dd></div>
          </dl>
        </ReaderOverlay>
      ) : null}
    </div>
  );
}
