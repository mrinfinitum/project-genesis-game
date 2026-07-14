import type { SupabaseClient } from "@supabase/supabase-js";
import type { NoverisAuthState } from "./types";
import { NoverisSupabaseUnavailableError, safeSupabaseErrorMessage } from "./errors";
import { defaultStorageService } from "@/platform/storage";

export const GUEST_MODE_KEY = "noveris-game:guest-mode";
const AUTH_RESTORE_TIMEOUT_MS = 4500;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out.`)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

function guestModeEnabled() {
  return defaultStorageService.getItem(GUEST_MODE_KEY) === "true";
}

function setGuestMode(enabled: boolean) {
  if (enabled) {
    defaultStorageService.setItem(GUEST_MODE_KEY, "true");
  } else {
    defaultStorageService.removeItem(GUEST_MODE_KEY);
  }
}

export class NoverisAuthService {
  constructor(
    private readonly client: SupabaseClient | null,
    private readonly unavailableReason = "Cloud accounts are unavailable in this build."
  ) {}

  get isConfigured() {
    return Boolean(this.client);
  }

  async restoreSession(): Promise<NoverisAuthState> {
    if (!this.client) {
      return {
        status: guestModeEnabled() ? "guest" : "signed_out",
        session: null,
        user: null,
        cloudAvailable: false,
        unavailableReason: this.unavailableReason
      };
    }

    let restored: Awaited<ReturnType<SupabaseClient["auth"]["getSession"]>>;
    try {
      restored = await withTimeout(this.client.auth.getSession(), AUTH_RESTORE_TIMEOUT_MS, "Session restore");
    } catch (error) {
      return { status: "error", session: null, user: null, error: safeSupabaseErrorMessage(error, "Could not restore session."), cloudAvailable: true };
    }

    const { data, error } = restored;
    if (error) {
      return { status: "error", session: null, user: null, error: safeSupabaseErrorMessage(error, "Could not restore session."), cloudAvailable: true };
    }

    if (data.session) {
      setGuestMode(false);
      return {
        status: "authenticated",
        session: data.session,
        user: data.session.user,
        email: data.session.user.email,
        cloudAvailable: true
      };
    }

    return {
      status: guestModeEnabled() ? "guest" : "signed_out",
      session: null,
      user: null,
      cloudAvailable: true
    };
  }

  onAuthStateChange(callback: (state: NoverisAuthState) => void) {
    if (!this.client) return { unsubscribe() {} };

    const { data } = this.client.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setGuestMode(false);
        callback({ status: "authenticated", session, user: session.user, email: session.user.email, cloudAvailable: true });
      } else {
        callback({ status: "signed_out", session: null, user: null, cloudAvailable: true });
      }
    });

    return { unsubscribe: () => data.subscription.unsubscribe() };
  }

  continueAsGuest(): NoverisAuthState {
    setGuestMode(true);
    return { status: "guest", session: null, user: null, cloudAvailable: Boolean(this.client), unavailableReason: this.client ? undefined : this.unavailableReason };
  }

  async signIn(email: string, password: string) {
    if (!this.client) throw new NoverisSupabaseUnavailableError(this.unavailableReason);
    setGuestMode(false);
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async signUp(email: string, password: string) {
    if (!this.client) throw new NoverisSupabaseUnavailableError(this.unavailableReason);
    setGuestMode(false);
    const { data, error } = await this.client.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  }

  async sendMagicLink(email: string, redirectTo = window.location.origin) {
    if (!this.client) throw new NoverisSupabaseUnavailableError(this.unavailableReason);
    const { data, error } = await this.client.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
    if (error) throw error;
    return data;
  }

  async requestPasswordReset(email: string, redirectTo = `${window.location.origin}/reset-password`) {
    if (!this.client) throw new NoverisSupabaseUnavailableError(this.unavailableReason);
    const { data, error } = await this.client.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
    return data;
  }

  async updatePassword(password: string) {
    if (!this.client) throw new NoverisSupabaseUnavailableError(this.unavailableReason);
    const { data, error } = await this.client.auth.updateUser({ password });
    if (error) throw error;
    return data;
  }

  async signOut() {
    if (this.client) {
      const { error } = await this.client.auth.signOut();
      if (error) throw error;
    }
    setGuestMode(false);
  }
}
