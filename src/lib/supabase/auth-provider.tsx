/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getNoverisSupabaseClient } from "./client";
import { readNoverisSupabaseConfig } from "./env";
import { NoverisAuthService } from "./auth-service";
import { safeSupabaseErrorMessage } from "./errors";
import type { NoverisAuthState } from "./types";

type AuthContextValue = {
  state: NoverisAuthState;
  service: NoverisAuthService;
  continueAsGuest: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  sendMagicLink: (email: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const initialAuthState: NoverisAuthState = {
  status: "initializing",
  session: null,
  user: null,
  cloudAvailable: false
};

const AUTH_STARTUP_WATCHDOG_TIMEOUT_MS = 6000;

const AuthContext = createContext<AuthContextValue | null>(null);

export function NoverisAuthProvider({ children }: { children: ReactNode }) {
  const config = useMemo(() => readNoverisSupabaseConfig(), []);
  const client = useMemo(() => getNoverisSupabaseClient(config), [config]);
  const service = useMemo(() => new NoverisAuthService(client, config.unavailableReason), [client, config.unavailableReason]);
  const [state, setState] = useState<NoverisAuthState>(initialAuthState);

  useEffect(() => {
    let cancelled = false;
    let resolved = false;
    const timeout = window.setTimeout(() => {
      if (cancelled || resolved) return;
      resolved = true;
      setState({
        status: "error",
        session: null,
        user: null,
        error: "Account startup timed out. Continuing offline.",
        cloudAvailable: service.isConfigured
      });
    }, AUTH_STARTUP_WATCHDOG_TIMEOUT_MS);

    void service.restoreSession()
      .then((restored) => {
        if (cancelled) return;
        resolved = true;
        window.clearTimeout(timeout);
        setState(restored);
      })
      .catch((error) => {
        if (cancelled) return;
        resolved = true;
        window.clearTimeout(timeout);
        setState({
          status: "error",
          session: null,
          user: null,
          error: safeSupabaseErrorMessage(error, "Account startup failed. Continuing offline."),
          cloudAvailable: service.isConfigured
        });
      });

    let subscription: { unsubscribe: () => void };
    try {
      subscription = service.onAuthStateChange((next) => {
        resolved = true;
        window.clearTimeout(timeout);
        setState(next);
      });
    } catch (error) {
      resolved = true;
      window.clearTimeout(timeout);
      subscription = { unsubscribe() {} };
      setState({
        status: "error",
        session: null,
        user: null,
        error: safeSupabaseErrorMessage(error, "Account listener failed. Continuing offline."),
        cloudAvailable: service.isConfigured
      });
    }

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [service]);

  const runAuthAction = useCallback(async (action: () => Promise<void>, pendingStatus: NoverisAuthState["status"] = "signing_in") => {
    setState((current) => ({ ...current, status: pendingStatus, error: undefined }));
    try {
      await action();
      setState(await service.restoreSession());
    } catch (error) {
      setState((current) => ({ ...current, status: "error", error: safeSupabaseErrorMessage(error), session: null, user: null }));
    }
  }, [service]);

  const value = useMemo<AuthContextValue>(() => ({
    state,
    service,
    continueAsGuest() {
      setState(service.continueAsGuest());
    },
    signIn(email, password) {
      return runAuthAction(() => service.signIn(email, password).then(() => undefined));
    },
    signUp(email, password) {
      return runAuthAction(() => service.signUp(email, password).then(() => undefined));
    },
    sendMagicLink(email) {
      return runAuthAction(() => service.sendMagicLink(email).then(() => undefined));
    },
    requestPasswordReset(email) {
      return runAuthAction(() => service.requestPasswordReset(email).then(() => undefined));
    },
    updatePassword(password) {
      return runAuthAction(() => service.updatePassword(password).then(() => undefined));
    },
    signOut() {
      return runAuthAction(() => service.signOut());
    }
  }), [runAuthAction, service, state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useNoverisAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useNoverisAuth must be used inside NoverisAuthProvider");
  return value;
}
