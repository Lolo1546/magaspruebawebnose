import { useEffect, useRef } from "react";

export type ReaderPersistenceConfig = {
  chapterId: string;
  chapterReleaseId: string | null;
  mangaId: string;
  csrfToken: string;
};

export type ReaderPersistenceProps = {
  config: ReaderPersistenceConfig | null | undefined;
  currentPage: number;
};

type Queue = {
  pending: number | null;
  confirmed: number | null;
  inFlight: boolean;
  disabled: boolean;
  disposed: boolean;
};

export function useReaderPersistence({ config, currentPage }: ReaderPersistenceProps) {
  const queueRef = useRef<Queue | null>(null);
  const chapterId = config?.chapterId;
  const chapterReleaseId = config?.chapterReleaseId;
  const mangaId = config?.mangaId;
  const csrfToken = config?.csrfToken;

  useEffect(() => {
    const queue: Queue = { pending: null, confirmed: null, inFlight: false, disabled: false, disposed: false };
    queueRef.current = queue;
    // A response from a previous release/session must not change the new queue.
    return () => { queue.disposed = true; };
  }, [chapterId, chapterReleaseId, mangaId, csrfToken]);

  useEffect(() => {
    const queue = queueRef.current;
    const origin = process.env.NEXT_PUBLIC_API_URL;
    if (!queue || queue.disabled || !chapterId || !chapterReleaseId || !mangaId || !csrfToken || !origin) return;
    const headers = { "Content-Type": "application/json", "x-csrf-token": csrfToken };
    queue.pending = currentPage;

    async function drain() {
      if (!queue || queue.inFlight || queue.disposed || queue.disabled) return;
      while (queue.pending !== null && !queue.disposed && !queue.disabled) {
        const page = queue.pending;
        if (page === queue.confirmed) { queue.pending = null; return; }
        queue.inFlight = true;
        try {
          const response = await fetch(`${origin}/me/mangas/${mangaId}/progress`, {
            method: "PUT",
            credentials: "include",
            headers,
            body: JSON.stringify({ chapterId, chapterReleaseId, pageNumber: page }),
          });
          if (queue.disposed) return;
          if (response.ok) {
            queue.confirmed = page;
            if (queue.pending === page) queue.pending = null;
          } else {
            if (response.status === 401 || response.status === 403) queue.disabled = true;
            return;
          }
        } catch {
          // Retry on the next page change, never a tight network retry loop.
          return;
        } finally {
          queue.inFlight = false;
        }
      }
    }

    // Opening a release also persists its initial position (including one-page releases).
    const timer = setTimeout(() => void drain(), 750);
    return () => clearTimeout(timer);
  }, [currentPage, chapterId, chapterReleaseId, mangaId, csrfToken]);
}
