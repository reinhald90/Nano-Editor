

/* ============================================================
 * BRANDED TYPES
 * ============================================================ */

/**
 * Branded type untuk ID supaya tidak ketuker antar entitas.
 * Contoh: `UserId` tidak bisa di-assign ke `FileId`.
 */
declare const __brand: unique symbol;
type Brand<T, B> = T & { readonly [__brand]: B };

export type UploadId = Brand<string, "UploadId">;
export type FileId = Brand<string, "FileId">;
export type UserId = Brand<string, "UserId">;
export type FontId = Brand<string, "FontId">;

/**
 * Helper untuk casting string biasa ke branded type.
 * Gunakan hanya di boundary (parsing API response, dll).
 */
export const asUploadId = (v: string): UploadId => v as UploadId;
export const asFileId = (v: string): FileId => v as FileId;
export const asUserId = (v: string): UserId => v as UserId;
export const asFontId = (v: string): FontId => v as FontId;

/* ============================================================
 * RESULT TYPE
 * ============================================================ */

/**
 * Discriminated union untuk hasil operasi yang bisa gagal.
 * Lebih aman daripada throw error di banyak tempat.
 */
export type Result<T, E = Error> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const Ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const Err = <E>(error: E): Result<never, E> => ({ ok: false, error });

/* ============================================================
 * UPLOAD
 * ============================================================ */

export const UPLOAD_KINDS = ["image", "video", "audio", "document"] as const;
export type UploadKind = (typeof UPLOAD_KINDS)[number];

/**
 * Metadata MIME & extension per kind.
 */
export const UPLOAD_KIND_META: Record<
  UploadKind,
  { extensions: readonly string[]; mimes: readonly string[] }
> = {
  image: {
    extensions: ["jpg", "jpeg", "png", "gif", "webp", "svg", "avif"],
    mimes: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"],
  },
  video: {
    extensions: ["mp4", "webm", "mov", "avi", "mkv"],
    mimes: ["video/mp4", "video/webm", "video/quicktime"],
  },
  audio: {
    extensions: ["mp3", "wav", "ogg", "m4a", "aac", "flac"],
    mimes: ["audio/mpeg", "audio/wav", "audio/ogg"],
  },
  document: {
    extensions: ["pdf", "doc", "docx", "txt"],
    mimes: ["application/pdf", "text/plain"],
  },
} as const;

/**
 * Status upload lifecycle.
 */
export const UPLOAD_STATUSES = [
  "idle",
  "uploading",
  "processing",
  "ready",
  "error",
] as const;
export type UploadStatus = (typeof UPLOAD_STATUSES)[number];

/**
 * Upload dengan progress tracking.
 */
export interface IUploadProgress {
  readonly loaded: number;
  readonly total: number;
  readonly percentage: number;
}

/**
 * Interface utama untuk file yang di-upload.
 */
export interface IUpload {
  readonly id: UploadId;
  readonly name: string;
  readonly originalName: string;
  readonly fileId: FileId;
  readonly userId?: UserId;
  readonly previewUrl: string;
  readonly url: string;
  readonly previewData?: string;
  readonly size?: number;
  readonly mimeType?: string;
  readonly kind?: UploadKind;
  readonly status?: UploadStatus;
  readonly progress?: IUploadProgress;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}

/* ============================================================
 * USER
 * ============================================================ */

export const USER_PROVIDERS = ["github", "google", "email"] as const;
export type UserProvider = (typeof USER_PROVIDERS)[number];

export const USER_ROLES = ["owner", "editor", "viewer"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface User {
  readonly id: UserId;
  readonly email: string;
  readonly avatar: string;
  readonly username: string;
  readonly provider: UserProvider;
  readonly role?: UserRole;
  readonly displayName?: string;
  readonly createdAt?: string;
}

/* ============================================================
 * FONTS
 * ============================================================ */

export const FONT_CATEGORIES = [
  "sans-serif",
  "serif",
  "monospace",
  "display",
  "handwriting",
  "decorative",
] as const;
export type FontCategory = (typeof FONT_CATEGORIES)[number];

export const FONT_WEIGHTS = [
  100, 200, 300, 400, 500, 600, 700, 800, 900,
] as const;
export type FontWeight = (typeof FONT_WEIGHTS)[number];

export const FONT_STYLES = ["normal", "italic", "oblique"] as const;
export type FontStyle = (typeof FONT_STYLES)[number];

/**
 * Font variable — subset dari CSS font-variation-settings.
 */
export interface IFontVariable {
  readonly name: string;
  readonly value: number;
  readonly min?: number;
  readonly max?: number;
}

export interface IFont {
  readonly id: FontId;
  readonly family: string;
  readonly fullName: string;
  readonly postScriptName: string;
  readonly preview: string;
  readonly style: string;
  readonly url: string;
  readonly category: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly userId: UserId | null;

  /** Metadata tambahan opsional */
  readonly weight?: FontWeight;
  readonly fontStyle?: FontStyle;
  readonly variable?: readonly IFontVariable[];
  readonly fallbacks?: readonly string[];
}

export interface ICompactFont {
  readonly family: string;
  readonly styles: readonly IFont[];
  readonly default: IFont;
  readonly name?: string;
  readonly categories?: readonly FontCategory[];
  readonly weights?: readonly FontWeight[];
}

/**
 * Cache untuk compact font agar tidak rebuild berkali-kali.
 * WeakMap dengan kunci array referensi.
 */
const compactFontCache = new WeakMap<readonly IFont[], ICompactFont[]>();

/* ============================================================
 * DATA STATE
 * ============================================================ */

export interface IDataState {
  readonly fonts: readonly IFont[];
  readonly compactFonts: readonly ICompactFont[];
  readonly setFonts: (fonts: readonly IFont[]) => void;
  readonly setCompactFonts: (compactFonts: readonly ICompactFont[]) => void;
  readonly addFont: (font: IFont) => void;
  readonly removeFont: (id: FontId) => void;
  readonly clearFonts: () => void;
}

/* ============================================================
 * PROPERTY
 * ============================================================ */

export const PROPERTY_TYPES = [
  "textContent",
  "fontSize",
  "color",
] as const;
export type IPropertyType = (typeof PROPERTY_TYPES)[number];

/**
 * Metadata untuk property type.
 */
export interface IPropertyMeta<T = unknown> {
  readonly label: string;
  readonly description: string;
  readonly inputType: "text" | "number" | "color";
  readonly defaultValue: T;
  readonly validate?: (value: unknown) => value is T;
}

/**
 * Mapping per property type dengan tipe value masing-masing.
 * Ini bikin `getPropertyMeta` bisa return tipe yang tepat.
 */
export type PropertyMetaMap = {
  textContent: IPropertyMeta<string>;
  fontSize: IPropertyMeta<number>;
  color: IPropertyMeta<string>;
};

export const PROPERTY_META: PropertyMetaMap = {
  textContent: {
    label: "Text Content",
    description: "Isi teks untuk elemen text",
    inputType: "text",
    defaultValue: "Hello World",
    validate: (v): v is string => typeof v === "string",
  },
  fontSize: {
    label: "Font Size",
    description: "Ukuran font dalam pixel",
    inputType: "number",
    defaultValue: 16,
    validate: (v): v is number =>
      typeof v === "number" && Number.isFinite(v) && v > 0,
  },
  color: {
    label: "Color",
    description: "Warna elemen (hex / rgba)",
    inputType: "color",
    defaultValue: "#ffffff",
    validate: (v): v is string =>
      typeof v === "string" && /^#([0-9a-f]{3,8})$/i.test(v),
  },
};

/* ============================================================
 * GEOMETRY
 * ============================================================ */

export type Ratio = Brand<number, "Ratio">;

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface BoundingBox extends Point, Size {
  readonly rotation?: number;
}

/**
 * Area dengan named properties untuk menghindari tuple confusion.
 */
export interface AreaObject extends Point, Size {}

/**
 * Area tuple [x, y, width, height] — dipertahankan untuk
 * kompatibilitas dengan library bawaan.
 */
export type Area = readonly [x: number, y: number, width: number, height: number];

/* ============================================================
 * RUNTIME GUARDS
 * ============================================================ */

const hasStringProp = <K extends string>(
  obj: Record<string, unknown>,
  key: K,
): obj is Record<K, string> => typeof obj[key] === "string";

export const isUserProvider = (value: unknown): value is UserProvider =>
  typeof value === "string" &&
  (USER_PROVIDERS as readonly string[]).includes(value);

export const isUserRole = (value: unknown): value is UserRole =>
  typeof value === "string" &&
  (USER_ROLES as readonly string[]).includes(value);

export const isUser = (value: unknown): value is User => {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    hasStringProp(v, "id") &&
    hasStringProp(v, "email") &&
    hasStringProp(v, "avatar") &&
    hasStringProp(v, "username") &&
    isUserProvider(v.provider)
  );
};

export const isUploadKind = (value: unknown): value is UploadKind =>
  typeof value === "string" &&
  (UPLOAD_KINDS as readonly string[]).includes(value);

export const isUploadStatus = (value: unknown): value is UploadStatus =>
  typeof value === "string" &&
  (UPLOAD_STATUSES as readonly string[]).includes(value);

export const isUpload = (value: unknown): value is IUpload => {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    hasStringProp(v, "id") &&
    hasStringProp(v, "name") &&
    hasStringProp(v, "originalName") &&
    hasStringProp(v, "fileId") &&
    hasStringProp(v, "previewUrl") &&
    hasStringProp(v, "url")
  );
};

export const isFontCategory = (value: unknown): value is FontCategory =>
  typeof value === "string" &&
  (FONT_CATEGORIES as readonly string[]).includes(value);

export const isFont = (value: unknown): value is IFont => {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    hasStringProp(v, "id") &&
    hasStringProp(v, "family") &&
    hasStringProp(v, "fullName") &&
    hasStringProp(v, "url")
  );
};

export const isCompactFont = (value: unknown): value is ICompactFont => {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    hasStringProp(v, "family") &&
    Array.isArray(v.styles) &&
    typeof v.default === "object"
  );
};

export const isPropertyType = (value: unknown): value is IPropertyType =>
  typeof value === "string" &&
  (PROPERTY_TYPES as readonly string[]).includes(value);

export const isValidArea = (area: Area): boolean =>
  area[2] > 0 && area[3] > 0;

/* ============================================================
 * UPLOAD HELPERS
 * ============================================================ */

export const getFileExtension = (filename: string): string => {
  const idx = filename.lastIndexOf(".");
  return idx === -1 ? "" : filename.slice(idx + 1).toLowerCase();
};

/**
 * Deteksi kind upload berdasarkan ekstensi.
 * Return null kalau tidak dikenali.
 */
export const detectUploadKind = (filename: string): UploadKind | null => {
  const ext = getFileExtension(filename);
  for (const kind of UPLOAD_KINDS) {
    if ((UPLOAD_KIND_META[kind].extensions as readonly string[]).includes(ext)) {
      return kind;
    }
  }
  return null;
};

export const isImageUpload = (u: IUpload): boolean =>
  u.kind === "image" || detectUploadKind(u.originalName) === "image";

export const isVideoUpload = (u: IUpload): boolean =>
  u.kind === "video" || detectUploadKind(u.originalName) === "video";

export const isAudioUpload = (u: IUpload): boolean =>
  u.kind === "audio" || detectUploadKind(u.originalName) === "audio";

/**
 * Format ukuran file ke string human-readable.
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let size = bytes / 1024;
  let i = 0;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(2)} ${units[i]}`;
};

/**
 * Hitung progress upload.
 */
export const computeUploadProgress = (
  loaded: number,
  total: number,
): IUploadProgress => ({
  loaded,
  total,
  percentage: total === 0 ? 0 : Math.min(100, (loaded / total) * 100),
});

/* ============================================================
 * USER HELPERS
 * ============================================================ */

export const getUserInitials = (
  user: Pick<User, "username"> & { displayName?: string },
): string => {
  const source = user.displayName ?? user.username;
  const parts = source.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const getDisplayName = (user: User): string =>
  user.displayName ?? user.username;

export const isUserOwner = (user: User): boolean => user.role === "owner";

/* ============================================================
 * FONT HELPERS
 * ============================================================ */

/**
 * Bangun compactFonts dari array fonts.
 * Hasil di-cache via WeakMap agar tidak rebuild untuk
 * input array yang sama persis.
 */
export const buildCompactFonts = (fonts: readonly IFont[]): ICompactFont[] => {
  const cached = compactFontCache.get(fonts);
  if (cached) return cached;

  const grouped = new Map<string, IFont[]>();
  for (const font of fonts) {
    const list = grouped.get(font.family) ?? [];
    list.push(font);
    grouped.set(font.family, list);
  }

  const result: ICompactFont[] = [];
  for (const [family, styles] of grouped) {
    const defaultFont =
      styles.find((s) => s.style.toLowerCase() === "regular") ??
      styles.find((s) => s.style.toLowerCase() === "normal") ??
      styles[0];

    const weights = Array.from(
      new Set(
        styles
          .map((s) => s.weight)
          .filter((w): w is FontWeight => typeof w === "number"),
      ),
    ).sort((a, b) => a - b);

    const categories = Array.from(
      new Set(
        styles
          .map((s) => s.category)
          .filter((c): c is FontCategory => isFontCategory(c)),
      ),
    );

    result.push({
      family,
      styles,
      default: defaultFont,
      name: family,
      weights,
      categories,
    });
  }

  compactFontCache.set(fonts, result);
  return result;
};

export const filterFontsByCategory = (
  fonts: readonly IFont[],
  category: FontCategory | "all",
): IFont[] => {
  if (category === "all") return [...fonts];
  const lc = category.toLowerCase();
  return fonts.filter((f) => f.category.toLowerCase() === lc);
};

export const findCompactFontByFamily = (
  compactFonts: readonly ICompactFont[],
  family: string,
): ICompactFont | undefined =>
  compactFonts.find((f) => f.family === family);

export const findFontByFamilyAndWeight = (
  compactFonts: readonly ICompactFont[],
  family: string,
  weight: FontWeight,
): IFont | undefined => {
  const compact = findCompactFontByFamily(compactFonts, family);
  if (!compact) return undefined;
  return compact.styles.find((s) => s.weight === weight) ?? compact.default;
};

/**
 * Bangun CSS font-family string dengan fallback.
 */
export const buildFontFamilyCss = (font: IFont): string => {
  const fallbacks = font.fallbacks?.join(", ") ?? "sans-serif";
  return `"${font.family}", ${fallbacks}`;
};

/* ============================================================
 * PROPERTY HELPERS
 * ============================================================ */

/**
 * Ambil metadata property dengan tipe value yang sesuai.
 * Overload memastikan return type sesuai input type.
 */
export function getPropertyMeta<T extends IPropertyType>(
  type: T,
): PropertyMetaMap[T] {
  return PROPERTY_META[type];
}

/**
 * Validasi nilai property berdasarkan type.
 */
export const validatePropertyValue = <T extends IPropertyType>(
  type: T,
  value: unknown,
): value is typeof PROPERTY_META[T]["defaultValue"] => {
  const meta = PROPERTY_META[type];
  return meta.validate ? meta.validate(value) : true;
};

/* ============================================================
 * GEOMETRY HELPERS
 * ============================================================ */

export const createRatio = (width: number, height: number): Ratio =>
  (height === 0 ? 0 : width / height) as Ratio;

export const createArea = (point: Point, size: Size): Area =>
  [point.x, point.y, size.width, size.height] as const;

export const createAreaObject = (point: Point, size: Size): AreaObject => ({
  x: point.x,
  y: point.y,
  width: size.width,
  height: size.height,
});

export const areaToBoundingBox = (area: Area): BoundingBox => {
  const [x, y, width, height] = area;
  return { x, y, width, height };
};

export const boundingBoxToArea = (box: BoundingBox): Area =>
  [box.x, box.y, box.width, box.height] as const;

export const areaObjectToTuple = (obj: AreaObject): Area =>
  [obj.x, obj.y, obj.width, obj.height] as const;

/**
 * Clamp bounding box ke dalam boundary tertentu.
 */
export const clampBoundingBox = (
  box: BoundingBox,
  boundary: Size,
): BoundingBox => ({
  ...box,
  x: Math.max(0, Math.min(box.x, boundary.width - box.width)),
  y: Math.max(0, Math.min(box.y, boundary.height - box.height)),
});

/* ============================================================
 * DEFAULT STATE
 * ============================================================ */

export const DEFAULT_DATA_STATE: Pick<
  IDataState,
  "fonts" | "compactFonts"
> = {
  fonts: [],
  compactFonts: [],
};

/**
 * Factory untuk bikin IUpload dengan default yang aman.
 */
export const createUpload = (
  input: Omit<IUpload, "id" | "fileId" | "status"> &
    Partial<Pick<IUpload, "id" | "fileId" | "status">>,
): IUpload => ({
  status: "idle",
  ...input,
  id: input.id ?? asUploadId(crypto.randomUUID()),
  fileId: input.fileId ?? asFileId(crypto.randomUUID()),
  kind: input.kind ?? detectUploadKind(input.originalName) ?? undefined,
});

/**
 * Factory untuk bikin User dengan default role.
 */
export const createUser = (input: Omit<User, "role"> & Partial<Pick<User, "role">>): User => ({
  role: "editor",
  ...input,
});
