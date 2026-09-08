# Crossword generation benchmark

Commit: e095dba37cb985912261efd9fd24ff51b54cabc9
Band: beginner; seeds: 1–10; CPU: Apple M4 Pro; Node: v24.10.0

Times below are total generateCrossword milliseconds, including failures. API is measured locally, without network.

| Pool | Size | Answers | Success | Median ms | p95 ms | Slowest ms |
|---|---|---|---:|---:|---:|---:|
| 2000 | 7 | rtl | 100% | 360.6 | 480.9 | 480.9 |
| 2000 | 7 | ltr | 90% | 4976.7 | 6024.6 | 6024.6 |
| 2000 | 9 | rtl | 100% | 1362.0 | 3407.8 | 3407.8 |
| 2000 | 9 | ltr | 40% | 8036.2 | 8066.0 | 8066.0 |
| 2000 | 11 | rtl | 50% | 3615.9 | 3619.7 | 3619.7 |
| 2000 | 11 | ltr | 0% | 9023.7 | 9043.6 | 9043.6 |
| 2000 | 13 | rtl | 30% | 3618.0 | 3624.7 | 3624.7 |
| 2000 | 13 | ltr | 0% | 9032.5 | 9038.2 | 9038.2 |

## Warm API preparation and uncompressed payload

| Pool | Size | Answers | Preparation median ms | Preparation p95 ms | Payload median bytes | Candidates median |
|---|---|---|---:|---:|---:|---:|
| 2000 | 7 | rtl | 0.246 | 0.445 | 76089 | 2000 |
| 2000 | 7 | ltr | 0.233 | 0.396 | 78248.5 | 2000 |
| 2000 | 9 | rtl | 0.249 | 0.337 | 80631 | 2000 |
| 2000 | 9 | ltr | 0.232 | 0.329 | 81728.5 | 2000 |
| 2000 | 11 | rtl | 0.255 | 0.458 | 85232 | 2000 |
| 2000 | 11 | ltr | 0.250 | 0.406 | 84963 | 2000 |
| 2000 | 13 | rtl | 0.250 | 0.453 | 89102.5 | 2000 |
| 2000 | 13 | ltr | 0.254 | 0.302 | 87872 | 2000 |

## Candidates by answer length (median across seeds)

| Pool | Size | Answers | Length: count |
|---|---|---|---|
| 2000 | 7 | rtl | 2: 225, 3: 355, 4: 355, 5: 355, 6: 355, 7: 355 |
| 2000 | 7 | ltr | 2: 57, 3: 389, 4: 389, 5: 389, 6: 388, 7: 388 |
| 2000 | 9 | rtl | 2: 238, 3: 252, 4: 252, 5: 252, 6: 252, 7: 252, 8: 251, 9: 251 |
| 2000 | 9 | ltr | 2: 57, 3: 278, 4: 278, 5: 278, 6: 278, 7: 277, 8: 277, 9: 277 |
| 2000 | 11 | rtl | 2: 200, 3: 200, 4: 200, 5: 200, 6: 200, 7: 200, 8: 200, 9: 200, 10: 200, 11: 200 |
| 2000 | 11 | ltr | 2: 57, 3: 215, 4: 216, 5: 216, 6: 216, 7: 216, 8: 216, 9: 216, 10: 216, 11: 216 |
| 2000 | 13 | rtl | 2: 172, 3: 172, 4: 173, 5: 172, 6: 172, 7: 172, 8: 172, 9: 172, 10: 172, 11: 172, 12: 172, 13: 107 |
| 2000 | 13 | ltr | 2: 57, 3: 176, 4: 177, 5: 177, 6: 177, 7: 177, 8: 177, 9: 177, 10: 177, 11: 176, 12: 176, 13: 176 |

Full per-phase distributions, counts, hashes, machine metadata, and raw seeded samples are in the adjacent JSON file.
Real production wall-clock deadlines remain enabled, so machine load can change outcomes despite identical seeded inputs.
