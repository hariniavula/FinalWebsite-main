<!-- Copilot / AI agent instructions for this repository -->
# Copilot Instructions — DS 4200 Final Project

Purpose: help AI coding agents be productive quickly in this small D3 visualization project.

- **Project entry points:** `index.html` and `main.js` (ES module). The CSV dataset is `shopping_behavior_updated.csv`.

- **Big picture:** a single-page D3 visualization that reads `shopping_behavior_updated.csv`, filters by location and age-group, aggregates purchase totals by gender, and renders a stacked/total bar chart into `#d3-viz`.

- **How the code runs:** open `index.html` in a browser (it loads `d3.v7` from CDN and `main.js` as a module). For local development use a simple HTTP server, e.g. `python3 -m http.server 8000` from the repo root and open `http://localhost:8000`.

- **Key files to read and edit:**
  - `main.js` — core logic: data loading (`d3.csv`), `getAgeGroup`, `aggregateData`, `renderChart`, `initializeFilter`.
  - `index.html` — DOM container IDs: `#d3-viz` and `#age-filter-controls` (used by `main.js`).
  - `shopping_behavior_updated.csv` — source CSV; column referenced by code is `Purchase Amount (USD)`.

- **Important implementation details / gotchas:**
  - The page title and header mention Pennsylvania, but `main.js` currently filters for `Location === 'Massachusetts'` (variable `PAdata` holds filtered data). If you change the location text or filter, keep code and UI consistent.
  - `main.js` maps the CSV columns to fields with these names: `Location`, `Gender`, `Age`, `AgeGroup`, `PurchaseAmount` (derived from `Purchase Amount (USD)`). If the CSV column names change, update the mapping in `loadAndStoreData`.
  - Age groups are defined by the `AGE_GROUPS` array and `getAgeGroup(age)`. The code aggregates either a single selected age-group or a `Total` group for all ages.
  - Aggregation uses `d3.rollup` and `d3.stack` — follow the existing shape: aggregated rows have `Gender`, one or more age-group keys (or `Total`), and `TotalPurchase`.
  - Colors: `d3.schemeCategory10` is used for age groups; `Total` currently uses a fixed color `#4e79a7`.

- **Common edits and examples:**
  - To change the analyzed location from Massachusetts to Pennsylvania, update the filter in `loadAndStoreData`:

    // in `main.js`
    PAdata = rawData.filter(d => d.Location === 'Pennsylvania');

  - To add a new age bucket, update `AGE_GROUPS` and ensure `getAgeGroup` categorizes values accordingly.

  - To change the CSV column for purchase amount, update the parser line in `loadAndStoreData`:

    PurchaseAmount: +d["Purchase Amount (USD)"] // change key if CSV column name differs

- **No build system / tests:**
  - This repo uses no bundler or test runner. There are no automated tests. The quick dev loop is: start an HTTP server, edit `main.js`, reload the page.

- **Debugging tips:**
  - Use browser DevTools console to inspect `PAdata` or call `aggregateData` manually from console (open `main.js` as a module - you can expose helpers temporarily for debugging).
  - Log CSV parse results in `loadAndStoreData` to verify field names and types.

- **Style & conventions specific to this repo:**
  - Keep top-level constants (`DATA_FILE`, `AGE_GROUPS`, `MARGIN`, sizes) at the top of `main.js`.
  - `initialize()` is the single bootstrapping function — keep initialization logic minimal and idempotent.

- **What not to change without confirm:**
  - The DOM IDs (`#d3-viz`, `#age-filter-controls`) — UI wiring expects those exact IDs.
  - The CSV column name `Purchase Amount (USD)` — changing it requires updating parsing code.

- **If you add features:**
  - Add small, focused helper functions in `main.js` rather than large anonymous blocks; keep code readable and maintain the existing pattern of pure transformations followed by rendering.
  - If adding external libraries, prefer CDN usage for quick iteration (consistent with `d3.v7` import) or add a minimal `package.json` if project scales.

If any of the above assumptions are wrong (for example the dataset contains different location names or column headings), tell me which file or CSV header to inspect and I will update these instructions accordingly.

---
Please review and tell me if you want a different tone, more examples, or extra-run commands (e.g., a `package.json` and local dev script). 
