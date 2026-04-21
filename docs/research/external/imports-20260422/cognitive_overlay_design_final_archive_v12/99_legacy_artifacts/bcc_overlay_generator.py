#!/usr/bin/env python3
"""
BCC Overlay Generator
=====================

A small human-in-the-loop prototype for generating short-form video overlay files.

Input:
  inputs/sample_beat_sheet.csv or any CSV with:
  video_id, beat_id, start, end, spoken_text, semantic_caption, role, keywords,
  placement_zone, visual_load

Output:
  - SRT files for basic subtitle editors
  - VTT files with basic cue comments
  - ASS files with bold markup suitable for richer styling pipelines
  - JSON overlay plans for production or automation
  - CSV export for manual editors

This script does not perform AI summarization. It expects semantic_caption and
keywords to be authored or reviewed by a human. That is deliberate: the current
research question is whether these overlay variants perform differently, not
whether automated summarization is accurate.
"""

from __future__ import annotations

import argparse
import csv
import html
import json
import re
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Iterable, List, Dict, Tuple

OPERATORS = {
    "not", "no", "never", "stop", "start", "less", "more", "first", "then",
    "before", "after", "only", "without", "because", "reduce", "shrink",
    "close", "make", "keep", "block"
}

STOPWORDS = {
    "a","an","the","and","or","but","if","is","are","was","were","to","of",
    "in","on","for","with","that","this","it","its","your","you","they","we",
    "he","she","as","at","by","from","than","into","about","around","every",
    "because","do","does","did"
}

@dataclass
class Beat:
    video_id: str
    beat_id: str
    start: str
    end: str
    spoken_text: str
    semantic_caption: str
    role: str
    keywords: str = ""
    category: str = ""
    placement_zone: str = "center_upper"
    visual_load: str = "medium"

def normalize_word(word: str) -> str:
    return re.sub(r"[^A-Za-z0-9']+", "", word).lower()

def split_keywords(s: str) -> List[str]:
    return [normalize_word(x) for x in re.split(r"[;,|]", s or "") if normalize_word(x)]

def bionic_split(word: str) -> Tuple[str, str]:
    """
    Conservative partial-word anchor.
    - Short words remain fully emphasized.
    - Longer words use the first ~45% of characters, with bounds.
    """
    clean_len = len(re.sub(r"[^A-Za-z0-9]", "", word))
    if clean_len <= 4:
        return word, ""
    n = max(3, min(6, round(clean_len * 0.45)))
    return word[:n], word[n:]

def html_bold(text: str) -> str:
    return f"<b>{html.escape(text)}</b>"

def ass_bold(text: str) -> str:
    return r"{\b1}" + text + r"{\b0}"

def format_words(text: str, keywords: List[str], mode: str = "html", heavy: bool = False) -> str:
    """
    Formats text using:
      - full bold for operator words
      - partial bold for concept keywords
      - optional heavy bionic formatting for control condition
    """
    out = []
    for token in re.findall(r"\w+|[^\w\s]+|\s+", text, flags=re.UNICODE):
        if token.isspace() or re.match(r"[^\w\s]+$", token):
            out.append(html.escape(token) if mode == "html" else token)
            continue

        norm = normalize_word(token)
        is_operator = norm in OPERATORS
        is_keyword = norm in keywords
        is_heavy = heavy and norm not in STOPWORDS and len(norm) > 3

        if mode == "html":
            if is_operator:
                out.append(html_bold(token))
            elif is_keyword or is_heavy:
                a,b = bionic_split(token)
                out.append(html_bold(a) + html.escape(b))
            else:
                out.append(html.escape(token))
        elif mode == "ass":
            if is_operator:
                out.append(ass_bold(token))
            elif is_keyword or is_heavy:
                a,b = bionic_split(token)
                out.append(ass_bold(a) + b)
            else:
                out.append(token)
        else:
            out.append(token)
    return "".join(out)

def keyword_highlight(text: str, keywords: List[str], mode: str = "html") -> str:
    out = []
    for token in re.findall(r"\w+|[^\w\s]+|\s+", text, flags=re.UNICODE):
        if token.isspace() or re.match(r"[^\w\s]+$", token):
            out.append(html.escape(token) if mode == "html" else token)
            continue
        norm = normalize_word(token)
        if norm in keywords:
            out.append(html_bold(token) if mode == "html" else ass_bold(token))
        else:
            out.append(html.escape(token) if mode == "html" else token)
    return "".join(out)

def variant_text(beat: Beat, variant: str, mode: str = "html") -> str:
    keywords = split_keywords(beat.keywords)
    if variant == "full_transcript":
        return html.escape(beat.spoken_text) if mode == "html" else beat.spoken_text
    if variant == "keyword_highlight":
        return keyword_highlight(beat.spoken_text, keywords, mode=mode)
    if variant == "semantic_compression":
        return html.escape(beat.semantic_caption) if mode == "html" else beat.semantic_caption
    if variant == "bcc":
        return format_words(beat.semantic_caption, keywords, mode=mode, heavy=False)
    if variant == "bcc_plus":
        return format_words(beat.semantic_caption, keywords, mode=mode, heavy=False)
    if variant == "heavy_bionic":
        source = beat.spoken_text
        return format_words(source, keywords, mode=mode, heavy=True)
    raise ValueError(f"Unknown variant: {variant}")

def timestamp_srt(t: str) -> str:
    # expects HH:MM:SS.mmm
    return t.replace(".", ",")

def timestamp_ass(t: str) -> str:
    # ASS format H:MM:SS.cc
    h, m, rest = t.split(":")
    sec, ms = rest.split(".")
    cs = int(round(int(ms) / 10))
    return f"{int(h)}:{m}:{sec}.{cs:02d}"

def read_beats(path: Path) -> List[Beat]:
    beats = []
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            beats.append(Beat(
                video_id=row["video_id"],
                beat_id=row.get("beat_id",""),
                start=row["start"],
                end=row["end"],
                spoken_text=row["spoken_text"],
                semantic_caption=row["semantic_caption"],
                role=row.get("role",""),
                keywords=row.get("keywords",""),
                category=row.get("category",""),
                placement_zone=row.get("placement_zone","center_upper"),
                visual_load=row.get("visual_load","medium"),
            ))
    return beats

def write_srt(beats: List[Beat], out: Path, variant: str) -> None:
    lines = []
    for idx, beat in enumerate(beats, 1):
        text = variant_text(beat, variant, mode="html")
        lines.extend([
            str(idx),
            f"{timestamp_srt(beat.start)} --> {timestamp_srt(beat.end)}",
            text,
            ""
        ])
    out.write_text("\n".join(lines), encoding="utf-8")

def write_vtt(beats: List[Beat], out: Path, variant: str) -> None:
    lines = ["WEBVTT", ""]
    for idx, beat in enumerate(beats, 1):
        text = variant_text(beat, variant, mode="html")
        lines.extend([
            f"NOTE role={beat.role}; placement={beat.placement_zone}; visual_load={beat.visual_load}",
            f"{beat.start} --> {beat.end}",
            text,
            ""
        ])
    out.write_text("\n".join(lines), encoding="utf-8")

def ass_alignment(placement: str) -> str:
    # ASS alignment values: 1-9 numpad layout. 8=top center, 5=center, 4=mid-left, 6=mid-right.
    return {
        "center_upper": "8",
        "center": "5",
        "left_mid": "4",
        "right_mid": "6",
        "lower_center": "2",
    }.get(placement, "8")

def write_ass(beats: List[Beat], out: Path, variant: str) -> None:
    header = r"""[Script Info]
Title: BCC Overlay Prototype
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: BCC,Arial,72,&H00FFFFFF,&H00FFFFFF,&H00111111,&H66000000,0,0,0,0,100,100,0,0,1,4,1,8,80,80,180,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines = [header]
    for beat in beats:
        text = variant_text(beat, variant, mode="ass").replace("\n", r"\N")
        # Override alignment per beat.
        text = r"{\an" + ass_alignment(beat.placement_zone) + r"}" + text
        lines.append(f"Dialogue: 0,{timestamp_ass(beat.start)},{timestamp_ass(beat.end)},BCC,,0,0,0,,{text}")
    out.write_text("\n".join(lines), encoding="utf-8")

def write_plan(beats: List[Beat], out: Path, variant: str) -> None:
    plan = []
    for beat in beats:
        plan.append({
            **asdict(beat),
            "variant": variant,
            "overlay_text_html": variant_text(beat, variant, mode="html"),
            "overlay_text_plain": re.sub(r"<[^>]+>", "", variant_text(beat, variant, mode="html")),
            "operator_anchor_policy": "full-bold operators",
            "concept_anchor_policy": "partial-bold selected concept words" if variant in {"bcc","bcc_plus"} else "",
            "placement_policy": "gaze-safe placement from beat_sheet" if variant == "bcc_plus" else "static/default",
        })
    out.write_text(json.dumps(plan, indent=2, ensure_ascii=False), encoding="utf-8")

def write_editor_csv(beats: List[Beat], out: Path, variant: str) -> None:
    fields = ["video_id","beat_id","start","end","variant","plain_text","html_text","role","keywords","placement_zone","visual_load"]
    with out.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        for beat in beats:
            html_text = variant_text(beat, variant, mode="html")
            writer.writerow({
                "video_id": beat.video_id,
                "beat_id": beat.beat_id,
                "start": beat.start,
                "end": beat.end,
                "variant": variant,
                "plain_text": re.sub(r"<[^>]+>", "", html_text),
                "html_text": html_text,
                "role": beat.role,
                "keywords": beat.keywords,
                "placement_zone": beat.placement_zone,
                "visual_load": beat.visual_load,
            })

def group_by_video(beats: Iterable[Beat]) -> Dict[str, List[Beat]]:
    grouped: Dict[str, List[Beat]] = {}
    for b in beats:
        grouped.setdefault(b.video_id, []).append(b)
    return grouped

def main() -> None:
    parser = argparse.ArgumentParser(description="Generate BCC/BCC+ overlay subtitle files from a beat sheet.")
    parser.add_argument("--input", default="inputs/sample_beat_sheet.csv", help="Path to beat sheet CSV.")
    parser.add_argument("--outdir", default="outputs", help="Output directory.")
    parser.add_argument("--variants", nargs="*", default=[
        "full_transcript","keyword_highlight","semantic_compression","bcc","bcc_plus","heavy_bionic"
    ])
    args = parser.parse_args()

    input_path = Path(args.input)
    outdir = Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)

    beats = read_beats(input_path)
    grouped = group_by_video(beats)

    for video_id, video_beats in grouped.items():
        video_out = outdir / video_id
        video_out.mkdir(parents=True, exist_ok=True)
        for variant in args.variants:
            write_srt(video_beats, video_out / f"{video_id}_{variant}.srt", variant)
            write_vtt(video_beats, video_out / f"{video_id}_{variant}.vtt", variant)
            write_ass(video_beats, video_out / f"{video_id}_{variant}.ass", variant)
            write_plan(video_beats, video_out / f"{video_id}_{variant}_overlay_plan.json", variant)
            write_editor_csv(video_beats, video_out / f"{video_id}_{variant}_editor.csv", variant)

    print(f"Generated {len(grouped)} video folders in {outdir}")

if __name__ == "__main__":
    main()
