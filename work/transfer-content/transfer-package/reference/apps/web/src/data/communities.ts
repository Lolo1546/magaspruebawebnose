export const communityCategories = ["genre", "work", "general", "art"] as const;
export const communityActivities = ["high", "active", "moderate"] as const;

export type CommunityActivity = (typeof communityActivities)[number];
export type CommunityCategory = (typeof communityCategories)[number];

export type PublicCommunity = {
  readonly activity: CommunityActivity;
  readonly activityOrder: number;
  readonly category: CommunityCategory;
  readonly description: string;
  readonly featured: boolean;
  readonly id: string;
  readonly initials: string;
  readonly membersCount: number;
  readonly name: string;
  readonly onlineCount: number;
  readonly postsCount: number;
  readonly slug: string;
  readonly tags: readonly string[];
};

export const communityActivityLabels: Readonly<Record<CommunityActivity, string>> = {
  active: "Activa",
  high: "Muy activa",
  moderate: "Moderada",
};

export const communityCategoryLabels: Readonly<Record<CommunityCategory, string>> = {
  art: "Arte",
  general: "General",
  genre: "Género",
  work: "Obra",
};

export const publicCommunities: readonly PublicCommunity[] = [
  {
    activity: "high",
    activityOrder: 9,
    category: "genre",
    description: "Teorías y debates sobre mundos oscuros, magia peligrosa y antihéroes.",
    featured: true,
    id: "community-dark-fantasy",
    initials: "FO",
    membersCount: 8_240,
    name: "Fantasía Oscura",
    onlineCount: 312,
    postsCount: 1_840,
    slug: "fantasia-oscura",
    tags: ["Fantasía", "Seinen", "Teorías"],
  },
  {
    activity: "high",
    activityOrder: 8,
    category: "general",
    description: "Estrenos, recomendaciones y conversaciones sobre manhwa de todos los géneros.",
    featured: true,
    id: "community-manhwa-club",
    initials: "CM",
    membersCount: 7_160,
    name: "Club Manhwa",
    onlineCount: 284,
    postsCount: 1_520,
    slug: "club-manhwa",
    tags: ["Manhwa", "Estrenos", "Recomendaciones"],
  },
  {
    activity: "high",
    activityOrder: 7,
    category: "work",
    description: "Análisis de capítulos, teorías y conversaciones con spoilers moderados.",
    featured: true,
    id: "community-ashes-crown",
    initials: "AC",
    membersCount: 5_840,
    name: "Ashes of the Crown",
    onlineCount: 196,
    postsCount: 1_288,
    slug: "ashes-of-the-crown",
    tags: ["Obra", "Teorías", "Spoilers"],
  },
  {
    activity: "active",
    activityOrder: 6,
    category: "genre",
    description: "Recomendaciones, finales explicados y debates sobre tramas complejas.",
    featured: false,
    id: "community-mystery-thriller",
    initials: "MT",
    membersCount: 3_920,
    name: "Misterio y Thriller",
    onlineCount: 102,
    postsCount: 864,
    slug: "misterio-thriller",
    tags: ["Misterio", "Thriller", "Análisis"],
  },
  {
    activity: "active",
    activityOrder: 5,
    category: "genre",
    description: "Romances con buena química, desarrollo real y personajes memorables.",
    featured: false,
    id: "community-romance",
    initials: "RC",
    membersCount: 4_480,
    name: "Romance sin cliché",
    onlineCount: 118,
    postsCount: 930,
    slug: "romance-sin-cliche",
    tags: ["Romance", "Josei", "Drama"],
  },
  {
    activity: "high",
    activityOrder: 4,
    category: "art",
    description: "Ilustraciones, procesos, retos y recursos compartidos por artistas.",
    featured: false,
    id: "community-fan-art",
    initials: "FA",
    membersCount: 5_210,
    name: "Rincón del Fan-Art",
    onlineCount: 164,
    postsCount: 1_420,
    slug: "rincon-fanart",
    tags: ["Fan-Art", "Dibujo", "Retos"],
  },
  {
    activity: "active",
    activityOrder: 3,
    category: "genre",
    description: "Cultivo, artes marciales, mundos inmortales y recomendaciones de manhua.",
    featured: false,
    id: "community-cultivation",
    initials: "MC",
    membersCount: 3_660,
    name: "Manhua y Cultivo",
    onlineCount: 88,
    postsCount: 742,
    slug: "manhua-cultivo",
    tags: ["Manhua", "Cultivo", "Acción"],
  },
  {
    activity: "moderate",
    activityOrder: 2,
    category: "general",
    description: "Un espacio tranquilo para conversar sobre lecturas de madrugada.",
    featured: false,
    id: "community-night-readers",
    initials: "LN",
    membersCount: 2_180,
    name: "Lectores Nocturnos",
    onlineCount: 63,
    postsCount: 420,
    slug: "lectores-nocturnos",
    tags: ["General", "Lectura", "Charla"],
  },
  {
    activity: "moderate",
    activityOrder: 1,
    category: "general",
    description: "Obras poco conocidas que merecen más lectores y mejores reseñas.",
    featured: false,
    id: "community-hidden-gems",
    initials: "JO",
    membersCount: 1_840,
    name: "Joyas Ocultas",
    onlineCount: 42,
    postsCount: 356,
    slug: "joyas-ocultas",
    tags: ["Indie", "Recomendaciones", "Descubrimiento"],
  },
] as const;
