export class NoverisSupabaseUnavailableError extends Error {
  constructor(message = "Cloud accounts are unavailable in this build.") {
    super(message);
    this.name = "NoverisSupabaseUnavailableError";
  }
}

export function safeSupabaseErrorMessage(error: unknown, fallback = "Cloud service is temporarily unavailable.") {
  if (!error || typeof error !== "object") return fallback;
  const maybeMessage = "message" in error ? error.message : undefined;
  return typeof maybeMessage === "string" && maybeMessage.trim() ? maybeMessage : fallback;
}
