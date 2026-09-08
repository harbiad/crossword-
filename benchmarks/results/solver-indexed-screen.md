# Crossword generation benchmark

Commit: e095dba37cb985912261efd9fd24ff51b54cabc9
Band: beginner; seeds: 1–3; CPU: Apple M4 Pro; Node: v24.10.0

Times below are total generateCrossword milliseconds, including failures. API is measured locally, without network.

| Pool | Size | Answers | Success | Median ms | p95 ms | Slowest ms |
|---|---|---|---:|---:|---:|---:|
| default | 7 | rtl | 100% | 49.4 | 49.4 | 49.4 |
| default | 7 | ltr | 100% | 2294.6 | 4186.1 | 4186.1 |
| default | 9 | rtl | 100% | 107.3 | 120.7 | 120.7 |
| default | 9 | ltr | 100% | 3358.1 | 3432.0 | 3432.0 |
| default | 11 | rtl | 33% | 3603.8 | 3604.1 | 3604.1 |
| default | 11 | ltr | 0% | 9012.2 | 9012.9 | 9012.9 |
| default | 13 | rtl | 33% | 3606.3 | 3606.4 | 3606.4 |
| default | 13 | ltr | 0% | 9023.1 | 9024.0 | 9024.0 |

## Warm API preparation and uncompressed payload

| Pool | Size | Answers | Preparation median ms | Preparation p95 ms | Payload median bytes | Candidates median |
|---|---|---|---:|---:|---:|---:|
| default | 7 | rtl | 0.240 | 0.410 | 76095 | 2000 |
| default | 7 | ltr | 0.215 | 0.390 | 78239 | 2000 |
| default | 9 | rtl | 0.241 | 0.311 | 80633 | 2000 |
| default | 9 | ltr | 0.221 | 0.300 | 81749 | 2000 |
| default | 11 | rtl | 0.244 | 0.451 | 85230 | 2000 |
| default | 11 | ltr | 0.238 | 0.408 | 85057 | 2000 |
| default | 13 | rtl | 0.235 | 0.443 | 89070 | 2000 |
| default | 13 | ltr | 0.270 | 0.327 | 87849 | 2000 |

## Candidates by answer length (median across seeds)

| Pool | Size | Answers | Length: count |
|---|---|---|---|
| default | 7 | rtl | 2: 225, 3: 355, 4: 355, 5: 355, 6: 355, 7: 355 |
| default | 7 | ltr | 2: 57, 3: 389, 4: 389, 5: 389, 6: 388, 7: 388 |
| default | 9 | rtl | 2: 238, 3: 252, 4: 252, 5: 252, 6: 252, 7: 252, 8: 251, 9: 251 |
| default | 9 | ltr | 2: 57, 3: 278, 4: 278, 5: 278, 6: 278, 7: 277, 8: 277, 9: 277 |
| default | 11 | rtl | 2: 200, 3: 200, 4: 200, 5: 200, 6: 200, 7: 200, 8: 200, 9: 200, 10: 200, 11: 200 |
| default | 11 | ltr | 2: 57, 3: 215, 4: 216, 5: 216, 6: 216, 7: 216, 8: 216, 9: 216, 10: 216, 11: 216 |
| default | 13 | rtl | 2: 172, 3: 172, 4: 173, 5: 172, 6: 172, 7: 172, 8: 172, 9: 172, 10: 172, 11: 172, 12: 172, 13: 107 |
| default | 13 | ltr | 2: 57, 3: 176, 4: 177, 5: 177, 6: 177, 7: 177, 8: 177, 9: 177, 10: 177, 11: 176, 12: 176, 13: 176 |

Full per-phase distributions, counts, hashes, machine metadata, and raw seeded samples are in the adjacent JSON file.
Real production wall-clock deadlines remain enabled, so machine load can change outcomes despite identical seeded inputs.
