import type {
  CalendarRelease,
  RecentActivityItem,
  UpcomingRelease,
} from "@/types/home";

const cover = "/demo/cover-placeholder.svg";

export const calendarReleases: readonly CalendarRelease[] = [
  { id: "cal-today-one-piece", slug: "one-piece", title: "One Piece", type: "Manga", chapter: 1114, timeLabel: "10:00", dayGroup: "today" },
  { id: "cal-today-orv", slug: "omniscient-readers-viewpoint", title: "Omniscient Reader", type: "Manhwa", chapter: 269, timeLabel: "13:30", dayGroup: "today" },
  { id: "cal-today-martial", slug: "martial-peak", title: "Martial Peak", type: "Manhua", chapter: 3816, timeLabel: "18:00", dayGroup: "today" },
  { id: "cal-tomorrow-dandadan", slug: "dandadan", title: "Dandadan", type: "Manga", chapter: 206, timeLabel: "11:00", dayGroup: "tomorrow" },
  { id: "cal-tomorrow-eleceed", slug: "eleceed", title: "Eleceed", type: "Manhwa", chapter: 366, timeLabel: "16:00", dayGroup: "tomorrow" },
  { id: "cal-tomorrow-apotheosis", slug: "apotheosis", title: "Apotheosis", type: "Manhua", chapter: 1206, timeLabel: "20:00", dayGroup: "tomorrow" },
  { id: "cal-week-blue-lock", slug: "blue-lock", title: "Blue Lock", type: "Manga", chapter: 312, timeLabel: "Mié.", dayGroup: "week" },
  { id: "cal-week-tower", slug: "tower-of-god", title: "Tower of God", type: "Manhwa", chapter: 653, timeLabel: "Vie.", dayGroup: "week" },
  { id: "cal-week-chainsaw", slug: "chainsaw-man", title: "Chainsaw Man", type: "Manga", chapter: 212, timeLabel: "Sáb.", dayGroup: "week" },
];

export const upcomingReleases: readonly UpcomingRelease[] = [
  { id: "upcoming-chainsaw", slug: "chainsaw-man", title: "Chainsaw Man", cover, coverTone: "gold", chapter: 212, timeLabel: "En 2 h" },
  { id: "upcoming-orv", slug: "omniscient-readers-viewpoint", title: "Omniscient Reader", cover, coverTone: "crimson", chapter: 269, timeLabel: "En 5 h" },
  { id: "upcoming-eleceed", slug: "eleceed", title: "Eleceed", cover, coverTone: "blue", chapter: 366, timeLabel: "Mañana" },
  { id: "upcoming-blue-lock", slug: "blue-lock", title: "Blue Lock", cover, coverTone: "green", chapter: 312, timeLabel: "En 2 días" },
  { id: "upcoming-tower", slug: "tower-of-god", title: "Tower of God", cover, coverTone: "violet", chapter: 653, timeLabel: "En 3 días" },
];

export const recentActivity: readonly RecentActivityItem[] = [
  { id: "activity-chapter", kind: "chapter", label: "Capítulo publicado", detail: "Demo: Chainsaw Man · Cap. 211", timeLabel: "Hace 12 min" },
  { id: "activity-catalog", kind: "catalog", label: "Nueva obra agregada", detail: "Demo: Witch Hat Atelier", timeLabel: "Hace 38 min" },
  { id: "activity-community", kind: "community", label: "Comunidad aprobada", detail: "Demo: Lectores de misterio", timeLabel: "Hace 1 h" },
  { id: "activity-review", kind: "review", label: "Review publicada", detail: "Demo: análisis sin spoilers", timeLabel: "Hace 3 h" },
];
