# Traslado al chat en la nube y comienzo de S1

1. Desde el PC, abre ChatGPT en el navegador y crea un chat nuevo para MangaZone Sites.
2. Adjunta `MangaZone-Sites-Transfer.zip` desde `C:\Users\ELIAS\Desktop\MangaZone-Sites-Transfer`. Adjunta también `MASTER_CONTEXT.md` por separado si la interfaz no permite leer el Markdown dentro del ZIP.
3. Pide al asistente que confirme **qué archivos pudo abrir realmente**: `README.md`, `MASTER_CONTEXT.md`, `CONTRATOS_FUNCIONALES.md`, `ARQUITECTURA_SITES.md`, `MANIFEST.csv` y los archivos de referencia necesarios. Si no puede abrir o extraer ZIP, sube los documentos individuales y luego los módulos `reference/` que vaya solicitando. No supongas que la ruta del Escritorio está disponible para el chat en nube.
4. Antes de implementar, verifica que el ZIP corresponde al manifiesto y que distingue código de referencia de funciones pendientes. No ejecutes migraciones originales sobre ningún servicio de Sites.
5. Solicita una revisión de S1 basada en `ARQUITECTURA_SITES.md`: identidad, dos usuarios, persistencia, archivo privado, autorización y semántica de conflicto. Crear un Site solo cuando indiques que debe empezar S1.

Prompt sugerido para el nuevo chat:

> Estamos continuando MangaZone Sites. He adjuntado el paquete S0.5. Lee `MASTER_CONTEXT.md`, `CONTRATOS_FUNCIONALES.md`, `ARQUITECTURA_SITES.md` y `MANIFEST.csv`, e indica qué archivos pudiste abrir realmente. MangaZone Sites debe ser una aplicación funcional completa, no una demo. Distingue lo implementado en el repositorio original de los objetivos pendientes. Usa `reference/` como referencia, conserva el diseño productivo como canon y no presupongas capacidades de Sites sin validarlas. Primero revisa la arquitectura y los criterios de S1. No crees un Site ni migres datos hasta que te pida iniciar la construcción.

El paquete no incluye secretos ni datos de usuarios reales. Si más adelante se necesita un servicio externo, configura sus secretos mediante los mecanismos aprobados de Sites; no los pegues en el chat ni en archivos de código.
