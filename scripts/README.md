# scripts

Herramientas locales para preparar contenido. **No forman parte del sitio**: Vercel las ignora
(`.vercelignore`) y el build de Astro no las toca.

Requiere [uv](https://docs.astral.sh/uv/); cada script declara sus dependencias (PEP 723), así que no hay
que instalar nada a mano.

## Reporte de lesiones desde un video

```bash
uv run scripts/transcribe.py https://youtu.be/<id> --week 2026-w02
```

1. Usa los subtítulos del video si existen; si no, baja el audio y lo transcribe con Whisper en local
   (`--model small` por defecto, `--force-whisper` para saltarte los subtítulos).
2. Deja el texto en `scripts/transcripts/2026-w02.txt` (ignorado por git: es material de consulta, no se
   publica).
3. Con eso se escribe a mano `src/content/injuries/2026-w02.md`, parafraseado y simple, sin citar la fuente: por partido, solo lo clave de cada
   equipo (titulares fuera, regresos, dudas reales). Ver `2026-w01.md` como ejemplo.

Los subtítulos automáticos deforman nombres (p. ej. "coreback" por *quarterback*); revisa cada nombre
contra el roster antes de publicar.
