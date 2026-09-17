
import { User } from "@/interfaces/editor";
import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";

/* ============================================================
 * RESULT TYPE
 * ============================================================ */

/**
 * Discriminated union untuk hasil operasi auth yang bisa gagal.
 * Menghindari `Promise<any>` dan memaksa caller handle error.
 */
export type AuthResult<T = void> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: AuthError };

/**
 * Error yang mungkin terjadi saat operasi auth.
 */
export const AUTH_ERROR_CODES = [
  "invalid-email",
  "network-error",
  "unauthorized",
  "rate-limited",
  "unknown",
] as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[number];

export interface AuthError {
  readonly code: AuthErrorCode;
  readonly message: string;
  readonly cause?: unknown;
}

export const authOk = <T>(value: T): AuthResult<T> => ({
  ok: true,
  value,
});
export const authErr = (
  code: AuthErrorCode,
  message: string,
  cause?: unknown,
): AuthResult<never> => ({
  ok: false,
  error: { code, message, cause },
});

/* ============================================================
 * AUTH STATUS
 * ============================================================ */

/**
 * Status auth lifecycle.
 * - `idle`: belum ada interaksi auth
 * - `loading`: sedang proses login/signup
 * - `authenticated`: sudah login
 * - `unauthenticated`: belum login (setelah check selesai)
 */
export const AUTH_STATUSES = [
  "idle",
  "loading",
  "authenticated",
  "unauthenticated",
] as const;

export type AuthStatus = (typeof AUTH_STATUSES)[number];

export const isAuthStatus = (v: unknown): v is AuthStatus =>
  typeof v === "string" && (AUTH_STATUSES as readonly string[]).includes(v);

/* ============================================================
 * AUTH PROVIDER
 * ============================================================ */

export const AUTH_PROVIDERS = ["github", "magic-link", "google"] as const;
export type AuthProvider = (typeof AUTH_PROVIDERS)[number];

export const isAuthProvider = (v: unknown): v is AuthProvider =>
  typeof v === "string" && (AUTH_PROVIDERS as readonly string[]).includes(v);

/* ============================================================
 * PAYLOADS
 * ============================================================ */

export interface MagicLinkPayload {
  readonly email: string;
  readonly redirectTo?: string;
}

export interface GithubSignInPayload {
  readonly redirectTo?: string;
  readonly scopes?: readonly string[];
}

/* ============================================================
 * STATE
 * ============================================================ */

export interface IAuthState {
  /** User yang sedang login, null jika belum login */
  user: User | null;
  /** Status auth lifecycle */
  status: AuthStatus;
  /** Provider yang terakhir dipakai */
  lastProvider: AuthProvider | null;
  /** Timestamp login terakhir (ISO string) */
  lastLoginAt: string | null;
  /** Error terakhir (jika ada) */
  error: AuthError | null;
}

/**
 * Dipertahankan untuk backward compatibility.
 * Nilai ini derived dari `status === "authenticated"`.
 */
export interface IAuthDerived {
  readonly isAuthenticated: boolean;
  readonly isLoading: boolean;
}

export type IAuthComputed = IAuthState & IAuthDerived;

/* ============================================================
 * ACTIONS
 * ============================================================ */

export interface IAuthActions {
  /* ---------- Setters ---------- */
  setUser: (user: User | null) => void;
  setStatus: (status: AuthStatus) => void;
  setError: (error: AuthError | null) => void;
  clearError: () => void;

  /* ---------- Sign In ---------- */
  signInWithMagicLink: (
    payload: MagicLinkPayload,
  ) => Promise<AuthResult<{ email: string }>>;

  signInWithGithub: (
    payload?: GithubSignInPayload,
  ) => Promise<AuthResult<{ redirectUrl: string }>>;

  /* ---------- Sign Out ---------- */
  signOut: () => Promise<AuthResult>;

  /* ---------- Lifecycle ---------- */
  /**
   * Panggil di root app untuk rehydrate session dari backend.
   */
  initialize: () => Promise<void>;

  /** Reset semua state ke default */
  reset: () => void;
}

export type IAuthStore = IAuthState & IAuthDerived & IAuthActions;

/* ============================================================
 * DEFAULT STATE
 * ============================================================ */

export const DEFAULT_AUTH_STATE: IAuthState = {
  user: null,
  status: "idle",
  lastProvider: null,
  lastLoginAt: null,
  error: null,
};

/* ============================================================
 * GUARDS & HELPERS
 * ============================================================ */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (email: string): boolean =>
  EMAIL_REGEX.test(email.trim());

/**
 * Normalisasi email: trim + lowercase.
 */
export const normalizeEmail = (email: string): string =>
  email.trim().toLowerCase();

/**
 * Wrap promise dengan error handling agar tidak throw.
 */
const safeAsync = async <T>(
  fn: () => Promise<T>,
  fallbackCode: AuthErrorCode = "unknown",
): Promise<AuthResult<T>> => {
  try {
    const value = await fn();
    return authOk(value);
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : "Terjadi kesalahan";
    return authErr(fallbackCode, message, cause);
  }
};

/* ============================================================
 * STORE
 * ============================================================ */

export const useAuthStore = create<IAuthStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        ...DEFAULT_AUTH_STATE,

        /* ---------- Derived (getter dinamis) ---------- */
        get isAuthenticated() {
          return get().status === "authenticated" && get().user !== null;
        },
        get isLoading() {
          return get().status === "loading";
        },

        /* ---------- Setters ---------- */
        setUser: (user) =>
          set({
            user,
            status: user ? "authenticated" : "unauthenticated",
            lastLoginAt: user ? new Date().toISOString() : null,
          }),

        setStatus: (status) => set({ status }),

        setError: (error) => set({ error }),

        clearError: () => set({ error: null }),

        /* ---------- Sign In: Magic Link ---------- */
        signInWithMagicLink: async ({ email, redirectTo }) => {
          const cleanEmail = normalizeEmail(email);

          if (!isValidEmail(cleanEmail)) {
            const error: AuthError = {
              code: "invalid-email",
              message: "Format email tidak valid",
            };
            set({ error, status: "unauthenticated" });
            return authErr(error.code, error.message);
          }

          set({ status: "loading", error: null });

          const result = await safeAsync(async () => {
            // TODO: ganti dengan panggilan API asli
            // await supabase.auth.signInWithOtp({ email: cleanEmail });
            await Promise.resolve();
            return { email: cleanEmail };
          }, "network-error");

          if (result.ok) {
            set({
              status: "unauthenticated",
              lastProvider: "magic-link",
              error: null,
            });
          } else {
            set({
              status: "unauthenticated",
              error: result.error,
            });
          }

          return result;
        },

        /* ---------- Sign In: GitHub ---------- */
        signInWithGithub: async (payload = {}) => {
          set({ status: "loading", error: null });

          const result = await safeAsync(async () => {
            // TODO: ganti dengan panggilan API asli
            // const { data } = await supabase.auth.signInWithOAuth({
            //   provider: "github",
            //   options: { redirectTo: payload.redirectTo },
            // });
            await Promise.resolve();
            const redirectUrl =
              payload.redirectTo ?? "https://github.com/login/oauth";
            return { redirectUrl };
          }, "network-error");

          if (result.ok) {
            set({
              status: "unauthenticated",
              lastProvider: "github",
              error: null,
            });
          } else {
            set({
              status: "unauthenticated",
              error: result.error,
            });
          }

          return result;
        },

        /* ---------- Sign Out ---------- */
        signOut: async () => {
          set({ status: "loading", error: null });

          const result = await safeAsync(async () => {
            // TODO: ganti dengan panggilan API asli
            // await supabase.auth.signOut();
            await Promise.resolve();
          }, "network-error");

          if (result.ok) {
            set({
              ...DEFAULT_AUTH_STATE,
              status: "unauthenticated",
            });
          } else {
            set({
              status: "unauthenticated",
              error: result.error,
            });
          }

          return result;
        },

        /* ---------- Lifecycle ---------- */
        initialize: async () => {
          set({ status: "loading", error: null });

          const result = await safeAsync(async () => {
            // TODO: ganti dengan panggilan API asli
            // const { data } = await supabase.auth.getSession();
            // return data.session?.user ?? null;
            await Promise.resolve();
            return null as User | null;
          }, "network-error");

          if (result.ok) {
            const user = result.value;
            set({
              user,
              status: user ? "authenticated" : "unauthenticated",
              error: null,
            });
          } else {
            set({
              user: null,
              status: "unauthenticated",
              error: result.error,
            });
          }
        },

        /* ---------- Reset ---------- */
        reset: () => set({ ...DEFAULT_AUTH_STATE }),
      }),
      {
        name: "nano-auth",
        // Hanya persist data user & provider, bukan status/error
        partialize: (state) => ({
          user: state.user,
          lastProvider: state.lastProvider,
          lastLoginAt: state.lastLoginAt,
        }),
      },
    ),
  ),
);

/* ============================================================
 * SELECTORS
 * ============================================================ */

export const selectUser = (s: IAuthStore) => s.user;
export const selectStatus = (s: IAuthStore) => s.status;
export const selectIsAuthenticated = (s: IAuthStore) => s.isAuthenticated;
export const selectIsLoading = (s: IAuthStore) => s.isLoading;
export const selectError = (s: IAuthStore) => s.error;
export const selectLastProvider = (s: IAuthStore) => s.lastProvider;
export const selectLastLoginAt = (s: IAuthStore) => s.lastLoginAt;

/**
 * Derived selector: ambil user id.
 */
export const selectUserId = (s: IAuthStore): string | null =>
  s.user?.id ?? null;

/**
 * Derived selector: ambil username.
 */
export const selectUsername = (s: IAuthStore): string | null =>
  s.user?.username ?? null;

/**
 * Derived selector: apakah user adalah GitHub user.
 */
export const selectIsGithubUser = (s: IAuthStore): boolean =>
  s.user?.provider === "github";

/* ============================================================
 * EXPORT DEFAULT
 * ============================================================ */

export default useAuthStore;
