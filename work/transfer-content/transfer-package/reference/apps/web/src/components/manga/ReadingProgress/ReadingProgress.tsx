import styles from "./ReadingProgress.module.css";

export type ReadingProgressProps = {
  readonly current: number;
  readonly label?: string;
  readonly percentage?: number;
  readonly total?: number;
  readonly unitLabel?: string;
};

export function ReadingProgress({
  current,
  label = "Progreso de lectura",
  percentage,
  total,
  unitLabel = "Cap.",
}: ReadingProgressProps) {
  const calculated = total && total > 0 ? (current / total) * 100 : 0;
  const value = Math.min(100, Math.max(0, Math.round(percentage ?? calculated)));
  const detail = total === undefined ? `${value}%` : `${unitLabel} ${current} de ${total}`;

  return (
    <div className={styles.progressBlock}>
      <div className={styles.labelRow}>
        <span>{label}</span>
        <span>{detail}</span>
      </div>
      <progress aria-label={`${label}: ${value}%`} max={100} value={value} />
    </div>
  );
}
