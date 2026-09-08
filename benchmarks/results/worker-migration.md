# Web Worker migration verification

The app still fetches vocabulary from `/api/generate`. It then sends the pool to a Vite module worker, awaits the generated crossword, and updates React state. The existing loading indicator and at-most-one fresh-pool retry are preserved. React no longer imports or invokes the solver at runtime.

Each New Puzzle operation owns an AbortController covering its API fetch and worker job. Starting a newer operation or unmounting cancels the old operation. Cancellation terminates the worker. Request IDs reject stale worker messages, and React checks the current operation before setting the puzzle, errors, or loading state. A completion already queued before cancellation cannot replace the newer puzzle.

Messages use native structured cloning, preserving `Cell.entries` Sets and all Entry fields including `isInverted`. There is no JSON conversion of worker results. The solver, structural validation, traversal, input/navigation behavior, API shape, and UI design are unchanged.

Handled errors include empty generation results (one controlled fresh-pool retry), caught worker exceptions, worker startup/runtime errors, message encoding/decoding errors, API errors, and cancellation. Cancellation is silent and does not clear a newer request's loading state. Worker failures display a short user-facing message.

## Checks

- `npm test`: **202 tests passed**, including ten new worker/async-retry tests.
- `npm run test:worker`: **4 production-worker integration tests passed**. This command builds first, then runs the actual Vite worker asset in Node worker_threads with a browser-messaging adapter.
- `npm run lint`: passed.
- `npm run build`: passed. The worker is emitted separately (`crossword.worker-CIYwymWd.js`, 26.82 kB). The main JavaScript bundle is 208.57 kB and contains no solver code.
- Existing local solver benchmark: **54/80 successful puzzles**, unchanged from the pre-worker run; **zero invalid returned puzzles**. Both modes and all four sizes are included. This benchmark measures the unchanged solver, not worker startup/network/UI latency.

## Responsiveness evidence and limitation

During an actual **4,519 ms** 13×13 English search in the built worker, the host event loop processed **410** scheduled timer callbacks. The largest observed timer gap was **17.66 ms**. The worker returned an empty puzzle, consistent with the existing 13×13 English generation limitation; the scheduling assertions did not skip or hide that failure.

The integration checks also obtained valid 7×7 Arabic and English puzzles from the worker and verified structural validation, Set preservation and inversion metadata.

**Browser UI responsiveness has not been directly confirmed.** No browser was connected in this session. The Node integration result confirms off-thread execution and host scheduling, but is not a mobile/desktop browser interaction test. Browser verification remains pending: generate a 13×13 puzzle, interact with settings/current-grid controls while it is building, and verify responsiveness and latest-request behavior on desktop and mobile layouts.

## Reproduce

```sh
npm test
npm run test:worker
CROSSWORD_BENCH_OUTPUT=benchmarks/results/worker-solver-regression.json npm run bench:crossword
npm run lint
npm run build
```

- [Actual worker integration measurements](worker-integration.json)
- [Solver regression benchmark](worker-solver-regression.json)
