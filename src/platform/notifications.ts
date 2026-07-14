export type NotificationPermissionState = "disabled" | "denied" | "granted" | "prompt";

export interface NotificationService {
  permission(): NotificationPermissionState;
  schedule(): Promise<{ ok: false; reason: string }>;
}

export const notificationService: NotificationService = {
  permission() {
    return "disabled";
  },
  async schedule() {
    return { ok: false, reason: "Web mobile notifications are not enabled yet." };
  }
};
