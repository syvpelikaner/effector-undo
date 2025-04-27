import assert from "node:assert/strict";
import { test, describe } from "node:test";
import { createApi, createStore, fork, allSettled, sample } from "effector";
import { createHistory } from "../src/index.ts";

describe("createHistory", () => {
  const $counter = createStore(0, { name: "counter" });

  const { inc, dec } = createApi($counter, {
    inc: (state) => state + 1,
    dec: (state) => state - 1,
  });

  test("initial history state", () => {
    const scope = fork();

    const history = createHistory({ store: $counter, events: [inc, dec] });

    assert.deepEqual(scope.getState(history.history), {
      states: [0],
      head: 0,
    });
  });

  test("push event", async () => {
    const scope = fork();

    const history = createHistory({ store: $counter, events: [inc, dec] });

    await allSettled(inc, { scope });
    await allSettled(dec, { scope });

    assert.deepEqual(scope.getState(history.history), {
      states: [0, 1, 0],
      head: 0,
    });
  });

  test("undo", async () => {
    const scope = fork();

    const history = createHistory({ store: $counter, events: [inc, dec] });

    await allSettled(inc, { scope });
    await allSettled(inc, { scope });
    await allSettled(dec, { scope });
    await allSettled(history.undo, { scope });

    assert.deepEqual(scope.getState(history.history), {
      states: [1, 2, 1, 0],
      head: 1,
    });

    assert.equal(scope.getState($counter), 2);
  });

  test("redo", async () => {
    const scope = fork();

    const history = createHistory({ store: $counter, events: [inc, dec] });

    await allSettled(inc, { scope });
    await allSettled(dec, { scope });
    await allSettled(history.undo, { scope });
    await allSettled(history.redo, { scope });

    assert.deepEqual(scope.getState(history.history), {
      states: [0, 1, 0],
      head: 0,
    });
    assert.equal(scope.getState($counter), 0);
  });

  test("clear", async () => {
    const scope = fork();

    const history = createHistory({ store: $counter, events: [inc, dec] });

    await allSettled(inc, { scope });
    await allSettled(dec, { scope });
    await allSettled(history.clear, { scope });

    assert.deepEqual(scope.getState(history.history), {
      states: [0],
      head: 0,
    });
  });

  test("limit", async () => {
    const scope = fork();

    const history = createHistory({
      store: $counter,
      events: [inc, dec],
      limit: 2,
    });

    await allSettled(inc, { scope });
    await allSettled(inc, { scope });
    await allSettled(inc, { scope });

    assert.deepEqual(scope.getState(history.history), {
      states: [3, 2],
      head: 0,
    });
  });

  test("filter", async () => {
    const scope = fork();

    const history = createHistory({
      store: $counter,
      events: [inc, dec],
      filter: (state) => state % 2 === 0,
    });

    await allSettled(inc, { scope });
    await allSettled(inc, { scope });
    await allSettled(inc, { scope });
    await allSettled(inc, { scope });

    assert.deepEqual(scope.getState(history.history), {
      states: [4, 2, 0],
      head: 0,
    });
  });
});
