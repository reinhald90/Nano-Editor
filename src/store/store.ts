// src/store/store.ts
import CanvasTimeline from "@designcombo/timeline";
import {
  ITimelineScaleState,
  ITimelineScrollState,
  ITrack,
  ITrackItem,
  ITransition,
} from "@designcombo/types";
import { PlayerRef } from "@remotion/player";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

/* ============================================================
 * BRANDED TYPES
 * ============================================================ */

declare const __brand: unique symbol;
type Brand<T, B> = T & { readonly [__brand]: B };

export type TrackId = Brand<string, "TrackId">;
export type TrackItemId = Brand<string, "TrackItemId">;
export type TransitionId = Brand<string, "TransitionId">;

export const asTrackId = (v: string): TrackId => v as TrackId;
export const asTrackItemId = (v: string): TrackItemId => v as TrackItemId;
export const asTransitionId = (v: string): TransitionId => v as TransitionId;

/* ============================================================
 * TYPES
 * ============================================================ */

/**
 * Detail tambahan per track item. Bisa diperluas sesuai kebutuhan.
 */
export interface ITrackItemDetails {
  readonly [key: string]: unknown;
}

export type TrackItemsMap = Record<string, ITrackItem>;
export type TrackItemDetailsMap = Record<string, ITrackItemDetails>;
export type TransitionsMap = Record<string, ITransition>;

/**
 * Nilai default untuk scale timeline.
 */
export const DEFAULT_SCALE: ITimelineScaleState = {
  unit: 300,
  zoom: 1 / 240,
  segments: 5,
} as ITimelineScaleState;

export const DEFAULT_SCROLL: ITimelineScrollState = {
  left: 0,
  top: 0,
} as ITimelineScrollState;

export const DEFAULT_FPS = 30;
export const DEFAULT_DURATION_MS = 5000;

/* ============================================================
 * STATE
 * ============================================================ */

export interface ITimelineState {
  /** Durasi total timeline dalam ms */
  duration: number;
  /** Frame per second */
  fps: number;
  /** Zoom & scale timeline */
  scale: ITimelineScaleState;
  /** Posisi scroll timeline */
  scroll: ITimelineScrollState;

  /** Daftar track */
  tracks: ITrack[];
  /** Daftar ID track item (urutan penting untuk rendering) */
  trackItemIds: TrackItemId[];
  /** Daftar ID transition */
  transitionIds: TransitionId[];
  /** Map transition by id */
  transitionsMap: TransitionsMap;
  /** Map track item by id */
  trackItemsMap: TrackItemsMap;
  /** Map detail tambahan per track item */
  trackItemDetailsMap: TrackItemDetailsMap;
  /** ID item yang sedang aktif / terpilih */
  activeIds: TrackItemId[];

  /** Instance CanvasTimeline */
  timeline: CanvasTimeline | null;
  /** Ref ke Remotion Player */
  playerRef: React.RefObject<PlayerRef> | null;
}

/* ============================================================
 * ACTIONS
 * ============================================================ */

export interface ITimelineActions {
  /* ---------- Instance ---------- */
  setTimeline: (timeline: CanvasTimeline | null) => void;
  setPlayerRef: (ref: React.RefObject<PlayerRef> | null) => void;

  /* ---------- Viewport ---------- */
  setScale: (scale: ITimelineScaleState) => void;
  setScroll: (scroll: ITimelineScrollState) => void;

  /* ---------- Meta ---------- */
  setDuration: (duration: number) => void;
  setFps: (fps: number) => void;

  /* ---------- Tracks ---------- */
  setTracks: (tracks: ITrack[]) => void;
  addTrack: (track: ITrack) => void;
  removeTrack: (trackId: string) => void;
  updateTrack: (trackId: string, patch: Partial<ITrack>) => void;

  /* ---------- Track Items ---------- */
  setTrackItemIds: (ids: TrackItemId[]) => void;
  setTrackItemsMap: (map: TrackItemsMap) => void;
  addTrackItem: (item: ITrackItem) => void;
  removeTrackItem: (id: TrackItemId) => void;
  updateTrackItem: (id: TrackItemId, patch: Partial<ITrackItem>) => void;

  /* ---------- Track Item Details ---------- */
  setTrackItemDetailsMap: (map: TrackItemDetailsMap) => void;
  setTrackItemDetail: (id: TrackItemId, details: ITrackItemDetails) => void;
  removeTrackItemDetail: (id: TrackItemId) => void;

  /* ---------- Transitions ---------- */
  setTransitionIds: (ids: TransitionId[]) => void;
  setTransitionsMap: (map: TransitionsMap) => void;
  addTransition: (transition: ITransition) => void;
  removeTransition: (id: TransitionId) => void;

  /* ---------- Selection ---------- */
  setActiveIds: (ids: TrackItemId[]) => void;
  addActiveId: (id: TrackItemId) => void;
  removeActiveId: (id: TrackItemId) => void;
  clearActiveIds: () => void;
  toggleActiveId: (id: TrackItemId) => void;

  /* ---------- Bulk / Patch ---------- */
  /**
   * Update banyak field sekaligus. Lebih type-safe daripada
   * `setState(state: any)`.
   */
  patch: (partial: Partial<ITimelineState>) => void;

  /** Reset semua state ke default */
  reset: () => void;

  /**
   * Load project lengkap sekaligus (biasanya dari API).
   * Menggantikan `setState` yang pakai `any`.
   */
  loadProject: (project: IProjectSnapshot) => void;
}

export type ITimelineStore = ITimelineState & ITimelineActions;

/* ============================================================
 * PROJECT SNAPSHOT
 * ============================================================ */

/**
 * Snapshot lengkap project yang biasanya di-load dari API
 * atau di-export sebagai file.
 */
export interface IProjectSnapshot {
  duration?: number;
  fps?: number;
  scale?: ITimelineScaleState;
  scroll?: ITimelineScrollState;
  tracks?: ITrack[];
  trackItemIds?: TrackItemId[];
  transitionIds?: TransitionId[];
  transitionsMap?: TransitionsMap;
  trackItemsMap?: TrackItemsMap;
  trackItemDetailsMap?: TrackItemDetailsMap;
  activeIds?: TrackItemId[];
}

/* ============================================================
 * DEFAULT STATE
 * ============================================================ */

export const DEFAULT_STATE: ITimelineState = {
  duration: DEFAULT_DURATION_MS,
  fps: DEFAULT_FPS,
  scale: DEFAULT_SCALE,
  scroll: DEFAULT_SCROLL,
  tracks: [],
  trackItemIds: [],
  transitionIds: [],
  transitionsMap: {},
  trackItemsMap: {},
  trackItemDetailsMap: {},
  activeIds: [],
  timeline: null,
  playerRef: null,
};

/* ============================================================
 * HELPERS
 * ============================================================ */

/**
 * Update item di dalam map (immutably).
 */
const updateMap = <T>(
  map: Record<string, T>,
  id: string,
  patch: Partial<T>,
): Record<string, T> => {
  const current = map[id];
  if (!current) return map;
  return { ...map, [id]: { ...current, ...patch } };
};

/**
 * Hapus item dari map (immutably).
 */
const removeFromMap = <T>(
  map: Record<string, T>,
  id: string,
): Record<string, T> => {
  if (!(id in map)) return map;
  const next = { ...map };
  delete next[id];
  return next;
};

/**
 * Dedup array.
 */
const dedup = <T>(arr: T[]): T[] => Array.from(new Set(arr));

/* ============================================================
 * STORE
 * ============================================================ */

export const useTimelineStore = create<ITimelineStore>()(
  subscribeWithSelector((set, get) => ({
    ...DEFAULT_STATE,

    /* ---------- Instance ---------- */
    setTimeline: (timeline) => set({ timeline }),
    setPlayerRef: (playerRef) => set({ playerRef }),

    /* ---------- Viewport ---------- */
    setScale: (scale) => set({ scale }),
    setScroll: (scroll) => set({ scroll }),

    /* ---------- Meta ---------- */
    setDuration: (duration) => set({ duration }),
    setFps: (fps) => set({ fps }),

    /* ---------- Tracks ---------- */
    setTracks: (tracks) => set({ tracks }),

    addTrack: (track) =>
      set((s) => ({ tracks: [...s.tracks, track] })),

    removeTrack: (trackId) =>
      set((s) => ({ tracks: s.tracks.filter((t) => t.id !== trackId) })),

    updateTrack: (trackId, patch) =>
      set((s) => ({
        tracks: s.tracks.map((t) =>
          t.id === trackId ? ({ ...t, ...patch } as ITrack) : t,
        ),
      })),

    /* ---------- Track Items ---------- */
    setTrackItemIds: (ids) => set({ trackItemIds: ids }),
    setTrackItemsMap: (map) => set({ trackItemsMap: map }),

    addTrackItem: (item) =>
      set((s) => ({
        trackItemsMap: { ...s.trackItemsMap, [item.id]: item },
        trackItemIds: s.trackItemIds.includes(asTrackItemId(item.id))
          ? s.trackItemIds
          : [...s.trackItemIds, asTrackItemId(item.id)],
      })),

    removeTrackItem: (id) =>
      set((s) => ({
        trackItemsMap: removeFromMap(s.trackItemsMap, id),
        trackItemDetailsMap: removeFromMap(s.trackItemDetailsMap, id),
        trackItemIds: s.trackItemIds.filter((x) => x !== id),
        activeIds: s.activeIds.filter((x) => x !== id),
      })),

    updateTrackItem: (id, patch) =>
      set((s) => ({
        trackItemsMap: updateMap(s.trackItemsMap, id, patch),
      })),

    /* ---------- Track Item Details ---------- */
    setTrackItemDetailsMap: (map) => set({ trackItemDetailsMap: map }),

    setTrackItemDetail: (id, details) =>
      set((s) => ({
        trackItemDetailsMap: { ...s.trackItemDetailsMap, [id]: details },
      })),

    removeTrackItemDetail: (id) =>
      set((s) => ({
        trackItemDetailsMap: removeFromMap(s.trackItemDetailsMap, id),
      })),

    /* ---------- Transitions ---------- */
    setTransitionIds: (ids) => set({ transitionIds: ids }),
    setTransitionsMap: (map) => set({ transitionsMap: map }),

    addTransition: (transition) =>
      set((s) => ({
        transitionsMap: { ...s.transitionsMap, [transition.id]: transition },
        transitionIds: s.transitionIds.includes(
          asTransitionId(transition.id),
        )
          ? s.transitionIds
          : [...s.transitionIds, asTransitionId(transition.id)],
      })),

    removeTransition: (id) =>
      set((s) => ({
        transitionsMap: removeFromMap(s.transitionsMap, id),
        transitionIds: s.transitionIds.filter((x) => x !== id),
      })),

    /* ---------- Selection ---------- */
    setActiveIds: (ids) => set({ activeIds: dedup(ids) }),

    addActiveId: (id) =>
      set((s) => ({
        activeIds: s.activeIds.includes(id)
          ? s.activeIds
          : [...s.activeIds, id],
      })),

    removeActiveId: (id) =>
      set((s) => ({
        activeIds: s.activeIds.filter((x) => x !== id),
      })),

    clearActiveIds: () => set({ activeIds: [] }),

    toggleActiveId: (id) =>
      set((s) => ({
        activeIds: s.activeIds.includes(id)
          ? s.activeIds.filter((x) => x !== id)
          : [...s.activeIds, id],
      })),

    /* ---------- Bulk / Patch ---------- */
    patch: (partial) => set(partial),

    reset: () => set({ ...DEFAULT_STATE, timeline: get().timeline }),

    loadProject: (project) =>
      set({
        duration: project.duration ?? DEFAULT_DURATION_MS,
        fps: project.fps ?? DEFAULT_FPS,
        scale: project.scale ?? DEFAULT_SCALE,
        scroll: project.scroll ?? DEFAULT_SCROLL,
        tracks: project.tracks ?? [],
        trackItemIds: project.trackItemIds ?? [],
        transitionIds: project.transitionIds ?? [],
        transitionsMap: project.transitionsMap ?? {},
        trackItemsMap: project.trackItemsMap ?? {},
        trackItemDetailsMap: project.trackItemDetailsMap ?? {},
        activeIds: project.activeIds ?? [],
      }),
  })),
);

/* ============================================================
 * SELECTORS
 * ============================================================ */

export const selectDuration = (s: ITimelineStore) => s.duration;
export const selectFps = (s: ITimelineStore) => s.fps;
export const selectScale = (s: ITimelineStore) => s.scale;
export const selectScroll = (s: ITimelineStore) => s.scroll;
export const selectTracks = (s: ITimelineStore) => s.tracks;
export const selectTrackItemIds = (s: ITimelineStore) => s.trackItemIds;
export const selectTransitionIds = (s: ITimelineStore) => s.transitionIds;
export const selectTransitionsMap = (s: ITimelineStore) => s.transitionsMap;
export const selectTrackItemsMap = (s: ITimelineStore) => s.trackItemsMap;
export const selectTrackItemDetailsMap = (s: ITimelineStore) =>
  s.trackItemDetailsMap;
export const selectActiveIds = (s: ITimelineStore) => s.activeIds;
export const selectTimeline = (s: ITimelineStore) => s.timeline;
export const selectPlayerRef = (s: ITimelineStore) => s.playerRef;

/**
 * Derived selector: ambil track item by id.
 */
export const selectTrackItemById =
  (id: TrackItemId) =>
  (s: ITimelineStore): ITrackItem | undefined =>
    s.trackItemsMap[id];

/**
 * Derived selector: ambil transition by id.
 */
export const selectTransitionById =
  (id: TransitionId) =>
  (s: ITimelineStore): ITransition | undefined =>
    s.transitionsMap[id];

/**
 * Derived selector: ambil semua track item yang aktif.
 */
export const selectActiveTrackItems = (s: ITimelineStore): ITrackItem[] =>
  s.activeIds
    .map((id) => s.trackItemsMap[id])
    .filter((x): x is ITrackItem => Boolean(x));

/**
 * Derived selector: durasi dalam detik.
 */
export const selectDurationInSeconds = (s: ITimelineStore): number =>
  s.duration / 1000;

/**
 * Derived selector: apakah timeline kosong.
 */
export const selectIsEmpty = (s: ITimelineStore): boolean =>
  s.trackItemIds.length === 0 && s.tracks.length === 0;

/* ============================================================
 * EXPORT DEFAULT
 * ============================================================ */

/**
 * Default export dipertahankan untuk backward compatibility
 * dengan kode yang sudah import `useStore from "./store"`.
 */
export default useTimelineStore;
