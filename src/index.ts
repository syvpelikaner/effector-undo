import {
  createStore,
  createEvent,
  sample,
  merge,
  type StoreWritable,
  type Store,
  type Event,
  type EventCallable,
  type Json,
} from "effector";

export type HistoryState<State> = { states: State[]; head: number };
export type Filter<State> = (state: State, prevState: State) => boolean;

type SerializeConfig<State, SerializedState extends Json> = Exclude<
  Parameters<typeof createStore<State, SerializedState>>[1],
  undefined
>["serialize"];

export interface HistoryOptions<
  State = any,
  SerializedState extends Json = Json,
> {
  store: StoreWritable<State>;
  events: Event<any>[];
  limit?: number;
  filter?: Filter<State>;
  serialize?: SerializeConfig<HistoryState<State>, SerializedState>;
}

export function createHistory<State, SerializedState extends Json>({
  store,
  events,
  limit = 10,
  filter = defaultFilter,
  serialize = "ignore",
}: HistoryOptions<State, SerializedState>): {
  undo: EventCallable<void>;
  redo: EventCallable<void>;
  clear: EventCallable<void>;
  $history: Store<HistoryState<State>>;
  /* @deprecated */
  history: Store<HistoryState<State>>;
} {
  const initialState = store.getState();
  const name = store.shortName;

  const clear = createEvent(name + "-history-clear");
  const push = createEvent<State>(name + "-history-push");
  const undo = createEvent(name + "-history-undo");
  const redo = createEvent(name + "-history-redo");

  const $history = createStore<HistoryState<State>, SerializedState>(
    {
      states: [initialState],
      head: 0,
    },
    { serialize }
  )
    .on(push, ({ states, head }, state) => {
      const current = states.slice(head);
      const merged = [state].concat(current);
      const limited = merged.slice(0, limit);
      return {
        states: limited,
        head: 0,
      };
    })
    .on(undo, ({ states, head }) => ({
      states,
      head: Math.min(head + 1, states.length - 1),
    }))
    .on(redo, ({ states, head }) => ({
      states,
      head: Math.max(head - 1, 0),
    }))
    .on(clear, ({ states, head }) => ({
      states: [states[head]],
      head: 0,
    }));

  const current = $history.map(({ states, head }) => states[head]);

  const shouldSave = createStore(
    {
      next: initialState,
      prev: initialState,
    },
    { serialize: "ignore" }
  )
    .on(store, ({ next: prev }, next) => ({ next, prev }))
    .map(({ next, prev }) => filter(next, prev));

  sample({
    source: store,
    clock: merge(events),
    filter: shouldSave,
    target: push,
  });

  sample({
    source: current,
    target: store,
  });

  return {
    undo,
    redo,
    clear,
    $history,
    history: $history,
  };
}

const defaultFilter: Filter<any> = () => true;
