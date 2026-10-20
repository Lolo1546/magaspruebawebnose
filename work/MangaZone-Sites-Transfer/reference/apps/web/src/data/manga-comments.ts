export type MangaComment = {
  id: string;
  parentCommentId: string | null;
  body: string | null;
  status: "PUBLISHED" | "HIDDEN" | "REMOVED";
  isSpoiler: boolean;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  author: { username: string | null; displayName: string | null; avatarUrl: string | null };
};

export type CommentPageInfo = { hasMore: boolean; nextCursor: string | null };
export type MangaCommentRoot = MangaComment & { replies: MangaComment[]; repliesPageInfo: CommentPageInfo };
export type MangaCommentsPage = { items: MangaCommentRoot[]; pageInfo: CommentPageInfo; totalPublished: number };
export type MangaRepliesPage = { items: MangaComment[]; pageInfo: CommentPageInfo };
export type MangaCommentsAccess = { canParticipate: boolean; canModerate: boolean };
export type MangaCommentInput = { body: string; isSpoiler: boolean; parentCommentId?: string };
export type MangaCommentCommand = "edit" | "remove" | "hide" | "unhide";

export function mergeComments<T extends MangaComment>(current: T[], incoming: T[]): T[] {
  const rows = new Map(current.map((row) => [row.id, row]));
  for (const row of incoming) rows.set(row.id, row);
  return [...rows.values()];
}
