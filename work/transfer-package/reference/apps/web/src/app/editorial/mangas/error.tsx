"use client";

export default function EditorialError({ reset }: { error: Error; reset: () => void }) {
  return <main style={{ minHeight: "100vh", padding: "4rem", color: "var(--mz-text-primary)" }}><h1>No pudimos cargar el catálogo editorial</h1><button onClick={reset}>Reintentar</button></main>;
}
