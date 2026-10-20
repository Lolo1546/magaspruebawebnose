import type { NewsItem } from "@/types/home";

const image = "/demo/hero-placeholder.svg";

// Noticias completamente ficticias. No representan anuncios ni sucesos reales.
export const demoNews: readonly NewsItem[] = [
  {
    id: "news-adaptation",
    slug: "demo-novedades-adaptacion",
    title: "Demo: novedades de una adaptación en desarrollo",
    category: "Anime",
    publishedAtLabel: "Hace 2 h",
    image,
    imageTone: "crimson",
  },
  {
    id: "news-editorial",
    slug: "demo-anuncio-editorial",
    title: "Demo: anuncio editorial para lectores en español",
    category: "Manga",
    publishedAtLabel: "Hace 5 h",
    image,
    imageTone: "blue",
  },
  {
    id: "news-event",
    slug: "demo-evento-manga",
    title: "Demo: encuentro de manga anuncia su programación",
    category: "Eventos",
    publishedAtLabel: "Hace 9 h",
    image,
    imageTone: "gold",
  },
  {
    id: "news-creator",
    slug: "demo-entrevista-creador",
    title: "Demo: conversación sobre dibujo y narrativa secuencial",
    category: "Creadores",
    publishedAtLabel: "Ayer",
    image,
    imageTone: "green",
  },
  {
    id: "news-catalog",
    slug: "demo-catalogo-tematico",
    title: "Demo: selección temática llega al catálogo",
    category: "Catálogo",
    publishedAtLabel: "Hace 2 días",
    image,
    imageTone: "violet",
  },
  {
    id: "news-library",
    slug: "demo-guia-biblioteca",
    title: "Demo: guía para organizar una biblioteca de lectura",
    category: "Guías",
    publishedAtLabel: "Hace 3 días",
    image,
    imageTone: "blue",
  },
];
