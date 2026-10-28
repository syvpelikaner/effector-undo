# effector-undo

Simple undo/redo functionality for effector

Example

```javascript
import { createHistory } from "@tanyaisinmybed/effector-undo";

export const { undo, redo, clear, reset, $history } = createHistory({
  store: counter,
  limit: 10,
  events: [inc, dec],
  filter: (lastState, state) => state - lastState > 3,
});
```

`clear` keeps the current state and drops the rest of the history. `reset` returns both the history and the store to the initial state, so `undo` can't bring back anything recorded before it.

[codesandbox](https://codesandbox.io/s/x7q86y58oq)
