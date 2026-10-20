import {
  BookOpen,
  MessageSquareText,
  Plus,
  Star,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import type { ActivityKind, RecentActivityItem } from "@/types/home";

import { SidebarWidget } from "./SidebarWidget";
import styles from "./RecentActivity.module.css";

const activityIcons: Record<ActivityKind, LucideIcon> = {
  chapter: BookOpen,
  catalog: Plus,
  community: MessageSquareText,
  review: Star,
};

type RecentActivityProps = {
  items: readonly RecentActivityItem[];
};

export function RecentActivity({ items }: RecentActivityProps) {
  return (
    <SidebarWidget
      action={<Link href="/comunidades">Ver todo</Link>}
      title="Actividad reciente"
    >
      {items.length === 0 ? (
        <p className={styles.empty}>No hay actividad demo para mostrar.</p>
      ) : (
        <ul className={styles.list}>
          {items.map((item) => {
            const Icon = activityIcons[item.kind];

            return (
              <li className={styles.item} key={item.id}>
                <span className={`${styles.icon} ${styles[item.kind]}`}>
                  <Icon aria-hidden="true" size={14} strokeWidth={2} />
                </span>
                <span className={styles.copy}>
                  <span className={styles.label}>{item.label}</span>
                  <span className={styles.detail}>{item.detail}</span>
                  <span className={styles.time}>{item.timeLabel}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </SidebarWidget>
  );
}
