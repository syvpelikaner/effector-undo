# effector-undo

Simple undo/redo functionality for effector

Example

```javascript
import { createHistory } from "@tanyaisinmybed/effector-undo";

export const { undo, redo, clear, $history } = createHistory({
  store: counter,
  limit: 10,
  events: [inc, dec],
  filter: (lastState, state) => state - lastState > 3,
});
```

[codesandbox](https://codesandbox.io/s/x7q86y58oq)
