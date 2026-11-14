import { patchState, signalStoreFeature, type, watchState, withHooks } from '@ngrx/signals';

interface StorageSyncConfig<State> {
  key: string;
  /** Bump when the state shape changes so stale saves are discarded. */
  version?: number;
  /** Pick which parts of state to persist. Defaults to everything. */
  select?: (state: State) => Partial<State>;
  /** Coalesce rapid changes into one write. */
  delayMs?: number;
}

export function withStorageSync<State extends object>(config: StorageSyncConfig<State>) {
  const { key, version = 1, select = (s: State) => s, delayMs = 300 } = config;

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

        // Save: debounced, latest state wins
        let latest: State | null = null;
        let timer: ReturnType<typeof setTimeout> | undefined;

        const flush = () => {
          clearTimeout(timer);
          timer = undefined;
          if (latest === null) return;
          const state = latest;
          latest = null;
          try {
            localStorage.setItem(key, JSON.stringify({ version, state: select(state) }));
          } catch (e) {
            console.warn(`Could not save "${key}"`, e);
          }
        };

        watchState(store, (state) => {
          latest = state as State;
          timer ??= setTimeout(flush, delayMs); // at most one write per delayMs
        });

        // A backgrounded PWA can be killed without warning, so write anything pending
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'hidden') flush();
        });
        addEventListener('pagehide', flush);
      },
    }),
  );
}
