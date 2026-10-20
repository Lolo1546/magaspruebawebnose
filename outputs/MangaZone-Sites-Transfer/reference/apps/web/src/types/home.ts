export type WorkType = (typeof import("./manga-metadata").mangaTypeLabels)[keyof typeof import("./manga-metadata").mangaTypeLabels];

export type PublicationStatus = "En curso" | "Completado" | "Pausado";

export type VisualTone = "crimson" | "blue" | "gold" | "green" | "violet";

export type HeroSlide = {
  id: string;
  slug: string;
  title: string;
  type: WorkType;
  context: string;
  genres: readonly string[];
  description: string;
  score: number;
  chapters: number;
  readers: string;
  status: PublicationStatus;
  image: string;
  visualTone: VisualTone;
};

export type ChapterPreview = {
  number: number;
  label?: string;
  publishedAtLabel: string;
  isNew?: boolean;
};

export type RecentUpdate = {
  id: string;
  slug: string;
  title: string;
  type: WorkType;
  genre: string;
  score: number;
  status: PublicationStatus;
  cover: string;
  coverTone: VisualTone;
  chapters: readonly ChapterPreview[];
};

export type ContinueReadingItem = {
  id: string;
  slug: string;
  title: string;
  cover: string;
  coverTone: VisualTone;
  chapter: number;
  page: number;
  progressPercent: number;
  lastReadLabel: string;
};

export type TrendingItem = {
  id: string;
  slug: string;
  title: string;
  cover: string;
  coverTone: VisualTone;
  rank: number;
  trendChange: number;
};

export type MangaCardData = {
  id: string;
  slug: string;
  title: string;
  cover: string;
  coverTone: VisualTone;
  type: WorkType;
  score?: number;
  latestChapter?: number;
  status?: PublicationStatus;
  genre?: string;
  addedLabel?: string;
};

export type RecommendationItem = MangaCardData & {
  score: number;
  latestChapter: number;
  status: PublicationStatus;
  genre: string;
};

export type NewCatalogItem = MangaCardData & {
  addedLabel: string;
  status: PublicationStatus;
};

export type RankingPeriod = "week" | "month" | "all";

export type RankingItem = {
  id: string;
  slug: string;
  title: string;
  cover: string;
  coverTone: VisualTone;
  type: WorkType;
  chapter: number;
  readersLabel: string;
  score: number;
  trendChange: number;
};

export type CommunityFeed = "featured" | "recent";

export type CommunityPost = {
  id: string;
  username: string;
  avatarInitials: string;
  avatarTone: VisualTone;
  timeLabel: string;
  title: string;
  excerpt: string;
  likes: number;
  comments: number;
  isFeatured: boolean;
  isSpoiler?: boolean;
};

export type NewsItem = {
  id: string;
  slug: string;
  title: string;
  category: string;
  publishedAtLabel: string;
  image: string;
  imageTone: VisualTone;
};

export type CalendarDayGroup = "today" | "tomorrow" | "week";

export type CalendarRelease = {
  id: string;
  slug: string;
  title: string;
  type: WorkType;
  chapter: number;
  timeLabel: string;
  dayGroup: CalendarDayGroup;
};

export type UpcomingRelease = {
  id: string;
  slug: string;
  title: string;
  cover: string;
  coverTone: VisualTone;
  chapter: number;
  timeLabel: string;
};

export type ActivityKind = "chapter" | "catalog" | "community" | "review";

export type RecentActivityItem = {
  id: string;
  kind: ActivityKind;
  label: string;
  detail: string;
  timeLabel: string;
};
