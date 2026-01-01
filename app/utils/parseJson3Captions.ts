import type { CaptionSegment } from "../types/index.js";

export function parseJson3Captions(json: any): CaptionSegment[] {
  if (!json || !Array.isArray(json.events)) return [];

  const segments: CaptionSegment[] = [];

  for (const event of json.events) {
    if (!event.segs || !Array.isArray(event.segs)) continue;

    const text = event.segs
      .map((seg: any) => seg.utf8 || "")
      .join("")
      .replace(/\n/g, " ")
      .trim();

    if (!text) continue;

    const start = (event.tStartMs ?? 0) / 1000;
    const duration = (event.dDurationMs ?? 0) / 1000;

    segments.push({
      text,
      start,
      end: start + duration,
    });
  }

  return segments;
}
