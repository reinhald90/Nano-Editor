
import { ITrackItem } from "@designcombo/types";

/* ============================================================
 * MENU ITEMS
 * ============================================================ */

/**
 * Daftar semua menu yang tersedia di sidebar editor.
 * Urutan array ini menentukan urutan tampilan di UI.
 *
 * @example
 * MENU_ITEMS.map((key) => <SidebarButton key={key} menu={key} />)
 */
export const MENU_ITEMS = [
  "uploads",
  "templates",
  "videos",
  "images",
  "shapes",
  "audios",
  "transitions",
  "texts",
  "captions",
] as const;

export type IMenuItem = (typeof MENU_ITEMS)[number];

/**
 * Grup menu berdasarkan kategori untuk memudahkan rendering
 * sidebar dengan section header.
 */
export const MENU_GROUPS = {
  media: ["uploads", "videos", "images", "audios"],
  design: ["templates", "shapes", "texts"],
  effects: ["transitions", "captions"],
} as const satisfies Record<string, readonly IMenuItem[]>;

export type IMenuGroup = keyof typeof MENU_GROUPS;

/* ============================================================
 * TOOLBOX ITEMS
 * ============================================================ */

/**
 * Daftar tool yang tersedia di toolbox panel.
 * Tool ini aktif hanya saat ada track item yang terpilih.
 */
export const TOOLBOX_ITEMS = [
  "crop",
  "trim",
  "speed",
  "filters",
  "adjust",
  "effects",
] as const;

export type IToolboxItem = (typeof TOOLBOX_ITEMS)[number];

/* ============================================================
 * LAYOUT MODE
 * ============================================================ */

/**
 * Mode tampilan editor:
 * - `edit`: mode default untuk mengedit timeline
 * - `preview`: mode preview tanpa UI editing
 * - `export`: mode export/render
 */
export const LAYOUT_MODES = ["edit", "preview", "export"] as const;

export type LayoutMode = (typeof LAYOUT_MODES)[number];

/* ============================================================
 * SIDEBAR POSITION
 * ============================================================ */

/**
 * Posisi panel sidebar (kiri / kanan).
 * Berguna untuk user preference.
 */
export const SIDEBAR_POSITIONS = ["left", "right"] as const;

export type SidebarPosition = (typeof SIDEBAR_POSITIONS)[number];

/* ============================================================
 * PANEL SIZE
 * ============================================================ */

/**
 * Ukuran panel sidebar. Nilai ini nanti bisa dipetakan
 * ke lebar pixel di komponen.
 */
export const PANEL_SIZES = ["sm", "md", "lg"] as const;

export type PanelSize = (typeof PANEL_SIZES)[number];

/* ============================================================
 * RUNTIME GUARDS
 * ============================================================ */

/**
 * Cek apakah sebuah nilai valid sebagai IMenuItem.
 * Berguna saat parsing URL params, localStorage, atau data eksternal.
 */
export const isMenuItem = (value: unknown): value is IMenuItem =>
  typeof value === "string" &&
  (MENU_ITEMS as readonly string[]).includes(value);

export const isToolboxItem = (value: unknown): value is IToolboxItem =>
  typeof value === "string" &&
  (TOOLBOX_ITEMS as readonly string[]).includes(value);

export const isLayoutMode = (value: unknown): value is LayoutMode =>
  typeof value === "string" &&
  (LAYOUT_MODES as readonly string[]).includes(value);

export const isSidebarPosition = (
  value: unknown,
): value is SidebarPosition =>
  typeof value === "string" &&
  (SIDEBAR_POSITIONS as readonly string[]).includes(value);

export const isPanelSize = (value: unknown): value is PanelSize =>
  typeof value === "string" &&
  (PANEL_SIZES as readonly string[]).includes(value);

/* ============================================================
 * MENU METADATA
 * ============================================================ */

/**
 * Metadata per menu item. Berguna untuk render label,
 * deskripsi, shortcut, dan icon key.
 */
export interface IMenuMeta {
  label: string;
  description: string;
  shortcut?: string;
  icon: string; // nama icon (misal Lucide icon key)
}

export const MENU_META: Record<IMenuItem, IMenuMeta> = {
  uploads: {
    label: "Uploads",
    description: "Upload dan kelola file media kamu",
    shortcut: "U",
    icon: "Upload",
  },
  templates: {
    label: "Templates",
    description: "Template siap pakai untuk project",
    shortcut: "T",
    icon: "Layout",
  },
  videos: {
    label: "Videos",
    description: "Koleksi video dari library",
    shortcut: "V",
    icon: "Video",
  },
  images: {
    label: "Images",
    description: "Koleksi gambar dan stiker",
    shortcut: "I",
    icon: "Image",
  },
  shapes: {
    label: "Shapes",
    description: "Bentuk geometris dan elemen dekoratif",
    shortcut: "S",
    icon: "Shapes",
  },
  audios: {
    label: "Audios",
    description: "Musik dan sound effect",
    shortcut: "A",
    icon: "Music",
  },
  transitions: {
    label: "Transitions",
    description: "Efek transisi antar klip",
    shortcut: "N",
    icon: "Shuffle",
  },
  texts: {
    label: "Texts",
    description: "Teks, judul, dan typography",
    shortcut: "X",
    icon: "Type",
  },
  captions: {
    label: "Captions",
    description: "Subtitle dan auto-caption",
    shortcut: "C",
    icon: "Subtitles",
  },
};

/**
 * Metadata per toolbox item.
 */
export interface IToolboxMeta {
  label: string;
  description: string;
  shortcut?: string;
  icon: string;
}

export const TOOLBOX_META: Record<IToolboxItem, IToolboxMeta> = {
  crop: {
    label: "Crop",
    description: "Potong bagian video atau gambar",
    shortcut: "C",
    icon: "Crop",
  },
  trim: {
    label: "Trim",
    description: "Atur durasi awal dan akhir klip",
    shortcut: "R",
    icon: "Scissors",
  },
  speed: {
    label: "Speed",
    description: "Atur kecepatan playback",
    shortcut: "P",
    icon: "Gauge",
  },
  filters: {
    label: "Filters",
    description: "Filter warna dan efek visual",
    shortcut: "F",
    icon: "Sparkles",
  },
  adjust: {
    label: "Adjust",
    description: "Atur brightness, contrast, saturation",
    shortcut: "D",
    icon: "Sliders",
  },
  effects: {
    label: "Effects",
    description: "Efek animasi dan motion",
    shortcut: "E",
    icon: "Wand2",
  },
};

/* ============================================================
 * LAYOUT STATE
 * ============================================================ */

/**
 * State lengkap untuk layout editor.
 * Semua field di sini opsional untuk di-persist kecuali
 * cropTarget (karena bergantung pada ITrackItem).
 */
export interface ILayoutState {
  /** Item yang sedang dalam mode crop, null jika tidak ada */
  cropTarget: ITrackItem | null;

  /** Menu panel yang sedang aktif di sidebar */
  activeMenuItem: IMenuItem | null;

  /** Kontrol visibilitas tiap panel */
  showMenuItem: boolean;
  showControlItem: boolean;
  showToolboxItem: boolean;

  /** Toolbox tool yang sedang aktif */
  activeToolboxItem: IToolboxItem | null;

  /** Mode layout saat ini */
  mode: LayoutMode;

  /** Posisi sidebar */
  sidebarPosition: SidebarPosition;

  /** Ukuran panel sidebar */
  panelSize: PanelSize;

  /** Status apakah sidebar sedang collapsed */
  isSidebarCollapsed: boolean;

  /** Status apakah timeline sedang di-expand fullscreen */
  isTimelineExpanded: boolean;
}

/* ============================================================
 * LAYOUT ACTIONS
 * ============================================================ */

/**
 * Semua action yang bisa dilakukan terhadap layout state.
 */
export interface ILayoutActions {
  /* ---------- Setters ---------- */
  setCropTarget: (target: ITrackItem | null) => void;
  setActiveMenuItem: (menu: IMenuItem | null) => void;
  setShowMenuItem: (show: boolean) => void;
  setShowControlItem: (show: boolean) => void;
  setShowToolboxItem: (show: boolean) => void;
  setActiveToolboxItem: (item: IToolboxItem | null) => void;
  setMode: (mode: LayoutMode) => void;
  setSidebarPosition: (position: SidebarPosition) => void;
  setPanelSize: (size: PanelSize) => void;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  setIsTimelineExpanded: (expanded: boolean) => void;

  /* ---------- Toggle Helpers ---------- */
  toggleMenuItem: () => void;
  toggleControlItem: () => void;
  toggleToolboxItem: () => void;
  toggleSidebarCollapsed: () => void;
  toggleTimelineExpanded: () => void;
  toggleMode: () => void;

  /* ---------- Shortcut Helpers ---------- */
  toggleMenu: (menu: IMenuItem) => void;
  toggleToolbox: (item: IToolboxItem) => void;

  /* ---------- Reset ---------- */
  resetLayout: () => void;
  resetPanels: () => void;
}

export type ILayoutStore = ILayoutState & ILayoutActions;

/* ============================================================
 * DEFAULT STATE
 * ============================================================ */

export const DEFAULT_LAYOUT_STATE: ILayoutState = {
  cropTarget: null,
  activeMenuItem: "uploads",
  showMenuItem: true,
  showControlItem: true,
  showToolboxItem: false,
  activeToolboxItem: null,
  mode: "edit",
  sidebarPosition: "left",
  panelSize: "md",
  isSidebarCollapsed: false,
  isTimelineExpanded: false,
};

/* ============================================================
 * PANEL SIZE MAP
 * ============================================================ */

/**
 * Mapping ukuran panel ke lebar pixel.
 * Pakai ini di komponen untuk konsistensi.
 */
export const PANEL_WIDTH_MAP: Record<PanelSize, string> = {
  sm: "220px",
  md: "280px",
  lg: "340px",
};

/* ============================================================
 * SELECTOR HELPERS
 * ============================================================ */

/**
 * Helper untuk memilih state tertentu dari store.
 * Berguna untuk menghindari re-render berlebihan.
 *
 * @example
 * const activeMenu = useLayoutStore(selectActiveMenuItem);
 */
export const selectActiveMenuItem = (state: ILayoutStore) =>
  state.activeMenuItem;

export const selectActiveToolboxItem = (state: ILayoutStore) =>
  state.activeToolboxItem;

export const selectCropTarget = (state: ILayoutStore) => state.cropTarget;

export const selectMode = (state: ILayoutStore) => state.mode;

export const selectShowMenuItem = (state: ILayoutStore) =>
  state.showMenuItem;

export const selectPanelWidth = (state: ILayoutStore) =>
  PANEL_WIDTH_MAP[state.panelSize];

export const selectIsToolboxVisible = (state: ILayoutStore) =>
  state.showToolboxItem && state.activeToolboxItem !== null;

export const selectIsSidebarVisible = (state: ILayoutStore) =>
  state.showMenuItem && !state.isSidebarCollapsed;

/* ============================================================
 * UTILITY FUNCTIONS
 * ============================================================ */

/**
 * Cek apakah sebuah menu item termasuk dalam grup tertentu.
 */
export const isMenuInGroup = (
  menu: IMenuItem,
  group: IMenuGroup,
): boolean => (MENU_GROUPS[group] as readonly IMenuItem[]).includes(menu);

/**
 * Ambil semua menu item dalam grup tertentu.
 */
export const getMenusByGroup = (group: IMenuGroup): readonly IMenuItem[] =>
  MENU_GROUPS[group];

/**
 * Ambil label dari menu item (dari metadata).
 */
export const getMenuLabel = (menu: IMenuItem): string =>
  MENU_META[menu].label;

/**
 * Ambil label dari toolbox item (dari metadata).
 */
export const getToolboxLabel = (item: IToolboxItem): string =>
  TOOLBOX_META[item].label;

/**
 * Cari menu item berdasarkan shortcut.
 */
export const findMenuByShortcut = (
  shortcut: string,
): IMenuItem | undefined =>
  MENU_ITEMS.find(
    (key) =>
      MENU_META[key].shortcut?.toLowerCase() === shortcut.toLowerCase(),
  );

/**
 * Cari toolbox item berdasarkan shortcut.
 */
export const findToolboxByShortcut = (
  shortcut: string,
): IToolboxItem | undefined =>
  TOOLBOX_ITEMS.find(
    (key) =>
      TOOLBOX_META[key].shortcut?.toLowerCase() === shortcut.toLowerCase(),
  );

/**
 * Buat initial layout state dengan override parsial.
 */
export const createLayoutState = (
  overrides: Partial<ILayoutState> = {},
): ILayoutState => ({
  ...DEFAULT_LAYOUT_STATE,
  ...overrides,
});

/**
 * Persist keys — daftar field yang sebaiknya disimpan ke localStorage.
 * Field seperti cropTarget tidak dipersist karena transient.
 */
export const PERSIST_KEYS: (keyof ILayoutState)[] = [
  "activeMenuItem",
  "sidebarPosition",
  "panelSize",
  "isSidebarCollapsed",
  "mode",
];
