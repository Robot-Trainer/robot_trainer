import { describe, it, expect } from "vitest";
import { AsyncMutex } from "./mutex";

describe("AsyncMutex", () => {
  it("serializes concurrent operations", async () => {
    const mutex = new AsyncMutex();
    const log: string[] = [];

    const taskA = mutex.runExclusive(async () => {
      log.push("A-start");
      await new Promise((r) => setTimeout(r, 20));
      log.push("A-end");
      return "a";
    });

    const taskB = mutex.runExclusive(async () => {
      log.push("B-start");
      await new Promise((r) => setTimeout(r, 5));
      log.push("B-end");
      return "b";
    });

    const [a, b] = await Promise.all([taskA, taskB]);
    expect(a).toBe("a");
    expect(b).toBe("b");
    expect(log).toEqual(["A-start", "A-end", "B-start", "B-end"]);
  });

  it("releases lock even after an error", async () => {
    const mutex = new AsyncMutex();

    await expect(
      mutex.runExclusive(async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    const result = await mutex.runExclusive(async () => 42);
    expect(result).toBe(42);
  });

  it("returns the value produced by the work function", async () => {
    const mutex = new AsyncMutex();
    const result = await mutex.runExclusive(async () => "hello");
    expect(result).toBe("hello");
  });

  it("executes a single task without contention", async () => {
    const mutex = new AsyncMutex();
    const result = await mutex.runExclusive(async () => 123);
    expect(result).toBe(123);
  });

  it("processes three tasks in order", async () => {
    const mutex = new AsyncMutex();
    const order: number[] = [];

    const tasks = [1, 2, 3].map((n) =>
      mutex.runExclusive(async () => {
        order.push(n);
        return n;
      }),
    );

    const results = await Promise.all(tasks);
    expect(results).toEqual([1, 2, 3]);
    expect(order).toEqual([1, 2, 3]);
  });
});
