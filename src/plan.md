## Completed: CEFR Level Filtering (Feb 2026)

### What was done
Added CEFR difficulty levels to filter dictionary words by user-selected difficulty.

### Files created/modified
- **`api/cefr_levels.ts`** (NEW): CEFR level lookup module
  - `CefrLevel` type: `'A' | 'B' | 'C'`
  - `LEVEL_A_WORDS`: ~200+ curated beginner words
  - `LEVEL_B_WORDS`: 70 curated intermediate words
  - `LEVEL_C_WORDS`: 56 curated advanced words
  - `getWordLevel(word, indexInDict?)`: Returns level via curated lookup + heuristics
  - `isLevelAllowed(level, band)`: Filters by user's difficulty selection

- **`api/generate.ts`** (MODIFIED): Reduced from 728 → 279 lines
  - `buildCandidateWords(band, dict)`: Now filters by CEFR level
    - Beginner: only 'A' words
    - Intermediate: 'A' + 'B' words
    - Advanced: all words
  - Cascading fallback: If <200 candidates, auto-expands to more levels
  - Removed: `DICT_A1_A2`, `DICT_B1_B2`, `DICT_C1_C2`, `WORDS_*` arrays, unused functions

### How CEFR levels are determined (runtime, not in dictionary)
1. Check curated word sets in `cefr_levels.ts`
2. If not found, apply heuristics:
   - First 2000 words in dict → 'B' (frequency-based)
   - Words 9+ characters → 'C'
   - Default → 'C'

### Future improvements
- Can refine curated word lists in `api/cefr_levels.ts` anytime
- Could add level field directly to dictionary entries for more accuracy

---

## Updated professional prompt for your coding agent (copy/paste)

You are working on my crossword puzzle generator app.

### Context

* The app supports two modes:

  * **EN→AR**: shows **English vocab clues** and the user fills **Arabic answers**.
  * **AR→EN (vice versa)**: shows **Arabic vocab clues** and the user fills **English answers**.
* Current bugs:

  1. **Letters overwrite each other** at intersections (conflicting chars can occupy the same cell).
  2. Special clues like **“Double E / Double T / Triple I”** are poorly worded.
  3. Grid **numbers should follow RTL** when answers are Arabic, and **LTR** when answers are English. Currently numbers always behave LTR.
  4. Many generated words **do not cross** (disconnected islands); I need a proper crossword where answers intersect and the whole grid is connected.

### Global constraints (must always hold)

1. **No empty cells**: every cell is either a **letter** or a **black block**. There must be **zero blank/unused cells** in the final grid.
2. **Block runs constraint**: there must be **no more than two consecutive black blocks** in any row (across) or column (down).
3. Puzzle must be **valid**:

   * No conflicting letters in a shared cell
   * Entries spell correctly on the grid
   * Whole puzzle is **one connected component** (all letters connected via crossings)

---

## Your tasks (implementation)

### 1) Fix overwriting / conflicting intersections (grid as single source of truth)

Refactor the grid so it is the authoritative representation:

* Each cell must be exactly one of:

  * `{ type: 'block' }`
  * `{ type: 'letter', char: string, entries: Set<entryId> }`
* **No cell may be empty/undefined** at the end of generation. (During generation, you may use temporary state, but the final emitted grid must be fully filled.)

Placement rules:

* When placing a new entry:

  * If a target cell is `block` → reject placement
  * If it is `letter` with same char → OK (valid intersection)
  * If it is `letter` with different char → reject (conflict)
* After placing all entries, run validation to ensure every entry’s letters match the grid.

### 2) Enforce real crossings + single connected component

Update the placement algorithm so words actually cross:

* Place longest word first near center.
* For each next word, generate candidate placements by aligning matching letters with existing grid letters.
* Score candidates heavily by intersection count.
* Prefer placements that increase connectivity and avoid isolated islands.
* After placement, verify:

  * All letter cells are in **one connected component** (BFS/DFS over letter cells using 4-neighbor adjacency).
  * Reject/regenerate/backtrack if multiple components exist.

Add a configurable constraint such as:

* At least **X%** of entries must have ≥1 intersection (e.g., 80%).
* Total intersections must exceed a minimum threshold based on grid size / word count.

### 3) Enforce “no empty cells” + block run constraint (<= 2 consecutive blocks)

After placing entries (and before finalizing):

1. **Fill remaining cells** (since no empties allowed):

   * Convert unused/unfilled cells into `block` by default **only if** doing so does not violate the “<= 2 consecutive blocks” rule.
2. Enforce **no more than 2 consecutive blocks** in any row/column:

   * Scan each row and column; if there are runs of 3+ blocks, fix by:

     * Preferably regenerating with different placement / backtracking earlier, OR
     * Converting some blocks to letters ONLY if you have a valid strategy for filler letters (recommended: avoid random filler letters unless you also generate matching clues; better approach is: use regeneration/backtracking so the final grid naturally satisfies constraints without filler-letter inventing).
3. Ensure the final grid has:

   * 0 empty cells
   * block runs <= 2 across and down
   * still one connected component for letters
   * still valid entries

### 4) RTL/LTR numbering + across direction

Add `answerDirection: 'rtl' | 'ltr'` derived from current mode:

* EN→AR => Arabic answers => `rtl`
* AR→EN => English answers => `ltr`

Across direction:

* If `ltr`: across runs **left→right**
* If `rtl`: across runs **right→left**

Numbering rules:

* Generate clue numbers by scanning in reading order:

  * `ltr`: rows top→bottom, cols left→right
  * `rtl`: rows top→bottom, cols right→left
* A cell gets a number if it starts an across or down entry:

  * Across start depends on direction:

    * LTR across start: letter cell AND (left is edge/block) AND (right is letter)
    * RTL across start: letter cell AND (right is edge/block) AND (left is letter)
  * Down start: letter cell AND (top is edge/block) AND (bottom is letter)

UI rendering:

* Make clue numbers visually anchor to the “start” corner using logical CSS:

  * Use `inset-inline-start` instead of hardcoded `left`
  * Set `dir` and alignment based on `answerDirection`

### 5) Improve repeated-letter clue formatting (Double/Triple)

Replace “Double E”, “Double T”, “Triple I”, etc. with a consistent system:

* When answers are in **English**:

  * Clue title: **“Repeated letters”**
  * Format: **“E ×2”**, **“T ×2”**, **“I ×3”**, **“R ×2”**
* When answers are in **Arabic**:

  * Clue title: **“حروف متكررة”**
  * Keep the same symbol format for the repeated letter token: **“E ×2”**, **“I ×3”** etc. (unless you explicitly want Arabic letter tokens; do not translate the Latin letter itself unless specified)

Implement:

* A formatter that detects patterns like `Double X`, `Triple X`, `n repeated X`, etc., and outputs:

  * `X ×2` for double
  * `X ×3` for triple
* Attach these under the correct clue grouping with the proper localized title (“Repeated letters” / “حروف متكررة”) depending on the **answer language**.

### 6) Add validation + tests (must-have)

Implement `validatePuzzle(grid, entries, answerDirection)` that asserts:

* No cell conflicts (one char per letter cell; blocks don’t contain letters)
* Every entry spells correctly on grid
* Every intersection has matching chars
* All letter cells are one connected component
* No empty cells exist (every cell is letter or block)
* No row/column contains >2 consecutive blocks
* Numbering correctness for rtl/ltr across rules

Automated tests:

* Run generation 100–500 times with randomized vocab lists and random seeds.
* Fail fast with a useful diagnostic report and seed reproduction info.

---

### Acceptance criteria (must pass)

* Conflicting overlaps never occur; placement rejects conflicts.
* Final grid has **no empty cells**.
* No row/column has **3+ consecutive black blocks**.
* All letters are in **one connected component** and most words intersect.
* RTL mode: across right→left + numbering scan RTL + numbers anchor correctly.
* LTR mode: across left→right + numbering scan LTR.
* Repeated-letter clues display under:

  * “Repeated letters” (English) or “حروف متكررة” (Arabic)
  * with tokens like “E ×2”, “I ×3”, etc.

* Different forms of the same Arabic letter were causing mismatches at intersections:                                                                                
  - Ok for this: Alef variants: أ إ آ ٱ → all normalized to ا                                                             
  - No for this: Yeh variants: ى (alef maksura) → normalized to ي                                                                                                                 
     
### Deliverables

Return:

* Summary of changes
* Key files/functions modified
* New/updated tests and exact commands to run them
* Notes on any algorithmic tradeoffs (regen vs backtracking) and configuration values used



From this latest screenshot, a few issues are still visible:

### Problems I can see

1. **RTL numbering is still wrong (Arabic answers mode)**

* In the grid, clue numbers are still appearing as if “across” starts **left→right** (numbers sit on the left edge of across words).
* In Arabic-answer mode, across words are effectively **right→left**, so the **number must be on the rightmost cell** of the across answer.
* Also the number badge is still visually anchored to the **top-left** of the cell, not the **start edge** (top-right in RTL).

2. **Repeated-letter clues are still not fixed**

* The clue list still shows items like **“Double N / Double C / Double L”**.
* You wanted these to be under a dedicated clue heading:

  * English: **“Repeated letters”**
  * Arabic: **“حروف متكررة”**
* And the clue text should be formatted like **“N ×2”, “C ×2”, “L ×2”** (not “Double N”).

3. **(Likely UX bug to fix with RTL across) Cursor/input direction**

* In Arabic-answer mode, when the user types an across answer, the caret should advance **to the left** (RTL), and backspace should move right accordingly.
* Even if placement is RTL internally, many crossword UIs still move the cursor LTR unless explicitly coded.

Below is an updated “coding agent” prompt that targets exactly these remaining problems.

---

## Updated prompt for your coding agent (copy/paste)

You are working on my crossword puzzle generator + UI.

### Context

* Two modes:

  * **EN→AR**: English clues, Arabic answers (answers are RTL)
  * **AR→EN**: Arabic clues, English answers (answers are LTR)
* Global constraints must still hold:

  * No empty cells (each cell is letter or block)
  * No more than two consecutive blocks across/down
  * No conflicting overlaps
  * One connected component for all letters

### Remaining bugs to fix (based on current output screenshot)

## 1) Fix RTL numbering for Arabic-answer mode

In **Arabic answers (RTL)** mode:

* Across answers run **right→left**.
* The **start cell** of an across entry is the **rightmost** cell of that entry.
* Currently, numbers are still assigned/placed as if across starts left→right.

### Implementation requirements

* Number assignment must depend on `answerDirection`:

  * LTR: scan cols left→right; across-start = (left is edge/block)
  * RTL: scan cols right→left; across-start = (right is edge/block)

**Across-start detection**

* LTR across start:

  * cell is letter AND (c==0 OR left is block) AND (right is letter)
* RTL across start:

  * cell is letter AND (c==last OR right is block) AND (left is letter)

**Number scan order**

* LTR: rows top→bottom, cols left→right
* RTL: rows top→bottom, cols right→left

**UI placement/alignment**

* The clue number badge must anchor to the logical “start” corner:

  * Use logical CSS (e.g., `inset-inline-start`) instead of `left`
  * Set `dir` on the cell/number element based on `answerDirection`
  * For RTL, the number should appear top-right; for LTR top-left

## 2) Fix repeated-letter clues display + localization

Currently clues show “Double N”, “Double C”, “Double L”… This must be replaced.

### Requirements

* These clues must be grouped under a dedicated heading:

  * If clue language is English: heading = **“Repeated letters”**
  * If clue language is Arabic: heading = **“حروف متكررة”**
* Each repeated-letter clue text must be formatted like:

  * `N ×2`, `C ×2`, `L ×2`, `I ×3`, etc.
* Remove/stop displaying “Double X / Triple X” in the Across/Down lists.

  * They should appear only under the “Repeated letters / حروف متكررة” section.
* Implement a formatter that converts any internal representation (Double/Triple/etc.) into:

  * `X ×2` or `X ×3`

## 3) Fix typing/cursor direction for RTL across entries (UX)

In Arabic-answer mode:

* When the active direction is **Across**, typing should advance the cursor **one cell to the left**.
* Backspace should move in the opposite direction appropriately.
* Arrow navigation should follow direction:

  * Across RTL: left arrow moves forward in the word (toward earlier cells), right arrow moves backward, etc. (choose a consistent rule and document it)
* For Down entries, movement remains top→bottom in both modes.

## 4) Add regression checks to prevent this from coming back

Extend `validatePuzzle(...)` / UI tests to assert:

* For RTL mode, each across entry’s number is located at the entry’s **rightmost cell**
* Number scan order matches RTL (right→left)
* Repeated-letter clues are not present as “Double/Triple …” anywhere in Across/Down lists
* Repeated-letter clues appear under the localized heading and use `X ×n` format
* Cursor movement for Across respects RTL mode

### Deliverables

* List files/functions changed (generator + numbering + UI cell rendering + clue panel)
* Brief explanation of logic changes
* Tests added + how to run them
