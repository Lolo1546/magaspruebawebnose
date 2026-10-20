import type {
  CalendarRelease,
  RankingItem,
  RecentActivityItem,
  UpcomingRelease,
} from "@/types/home";

import { MiniRanking } from "./MiniRanking";
import { RecentActivity } from "./RecentActivity";
import { ReleaseCalendar } from "./ReleaseCalendar";
import { UpcomingReleases } from "./UpcomingReleases";
import styles from "./HomeSidebar.module.css";

type HomeSidebarProps = {
  activity: readonly RecentActivityItem[];
  calendar: readonly CalendarRelease[];
  ranking: readonly RankingItem[];
  upcoming: readonly UpcomingRelease[];
};

export function HomeSidebar({
  activity,
  calendar,
  ranking,
  upcoming,
}: HomeSidebarProps) {
  return (
    <aside aria-label="Panel informativo de MangaZone" className={styles.sidebar}>
      <ReleaseCalendar releases={calendar} />
      <UpcomingReleases releases={upcoming} />
      <RecentActivity items={activity} />
      <MiniRanking items={ranking} />
    </aside>
  );
}
