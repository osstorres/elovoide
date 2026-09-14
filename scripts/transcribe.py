# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "youtube-transcript-api>=1.2",
#   "yt-dlp>=2025.1.1",
#   "faster-whisper>=1.1",
# ]
# ///
"""Transcribe a YouTube video to plain text for writing the weekly injury report.

    uv run scripts/transcribe.py https://youtu.be/<id> --week 2026-w01

1. Uses the video's captions when they exist (fast, no download).
2. Otherwise downloads the audio with yt-dlp and runs faster-whisper locally.

The transcript lands in scripts/transcripts/<week>.txt (git-ignored): it is raw
source material, not something to publish. The report itself is written by hand
in src/content/injuries/<week>.md.
"""

from __future__ import annotations

import argparse
import re
import sys
import tempfile
from pathlib import Path

OUT_DIR = Path(__file__).parent / "transcripts"


def video_id(url: str) -> str:
    m = re.search(r"(?:v=|youtu\.be/|shorts/|embed/)([\w-]{11})", url)
    if not m:
        sys.exit(f"Could not find a video id in {url!r}")
    return m.group(1)


def from_captions(vid: str, langs: list[str]) -> str | None:
    from youtube_transcript_api import YouTubeTranscriptApi

    try:
        fetched = YouTubeTranscriptApi().fetch(vid, languages=langs)
    except Exception as exc:  # no captions, disabled, blocked…
        print(f"captions unavailable: {type(exc).__name__}", file=sys.stderr)
        return None
    return "\n".join(f"[{int(s.start) // 60:02d}:{int(s.start) % 60:02d}] {s.text}" for s in fetched)


def from_audio(url: str, lang: str, model: str) -> str:
    import yt_dlp
    from faster_whisper import WhisperModel

    with tempfile.TemporaryDirectory() as tmp:
        opts = {"format": "bestaudio/best", "outtmpl": f"{tmp}/audio.%(ext)s", "quiet": True}
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=True)
            path = ydl.prepare_filename(info)
        print(f"transcribing with whisper ({model})…", file=sys.stderr)
        segments, _ = WhisperModel(model, compute_type="int8").transcribe(path, language=lang, vad_filter=True)
        return "\n".join(f"[{int(s.start) // 60:02d}:{int(s.start) % 60:02d}] {s.text.strip()}" for s in segments)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("url")
    ap.add_argument("--week", required=True, help="file name, e.g. 2026-w01")
    ap.add_argument("--lang", default="es", help="spoken language (default: es)")
    ap.add_argument("--model", default="small", help="whisper model when there are no captions")
    ap.add_argument("--force-whisper", action="store_true", help="skip captions")
    args = ap.parse_args()

    vid = video_id(args.url)
    text = None if args.force_whisper else from_captions(vid, [args.lang, "es-419", "es-MX", "en"])
    source = "captions"
    if not text:
        text, source = from_audio(args.url, args.lang, args.model), "whisper"

    OUT_DIR.mkdir(exist_ok=True)
    out = OUT_DIR / f"{args.week}.txt"
    out.write_text(f"# https://youtu.be/{vid} ({source})\n{text}\n", encoding="utf-8")
    print(f"{out} · {len(text.split())} words · {source}")


if __name__ == "__main__":
    main()
