import { isUUID } from 'class-validator';
import { invalidCommentCursor } from './manga-comments.errors.js';

export type CommentCursorScope = {
  mangaId: string;
  parentCommentId: string | null;
};
export type CommentPosition = { id: string; createdAt: Date };

export function encodeCommentCursor(
  scope: CommentCursorScope,
  row: CommentPosition,
): string {
  return Buffer.from(
    JSON.stringify({
      v: 1,
      ...scope,
      id: row.id,
      createdAt: row.createdAt.toISOString(),
    }),
  ).toString('base64url');
}

export function decodeCommentCursor(
  cursor: string | undefined,
  scope: CommentCursorScope,
): CommentPosition | null {
  if (cursor === undefined) return null;
  try {
    if (!cursor || cursor.length > 512 || !/^[A-Za-z0-9_-]+$/.test(cursor))
      throw invalidCommentCursor();
    const decoded = Buffer.from(cursor, 'base64url');
    if (decoded.toString('base64url') !== cursor) throw invalidCommentCursor();
    const value: unknown = JSON.parse(decoded.toString('utf8'));
    if (
      typeof value !== 'object' ||
      value === null ||
      !('v' in value) ||
      value.v !== 1 ||
      !('mangaId' in value) ||
      value.mangaId !== scope.mangaId ||
      !('parentCommentId' in value) ||
      value.parentCommentId !== scope.parentCommentId ||
      !('id' in value) ||
      typeof value.id !== 'string' ||
      !isUUID(value.id) ||
      !('createdAt' in value) ||
      typeof value.createdAt !== 'string'
    )
      throw invalidCommentCursor();
    const createdAt = new Date(value.createdAt);
    if (
      !Number.isFinite(createdAt.getTime()) ||
      createdAt.toISOString() !== value.createdAt
    )
      throw invalidCommentCursor();
    return { id: value.id, createdAt };
  } catch {
    throw invalidCommentCursor();
  }
}
