export type PurchaseResult = { ok: false; reason: string };

export interface PurchaseService {
  purchase(productId: string): Promise<PurchaseResult>;
  restorePurchases(): Promise<PurchaseResult>;
}

export const purchaseService: PurchaseService = {
  async purchase() {
    return { ok: false, reason: "Native purchases are not enabled yet." };
  },
  async restorePurchases() {
    return { ok: false, reason: "Native purchases are not enabled yet." };
  }
};
