// src/store/captions.ts

/* ============================================================
 * TIME
 * ============================================================ */

/**
 * Waktu dalam detik (float). Branded agar tidak ketuker dengan
 * timestamp dalam ms.
 */
declare const __brand: unique symbol;
type Brand<T, B> = T & { readonly [__brand]: B };

export type Seconds = Brand<number, "Seconds">;
export type Milliseconds = Brand<number, "Milliseconds">;

export const asSeconds = (v: number): Seconds => v as Seconds;
export const asMilliseconds = (v: number): Milliseconds => v as Milliseconds;

/**
 * Konversi antar unit waktu.
 */
export const secToMs = (s: Seconds): Milliseconds =>
  asMilliseconds(s * 1000);

export const msToSec = (ms: Milliseconds): Seconds =>
  asSeconds(ms / 1000);

/* ============================================================
 * TIME RANGE
 * ============================================================ */

/**
 * Representasi rentang waktu [start, end] dalam detik.
 * Dipakai di segment & word.
 */
export interface TimeRange {
  readonly start: Seconds;
  readonly end: Seconds;
}

/**
 * Cek validitas range (end > start, keduanya finite & non-negative).
 */
export const isValidTimeRange = (range: TimeRange): boolean =>
  Number.isFinite(range.start) &&
  Number.isFinite(range.end) &&
  range.start >= 0 &&
  range.end > range.start;

/**
 * Durasi dari sebuah range (dalam detik).
 */
export const getRangeDuration = (range: TimeRange): Seconds =>
  asSeconds(range.end - range.start);

/**
 * Cek apakah dua range overlap.
 */
export const isRangeOverlapping = (a: TimeRange, b: TimeRange): boolean =>
  a.start < b.end && b.start < a.end;

/**
 * Cek apakah sebuah titik waktu berada di dalam range.
 */
export const isTimeInRange = (time: Seconds, range: TimeRange): boolean =>
  time >= range.start && time <= range.end;

/**
 * Cari range yang mengandung waktu tertentu dari daftar.
 */
export const findRangeAt = <T extends TimeRange>(
  ranges: readonly T[],
  time: Seconds,
): T | undefined => ranges.find((r) => isTimeInRange(time, r));

/* ============================================================
 * WORD
 * ============================================================ */

/**
 * Satu kata di dalam caption segment.
 * Setiap kata punya timestamp sendiri untuk fitur karaoke-style
 * highlighting.
 */
export interface Word {
  readonly start: Seconds;
  readonly end: Seconds;
  readonly word: string;
  readonly confidence?: number;
  readonly speaker?: string;
}

/* ============================================================
 * CAPTIONS SEGMENT
 * ============================================================ */

/**
 * Satu baris/segmen caption, biasanya satu kalimat atau frasa.
 */
export interface CaptionsSegment {
  readonly start: Seconds;
  readonly end: Seconds;
  readonly text: string;
  readonly words: readonly Word[];
  readonly id?: string;
  readonly speaker?: string;
  readonly language?: string;
  readonly confidence?: number;
}

/* ============================================================
 * CAPTIONS DATA
 * ============================================================ */

/**
 * Keseluruhan data caption untuk satu project/media.
 */
export interface CaptionsData {
  readonly segments: readonly CaptionsSegment[];
  readonly language?: string;
  readonly duration?: Seconds;
  readonly source?: CaptionSource;
  readonly version?: number;
}

/* ============================================================
 * SOURCE
 * ============================================================ */

export const CAPTION_SOURCES = [
  "manual",
  "auto",
  "imported-srt",
  "imported-vtt",
  "imported-json",
  "api",
] as const;

export type CaptionSource = (typeof CAPTION_SOURCES)[number];

export const isCaptionSource = (v: unknown): v is CaptionSource =>
  typeof v === "string" &&
  (CAPTION_SOURCES as readonly string[]).includes(v);

/* ============================================================
 * RUNTIME GUARDS
 * ============================================================ */

const isFiniteNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

export const isWord = (value: unknown): value is Word => {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    isFiniteNumber(v.start) &&
    isFiniteNumber(v.end) &&
    typeof v.word === "string"
  );
};

export const isCaptionsSegment = (
  value: unknown,
): value is CaptionsSegment => {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    isFiniteNumber(v.start) &&
    isFiniteNumber(v.end) &&
    typeof v.text === "string" &&
    Array.isArray(v.words) &&
    v.words.every(isWord)
  );
};

export const isCaptionsData = (value: unknown): value is CaptionsData => {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v.segments) && v.segments.every(isCaptionsSegment)
  );
};

/* ============================================================
 * HELPERS — SEGMENT
 * ============================================================ */

/**
 * Bangun word dari teks sederhana dengan distribusi waktu merata.
 * Berguna untuk import teks manual tanpa timestamp per kata.
 */
export const buildWordsFromText = (
  text: string,
  range: TimeRange,
): Word[] => {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  const duration = getRangeDuration(range);
  const perWord = duration / tokens.length;

  return tokens.map((word, i) => ({
    word,
    start: asSeconds(range.start + perWord * i),
    end: asSeconds(range.start + perWord * (i + 1)),
  }));
};

/**
 * Bangun segment dari teks, otomatis generate words.
 */
export const createSegment = (
  text: string,
  range: TimeRange,
  overrides: Partial<Omit<CaptionsSegment, "text" | "start" | "end" | "words">> = {},
): CaptionsSegment => ({
  text,
  start: range.start,
  end: range.end,
  words: buildWordsFromText(text, range),
  ...overrides,
});

/**
 * Gabungkan kata-kata dalam satu segment menjadi teks.
 * Berguna untuk validasi konsistensi.
 */
export const getSegmentText = (segment: CaptionsSegment): string =>
  segment.words.length > 0
    ? segment.words.map((w) => w.word).join(" ")
    : segment.text;

/**
 * Durasi segment.
 */
export const getSegmentDuration = (segment: CaptionsSegment): Seconds =>
  asSeconds(segment.end - segment.start);

/**
 * Cari word yang aktif di waktu tertentu dalam satu segment.
 */
export const findWordAt = (
  segment: CaptionsSegment,
  time: Seconds,
): Word | undefined =>
  segment.words.find((w) => isTimeInRange(time, w));

/**
 * Cek apakah segment punya timestamp per-word yang valid.
 */
export const hasWordTimestamps = (segment: CaptionsSegment): boolean =>
  segment.words.length > 0 && segment.words.every(isWord);

/* ============================================================
 * HELPERS — CAPTIONS DATA
 * ============================================================ */

/**
 * Urutkan segment berdasarkan start time.
 * Non-mutating — return array baru.
 */
export const sortSegments = (
  segments: readonly CaptionsSegment[],
): CaptionsSegment[] =>
  [...segments].sort((a, b) => a.start - b.start);

/**
 * Cari segment yang aktif di waktu tertentu.
 * Karena segment terurut, bisa pakai binary search di masa depan.
 */
export const findSegmentAt = (
  captions: CaptionsData,
  time: Seconds,
): CaptionsSegment | undefined =>
  captions.segments.find((s) => isTimeInRange(time, s));

/**
 * Cari word aktif di seluruh captions (untuk karaoke highlight).
 * Return object lengkap: segment + word + index.
 */
export interface ActiveWordResult {
  readonly segment: CaptionsSegment;
  readonly segmentIndex: number;
  readonly word: Word;
  readonly wordIndex: number;
}

export const findActiveWord = (
  captions: CaptionsData,
  time: Seconds,
): ActiveWordResult | undefined => {
  for (let i = 0; i < captions.segments.length; i++) {
    const seg = captions.segments[i];
    if (!isTimeInRange(time, seg)) continue;
    const wi = seg.words.findIndex((w) => isTimeInRange(time, w));
    if (wi !== -1) {
      return { segment: seg, segmentIndex: i, word: seg.words[wi], wordIndex: wi };
    }
  }
  return undefined;
};

/**
 * Hitung durasi total caption (dari segment terakhir).
 */
export const getCaptionsDuration = (captions: CaptionsData): Seconds => {
  if (captions.segments.length === 0) return asSeconds(0);
  const last = captions.segments.reduce(
    (max, s) => (s.end > max ? s.end : max),
    0,
  );
  return asSeconds(last);
};

/**
 * Hitung jumlah total kata di seluruh caption.
 */
export const countWords = (captions: CaptionsData): number =>
  captions.segments.reduce((sum, s) => sum + s.words.length, 0);

/**
 * Hitung Words Per Minute (WPM).
 */
export const computeWPM = (captions: CaptionsData): number => {
  const duration = getCaptionsDuration(captions);
  if (duration === 0) return 0;
  return (countWords(captions) / duration) * 60;
};

/**
 * Gabung semua segment jadi satu teks.
 */
export const getFullText = (captions: CaptionsData): string =>
  captions.segments.map((s) => s.text).join(" ");

/**
 * Validasi konsistensi: start < end untuk semua segment & word,
 * tidak ada overlap antar segment (opsional).
 */
export interface CaptionsValidationError {
  readonly type:
    | "invalid-range"
    | "overlapping-segments"
    | "empty-segment"
    | "word-out-of-bounds";
  readonly segmentIndex: number;
  readonly wordIndex?: number;
  readonly message: string;
}

export const validateCaptions = (
  captions: CaptionsData,
): CaptionsValidationError[] => {
  const errors: CaptionsValidationError[] = [];
  const sorted = sortSegments(captions.segments);

  for (let i = 0; i < sorted.length; i++) {
    const seg = sorted[i];

    if (!isValidTimeRange({ start: seg.start, end: seg.end })) {
      errors.push({
        type: "invalid-range",
        segmentIndex: i,
        message: `Segment ${i} punya range tidak valid (${seg.start} → ${seg.end})`,
      });
    }

    if (!seg.text.trim() && seg.words.length === 0) {
      errors.push({
        type: "empty-segment",
        segmentIndex: i,
        message: `Segment ${i} kosong (tidak ada teks atau kata)`,
      });
    }

    for (let wi = 0; wi < seg.words.length; wi++) {
      const w = seg.words[wi];
      if (w.start < seg.start || w.end > seg.end) {
        errors.push({
          type: "word-out-of-bounds",
          segmentIndex: i,
          wordIndex: wi,
          message: `Word "${w.word}" keluar dari range segment`,
        });
      }
    }

    const next = sorted[i + 1];
    if (next && isRangeOverlapping(seg, next)) {
      errors.push({
        type: "overlapping-segments",
        segmentIndex: i,
        message: `Segment ${i} overlap dengan segment ${i + 1}`,
      });
    }
  }

  return errors;
};

/* ============================================================
 * FORMATTING
 * ============================================================ */

/**
 * Format waktu ke SRT timestamp: HH:MM:SS,mmm
 */
export const formatSrtTime = (seconds: Seconds): string => {
  const total = Math.max(0, seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  const ms = Math.round((total - Math.floor(total)) * 1000);
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
};

/**
 * Format waktu ke VTT timestamp: HH:MM:SS.mmm
 */
export const formatVttTime = (seconds: Seconds): string => {
  const total = Math.max(0, seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  const ms = Math.round((total - Math.floor(total)) * 1000);
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(ms, 3)}`;
};

/**
 * Format waktu ke display manusia: MM:SS atau HH:MM:SS
 */
export const formatDisplayTime = (seconds: Seconds): string => {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

/* ============================================================
 * EXPORT / IMPORT
 * ============================================================ */

/**
 * Export captions ke format SRT.
 */
export const toSRT = (captions: CaptionsData): string =>
  sortSegments(captions.segments)
    .map((seg, i) => {
      const lines = [
        String(i + 1),
        `${formatSrtTime(seg.start)} --> ${formatSrtTime(seg.end)}`,
        seg.text.trim(),
      ];
      return lines.join("\n");
    })
    .join("\n\n");

/**
 * Export captions ke format WebVTT.
 */
export const toVTT = (captions: CaptionsData): string => {
  const header = "WEBVTT\n";
  const body = sortSegments(captions.segments)
    .map((seg) =>
      [
        `${formatVttTime(seg.start)} --> ${formatVttTime(seg.end)}`,
        seg.text.trim(),
      ].join("\n"),
    )
    .join("\n\n");
  return `${header}\n${body}`;
};

/**
 * Export captions ke plain text.
 */
export const toPlainText = (captions: CaptionsData): string =>
  getFullText(captions);

/* ============================================================
 * BUILDER
 * ============================================================ */

/**
 * Factory untuk bikin CaptionsData kosong.
 */
export const createEmptyCaptions = (
  overrides: Partial<CaptionsData> = {},
): CaptionsData => ({
  segments: [],
  source: "manual",
  version: 1,
  ...overrides,
});

/**
 * Factory untuk bikin Word dengan validasi basic.
 */
export const createWord = (
  word: string,
  range: TimeRange,
  overrides: Partial<Omit<Word, "word" | "start" | "end">> = {},
): Word => ({
  word,
  start: range.start,
  end: range.end,
  ...overrides,
});

/**
 * Factory untuk bikin segment dengan distribusi kata otomatis.
 */
export const createSegmentFromText = createSegment;

/* ============================================================
 * TRANSFORM
 * ============================================================ */

/**
 * Geser semua timestamp dengan offset tertentu (dalam detik).
 */
export const shiftCaptions = (
  captions: CaptionsData,
  offset: Seconds,
): CaptionsData => ({
  ...captions,
  segments: captions.segments.map((seg) => ({
    ...seg,
    start: asSeconds(seg.start + offset),
    end: asSeconds(seg.end + offset),
    words: seg.words.map((w) => ({
      ...w,
      start: asSeconds(w.start + offset),
      end: asSeconds(w.end + offset),
    })),
  })),
});

/**
 * Scale semua timestamp dengan faktor tertentu.
 * Berguna kalau video di-speed up / slow down.
 */
export const scaleCaptions = (
  captions: CaptionsData,
  factor: number,
): CaptionsData => ({
  ...captions,
  segments: captions.segments.map((seg) => ({
    ...seg,
    start: asSeconds(seg.start * factor),
    end: asSeconds(seg.end * factor),
    words: seg.words.map((w) => ({
      ...w,
      start: asSeconds(w.start * factor),
      end: asSeconds(w.end * factor),
    })),
  })),
});

/**
 * Split satu segment menjadi dua di waktu tertentu.
 * Berguna untuk editing manual.
 */
export const splitSegment = (
  segment: CaptionsSegment,
  at: Seconds,
): [CaptionsSegment, CaptionsSegment] | null => {
  if (at <= segment.start || at >= segment.end) return null;

  const leftWords = segment.words.filter((w) => w.end <= at);
  const rightWords = segment.words.filter((w) => w.start >= at);

  const leftText = leftWords.map((w) => w.word).join(" ");
  const rightText = rightWords.map((w) => w.word).join(" ");

  return [
    { ...segment, end: at, text: leftText, words: leftWords },
    { ...segment, start: at, text: rightText, words: rightWords },
  ];
};

/**
 * Merge dua segment berurutan jika memungkinkan.
 */
export const mergeSegments = (
  a: CaptionsSegment,
  b: CaptionsSegment,
): CaptionsSegment => ({
  ...a,
  end: b.end,
  text: `${a.text} ${b.text}`.trim(),
  words: [...a.words, ...b.words],
});

/* ============================================================
 * CACHE / MEMO
 * ============================================================ */

const textCache = new WeakMap<CaptionsData, string>();

/**
 * Ambil full text dengan cache.
 */
export const getFullTextCached = (captions: CaptionsData): string => {
  const cached = textCache.get(captions);
  if (cached) return cached;
  const text = getFullText(captions);
  textCache.set(captions, text);
  return text;
};
