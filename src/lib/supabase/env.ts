export type NoverisSupabaseConfig = {
  url: string;
  publishableKey: string;
  isConfigured: boolean;
  unavailableReason?: string;
};

type SupabaseEnv = {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function readNoverisSupabaseConfig(env: SupabaseEnv = import.meta.env as unknown as SupabaseEnv): NoverisSupabaseConfig {
  const url = clean(env.VITE_SUPABASE_URL);
  const publishableKey = clean(env.VITE_SUPABASE_PUBLISHABLE_KEY);

  if (!url || !publishableKey) {
    return {
      url: "",
      publishableKey: "",
      isConfigured: false,
      unavailableReason: "Cloud accounts are unavailable in this build."
    };
  }

  try {
    const parsed = new URL(url);
    if (!parsed.protocol.startsWith("http")) {
      throw new Error("Invalid protocol");
    }
  } catch {
    return {
      url: "",
      publishableKey: "",
      isConfigured: false,
      unavailableReason: "Cloud accounts are unavailable in this build."
    };
  }

  return {
    url,
    publishableKey,
    isConfigured: true
  };
}
