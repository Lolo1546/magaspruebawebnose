"use client";

export default function AdminError({ reset }: { readonly reset: () => void }) {
  return (
    <section role="alert">
      <h1>No pudimos cargar la administración</h1>
      <p>Comprueba tu conexión e inténtalo nuevamente.</p>
      <button type="button" onClick={reset}>
        Reintentar
      </button>
    </section>
  );
}
