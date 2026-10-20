"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

export function useReaderFullscreen(targetRef: RefObject<HTMLElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const target = targetRef.current;
    setIsSupported(
      typeof target?.requestFullscreen === "function" &&
        typeof document.exitFullscreen === "function",
    );

    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === targetRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [targetRef]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await targetRef.current?.requestFullscreen();
      }
      return true;
    } catch {
      return false;
    }
  }, [targetRef]);

  return { isFullscreen, isSupported, toggleFullscreen };
}
