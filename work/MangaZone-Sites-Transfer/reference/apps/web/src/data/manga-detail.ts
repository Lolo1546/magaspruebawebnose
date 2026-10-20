import { exploreCatalog, type ExploreManga } from "@/data/explore";

export type MangaChapter = {
  readonly readerKey: string;
  readonly group: string;
  readonly isNew?: boolean;
  readonly language: string;
  readonly number: number | null;
  readonly publishedAtLabel: string;
  readonly sortOrder: number;
  readonly title: string;
};

export type MangaReleaseGroup = {
  readonly name: string;
  readonly slug: string;
};

export type MangaReview = {
  readonly excerpt: string;
  readonly hasSpoilers: boolean;
  readonly id: string;
  readonly publishedAtLabel: string;
  readonly score: number;
  readonly title: string;
  readonly username: string;
};

export type MangaDetail = Readonly<ExploreManga> & {
  readonly creatorContributions?: readonly { name: string; role: string }[];
  readonly aliases: readonly string[];
  readonly artist: string;
  readonly author: string;
  readonly chapters: readonly MangaChapter[];
  readonly classification: string;
  readonly firstChapter: string;
  readonly firstChapterHref?: string | null;
  readonly groups: readonly MangaReleaseGroup[];
  readonly language: string;
  readonly originalTitle: string;
  readonly rankLabel: string;
  readonly readersLabel: string;
  readonly related: readonly ExploreManga[];
  readonly reviews: readonly MangaReview[];
  readonly romanizedTitle: string;
  readonly summary: string;
  readonly votesLabel: string;
};

type DetailOverride = {
  readonly aliases?: readonly string[];
  readonly artist?: string;
  readonly author?: string;
  readonly originalTitle?: string;
  readonly relatedSlugs?: readonly string[];
  readonly romanizedTitle?: string;
  readonly summary?: string;
};

const detailOverrides: Readonly<Record<string, DetailOverride>> = {
  "solo-leveling": {
    aliases: ["Na Honjaman Level Up", "I Level Up Alone"],
    artist: "Jang Sung-rak",
    author: "Chugong",
    originalTitle: "나 혼자만 레벨업",
    relatedSlugs: [
      "omniscient-reader",
      "legend-of-the-northern-blade",
      "the-gods-game",
      "dandadan",
    ],
    romanizedTitle: "Na Honjaman Level Up",
    summary:
      "Tras sobrevivir a una mazmorra imposible, Sung Jinwoo descubre un sistema que le permite crecer sin límites. Su ascenso altera el equilibrio entre cazadores, gremios y criaturas de otros mundos.",
  },
  "one-piece": {
    aliases: ["OP", "Wan Pīsu"],
    artist: "Eiichiro Oda",
    author: "Eiichiro Oda",
    originalTitle: "ONE PIECE",
    relatedSlugs: ["dandadan", "frieren", "blue-lock", "witch-hat-atelier"],
    romanizedTitle: "Wan Pīsu",
    summary:
      "Monkey D. Luffy recorre los mares junto a su tripulación para encontrar el legendario One Piece y convertirse en el Rey de los Piratas.",
  },
  "omniscient-reader": {
    aliases: ["ORV", "Omniscient Reader's Viewpoint"],
    artist: "Sleepy-C",
    author: "singNsong",
    originalTitle: "전지적 독자 시점",
    relatedSlugs: [
      "solo-leveling",
      "legend-of-the-northern-blade",
      "the-gods-game",
      "frieren",
    ],
    romanizedTitle: "Jeonjijeok Dokja Sijeom",
    summary:
      "La novela que Kim Dokja leyó durante años se convierte en realidad. Solo él conoce el final y deberá usar ese conocimiento para sobrevivir a cada escenario.",
  },
  frieren: {
    aliases: ["Frieren at the Funeral", "Sousou no Frieren"],
    artist: "Tsukasa Abe",
    author: "Kanehito Yamada",
    originalTitle: "葬送のフリーレン",
    relatedSlugs: [
      "witch-hat-atelier",
      "one-piece",
      "orange",
      "summer-time-rendering",
    ],
    romanizedTitle: "Sōsō no Furīren",
    summary:
      "Décadas después de derrotar al Rey Demonio, la elfa Frieren inicia otro viaje para comprender el paso del tiempo y los vínculos que dejó atrás.",
  },
  "blue-lock": {
    aliases: ["Blue Lock Project"],
    artist: "Yusuke Nomura",
    author: "Muneyuki Kaneshiro",
    originalTitle: "ブルーロック",
    relatedSlugs: ["one-piece", "dandadan", "skip-and-loafer", "orange"],
    romanizedTitle: "Burū Rokku",
    summary:
      "Trescientos delanteros compiten en un proyecto extremo para crear al atacante definitivo del fútbol japonés.",
  },
};

const releaseGroups: readonly MangaReleaseGroup[] = [
  {
    name: "Luna Translation",
    slug: "luna-translation",
  },
  {
    name: "Nébula Scan",
    slug: "nebula-scan",
  },
];

const chapterTitles = [
  "El umbral",
  "Una promesa pendiente",
  "Señales en la distancia",
  "La decisión",
  "Antes del amanecer",
  "Un nuevo rumbo",
] as const;

const publishedLabels = [
  "Hace 2 horas",
  "Ayer",
  "Hace 3 días",
  "Hace 6 días",
  "Hace 1 semana",
  "Hace 2 semanas",
] as const;

function createChapters(latestChapter: number): readonly MangaChapter[] {
  return Array.from({ length: Math.min(6, latestChapter) }, (_, index) => ({
    readerKey: `${latestChapter - index}`,
    group:
      releaseGroups[index % releaseGroups.length]?.name ??
      releaseGroups[0].name,
    isNew: index === 0,
    language: "es-LA",
    number: latestChapter - index,
    publishedAtLabel: publishedLabels[index] ?? "Hace varias semanas",
    sortOrder: latestChapter - index,
    title: chapterTitles[index] ?? `Capítulo ${latestChapter - index}`,
  }));
}

function createReviews(title: string): readonly MangaReview[] {
  return [
    {
      excerpt: `La construcción del mundo de ${title} mantiene un ritmo sólido y deja espacio para que sus personajes evolucionen.`,
      hasSpoilers: false,
      id: "review-01",
      publishedAtLabel: "Hace 2 días",
      score: 9,
      title: "Una historia que sabe crecer",
      username: "LunaV",
    },
    {
      excerpt:
        "El apartado visual destaca en los momentos clave y los secundarios aportan más de lo que esperaba.",
      hasSpoilers: true,
      id: "review-02",
      publishedAtLabel: "Hace 5 días",
      score: 8,
      title: "Gran apartado visual",
      username: "Kaito_89",
    },
  ];
}

function defaultRelatedSlugs(slug: string) {
  const currentIndex = exploreCatalog.findIndex((item) => item.slug === slug);

  return Array.from({ length: 4 }, (_, offset) => {
    const index = (currentIndex + offset + 1) % exploreCatalog.length;
    return exploreCatalog[index]?.slug;
  }).filter((relatedSlug): relatedSlug is string => Boolean(relatedSlug));
}

export function getMangaDetail(slug: string): MangaDetail | undefined {
  const item = exploreCatalog.find((entry) => entry.slug === slug);
  if (!item) return undefined;

  const override = detailOverrides[slug];
  const relatedSlugs = override?.relatedSlugs ?? defaultRelatedSlugs(slug);
  const related = relatedSlugs
    .map((relatedSlug) =>
      exploreCatalog.find((entry) => entry.slug === relatedSlug),
    )
    .filter((entry): entry is ExploreManga => Boolean(entry));

  return {
    ...item,
    aliases: override?.aliases ?? [item.title],
    artist: override?.artist ?? "Equipo artístico de demostración",
    author: override?.author ?? "Autor de demostración",
    chapters: createChapters(item.latestChapter ?? 1),
    classification: "Adolescentes y adultos",
    firstChapter: "1", // Fallback for fixture
    groups: releaseGroups,
    language:
      item.type === "Manhua"
        ? "Chino"
        : item.type === "Manhwa"
          ? "Coreano"
          : "Japonés",
    originalTitle: override?.originalTitle ?? item.title,
    rankLabel: `#${Math.max(1, 101 - item.popularity)}`,
    readersLabel: `${item.popularity * 2.4}K`,
    related,
    reviews: createReviews(item.title),
    romanizedTitle: override?.romanizedTitle ?? item.title,
    summary:
      override?.summary ??
      `${item.title} es una obra de ${item.genres.join(" y ")} incluida como contenido local de demostración para la ficha de MangaZone.`,
    votesLabel: `${(item.popularity * 137).toLocaleString("es-ES")} valoraciones`,
  };
}

export function getMangaDetailSlugs() {
  return exploreCatalog.map((item) => item.slug);
}
