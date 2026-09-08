# One-puzzle look-ahead latency

Measured 2026-09-08, Node v24.10.0, five seeds per configuration, beginner level. Actual Vite-built worker and local API, with deterministic API/solver randomness. No solver or API changes in this comparison.

**This is a request-to-ready proxy, not measured browser click-to-paint latency.** Network latency, React rendering, and the one-second idle delay before speculation are excluded. The before path fetches locally and constructs using the existing bounded retry flow; the after path consumes an already completed cache. Browser access was unavailable. Timing budgets still make generation outcomes machine-dependent.

| Size | Answers | Initial successes | Cache ready / background attempts | Before median / p95 ms (paired hits) | Ready cache median / p95 ms |
|---|---|---:|---:|---:|---:|
| 7 | Arabic (EN→AR) | 5/5 | 5/5 | 23.858 / 34.101 | 0.015 / 0.022 |
| 7 | English (AR→EN) | 5/5 | 5/5 | 27.188 / 36.041 | 0.014 / 0.019 |
| 9 | Arabic (EN→AR) | 5/5 | 5/5 | 28.376 / 29.908 | 0.017 / 0.019 |
| 9 | English (AR→EN) | 5/5 | 5/5 | 546.219 / 5131.627 | 0.016 / 0.043 |
| 11 | Arabic (EN→AR) | 5/5 | 5/5 | 37.450 / 1856.460 | 0.013 / 0.025 |
| 11 | English (AR→EN) | 0/5 | 0/0 | — / — | — / — |
| 13 | Arabic (EN→AR) | 2/5 | 2/2 | 238.937 / 423.261 | 0.018 / 0.029 |
| 13 | English (AR→EN) | 0/5 | 0/0 | — / — | — / — |

All 27 successful initial puzzles yielded a distinct, validated cached replacement. The 13 initial generation failures remain counted: English 11×11 and 13×13 each failed 5/5, and Arabic 13×13 failed 3/5. No background attempt is possible without an initial successful puzzle. This change does not repair existing generator reliability. Raw results include failure-inclusive timings, slowest values, background durations, and individual seeds.

Cache availability here is measured after waiting for the background attempt to finish; it is not a prediction of real user hit rate. Clicking before it is ready, changing settings, or cancelling speculation produces a cache miss and uses the existing foreground generation flow. A ready hit avoids the API fetch and worker startup/search; React still needs to render the puzzle.

Production behavior: wait one second after display, then make one worker attempt using the same vocabulary pool, without another API request. Keep one puzzle and eight recent solution signatures in memory. Invalidate on size/level/mode changes. Foreground requests abort speculation immediately. Hidden pages do not begin speculation and abort running background work. Failed, duplicate, or interrupted attempts do not restart automatically; a new displayed puzzle grants one new attempt.

Reproduce with `npm run bench:lookahead`; increase coverage with `CROSSWORD_LOOKAHEAD_SEEDS=20 npm run bench:lookahead`. Raw results: [lookahead-latency.json](lookahead-latency.json).
