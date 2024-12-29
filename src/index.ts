import {
  createStore,
  createEvent,
  sample,
  merge,
  type Store,
  type Event,
  type EventCallable
} from "effector";

export type Filter<State> = (state: State, prevState: State) => boolean;

export interface HistoryOptions<State = any> {
  store: Store<State>;
  events: Event<any>[];
  limit?: number;
  filter?: Filter<State>;
}

export function createHistory<State>({
  store,
  events,
  limit = 10,
  filter = defaultFilter
}: HistoryOptions<State>): {
  undo: EventCallable<void>;
  redo: EventCallable<void>;
  clear: EventCallable<void>;
  $history: Store<{ states: State[]; head: number }>;
  /* @deprecated */
  history: Store<{ states: State[]; head: number }>;
} {
  const initialState = store.getState();
  const name = store.shortName;

  const clear = createEvent(name + "-history-clear");
  const push = createEvent<State>(name + "-history-push");
  const undo = createEvent(name + "-history-undo");
  const redo = createEvent(name + "-history-redo");

  const $history = createStore({
    states: [initialState],
    head: 0
  })
    .on(push, ({ states, head }, state) => {
      const current = states.slice(head);
      const merged = [state].concat(current);
      const limited = merged.slice(0, limit);
      return {
        states: limited,
        head: 0
      };
    })
    .on(undo, ({ states, head }) => ({
      states,
      head: Math.min(head + 1, states.length - 1)
    }))
    .on(redo, ({ states, head }) => ({
      states,
      head: Math.max(head - 1, 0)
    }))
    .on(clear, ({ states, head }) => ({
      states: [states[head]],
      head: 0
    }));

  const current = $history.map(({ states, head }) => states[head]);

  const shouldSave = createStore({
    next: initialState,
    prev: initialState
  })
    .on(store, ({ next: prev }, next) => ({ next, prev }))
    .map(({ next, prev }) => filter(next, prev));

  sample({
    source: store,
    clock: merge(events),
    filter: shouldSave,
    target: push
  });

  sample({
    source: current,
    to: store
  });

  return {
    undo,
    redo,
    clear,
    $history,
    history: $history
  };
}

const defaultFilter: Filter<any> = () => true;
