# El Ovoide

Blog personal de NFL en español: posiciones, resultados, pronósticos semanales, survivor y memes.

Sitio 100% estático con [Astro](https://astro.build), desplegado en Vercel.

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # genera dist/
npm run check    # type-check
```

Requiere Node 22.12+.

## Cómo publicar contenido

Todo el contenido vive en `src/content/`. Cada cambio que se sube a GitHub dispara un deploy en Vercel.

### Pronósticos (semanales)

Crea un archivo por semana:

```
src/content/picks/es/2026-w03.md
```

```yaml
---
title: 'Semana 3: ...'
summary: 'Resumen corto para la tarjeta.'
season: 2026
week: 3
published: 2026-09-21
draft: false            # true = no se publica
games:
  - away: KC            # abreviaturas de ESPN: KC, BUF, WSH, LAR…
    home: BUF
    pick: BUF
    spread: 'BUF -2.5'  # opcional
    analysis: 'Por qué elegimos este pronóstico.'  # opcional; si falta se muestra «Análisis próximamente.»
    context: 'Lesiones, clima, racha…'      # opcional
    data:
      - 'Dato clave 1'
      - 'Dato clave 2'
    # result: opcional. Si no lo pones, el build lo calcula con el marcador final.
    # result: { outcome: win, note: 'Ganamos con gol de campo al final' }
---

Texto de introducción de la semana (Markdown).
```

El resultado (acierto/fallo) se resuelve solo con el marcador final **en el siguiente deploy**. Para
refrescarlo después de los partidos, basta con cualquier push o un *Redeploy* desde Vercel.

### Reporte de lesiones

Un archivo por semana en `src/content/injuries/2026-w03.md` con, por partido, notas cortas de cada equipo
(`awayNotes` / `homeNotes`; vacío = sin lesiones importantes) y una `note` opcional. Para sacarlo de un
video de YouTube hay un script en [`scripts/`](scripts/README.md).

### Survivor

Agrega una entrada en `src/content/survivor.yaml`:

```yaml
- id: 2026-w03
  season: 2026
  week: 3
  team: BAL
  opponent: CLE
  home: true
  why: Por qué elegimos este equipo.   # opcional
  # outcome: win | loss | push   (opcional; si no, se calcula solo)
```

### Memes

Copia la imagen (PNG/JPG/WebP) a `src/content/memes/` y agrégala en `src/content/memes/memes.yaml`:

```yaml
- id: mi-meme
  image: ./mi-meme.jpg
  date: 2026-09-21
  week: 3
  caption: 'Texto'
  alt: 'Descripción de la imagen'
```

Las imágenes se optimizan a WebP en el build.

### Posiciones y resultados

Salen automáticamente de la API pública de ESPN: se toma un snapshot en cada build y el navegador lo
refresca en vivo (los resultados se actualizan cada minuto mientras hay partidos en juego).

## Seguridad

- **Sin backend:** no hay funciones serverless, API propia, formularios ni base de datos. Todo lo sirve el
  CDN de Vercel (con su mitigación DDoS), así que no hay un origen que tumbar ni costos por invocación.
- **CSP estricta:** Astro genera hashes para cada script/estilo; solo se permiten conexiones a
  `site.api.espn.com` e imágenes de `a.espncdn.com`.
- **Cabeceras** (`vercel.json`): HSTS, `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `nosniff`,
  `Referrer-Policy`, `Permissions-Policy`, COOP.
- Los datos externos se validan y escapan antes de renderizarse.
- Opcional: en Vercel → *Firewall* puedes activar **Attack Challenge Mode** si alguna vez ves tráfico raro.
