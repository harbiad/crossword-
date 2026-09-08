# Crossword generation benchmark

Commit: e095dba37cb985912261efd9fd24ff51b54cabc9
Band: beginner; seeds: 1–10; CPU: Apple M4 Pro; Node: v24.10.0

Times below are total generateCrossword milliseconds, including failures. API is measured locally, without network.

| Pool | Size | Answers | Success | Median ms | p95 ms | Slowest ms |
|---|---|---|---:|---:|---:|---:|
| default | 7 | rtl | 100% | 3.4 | 7.3 | 7.3 |
| default | 7 | ltr | 100% | 541.7 | 2131.0 | 2131.0 |
| default | 9 | rtl | 100% | 7.6 | 47.0 | 47.0 |
| default | 9 | ltr | 90% | 1754.7 | 3991.6 | 3991.6 |
| default | 11 | rtl | 70% | 522.8 | 1804.1 | 1804.1 |
| default | 11 | ltr | 0% | 4502.7 | 4503.2 | 4503.2 |
| default | 13 | rtl | 50% | 1744.5 | 1806.9 | 1806.9 |
| default | 13 | ltr | 0% | 4512.9 | 4514.4 | 4514.4 |

## Warm API preparation and uncompressed payload

| Pool | Size | Answers | Preparation median ms | Preparation p95 ms | Payload median bytes | Candidates median |
|---|---|---|---:|---:|---:|---:|
| default | 7 | rtl | 0.236 | 0.399 | 76089 | 2000 |
| default | 7 | ltr | 0.218 | 0.375 | 78248.5 | 2000 |
| default | 9 | rtl | 0.243 | 0.319 | 80631 | 2000 |
| default | 9 | ltr | 0.217 | 0.305 | 81728.5 | 2000 |
| default | 11 | rtl | 0.245 | 0.430 | 85232 | 2000 |
| default | 11 | ltr | 0.225 | 0.375 | 84963 | 2000 |
| default | 13 | rtl | 0.240 | 0.435 | 89102.5 | 2000 |
| default | 13 | ltr | 0.236 | 0.330 | 87872 | 2000 |

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
