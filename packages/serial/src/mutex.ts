/**
 * A simple async mutual-exclusion lock.
 *
 * Queued callers execute one at a time in FIFO order, even when
 * multiple `runExclusive` calls are issued concurrently.
 */
export class AsyncMutex {
  private tail: Promise<void> = Promise.resolve();

  /**
   * Executes `work` while holding the lock exclusively.
   * Subsequent callers are queued until the current holder finishes.
   *
   * @param work - Async function to run under the lock.
   * @returns The value returned by `work`.
   */
  async runExclusive<T>(work: () => Promise<T>): Promise<T> {
    const runAfter = this.tail;
    let release!: () => void;
    this.tail = new Promise<void>((resolve) => {
      release = resolve;
    });

    await runAfter;
    try {
      return await work();
    } finally {
      release();
    }
  }
}
