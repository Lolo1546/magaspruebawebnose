# Design System de MangaZone

Esta carpeta contiene los fundamentos visuales reutilizables del frontend. El origen visual es `prototype/mangazone_v3_responsive.html`; los valores se adaptan a componentes mantenibles y accesibles, sin copiar la Home ni su JavaScript.

## Colores

- Fondos: `--mz-bg` y `--mz-bg-secondary`.
- Superficies: `--mz-surface`, `--mz-surface-secondary`, `--mz-card` y `--mz-card-hover`.
- Identidad: `--mz-red`, `--mz-red-hover`, `--mz-red-soft` y `--mz-red-glow`.
- Texto: `--mz-text-primary`, `--mz-text-secondary` y `--mz-text-muted`.
- Estados: verde para éxito o "En curso", amarillo para advertencia o "Pausado", gris para estados neutros o "Completado", azul para información y oro para puntuaciones o distinciones. Plata y bronce se reservan para las posiciones segunda y tercera de rankings.

## Tipografía

- Inter es la familia de interfaz y cuerpo mediante `--mz-font-body`.
- Bebas Neue se reserva para marca y títulos display mediante `--mz-font-display`.
- Ambas se cargan con `next/font/google`; no se deben añadir enlaces externos de Google Fonts.

## Espaciado y forma

- La escala de espaciado es 4, 8, 12, 16, 24, 32, 48 y 64 px (`--mz-space-1` a `--mz-space-8`).
- Los radios disponibles son 6, 10, 16 y 24 px, además de `--mz-radius-full`.
- Se deben reutilizar los tokens antes de introducir valores nuevos.

## Breakpoints

Las custom properties no funcionan de forma estándar en condiciones `@media`. Por ello se utilizan únicamente estos cortes compartidos:

| Nombre conceptual | Media query | Uso principal |
| --- | --- | --- |
| Mobile pequeño | `max-width: 540px` | Densidad y apilado en teléfonos |
| Mobile / tablet | `max-width: 760px` | Navegación y layouts táctiles |
| Sidebar | `max-width: 980px` | Ocultar o transformar el rail lateral |
| Layout grande | `max-width: 1180px` | Reorganizar contenido y panel derecho |

Los componentes deben usar el menor número de cortes posible y elegirlos de esta tabla. Los tamaños intermedios se resuelven primero mediante grid, flex, `minmax()` y `clamp()`.

## Reglas de uso

- `globals.css` se limita al reset y a estilos de elementos globales.
- Los componentes mantienen sus estilos en CSS Modules.
- No utilizar estilos inline para presentación permanente.
- No usar el color como único indicador cuando el significado necesite texto.
- Mantener foco visible, elementos HTML semánticos y targets táctiles adecuados.
- Respetar `prefers-reduced-motion` y evitar animaciones continuas decorativas.

## Layout y capas

- El header utiliza `--mz-header-height` (60 px).
- El sidebar ocupa `--mz-sidebar-width` (68 px) y puede superponerse al expandirse hasta `--mz-sidebar-expanded-width` (204 px).
- El contenido se limita mediante `--mz-content-max-width` (1440 px).
- La jerarquía de capas usa los tokens `--mz-z-content`, `--mz-z-sidebar`, `--mz-z-header`, `--mz-z-mobile-nav`, `--mz-z-overlay` y `--mz-z-modal`; no se deben introducir valores de `z-index` arbitrariamente altos.
