import {
  ArrowDown,
  ArrowUp,
  CircleMinus,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { EmptyState } from "@/components/feedback/FeedbackState";
import { Rating } from "@/components/manga/Rating";
import { Chip } from "@/components/ui/Chip";
import { rankingCategoryLabels, rankingPeriodLabels } from "@/data/ranking";

import {
  getRankMovement,
  type RankMovement,
  type RankingFilters,
  type RankingItem,
} from "./ranking-catalog";
import styles from "./RankingResults.module.css";

export function RankingResults({
  filters,
  items,
}: {
  filters: RankingFilters;
  items: readonly RankingItem[];
}) {
  if (!items.length) {
    return (
      <EmptyState
        description="No hay obras clasificadas para esta combinación de categoría y periodo."
        primaryAction={<Link className={styles.resetLink} href="/ranking">Ver ranking semanal</Link>}
        title="Ranking no disponible"
      />
    );
  }

  const podium = items.slice(0, 3);
  const remaining = items.slice(3);
  const movements = items.map((item) => ({
    item,
    movement: getRankMovement(item.entry.rank, item.entry.previousRank),
  }));
  const biggestRise = movements
    .filter(({ movement }) => movement.kind === "up")
    .sort((left, right) => right.movement.amount - left.movement.amount)[0];
  const biggestDrop = movements
    .filter(({ movement }) => movement.kind === "down")
    .sort((left, right) => right.movement.amount - left.movement.amount)[0];

  return (
    <div className={styles.results}>
      <section aria-labelledby="ranking-podium-title">
        <div className={styles.sectionHeading}>
          <div>
            <p>Podio actual</p>
            <h2 id="ranking-podium-title">Top 3</h2>
          </div>
          <span>{rankingCategoryLabels[filters.category]} · {rankingPeriodLabels[filters.period]}</span>
        </div>

        <ol aria-label="Tres primeras posiciones" className={styles.podium}>
          {podium.map((item) => (
            <li data-rank={item.entry.rank} key={item.manga.slug} value={item.entry.rank}>
              <article className={styles.podiumCard}>
                <Link className={styles.podiumCover} href={`/manga/${item.manga.slug}`}>
                  <Image
                    alt={`Portada de demostración de ${item.manga.title}`}
                    fill
                    priority={item.entry.rank === 1}
                    sizes="(max-width: 760px) calc(100vw - 32px), (max-width: 1180px) 30vw, 360px"
                    src={item.manga.cover}
                  />
                  <span className={styles.medal}>
                    <span className={styles.visuallyHidden}>Posición </span>
                    {item.entry.rank}
                  </span>
                  <Movement movement={getRankMovement(item.entry.rank, item.entry.previousRank)} />
                </Link>
                <div className={styles.podiumBody}>
                  <Chip variant="glass">{item.manga.type}</Chip>
                  <h3><Link href={`/manga/${item.manga.slug}`}>{item.manga.title}</Link></h3>
                  <div className={styles.podiumMetrics}>
                    <Rating score={item.manga.score} />
                    <span><strong>{item.entry.score}</strong> índice local</span>
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ol>
      </section>

      <div className={styles.contentLayout}>
        <section aria-labelledby="ranking-list-title" className={styles.rankingPanel}>
          <h2 className={styles.visuallyHidden} id="ranking-list-title">Posiciones restantes</h2>
          <ol aria-label="Posiciones cuatro en adelante" className={styles.rankingList} start={4}>
            {remaining.map((item) => (
              <li key={item.manga.slug} value={item.entry.rank}>
                <article className={styles.row}>
                  <span className={styles.rank}>
                    <span className={styles.visuallyHidden}>Posición </span>
                    {item.entry.rank}
                  </span>
                  <Link className={styles.cover} href={`/manga/${item.manga.slug}`}>
                    <Image
                      alt={`Portada de demostración de ${item.manga.title}`}
                      fill
                      sizes="(max-width: 540px) 54px, 68px"
                      src={item.manga.cover}
                    />
                  </Link>
                  <div className={styles.mainCopy}>
                    <h3><Link href={`/manga/${item.manga.slug}`}>{item.manga.title}</Link></h3>
                    <div className={styles.meta}>
                      <Chip variant="glass">{item.manga.type}</Chip>
                      <span>{item.manga.genre}</span>
                    </div>
                  </div>
                  <div className={styles.ratingCell}><Rating score={item.manga.score} /></div>
                  <div className={styles.score}>
                    <strong>{item.entry.score}</strong>
                    <span>Índice local</span>
                  </div>
                  <Movement movement={getRankMovement(item.entry.rank, item.entry.previousRank)} />
                </article>
              </li>
            ))}
          </ol>
        </section>

        <aside aria-label="Resumen del ranking" className={styles.summary}>
          <section>
            <h2>Resumen del periodo</h2>
            <dl>
              <div>
                <dt><TrendingUp aria-hidden="true" size={16} />Mayor subida</dt>
                <dd>{biggestRise ? `${biggestRise.item.manga.title} +${biggestRise.movement.amount}` : "Sin cambios"}</dd>
              </div>
              <div>
                <dt><TrendingDown aria-hidden="true" size={16} />Mayor caída</dt>
                <dd>{biggestDrop ? `${biggestDrop.item.manga.title} −${biggestDrop.movement.amount}` : "Sin cambios"}</dd>
              </div>
            </dl>
          </section>
          <section>
            <h2>Cómo se calcula</h2>
            <p>Los índices y movimientos son fixtures locales y deterministas. No representan analítica, votos ni actividad real.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Movement({ movement }: { movement: RankMovement }) {
  const Icon = movement.kind === "up"
    ? ArrowUp
    : movement.kind === "down"
      ? ArrowDown
      : movement.kind === "new"
        ? Sparkles
        : CircleMinus;
  const shortLabel = movement.kind === "new"
    ? "Nuevo"
    : movement.kind === "same"
      ? "Igual"
      : `${movement.kind === "up" ? "+" : "−"}${movement.amount}`;

  return (
    <span className={styles.movement} data-kind={movement.kind}>
      <Icon aria-hidden="true" size={14} />
      <span aria-hidden="true">{shortLabel}</span>
      <span className={styles.visuallyHidden}>{movement.label}</span>
    </span>
  );
}
