export const publicProfileTabs = [
  "activity",
  "library",
  "lists",
  "reviews",
  "posts",
] as const;

export type PublicProfileTab = (typeof publicProfileTabs)[number];

export type PublicProfileActivity = {
  readonly detail: string;
  readonly id: string;
  readonly mangaSlug?: string;
  readonly timeLabel: string;
  readonly title: string;
};

export type PublicProfileList = {
  readonly description: string;
  readonly id: string;
  readonly mangaSlugs: readonly string[];
  readonly name: string;
};

export type PublicProfileReview = {
  readonly excerpt: string;
  readonly id: string;
  readonly mangaSlug: string;
  readonly score: number;
};

export type PublicProfilePost = {
  readonly communitySlug: string;
  readonly id: string;
  readonly repliesLabel: string;
  readonly text: string;
  readonly timeLabel: string;
};

export type PublicProfileAffiliation = {
  readonly kind: "community" | "group";
  readonly role: string;
  readonly slug: string;
};

export type PublicProfile = {
  readonly activity: readonly PublicProfileActivity[];
  readonly affiliations: readonly PublicProfileAffiliation[];
  readonly avatar: string;
  readonly badges: readonly string[];
  readonly banner: string;
  readonly bio: string;
  readonly displayName: string;
  readonly favoriteMangaSlugs: readonly string[];
  readonly joinedLabel: string;
  readonly location: string;
  readonly posts: readonly PublicProfilePost[];
  readonly publicLists: readonly PublicProfileList[];
  readonly reviews: readonly PublicProfileReview[];
  readonly stats: {
    readonly followers: number;
    readonly following: number;
    readonly posts: number;
    readonly readManga: number;
    readonly reviews: number;
  };
  readonly username: string;
};

export const publicProfiles: readonly PublicProfile[] = [
  {
    username: "lunaviolet",
    displayName: "Luna Violet",
    bio: "Fan de la fantasía oscura, el romance bien escrito y las teorías imposibles. Dibujo fan-art y colaboro en comunidades de MangaZone.",
    avatar: "/demo/profile-avatar-placeholder.svg",
    banner: "/demo/social-directory-placeholder.svg",
    location: "Lima, Perú",
    joinedLabel: "Se unió en 2024",
    badges: ["Lectora veterana", "Artista", "Top reviewer"],
    stats: {
      followers: 1_284,
      following: 326,
      readManga: 148,
      reviews: 27,
      posts: 42,
    },
    favoriteMangaSlugs: [
      "solo-leveling",
      "frieren",
      "witch-hat-atelier",
      "orange",
    ],
    activity: [
      {
        id: "activity-finished-chapter",
        title: "Terminó una lectura",
        detail: "Completó el capítulo 202 y lo calificó con 9/10.",
        timeLabel: "Hace 2 horas",
        mangaSlug: "solo-leveling",
      },
      {
        id: "activity-review",
        title: "Publicó una review",
        detail: "Destacó la construcción del mundo y la evolución de su protagonista.",
        timeLabel: "Ayer",
        mangaSlug: "frieren",
      },
      {
        id: "activity-list",
        title: "Actualizó una lista pública",
        detail: "Añadió una nueva obra a Fantasía para perderse.",
        timeLabel: "Hace 3 días",
        mangaSlug: "witch-hat-atelier",
      },
    ],
    publicLists: [
      {
        id: "dark-fantasy",
        name: "Fantasía para perderse",
        description: "Mundos de magia, aventura y decisiones difíciles.",
        mangaSlugs: ["frieren", "witch-hat-atelier", "solo-leveling"],
      },
      {
        id: "quiet-stories",
        name: "Historias que dejan huella",
        description: "Lecturas emotivas para recomendar sin reservas.",
        mangaSlugs: ["orange", "the-horizon", "seasons-of-blossom"],
      },
    ],
    reviews: [
      {
        id: "review-frieren",
        mangaSlug: "frieren",
        score: 9,
        excerpt: "Una aventura serena sobre el tiempo, la memoria y los vínculos que permanecen.",
      },
      {
        id: "review-witch-hat",
        mangaSlug: "witch-hat-atelier",
        score: 9,
        excerpt: "Arte extraordinario y un sistema de magia que convierte cada página en descubrimiento.",
      },
    ],
    posts: [
      {
        id: "post-dark-fantasy",
        communitySlug: "fantasia-oscura",
        text: "Mi teoría sobre el verdadero coste de la magia en los mundos de fantasía oscura.",
        timeLabel: "Hace 2 días",
        repliesLabel: "46 respuestas",
      },
      {
        id: "post-fanart",
        communitySlug: "rincon-fanart",
        text: "Compartí mi proceso de color para una ilustración nocturna.",
        timeLabel: "Hace 5 días",
        repliesLabel: "28 respuestas",
      },
    ],
    affiliations: [
      { kind: "group", slug: "crown-team", role: "Colaboradora" },
      { kind: "community", slug: "fantasia-oscura", role: "Moderadora demo" },
      { kind: "community", slug: "rincon-fanart", role: "Miembro" },
    ],
  },
] as const;

export function getPublicProfile(username: string) {
  return publicProfiles.find((profile) => profile.username === username);
}

export function getPublicProfileUsernames() {
  return publicProfiles.map((profile) => profile.username);
}
