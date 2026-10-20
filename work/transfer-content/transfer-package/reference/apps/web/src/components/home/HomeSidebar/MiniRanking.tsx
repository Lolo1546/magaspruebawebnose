import { Star } from "lucide-react";
import Link from "next/link";

import type { RankingItem } from "@/types/home";

import { SidebarWidget } from "./SidebarWidget";
import styles from "./MiniRanking.module.css";

type MiniRankingProps = {
  items: readonly RankingItem[];
};

export function MiniRanking({ items }: MiniRankingProps) {
  const topItems = items.slice(0, 5);

  return (
    <SidebarWidget
      action={<Link href="/ranking">Ver ranking</Link>}
      title="Top rápido"
    >
      {topItems.length === 0 ? (
        <p className={styles.empty}>No hay datos de ranking disponibles.</p>
      ) : (
        <ol className={styles.list}>
          {topItems.map((item, index) => (
            <li key={item.id}>
              <Link className={styles.item} href={`/manga/${item.slug}`}>
                <span className={`${styles.rank} ${styles[`rank${index + 1}`] ?? ""}`}>
                  {index + 1}
                </span>
                <span className={styles.info}>
                  <span className={styles.title}>{item.title}</span>
                  <span className={styles.readers}>{item.readersLabel} lectores</span>
                </span>
                <span className={styles.score}>
                  <Star aria-hidden="true" fill="currentColor" size={11} />
                  {item.score.toFixed(1)}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </SidebarWidget>
  );
}
