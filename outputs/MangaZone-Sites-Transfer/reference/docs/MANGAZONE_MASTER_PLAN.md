# MangaZone — Plan Maestro Funcional

Este documento es la referencia funcional oficial y obligatoria del proyecto MangaZone. El prototipo visual oficial de referencia es `mangazone_v3_responsive.html` y debe utilizarse únicamente como referencia visual y de experiencia de usuario, no como arquitectura técnica definitiva.

## 1. Visión del proyecto

MangaZone será una plataforma web en español centrada principalmente en:

- Manga.
- Manhwa.
- Manhua.

El manga y la lectura serán el núcleo principal de la plataforma.

La web también tendrá módulos secundarios relacionados con la cultura manga/anime:

- Fan-Art.
- Clips.
- Anime.
- Comunidades.
- Mensajes.
- Momentos.
- Noticias.

Estos módulos tendrán páginas independientes dentro del mismo dominio y no deben quitar protagonismo al manga en la página principal.

Ejemplos de rutas:

```text
dominio.com/
dominio.com/manga
dominio.com/fanart
dominio.com/clips
dominio.com/anime
dominio.com/comunidades
dominio.com/mensajes
dominio.com/perfil
```

La Home debe transmitir principalmente:

> Hay nuevos capítulos disponibles. Entra, descubre y continúa leyendo.

## 2. Principios del producto

MangaZone debe priorizar:

1. Manga.
2. Descubrimiento de nuevas obras.
3. Actualizaciones y capítulos recientes.
4. Continuidad de lectura.
5. Biblioteca personal.
6. Comunidad.
7. Creadores.
8. Experiencia móvil.
9. Velocidad.
10. Seguridad y privacidad.

La web no debe convertirse en una red social genérica. Fan-Art, Clips, Momentos y Mensajes deben reforzar el ecosistema MangaZone.

## 3. Home

La página principal debe estar enfocada principalmente en manga.

Orden conceptual:

1. Header.
2. Hero compacto.
3. Actualizaciones recientes.
4. Continuar leyendo.
5. Tendencias.
6. Recomendaciones.
7. Nuevos en MangaZone.
8. Rankings.
9. Calendario.
10. Previews discretos de otras áreas cuando corresponda.
11. Comunidad.
12. Noticias.
13. Footer.

Fan-Art, Clips y Anime podrán aparecer en la Home mediante previews pequeños, pero sus experiencias completas tendrán páginas independientes.

## 4. Navegación principal

### Desktop

- Inicio.
- Explorar.
- Fan-Art.
- Clips.
- Anime.
- Comunidad.

Zona derecha:

- Buscar.
- Mensajes.
- Notificaciones.
- Perfil / Acceder.

Explorar contendrá:

- Manga.
- Manhwa.
- Manhua.
- Actualizaciones.
- Nuevos.
- Finalizados.
- Ranking.
- Calendario.
- Géneros.

### Mobile

La navegación inferior principal debe mantenerse simple:

- Inicio.
- Explorar.
- Biblioteca.
- Mi lista.
- Perfil.

Mensajes y notificaciones podrán estar disponibles desde la zona superior.

## 5. Tipos de usuario

### Visitante

Puede:

- Navegar por contenido público.
- Buscar obras.
- Consultar fichas públicas.
- Ver información general.

No puede:

- Acceder a contenido +18.
- Usar biblioteca sincronizada.
- Publicar.
- Comentar.
- Usar mensajes.
- Crear comunidades.
- Gestionar proyectos.

### Usuario registrado

Puede:

- Editar su perfil.
- Utilizar biblioteca.
- Guardar historial.
- Crear listas.
- Comentar.
- Publicar contenido permitido.
- Seguir usuarios.
- Seguir mangas.
- Seguir comunidades.
- Seguir grupos verificados.
- Utilizar mensajes según privacidad.
- Solicitar creación de comunidades.
- Subir Fan-Art permitido.
- Publicar Momentos.
- Usar funciones sociales.

### Grupo verificado por MangaZone

No es lo mismo que un usuario normal. Es una entidad o perfil especial aprobado por MangaZone.

Puede:

- Tener Fanpage propia.
- Administrar miembros.
- Solicitar proyectos.
- Participar en colaboraciones.
- Publicar capítulos cuando tenga los permisos correspondientes.
- Gestionar créditos.
- Publicar novedades.
- Reclutar miembros.

La insignia será **“Grupo verificado por MangaZone”**.

Nunca debe utilizarse la palabra “oficial” salvo que realmente corresponda a una editorial o titular autorizado.

### Moderador

Es un usuario al que el Administrador asigna permisos específicos. Un Moderador no obtiene automáticamente permisos sobre toda MangaZone.

### Administrador

Tiene control global y todos los permisos de la plataforma. Es el único rol que puede asignar, modificar o revocar permisos de moderación.

## 6. Roles y permisos

Los permisos de Moderador deben poder asignarse por áreas, por ejemplo:

- Comunidades.
- Catálogo.
- Scanlations / Grupos.
- Fan-Art.
- Clips.
- Contenido +18.
- Reportes.
- Usuarios.
- Otras áreas futuras.

Ejemplo conceptual:

| Moderador @Carlos | Permiso |
|---|---:|
| Comunidades | Sí |
| Fan-Art | Sí |
| Scanlations | No |
| Catálogo | No |
| Contenido +18 | Sí |

El Administrador tiene todos los permisos.

Los niveles, insignias o reputación de usuarios nunca deben conceder permisos administrativos. Autoridad y gamificación son sistemas completamente diferentes.

## 7. Manga / Manhwa / Manhua

Cada obra debe tener una ficha única.

Debe contemplarse:

- Título principal.
- Aliases.
- Título original.
- Tipo.
- Géneros.
- Autor.
- Artista.
- Estado.
- Descripción.
- Portada.
- Capítulos.
- Puntuación.
- Estadísticas.
- Grupos participantes.
- Historial del proyecto.
- Adaptación anime cuando exista.
- Fan-Art relacionado.
- Clips relacionados.
- Comunidad relacionada.
- Reviews.

No deben existir fichas duplicadas de una misma obra. Antes de crear una nueva ficha debe existir búsqueda de coincidencias. Los aliases deben asociarse a una misma obra.

Por ejemplo, los siguientes nombres deben pertenecer a una sola ficha:

- One Piece.
- ONE PIECE.
- Wan Pīsu.
- ワンピース.

## 8. Grupos verificados por MangaZone

Los grupos de scanlation necesitan aprobación. No cualquier usuario puede publicar mangas o capítulos.

Flujo conceptual:

```text
Solicitud de grupo
→ revisión
→ aprobación/rechazo
→ Grupo verificado por MangaZone
```

Cada grupo tendrá Fanpage.

Información posible:

- Logo.
- Banner.
- Descripción.
- Fecha de creación.
- Idioma.
- Redes sociales.
- Web.
- Miembros.
- Roles.
- Proyectos activos.
- Proyectos pausados.
- Proyectos completados.
- Colaboraciones.
- Reclutamiento.

## 9. Roles internos del grupo

Se contemplan roles como:

- Fundador.
- Administrador.
- Uploader.
- Traductor.
- Cleaner.
- Redrawer.
- Typesetter.
- Proofreader.

Los permisos deben poder diferenciarse. Por ejemplo, un traductor no necesariamente puede publicar capítulos, mientras que un uploader sí puede hacerlo.

## 10. Proyectos de grupos

Un manga puede tener uno o varios grupos asociados.

Debe permitirse:

- Proyecto individual.
- Colaboración entre grupos.
- Transición de proyecto.
- Continuación de proyecto.
- Historial de grupos.

No se debe tratar la obra como propiedad absoluta de un scanlation. El sistema representa quién tiene asignado el proyecto dentro de MangaZone.

Estados de proyecto:

- Activo.
- En pausa.
- Abandonado.
- Completado.
- Disponible para continuación.
- En disputa.

## 11. Continuación de proyectos

Si un proyecto parece abandonado, otro Grupo verificado podrá solicitar continuarlo.

Flujo:

```text
Grupo B solicita continuación
→ Grupo A recibe solicitud
→ Grupo A puede aceptar, rechazar o proponer colaboración
```

Si el grupo original no responde durante el plazo definido por política, la solicitud pasa a revisión de moderación.

La decisión de abandono no debe depender únicamente de un contador automático. Debe poder evaluarse:

- Última actualización.
- Frecuencia de publicación de la obra.
- Actividad del grupo.
- Anuncios de pausa.
- Comunicación.
- Contexto del proyecto.

El Moderador correspondiente podrá declarar el proyecto disponible para continuación. Debe existir posibilidad de apelación.

## 12. Historial de proyectos

La ficha del manga debe conservar historial público.

Ejemplo:

| Período | Grupo | Capítulos |
|---|---|---|
| 2022–2023 | Grupo A | 1–42 |
| 2023–2025 | Grupo B | 43–116 |
| 2025– | Grupo C | 117– |

Los créditos anteriores nunca deben desaparecer simplemente porque cambie el grupo actual.

## 13. Créditos de capítulo

Un capítulo podrá registrar:

- Grupo.
- Colaboración.
- Traductor.
- Cleaner.
- Redrawer.
- Typesetter.
- Proofreader.
- Uploader.

Los créditos históricos deben conservarse.

## 14. Comunidades

Los usuarios pueden solicitar crear comunidades. Una comunidad no se crea instantáneamente.

Flujo:

```text
Usuario solicita comunidad
→ búsqueda de duplicados
→ revisión de Moderador
→ aprobación / rechazo / fusión
```

Antes de permitir la solicitud se deben mostrar comunidades similares.

Ejemplo: si el usuario escribe “Fans de Berserk”, MangaZone debe buscar comunidades relacionadas y sugerirlas antes de permitir una nueva solicitud.

El objetivo es evitar decenas de comunidades duplicadas sobre el mismo tema.

## 15. Roles de comunidad

Una comunidad podrá tener:

- Propietario.
- Administradores.
- Moderadores.
- Miembros.

Estos roles son internos de la comunidad. No equivalen a Moderadores globales de MangaZone.

Los Moderadores de MangaZone siempre tendrán autoridad superior dentro de las áreas para las cuales tengan permiso.

## 16. Fan-Art

Fan-Art tendrá página independiente:

```text
dominio.com/fanart
```

Debe permitir:

- Para ti.
- Tendencias.
- Recientes.
- Siguiendo.
- Concursos.
- Búsqueda.
- Filtros.

El Fan-Art debe poder vincularse con:

- Manga.
- Manhwa.
- Manhua.
- Personaje.
- Artista.
- Tags.

Debe permitir buscar Fan-Art por obra relacionada.

Cada publicación puede tener:

- Título.
- Descripción.
- Autor.
- Obra relacionada.
- Personajes.
- Tags.
- Herramienta utilizada.
- Indicadores de contenido.
- Likes.
- Comentarios.
- Guardados.

Los autores tendrán perfiles donde puedan mostrarse sus publicaciones.

En V1 no se permitirá contenido sexual explícito en Fan-Art.

## 17. Clips

Página:

```text
dominio.com/clips
```

Utilizará un formato vertical de video corto. No debe ser una red social generalista.

El contenido debe estar relacionado con:

- Manga.
- Anime.
- Teorías.
- Reviews.
- Noticias.
- Fan-Art.
- Dibujo.
- Cosplay.
- Humor relacionado.

Cada Clip puede vincularse a una obra. Desde el Clip debe poder navegarse a la ficha relacionada.

Categorías posibles:

- Para ti.
- Siguiendo.
- Manga.
- Anime.
- Teorías.
- Reviews.
- Noticias.
- Fan-Art.
- Dibujo.
- Cosplay.
- Humor.

## 18. Anime

Anime será secundario respecto al manga.

Página:

```text
dominio.com/anime
```

Puede incluir:

- Temporada actual.
- Próximos estrenos.
- Calendario.
- Adaptaciones.
- Trailers.
- Noticias.
- Información de estudios.
- Episodios.
- Temporadas.
- Relación manga/anime.

Cuando sea posible, una ficha podrá indicar aproximadamente qué capítulos del manga corresponden a determinados episodios.

## 19. Perfiles de usuario

Cada usuario podrá configurar:

- Avatar.
- Banner.
- Nombre visible.
- `@username`.
- Descripción.
- Enlaces sociales.
- Sitio web cuando corresponda.
- Mangas favoritos.
- Géneros favoritos.

La privacidad debe permitir decidir qué información mostrar.

Perfil conceptual:

- Avatar.
- Banner.
- Nombre.
- Username.
- Bio.
- Nivel.
- Reputación.
- Seguidores.
- Siguiendo.
- Estadísticas opcionales.
- Biblioteca.
- Listas.
- Reviews.
- Fan-Art.
- Actividad.
- Insignias.

## 20. Configuración del usuario

Debe existir una página completa de configuración con secciones como:

- Cuenta.
- Perfil.
- Privacidad.
- Biblioteca.
- Notificaciones.
- Contenido.
- Apariencia.
- Seguridad.
- Sesiones.
- Datos y privacidad.
- Eliminar cuenta.

Privacidad debe permitir configurar:

- Perfil público/privado.
- Biblioteca visible.
- Actividad visible.
- Estado online.
- Última conexión.
- Historial.
- Seguidores.
- Confirmaciones de lectura.
- Quién puede enviar mensajes.
- Usuarios bloqueados.
- Comunidades silenciadas.
- Tags silenciados.

El historial de lectura será privado por defecto.

## 21. Biblioteca

Estados posibles:

- Leyendo.
- Quiero leer.
- En espera.
- Terminado.
- Abandonado.
- Favorito.

Los usuarios podrán crear listas personalizadas.

Ejemplos:

- Mis mejores romances.
- Manhwas pendientes.
- Seinen favoritos.
- Para leer después.

## 22. Historial y Continuar leyendo

MangaZone debe recordar:

- Obra.
- Capítulo.
- Página.
- Progreso.
- Fecha.

La función “Continuar leyendo” debe ser fundamental.

En el futuro deberá sincronizarse entre dispositivos cuando exista backend.

## 23. Niveles

MangaZone puede utilizar un nivel de usuario como gamificación. No debe depender exclusivamente del número de capítulos abiertos.

El sistema futuro podrá valorar actividades legítimas como:

- Lectura.
- Obras completadas.
- Reviews útiles.
- Fan-Art aprobado.
- Contribuciones positivas.
- Participación.

Debe incluir límites y medidas antiabuso. No se debe dar XP indiscriminadamente por comentarios para evitar spam.

## 24. Insignias

El sistema de insignias será independiente del nivel.

Ejemplos:

- Lector Novato.
- Lector Veterano.
- Artista.
- Artista Destacado.
- Crítico.
- Participación comunitaria.

Las insignias no conceden permisos administrativos.

## 25. Reputación

La reputación es un sistema separado de:

- Nivel.
- Insignias.
- Roles.

Puede representar contribuciones valoradas positivamente.

Ejemplos:

- Reviews útiles.
- Fan-Art destacado.
- Reportes válidos.
- Contribuciones comunitarias positivas.

La reputación no concede autoridad administrativa automáticamente.

## 26. Seguidores

MangaZone utilizará un modelo de seguimiento.

El Usuario A puede seguir al Usuario B sin exigir reciprocidad. Si ambos se siguen, la relación se denomina **“Seguimiento mutuo”**.

Los permisos de mensajes podrán usar esta relación.

## 27. Mensajes

Página:

```text
dominio.com/mensajes
```

Debe contemplar inicialmente:

- Conversaciones 1 a 1.
- Grupos pequeños en fases posteriores.
- Texto.
- Imágenes permitidas.
- GIF.
- Stickers.
- Reacciones.
- Respuestas.
- Mensajes fijados.
- Búsqueda.
- Silenciar.
- Bloquear.
- Reportar.
- Compartir manga.
- Compartir capítulo.
- Compartir Fan-Art.
- Compartir Clip.

El usuario debe controlar quién puede enviarle mensajes.

Opciones futuras:

- Personas que sigo.
- Seguidores.
- Seguimiento mutuo.
- Miembros de mis comunidades.
- Todos.
- Nadie.

Los archivos multimedia de desconocidos podrán permanecer ocultos hasta aceptar la solicitud.

## 28. Cultivo

“Cultivo” será el nombre de la mecánica que mide días consecutivos de interacción entre dos usuarios.

Ejemplo:

```text
Marco × Carlos
Cultivo: 42 días
```

No se debe llamar “Racha”.

Para validar un día de Cultivo debe existir interacción de ambos usuarios durante ese día. No debe incrementarse únicamente porque una persona envíe mensajes sin respuesta.

Cultivo:

- Es social.
- No concede XP automáticamente.
- No concede permisos.
- No modifica reputación.
- Es independiente del nivel.

## 29. Momentos

“Momentos” será el formato de publicaciones temporales.

Duración normal: **24 horas**.

Podrá admitir:

- Texto.
- Imagen.
- GIF.
- Video corto.
- Encuesta.
- Obra que está leyendo.
- Fan-Art.
- Contenido relacionado.

Puede incluir:

- Obra relacionada.
- Spoiler.
- Contenido sensible.

Los usuarios podrán guardar determinados Momentos como destacados en su perfil.

Los grupos verificados también podrán usar Momentos para:

- Avances.
- Anuncios.
- Reclutamiento.
- Progreso de capítulos.
- Encuestas.

Las comunidades podrán utilizar Momentos en fases posteriores.

## 30. Spoilers

La protección antispóilers debe ser una característica importante de MangaZone.

El contenido marcado como spoiler deberá poder ocultarse.

Como objetivo futuro, MangaZone podrá conocer el progreso de lectura del usuario y ocultar contenido relacionado con capítulos posteriores.

Ejemplo:

```text
Usuario ha leído hasta el capítulo 80.
Publicación contiene spoilers del capítulo 100.

Resultado:
“Contenido oculto: contiene spoilers posteriores a tu progreso.”
```

## 31. Contenido +18

El contenido adulto permitido se limitará inicialmente a:

- Manga.
- Manhwa.
- Manhua.

Fan-Art, Clips, Comunidades y otras áreas no permitirán contenido sexual explícito en V1.

Para visitantes sin sesión, el contenido +18 estará oculto.

Para usuarios con sesión, el contenido +18 continuará oculto por defecto. El usuario deberá habilitarlo manualmente y debe existir una advertencia clara antes de activarlo.

Opciones de portadas +18:

- Mostrar.
- Difuminar.
- Ocultar.

Por defecto debe utilizarse una opción segura.

La autorización +18 no debe depender únicamente de blur visual. En la futura implementación real, los usuarios no autorizados no deben recibir los recursos explícitos originales.

La política de contenido debe prohibir estrictamente contenido sexual que represente menores.

## 32. Notificaciones

Debe existir un centro de notificaciones.

Categorías:

- Todo.
- Manga.
- Social.
- Comunidades.
- Grupos.
- Moderación, cuando corresponda.

Ejemplos:

- Nuevo capítulo.
- Respuesta.
- Mención.
- Nuevo seguidor.
- Publicación de grupo.
- Comunidad aprobada.
- Solicitud de proyecto.
- Cultivo alcanzó determinado número de días.

El usuario podrá configurar qué notificaciones desea recibir.

## 33. Moderación

MangaZone tendrá Moderadores especializados.

Áreas posibles:

- Comunidades.
- Fan-Art.
- Clips.
- Catálogo.
- Grupos.
- +18.
- Usuarios.
- Reportes.

El Administrador asignará estos permisos.

Cada acción importante debe quedar registrada con:

- Moderador.
- Acción.
- Motivo.
- Fecha.
- Recurso afectado.

Los Moderadores no pueden eliminar sus propios logs.

Debe existir:

- Reportes.
- Revisión.
- Sanciones.
- Apelaciones.

## 34. Sanciones

Modelo progresivo cuando corresponda:

1. Advertencia.
2. Restricción temporal.
3. Suspensión.
4. Expulsión.

La gravedad del caso puede justificar acciones superiores directamente.

## 35. Mensajes privados y moderación

Los Moderadores no deben poder navegar libremente por conversaciones privadas.

Cuando un usuario reporte un mensaje, el sistema podrá proporcionar a moderación el contexto necesario para investigar ese reporte.

Debe respetarse la privacidad de las conversaciones.

## 36. Eliminación de publicaciones

Una publicación subida a MangaZone no tendrá eliminación directa por parte del usuario.

El usuario dispondrá de **“Solicitar eliminación”**. La solicitud deberá enviarse a moderación.

Datos posibles:

- Publicación.
- Motivo.
- Explicación.

Moderación podrá:

- Aprobar.
- Rechazar.
- Solicitar más información.

La decisión debe quedar registrada.

El usuario podrá editar ciertos metadatos de su publicación según reglas futuras, pero no borrar unilateralmente el contenido publicado.

## 37. Eliminación de cuenta

El usuario podrá solicitar eliminar su cuenta.

Período de recuperación: **7 días**.

Flujo:

```text
Solicitar eliminación
→ confirmación
→ contraseña
→ 2FA si corresponde
→ cuenta pendiente de eliminación
→ 7 días
→ eliminación irreversible
```

Durante esos siete días podrá cancelar la eliminación.

Después del plazo deben eliminarse o anonimizarse los datos personales según corresponda.

Las publicaciones permanecen. El autor de publicaciones pasa a mostrarse como **“Usuario eliminado”**.

Para eliminar contenido publicado debe existir una solicitud separada de eliminación y moderación.

## 38. Responsabilidades antes de eliminar una cuenta

Si el usuario es propietario de una comunidad, deberá transferirla antes de eliminar la cuenta.

Si es fundador o propietario de un Grupo verificado, deberá transferir responsabilidades a otro miembro o solicitar cierre/revisión.

Los permisos de Moderador deben revocarse.

Los logs históricos de moderación deben conservarse de forma auditada.

## 39. Seguridad de cuenta

La interfaz futura debe contemplar:

- Cambiar contraseña.
- Recuperación de contraseña.
- Verificación de correo.
- 2FA.
- Sesiones activas.
- Dispositivos.
- Cerrar otras sesiones.
- Alertas de seguridad.

Los cambios críticos deberán requerir reautenticación.

## 40. Soporte

Debe existir:

```text
dominio.com/ayuda
```

Temas:

- Cuenta.
- Lectura.
- Biblioteca.
- Grupos.
- Comunidades.
- Fan-Art.
- Mensajes.
- +18.
- Reportes.
- Privacidad.

También debe existir un mecanismo futuro para contactar con soporte.

## 41. Normas

Debe existir una página de reglas.

Secciones futuras:

- Normas generales.
- Comunidades.
- Fan-Art.
- Grupos.
- Contenido +18.
- Spoilers.
- Mensajes.
- Clips.

Las decisiones de moderación deben basarse en reglas documentadas.

## 42. Hosting y producción

MangaZone será un sitio web publicado en hosting real.

El prototipo HTML no representa la arquitectura de producción.

La arquitectura real deberá contemplar posteriormente:

- Frontend.
- Backend/API.
- Base de datos.
- Almacenamiento de archivos.
- CDN.
- Seguridad.
- Backups.
- Monitorización.

Las imágenes y los videos no deberán necesariamente residir en el mismo servidor de aplicación.

## 43. Base de datos futura

No implementar todavía.

El proyecto debe diseñarse pensando en entidades como:

- `users`.
- `profiles`.
- `roles`.
- `permissions`.
- `mangas`.
- `manga_aliases`.
- `chapters`.
- `genres`.
- `authors`.
- `libraries`.
- `reading_history`.
- `lists`.
- `scanlation_groups`.
- `scanlation_members`.
- `projects`.
- `project_requests`.
- `chapter_credits`.
- `communities`.
- `community_members`.
- `posts`.
- `comments`.
- `fanarts`.
- `conversations`.
- `messages`.
- `moments`.
- `cultivos`.
- `notifications`.
- `reports`.
- `moderation_actions`.
- `appeals`.
- `follows`.
- `blocks`.
- `account_deletion_requests`.
- `content_deletion_requests`.

Esto no es todavía un esquema definitivo de base de datos. Solo sirve como referencia funcional.

## 44. Versiones del proyecto

### V1

Prioridad:

- Manga / Manhwa / Manhua.
- Home.
- Explorar.
- Fichas.
- Lector.
- Usuarios.
- Perfiles.
- Configuración.
- Biblioteca.
- Historial.
- Listas.
- Grupos verificados.
- Proyectos.
- Comunidades.
- Moderación.
- +18.
- Fan-Art.
- Notificaciones.
- Mensajes privados básicos.
- Seguridad fundamental.

### V1.5

Posibles incorporaciones:

- Momentos.
- Cultivo.
- Sistema avanzado de niveles.
- Insignias.
- Reputación.
- Feed social.
- Mejoras de comunidades.

### V2

Posibles incorporaciones:

- Clips completos.
- Anime avanzado.
- Chats comunitarios en tiempo real.
- Herramientas internas avanzadas para grupos.
- MangaZone Originals.
- Funciones sociales avanzadas.

## 45. Regla de desarrollo

Todo agente o desarrollador que trabaje sobre MangaZone debe consultar este documento antes de implementar nuevas funcionalidades.

Si una implementación contradice `MANGAZONE_MASTER_PLAN.md`:

- No asumir.
- No inventar.
- Detener la decisión.
- Solicitar confirmación.

`MANGAZONE_MASTER_PLAN.md` será la fuente funcional principal del proyecto.
