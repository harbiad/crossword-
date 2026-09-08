# Crossword generation benchmark

Commit: e095dba37cb985912261efd9fd24ff51b54cabc9
Band: beginner; seeds: 1–10; CPU: Apple M4 Pro; Node: v24.10.0

Times below are total generateCrossword milliseconds, including failures. API is measured locally, without network.

| Pool | Size | Answers | Success | Median ms | p95 ms | Slowest ms |
|---|---|---|---:|---:|---:|---:|
| default | 7 | rtl | 100% | 351.6 | 480.2 | 480.2 |
| default | 7 | ltr | 90% | 4963.6 | 6014.6 | 6014.6 |
| default | 9 | rtl | 100% | 1321.6 | 3408.7 | 3408.7 |
| default | 9 | ltr | 40% | 8026.3 | 8047.7 | 8047.7 |
| default | 11 | rtl | 50% | 3614.8 | 3617.3 | 3617.3 |
| default | 11 | ltr | 0% | 9024.1 | 9026.3 | 9026.3 |
| default | 13 | rtl | 30% | 3617.6 | 3623.6 | 3623.6 |
| default | 13 | ltr | 0% | 9031.9 | 9036.6 | 9036.6 |

## Warm API preparation and uncompressed payload

| Pool | Size | Answers | Preparation median ms | Preparation p95 ms | Payload median bytes | Candidates median |
|---|---|---|---:|---:|---:|---:|
| default | 7 | rtl | 0.273 | 0.403 | 76089 | 2000 |
| default | 7 | ltr | 0.261 | 0.400 | 78248.5 | 2000 |
| default | 9 | rtl | 0.279 | 0.346 | 80631 | 2000 |
| default | 9 | ltr | 0.262 | 0.324 | 81728.5 | 2000 |
| default | 11 | rtl | 0.293 | 0.472 | 85232 | 2000 |
| default | 11 | ltr | 0.257 | 0.402 | 84963 | 2000 |
| default | 13 | rtl | 0.282 | 0.490 | 89102.5 | 2000 |
| default | 13 | ltr | 0.281 | 0.312 | 87872 | 2000 |

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
