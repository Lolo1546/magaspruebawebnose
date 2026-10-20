import { Star } from "lucide-react";

import styles from "./Rating.module.css";

export type RatingProps = {
  readonly score: number;
  readonly votesLabel?: string;
};

export function Rating({ score, votesLabel }: RatingProps) {
  const accessibleLabel = votesLabel
    ? `Puntuación ${score.toFixed(1)} de 10, ${votesLabel}`
    : `Puntuación ${score.toFixed(1)} de 10`;

  return (
    <span aria-label={accessibleLabel} className={styles.rating}>
      <Star aria-hidden="true" fill="currentColor" size={18} />
      <strong>{score.toFixed(1)}</strong>
      {votesLabel ? <span>{votesLabel}</span> : null}
    </span>
  );
}
