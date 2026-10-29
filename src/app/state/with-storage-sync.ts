import { patchState, signalStoreFeature, type, watchState, withHooks } from '@ngrx/signals';

interface StorageSyncConfig<State> {
  key: string;
  /** Bump when the state shape changes so stale saves are discarded. */
  version?: number;
  /** Pick which parts of state to persist. Defaults to everything. */
  select?: (state: State) => Partial<State>;
}

export function withStorageSync<State extends object>(config: StorageSyncConfig<State>) {
  const { key, version = 1, select = (s: State) => s } = config;

  return signalStoreFeature(
    { state: type<State>() },
    withHooks({
      onInit(store) {
        if (typeof localStorage === 'undefined') return;

        // Restore
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const saved = JSON.parse(raw) as { version: number; state: Partial<State> };
            if (saved.version === version) {
              patchState(store, saved.state);
            } else {
              localStorage.removeItem(key);
            }
          }
        } catch (e) {
          console.warn(`Could not restore "${key}"`, e);
          localStorage.removeItem(key);
        }

        // Save on every state change (also runs once right away)
        watchState(store, (state) => {
          try {
            localStorage.setItem(key, JSON.stringify({ version, state: select(state as State) }));
          } catch (e) {
            console.warn(`Could not save "${key}"`, e);
          }
        });
      },
    }),
  );
}
