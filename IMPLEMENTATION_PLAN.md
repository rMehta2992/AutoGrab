# Vehicle selection implementation plan

## Goal

Build a small, runnable full-stack application for selecting a vehicle and submitting a plain-text service logbook. The server validates the selected make, model, and badge, then returns the selected vehicle and logbook contents for display on a plain-text `/upload` result page.

## Project structure

```text
.
├── apps/
│   ├── api/
│   │   └── src/
│   │       ├── __tests__/
│   │       ├── app.ts
│   │       ├── index.ts
│   │       ├── routes/
│   │       │   ├── submissions.ts
│   │       │   └── vehicles.ts
│   │       └── vehicles.ts
│   └── frontend/
│       ├── src/
│       │   ├── App.tsx
│       │   ├── UploadResult.tsx
│       │   ├── api.ts
│       │   ├── main.tsx
│       │   ├── styles.css
│       │   └── types.ts
│       └── e2e/
│           └── vehicle-form.spec.ts
├── playwright.config.ts
├── IMPLEMENTATION_PLAN.md
└── README.md
```

Tests are grouped by the application layer they exercise. API tests belong in `apps/api/src/__tests__/`; frontend browser interaction tests belong in `apps/frontend/e2e/`.

## Implementation steps

### 1. Project foundation — complete

- Set up npm workspaces for `apps/api` and `apps/frontend`.
- Use Express and TypeScript for the API, and Vite, React, and TypeScript for the frontend.
- Keep Express app construction separate from the process entry point so tests can create an app without opening a listening port.
- Add root development, type-check, and build scripts.
- Add a health endpoint and a minimal frontend entry point.
- Document Node.js/npm requirements and how to run the project.

**Acceptance criteria**

- `npm ci` installs both workspaces reproducibly from `package-lock.json`.
- `npm run dev` starts the API and frontend together.
- The frontend is reachable locally and `/api/health` returns a successful response.
- `npm run check` and `npm run build` complete successfully.

**Verified:** `npm ci`, `npm run check`, and `npm run build` succeed. The health endpoint is exercised by the Playwright web-server startup check.

### 2. Vehicle data and API — complete

- Add one server-side vehicle map for Ford, BMW, and Tesla.
- Expose the map through `GET /api/vehicles` so the frontend and API validation use the same source of truth.
- Resolve the supplied malformed vehicle data consistently; include 🍌 as the final Ford Falcon Ute badge.
- Add API tests for the map response and relevant invalid requests.

**Acceptance criteria**

- All supplied makes, models, and badges are represented with the agreed ordering.
- Ford Falcon Ute's last badge is 🍌.
- The API returns the options in a predictable, documented JSON shape.

**Verified:** API catalog, validation, and upload boundary tests pass.

### 3. Cascading vehicle form — complete

- Fetch vehicle options from the API.
- Implement Make, Model, and Badge selects with dependent options.
- Clear Model and Badge when Make changes; clear Badge when Model changes.
- Start with an unselected Make control. Reveal Model after Make is selected,
  Badge after Model is selected, and the upload section after Badge is selected.
- Add at least two quick-select buttons that choose complete valid vehicles;
  the current choices are Tesla Model 3 Performance and BMW 130d xDrive 26d.
- Keep all three dropdowns the same width and separate the upload section from
  the dropdowns.
- Keep the file input unavailable until a Badge is selected.
- Add Playwright tests for option changes, dependent resets, quick-selects, and upload gating.

**Acceptance criteria**

- Each select only offers options valid for its parent selection.
- Changing a parent selection cannot leave a stale dependent value selected.
- Quick-select buttons set all three fields to a valid combination.
- The logbook file input becomes available after Badge selection.

**Verified:** Playwright covers dependent options, resets, both quick-selects,
file gating, equal dropdown widths, submission, and returning from the result
view with the browser Back button.

### 4. Logbook submission — complete

- Submit `make`, `model`, `badge`, and one `.txt` logbook as `multipart/form-data`.
- Limit uploads to one file and 1 MiB.
- Accept files exactly 1 MiB and reject files larger than 1 MiB.
- Validate required fields and the vehicle combination on the server.
- Decode valid UTF-8 logbook text in memory; do not persist it.
- Return the validated vehicle selection and logbook contents.
- After successful submission, navigate in the same tab to `/upload` and show
  the returned make, model, badge, and logbook text as plain text. Include
  “there is no spoon” in the success message.
- Use browser history so Back returns to the form with its vehicle selection
  and selected file preserved.
- Handle non-JSON and malformed JSON API responses with visible errors. If the
  result URL is opened without a submission result, show an explicit message.
- Add API and frontend tests for successful submission, invalid combinations, missing files, oversized files, and visible results/errors.

**Acceptance criteria**

- A valid upload navigates to `/upload` in the same tab and displays the
  server-returned vehicle fields and exact logbook text.
- Browser Back returns to the populated form.
- Invalid or missing input produces an explicit client error and a visible message.
- Oversized uploads are rejected.
- User-provided logbook content is never interpreted as HTML.
- The success message includes the required phrase.

**Verified:** API tests cover valid and invalid multipart cases, the exact 1 MiB
boundary, and oversized uploads. Browser tests cover successful same-tab
navigation to `/upload`, the plain-text response, browser Back, and API error
responses.

### 5. Final verification and documentation — complete

- Run the project checks, tests, and production builds.
- Verify the README setup instructions from a clean install.
- Update the README with API endpoints, request format, validation behavior, and test commands.
- Rehearse a short walkthrough of manual selection, quick-select, upload, and error handling.

## Proposed test tooling

Use Node's built-in `node:test` and `node:assert/strict` for API tests. The API route test uses Node's built-in `fetch` against a temporary local server. Use Playwright with Chromium for browser-level frontend interaction tests in `apps/frontend/e2e/`.

## Scope boundaries

- No database or upload persistence: submissions are validated and returned immediately.
- No authentication or deployment configuration.
- Keep the form close to the supplied demonstration: compact native controls,
  cascading selection, separate upload section, and quick-select buttons.
- The result page is intentionally plain text, matching the demonstration.

## Engineering considerations and trade-offs

- Keep vehicle data server-owned so the API can validate exactly what the UI offers; avoid duplicating the map.
- Keep uploads in memory only because the requirement asks to return the contents, not retain them. Bound upload size and file count.
- Treat the browser's file type and extension as hints, not security checks; render returned logbook text as text.
- Prefer a few focused modules and behavior-oriented tests over speculative abstractions or broad snapshot coverage.
- The `/upload` result uses same-tab client-side history. The result is held in
  the current history state, so browser Back restores the form; directly
  opening or refreshing `/upload` without that state shows a useful message.
- API response parsing distinguishes HTTP errors from malformed JSON, so
  non-JSON server/proxy responses do not leak a raw JSON parser error to users.
- Add persistence, authentication, or more elaborate upload handling only if requirements justify them.

## Current validation status

- `npm test` passes 13 API tests and 5 Playwright Chromium tests.
- Frontend TypeScript checking and production build pass with the installed
  workspace toolchain.
- In the current local environment, the root `npm run check` and API build can
  be blocked by empty duplicate type-definition directories under
  `node_modules/@types` (directories whose names end in ` 2`). This is an
  installed-dependency state issue; a clean `npm ci` should be used to verify
  the repository in a fresh environment.
