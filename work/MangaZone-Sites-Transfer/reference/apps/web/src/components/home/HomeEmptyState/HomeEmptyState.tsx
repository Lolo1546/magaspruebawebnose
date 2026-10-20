import styles from "./HomeEmptyState.module.css";

type HomeEmptyStateProps = {
  message: string;
};

export function HomeEmptyState({ message }: HomeEmptyStateProps) {
  return (
    <div className={styles.empty} role="status">
      <span className={styles.marker} aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}
