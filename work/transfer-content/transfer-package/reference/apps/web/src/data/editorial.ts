import { contributionTypeLabels, mangaTypeLabels, type MangaDemography } from "@/types/manga-metadata";

export type MangaType = keyof typeof mangaTypeLabels;
export type ContributionType = keyof typeof contributionTypeLabels;
export type ContentRating = "GENERAL" | "TEEN" | "MATURE" | "ADULT";
export type MangaStatus = "ONGOING" | "COMPLETED" | "PAUSED" | "CANCELLED" | "UNKNOWN";
export type EditorialStatus = "DRAFT" | "PUBLIC" | "HIDDEN";

export type EditorialAlias = { alias: string; languageCode: string | null };
export type EditorialGenre = { id: string; slug: string; name: string };
export type EditorialCreatorContribution = {
  id: string;
  name: string;
  contributionType: ContributionType;
};
export type EditorialCover = {
  id: string;
  status: string;
  url: string | null;
  width: number | null;
  height: number | null;
} | null;

export type EditorialMangaSummary = {
  id: string;
  slug: string;
  title: string;
  editorialStatus: EditorialStatus;
  contentRating: ContentRating;
  type: MangaType;
  demography: MangaDemography | null;
  status: MangaStatus;
  version: number;
  cover: EditorialCover;
  updatedAt: string;
};

export type EditorialManga = EditorialMangaSummary & {
  originalTitle: string | null;
  description: string | null;
  publicationYear: number | null;
  aliases: EditorialAlias[];
  genres: EditorialGenre[];
  creators: EditorialCreatorContribution[];
};

export type EditorialPagination = { page: number; pageSize: number; total: number; pageCount: number };
export type EditorialMangaList = { items: EditorialMangaSummary[]; pagination: EditorialPagination };
export type EditorialLookupItem = { id: string; name: string };
export type EditorialLookupResponse = { items: EditorialLookupItem[]; pagination: EditorialPagination };

export type EditorialFormState = {
  title: string;
  aliases: EditorialAlias[];
  description: string;
  type: MangaType;
  demography: MangaDemography | null;
  contentRating: ContentRating;
  status: MangaStatus;
  genreIds: string[];
  genres: EditorialGenre[];
  creators: EditorialCreatorContribution[];
};

export const demographyLabels: Record<MangaDemography, string> = {
  SEINEN: "Seinen", SHOUJO: "Shoujo", SHOUNEN: "Shounen", JOSEI: "Josei", KODOMO: "Kodomo",
};
export const ratingLabels: Record<Exclude<ContentRating, "ADULT">, string> = {
  GENERAL: "Todo público", TEEN: "Adolescentes", MATURE: "Maduro",
};
export const statusLabels: Record<MangaStatus, string> = {
  ONGOING: "En publicación", COMPLETED: "Finalizado", PAUSED: "En pausa", CANCELLED: "Cancelado", UNKNOWN: "Desconocido",
};

// Mirrors validator.js/class-validator length semantics used by the API:
// surrogate pairs and emoji presentation selectors count as one character.
export function editorialTextLength(value: string): number {
  const presentationSequences = value.match(/[^\uFE0F\uFE0E][\uFE0F\uFE0E]/g) ?? [];
  const surrogatePairs = value.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g) ?? [];
  return value.length - presentationSequences.length - surrogatePairs.length;
}

export type EditorialFieldErrors = Partial<Record<"title" | "description" | "aliases", string>>;

export function validateEditorialForm(form: EditorialFormState): EditorialFieldErrors {
  const errors: EditorialFieldErrors = {};
  const title = form.title.trim();
  if (!title) errors.title = "El título es obligatorio.";
  else if (editorialTextLength(title) > 200) errors.title = "El título no puede superar 200 caracteres.";

  if (editorialTextLength(form.description.trim()) > 10000) errors.description = "La sinopsis no puede superar 10.000 caracteres.";

  const aliases = form.aliases.map(({ alias }) => alias.trim());
  if (aliases.some((alias) => !alias)) errors.aliases = "Los títulos alternativos no pueden estar vacíos.";
  else if (aliases.some((alias) => editorialTextLength(alias) > 200)) errors.aliases = "Cada título alternativo admite hasta 200 caracteres.";
  else if (new Set(aliases.map((alias) => alias.toUpperCase().replace(/\s+/g, " "))).size !== aliases.length) errors.aliases = "Los títulos alternativos no pueden repetirse.";
  return errors;
}

export function emptyEditorialForm(): EditorialFormState {
  return { title: "", aliases: [], description: "", type: "MANGA", demography: null, contentRating: "GENERAL", status: "ONGOING", genreIds: [], genres: [], creators: [] };
}

export function mangaToForm(manga: EditorialManga): EditorialFormState {
  return {
    title: manga.title,
    aliases: manga.aliases.map((alias) => ({ ...alias })),
    description: manga.description ?? "",
    type: manga.type,
    demography: manga.demography,
    contentRating: manga.contentRating,
    status: manga.status,
    genreIds: manga.genres.map(({ id }) => id),
    genres: manga.genres.map((genre) => ({ ...genre })),
    creators: manga.creators.map((creator) => ({ ...creator })),
  };
}

export function publicationRequirements(form: EditorialFormState): string[] {
  const missing: string[] = [];
  if (!form.title.trim() || editorialTextLength(form.title.trim()) > 200) missing.push("title");
  if (!form.description.trim() || editorialTextLength(form.description.trim()) > 10000) missing.push("description");
  if (!form.type) missing.push("type");
  if (!form.demography) missing.push("demography");
  if (form.contentRating === "ADULT") missing.push("contentRating");
  if (!form.status) missing.push("status");
  if (!form.genreIds.length) missing.push("genres");
  if (!form.creators.length) missing.push("creators");
  return missing;
}

export function createPayload(form: EditorialFormState, duplicateOverrideReason?: string) {
  return {
    title: form.title,
    description: form.description || null,
    type: form.type,
    demography: form.demography,
    status: form.status,
    contentRating: form.contentRating,
    aliases: form.aliases.map(({ alias, languageCode }) => ({ alias, languageCode: languageCode ?? undefined })),
    genreIds: form.genreIds,
    creators: form.creators.map(({ id, contributionType }) => ({ creatorId: id, contributionType })),
    ...(duplicateOverrideReason ? { duplicateOverrideReason } : {}),
  };
}

export function updatePayload(manga: EditorialManga, form: EditorialFormState, duplicateOverrideReason?: string) {
  return {
    ...createPayload(form, duplicateOverrideReason),
    expectedVersion: manga.version,
    originalTitle: manga.originalTitle,
    publicationYear: manga.publicationYear,
  };
}
