import { createRuntimeSelectors } from "./selectors";
import type { GameRuntimeData, RuntimeContentSelectors, RuntimeContentState } from "./types";

type Listener = () => void;

export class RuntimeContentStore {
  private listeners = new Set<Listener>();

  constructor(private state: RuntimeContentState) {}

  getSnapshot = () => this.state;

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  setState(next: RuntimeContentState) {
    this.state = next;
    for (const listener of this.listeners) {
      listener();
    }
  }

  getPayload(): GameRuntimeData {
    return {
      metadata: {
        schemaVersion: this.state.schemaVersion as "game-runtime-v1",
        contentVersion: this.state.contentVersion,
        releaseName: this.state.releaseName,
        checksum: this.state.checksum,
        accessLevel: this.state.accessLevel as "public-published",
        validationStatus: this.state.validationStatus as "Ready"
      },
      eras: this.state.eras,
      resources: this.state.resources,
      upgradeCategories: this.state.upgradeCategories,
      upgrades: this.state.upgrades,
      assets: this.state.assets,
      balance: this.state.balance,
      clientProfiles: this.state.clientProfiles
    };
  }

  selectors(): RuntimeContentSelectors {
    return createRuntimeSelectors(this.getPayload());
  }
}
