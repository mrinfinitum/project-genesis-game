export type DeepLinkHandler = (url: string) => void;

export interface DeepLinkService {
  readonly scheme: "noveris";
  onOpen(handler: DeepLinkHandler): () => void;
  parse(url: string): URL | null;
}

export const deepLinkService: DeepLinkService = {
  scheme: "noveris",
  onOpen() {
    return () => undefined;
  },
  parse(url: string) {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "noveris:" ? parsed : null;
    } catch {
      return null;
    }
  }
};
