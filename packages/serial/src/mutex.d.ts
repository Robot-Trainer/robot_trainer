/**
 * A simple async mutual-exclusion lock.
 *
 * Queued callers execute one at a time in FIFO order, even when
 * multiple `runExclusive` calls are issued concurrently.
 */
export declare class AsyncMutex {
    private tail;
    /**
     * Executes `work` while holding the lock exclusively.
     * Subsequent callers are queued until the current holder finishes.
     *
     * @param work - Async function to run under the lock.
     * @returns The value returned by `work`.
     */
    runExclusive<T>(work: () => Promise<T>): Promise<T>;
}
//# sourceMappingURL=mutex.d.ts.map