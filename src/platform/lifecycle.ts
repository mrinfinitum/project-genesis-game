export type AppLifecycleEvent = "background" | "foreground" | "network_lost" | "network_restored";
export type LifecycleUnsubscribe = () => void;

export interface LifecycleService {
  isOnline(): boolean;
  on(event: AppLifecycleEvent, callback: () => void): LifecycleUnsubscribe;
}

export class WebLifecycleService implements LifecycleService {
  isOnline() {
    return typeof navigator === "undefined" ? true : navigator.onLine;
  }

  on(event: AppLifecycleEvent, callback: () => void) {
    if (typeof window === "undefined" || typeof document === "undefined") return () => undefined;

    if (event === "background" || event === "foreground") {
      const listener = () => {
        const hidden = document.visibilityState === "hidden";
        if ((event === "background" && hidden) || (event === "foreground" && !hidden)) callback();
      };
      document.addEventListener("visibilitychange", listener);
      window.addEventListener("pagehide", event === "background" ? callback : noop);
      window.addEventListener("pageshow", event === "foreground" ? callback : noop);
      return () => {
        document.removeEventListener("visibilitychange", listener);
        window.removeEventListener("pagehide", event === "background" ? callback : noop);
        window.removeEventListener("pageshow", event === "foreground" ? callback : noop);
      };
    }

    const type = event === "network_restored" ? "online" : "offline";
    window.addEventListener(type, callback);
    return () => window.removeEventListener(type, callback);
  }
}

function noop() {
  return undefined;
}

export const lifecycleService: LifecycleService = new WebLifecycleService();
