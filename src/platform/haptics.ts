export type HapticImpactStyle = "light" | "medium" | "heavy";

export interface HapticsService {
  impact(style?: HapticImpactStyle): Promise<void>;
  selection(): Promise<void>;
}

export const hapticsService: HapticsService = {
  async impact() {
    // Web implementation is intentionally no-op until Capacitor Haptics is introduced.
  },
  async selection() {
    // Web implementation is intentionally no-op until Capacitor Haptics is introduced.
  }
};
