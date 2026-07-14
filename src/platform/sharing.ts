export interface SharingService {
  share(data: { title?: string; text?: string; url?: string }): Promise<{ ok: boolean; reason?: string }>;
}

export const sharingService: SharingService = {
  async share(data) {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      await navigator.share(data);
      return { ok: true };
    }

    return { ok: false, reason: "Web Share API is unavailable." };
  }
};
