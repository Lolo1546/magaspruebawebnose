export const groupLanguages = ["es", "latam", "multi"] as const;
export const groupStatuses = ["active", "recruiting", "paused"] as const;

export type GroupLanguage = (typeof groupLanguages)[number];
export type GroupStatus = (typeof groupStatuses)[number];

export type PublicGroup = {
  readonly activityLabel: string;
  readonly activityOrder: number;
  readonly description: string;
  readonly featured: boolean;
  readonly followersCount: number;
  readonly id: string;
  readonly initials: string;
  readonly language: GroupLanguage;
  readonly membersCount: number;
  readonly name: string;
  readonly projectsCount: number;
  readonly slug: string;
  readonly status: GroupStatus;
  readonly tags: readonly string[];
  readonly verified: boolean;
};

export const groupLanguageLabels: Readonly<Record<GroupLanguage, string>> = {
  es: "Español",
  latam: "Español LATAM",
  multi: "Multilingüe",
};

export const groupStatusLabels: Readonly<Record<GroupStatus, string>> = {
  active: "Activo",
  paused: "En pausa",
  recruiting: "Reclutando",
};

export const publicGroups: readonly PublicGroup[] = [
  {
    activityLabel: "Actividad hoy",
    activityOrder: 9,
    description: "Traducciones de fantasía oscura, acción y seinen con releases cuidadas.",
    featured: true,
    followersCount: 12_480,
    id: "group-crown-team",
    initials: "CT",
    language: "es",
    membersCount: 42,
    name: "Crown Team",
    projectsCount: 18,
    slug: "crown-team",
    status: "active",
    tags: ["Fantasía", "Seinen", "Acción"],
    verified: true,
  },
  {
    activityLabel: "Actividad hoy",
    activityOrder: 8,
    description: "Manga sobrenatural, misterio y colaboraciones entre equipos latinoamericanos.",
    featured: true,
    followersCount: 9_860,
    id: "group-red-moon-scan",
    initials: "RM",
    language: "latam",
    membersCount: 31,
    name: "Red Moon Scan",
    projectsCount: 14,
    slug: "red-moon-scan",
    status: "recruiting",
    tags: ["Terror", "Misterio", "Colaboración"],
    verified: true,
  },
  {
    activityLabel: "Actividad ayer",
    activityOrder: 7,
    description: "Especialistas en manhua de cultivo, aventura y fantasía oriental.",
    featured: true,
    followersCount: 8_420,
    id: "group-jade-team",
    initials: "JT",
    language: "es",
    membersCount: 28,
    name: "Jade Team",
    projectsCount: 12,
    slug: "jade-team",
    status: "active",
    tags: ["Manhua", "Cultivo", "Aventura"],
    verified: true,
  },
  {
    activityLabel: "Actividad hace 2 días",
    activityOrder: 6,
    description: "Romance, drama y webtoons con publicaciones constantes cada semana.",
    featured: false,
    followersCount: 10_420,
    id: "group-blue-rose",
    initials: "BR",
    language: "latam",
    membersCount: 36,
    name: "Blue Rose",
    projectsCount: 16,
    slug: "blue-rose",
    status: "active",
    tags: ["Romance", "Drama", "Manhwa"],
    verified: true,
  },
  {
    activityLabel: "Actividad hace 3 días",
    activityOrder: 5,
    description: "Horror, thriller psicológico y misterio para lectores nocturnos.",
    featured: false,
    followersCount: 4_620,
    id: "group-night-owls",
    initials: "NO",
    language: "es",
    membersCount: 17,
    name: "Night Owls",
    projectsCount: 8,
    slug: "night-owls",
    status: "active",
    tags: ["Horror", "Thriller", "Misterio"],
    verified: false,
  },
  {
    activityLabel: "Actividad esta semana",
    activityOrder: 4,
    description: "Acción, samuráis y manga histórico con atención especial al redraw.",
    featured: false,
    followersCount: 6_760,
    id: "group-kitsune-scan",
    initials: "KS",
    language: "es",
    membersCount: 24,
    name: "Kitsune Scan",
    projectsCount: 10,
    slug: "kitsune-scan",
    status: "recruiting",
    tags: ["Acción", "Histórico", "Samuráis"],
    verified: true,
  },
  {
    activityLabel: "Actividad esta semana",
    activityOrder: 3,
    description: "Equipo multilingüe dedicado a ciencia ficción, cyberpunk y misterio.",
    featured: false,
    followersCount: 3_980,
    id: "group-nova-scan",
    initials: "NS",
    language: "multi",
    membersCount: 19,
    name: "Nova Scan",
    projectsCount: 9,
    slug: "nova-scan",
    status: "active",
    tags: ["Sci-fi", "Cyberpunk", "Misterio"],
    verified: false,
  },
  {
    activityLabel: "Actividad pausada",
    activityOrder: 1,
    description: "Comedia, slice of life y romance ligero; actualmente en reorganización.",
    featured: false,
    followersCount: 2_740,
    id: "group-golden-leaf",
    initials: "GL",
    language: "latam",
    membersCount: 12,
    name: "Golden Leaf",
    projectsCount: 5,
    slug: "golden-leaf",
    status: "paused",
    tags: ["Comedia", "Slice of life", "Romance"],
    verified: false,
  },
  {
    activityLabel: "Actividad hace 6 días",
    activityOrder: 2,
    description: "Equipo internacional con proyectos de romance, drama y fantasía.",
    featured: false,
    followersCount: 8_120,
    id: "group-sakura-works",
    initials: "SW",
    language: "multi",
    membersCount: 27,
    name: "Sakura Works",
    projectsCount: 13,
    slug: "sakura-works",
    status: "active",
    tags: ["Multilingüe", "Romance", "Fantasía"],
    verified: true,
  },
] as const;
