import { ContinueReading } from "@/components/home/ContinueReading";
import { CommunityPreview } from "@/components/home/CommunityPreview";
import { Hero } from "@/components/home/Hero";
import { HomeContentLayout } from "@/components/home/HomeContentLayout";
import { HomeSidebar } from "@/components/home/HomeSidebar";
import { NewInMangaZone } from "@/components/home/NewInMangaZone";
import { NewsPreview } from "@/components/home/NewsPreview";
import { RecentUpdates } from "@/components/home/RecentUpdates";
import { Recommendations } from "@/components/home/Recommendations";
import { TrendingManga } from "@/components/home/TrendingManga";
import { WeeklyRanking } from "@/components/home/WeeklyRanking";
import { PageContainer } from "@/components/layout/PageContainer";
import {
  continueReadingItems,
  heroSlides,
  newCatalogItems,
  recentUpdates,
  recommendationItems,
  trendingItems,
} from "@/data/home";
import { communityPosts } from "@/data/home/community";
import { demoNews } from "@/data/home/news";
import { rankingByPeriod, rankingPeriodLabels } from "@/data/home/ranking";
import {
  calendarReleases,
  recentActivity,
  upcomingReleases,
} from "@/data/home/sidebar";

import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <Hero slides={heroSlides} />

      <PageContainer className={styles.content}>
        <HomeContentLayout
          sidebar={
            <HomeSidebar
              activity={recentActivity}
              calendar={calendarReleases}
              ranking={rankingByPeriod.week}
              upcoming={upcomingReleases}
            />
          }
        >
          <RecentUpdates updates={recentUpdates} />
          <ContinueReading items={continueReadingItems} />
          <TrendingManga items={trendingItems} />
          <Recommendations items={recommendationItems} />
          <NewInMangaZone items={newCatalogItems} />
          <WeeklyRanking
            labels={rankingPeriodLabels}
            rankings={rankingByPeriod}
          />
          <CommunityPreview posts={communityPosts} />
          <NewsPreview items={demoNews} />
        </HomeContentLayout>
      </PageContainer>
    </div>
  );
}
