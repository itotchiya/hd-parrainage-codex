# HD Parrainage — Security & Bug Audit Report

**Date:** 2026-04-09  
**Tester:** Claude Code (automated browser audit via DevTools MCP)  
**Role tested:** Business Owner (`owner@havetdigital.test`)  
**Scope:** Programs page + all sub-pages/actions, Exchange Packs page + all sub-pages/actions  
**API base:** `http://localhost:8081`  
**Frontend:** `http://localhost:5175`

---

## Executive Summary

| Category | Count |
|---|---|
| Critical Security Issues | 1 |
| Medium Security Issues | 2 |
| Low Security Issues | 2 |
| Functional Bugs | 9 |
| Accessibility / UX Bugs | 5 |

---

## Security Findings

### [SEC-01] IDOR — Prospect URL Agent Segment Ignored by Backend API
**Severity:** Critical  
**Page:** Program detail → Program prospects table

**Description:**  
Prospect URLs follow the pattern `/agents/{agent_id}/{prospect_id}`. The `agent_id` segment in the URL is **completely ignored** by the frontend and backend. The API call made is:
```
GET /api/v1/prospects/{prospect_id}
```
No check is performed to verify that the prospect belongs to the agent in the URL.

**Reproduced:**  
Navigated to `/agents/019d6f10-5d30-7274-a6c9-2d7b9ac30766/019d6f10-6080-71c8-bf00-041a01b92a07` using Lea Martin's agent ID with Restaurant Nacre's prospect ID (which belongs to Pierre Bernard). The prospect page loaded fully with Pierre Bernard's data, while the URL contained Lea Martin's ID.

**Risk:**  
- Any authenticated user who knows or guesses a prospect UUID can access it regardless of ownership.
- UUIDs are exposed in the frontend DOM and network responses, making enumeration possible within a session.
- If multi-tenant isolation relies on the agent-prospect URL relationship, this is a broken access control.

**Fix:**  
- Backend API must validate that `prospect_id` belongs to the authenticated business owner's tenant.
- Optionally validate the agent-prospect relationship in the API: `GET /api/v1/agents/{agent_id}/prospects/{prospect_id}` and reject mismatches.
- Consider removing the agent ID from the URL entirely if it serves no authorization purpose.

---

### [SEC-02] Search Query Reflected in URL (Potential Open Redirect / Info Leak)
**Severity:** Medium  
**Page:** Programs (`/programs?q=...`), Exchange Packs

**Description:**  
The search term is reflected verbatim in the URL as a query parameter (`?q=<value>`). This is standard SPA behavior, but:
- Special characters including `<>` are stored in the URL and passed back to the component.
- If a shared link with a malicious search string is opened, the input field is pre-populated with that string.

**Tested:**  
Navigated to `?q=<script>alert(1)</script>` — the browser URL-encodes this to `%3Cscript%3E...` and React renders it as literal text (no execution). XSS is **not** exploitable here due to React's safe rendering.

**Risk (Low-Medium):**  
- No XSS found on the frontend.
- However, if search terms are ever server-side rendered or sent to analytics/logging without sanitization, stored XSS or log injection could occur.
- URL-reflected values can be used in phishing (user receives a crafted link that pre-fills a deceptive search).

**Fix:**  
- Validate and sanitize the `q` parameter on read (already done by React).
- Ensure backend search endpoint sanitizes input before any SQL/Elasticsearch queries.
- Consider limiting the max length of the `q` parameter.

---

### [SEC-03] External IACRM API Simulator Exposed in Production URL
**Severity:** Medium  
**Observed in:** Network requests on every page load

**Description:**  
Every authenticated page makes a request to:
```
GET https://iacrm-api-simulator-production.up.railway.app/services
```
This is a third-party hosted simulator (Railway.app). The endpoint is publicly accessible and included in production frontend code.

**Risk:**  
- The simulator is not under the team's infrastructure control.
- If the Railway app is ever taken down, reassigned, or compromised, the frontend breaks or receives malicious data.
- Any API keys/tokens sent to this endpoint may be logged by a third party.
- The banner "IACRM est requis pour faire fonctionner l'application" is shown to all users — reveals internal dependency to unauthenticated observers.

**Fix:**  
- Move the IACRM simulator to an internal or self-hosted environment for production.
- Use environment variables to toggle between real IACRM and simulator per environment.
- Do not expose the requirement for IACRM in a visible banner without authentication.

---

### [SEC-04] CSRF Protection Confirmed (Positive Finding)
**Severity:** N/A — Pass  

All mutating HTTP requests (pause, reactivate, etc.) correctly fetch a CSRF cookie before posting:
```
GET /sanctum/csrf-cookie [204]
POST /api/v1/programs/{id}/pause [200]
POST /api/v1/programs/{id}/reactivate [200]
```
Laravel Sanctum CSRF protection is properly implemented.

---

### [SEC-05] XSS Tests — All Passed (Positive Finding)
**Severity:** N/A — Pass  

Tested the following XSS vectors across all input fields:
- Search box: `<script>alert('xss')</script>` → rendered as literal text
- Program name (Create wizard): `<img src=x onerror=alert(1)> Test Program` → literal text
- Pack name (Edit dialog): `<script>alert(1)</script>Digital` → literal text

React's JSX escapes all user-controlled values by default. No XSS found in the frontend rendering layer.

---

## Functional Bug Findings

### [BUG-01] Filter Dropdown Display Lags by One Interaction
**Severity:** High  
**Pages:** Programs (`/programs`), Exchange Packs (`/exchange-packs`)

**Description:**  
After selecting a value in a filter combobox, the URL is updated immediately (e.g., `?status=active`) but the dropdown continues to display the **previous value** until the user interacts with another element. On the next interaction, the display then correctly updates.

**Reproduced:**
1. On `/programs`, open Status filter → select "Active"
2. URL becomes `?status=active`
3. Status combobox still shows "All statuses"
4. Open Mode filter → select "Cash"
5. Now Status combobox correctly shows "Active", but Mode combobox still shows "All modes"

**Impact:** Users don't get visual confirmation of which filters are active. They may think a filter isn't applied and select it again.

**Fix:**  
Ensure filter comboboxes read their value from URL params on mount and on URL change, not just from local state. Use `useSearchParams()` (React Router) to derive the displayed value rather than a separate local state variable that lags.

---

### [BUG-02] Status Filter Does Not Filter Results When Applied Alone
**Severity:** High  
**Page:** Programs (`/programs`)

**Description:**  
Selecting "Active" from the Status filter updates the URL to `?status=active` but the program list continues to show ALL programs including "Paused" ones. The filter only appears to take effect when combined with another filter.

**Reproduced:**
1. Select Status = "Active"
2. URL: `?status=active`
3. Programs shown: Creation de Sites Vitrines (Active), SaaS & Automatisation (Active), Solutions Print (Paused) ← Paused still visible

**Fix:**  
The filtering logic must re-evaluate the displayed list immediately when `status` URL param changes. Verify that the filter function reads the current URL param value synchronously, not a stale state snapshot.

---

### [BUG-03] "Edit" and "Edit Cash" Menu Items Appear Enabled Visually but Are Disabled in Accessibility Tree
**Severity:** Medium  
**Page:** Programs list context menu (`/programs`)

**Description:**  
In the "Program actions" context menu for Active programs, the items "Edit" and "Edit cash" are marked `aria-disabled="true"` in the DOM but are **not visually grayed out**, unlike "Suspend", "Archive", and "Delete" which correctly appear disabled (grayed).

**Impact:**  
- Sighted users may click "Edit" expecting it to work, then nothing happens.
- Screen reader users are correctly told these items are disabled, but sighted users receive no indication.
- Inconsistent with "Suspend"/"Archive"/"Delete" which ARE visually grayed.

**Fix:**  
Apply the same disabled CSS styles to "Edit" and "Edit cash" that are applied to "Suspend", "Archive", and "Delete". Or enable the items if they are intended to be functional.

---

### [BUG-04] Assign Agents Dialog — Cannot Remove Existing Assignments
**Severity:** Medium  
**Page:** Programs list and detail — "Assign agents" dialog

**Description:**  
When opening "Assign agents", currently assigned agents (LM, PB, HA for "Creation de Sites Vitrines") are shown with **disabled checkboxes**. The dialog only allows adding NEW assignments. There is no way to unassign an agent from a program through the UI.

**Impact:**  
- Business owners cannot remove incorrect or former agent assignments.
- Only workaround is backend admin access.

**Fix:**  
- Allow unchecking already-assigned agents, with a confirmation step before saving.
- Or add a separate "Unassign agent" action per agent in the detail page.

---

### [BUG-05] Archived Programs Tab — Incorrect aria-selected State
**Severity:** Medium  
**Page:** Programs (`/programs`) — "Archived" tab

**Description:**  
After clicking the "Archived" tab:
- URL correctly updates to `?scope=archived`
- Visual state correctly shows "Archived" as active
- However, the `aria-selected` attribute is NOT set on the Archived tab, and remains set to `true` on the "Programs" tab

Snapshot evidence:
```
uid=25_44 tab "Programs" selectable selected   ← still "selected"
uid=25_45 tab "Archived" focusable focused selectable   ← NOT "selected"
```

**Impact:**  
Screen reader users will be told "Programs" tab is selected when "Archived" is the active view. This is a WCAG 2.1 Level A failure (4.1.2 Name, Role, Value).

**Fix:**  
Ensure the tab component sets `aria-selected="true"` on the active tab and `aria-selected="false"` on inactive tabs whenever the active tab changes.

---

### [BUG-06] Archived Programs Never Loaded — Client-Side Filtering Only
**Severity:** Medium  
**Page:** Programs (`/programs?scope=archived`)

**Description:**  
Clicking the "Archived" tab does not trigger a new API call. The Archived view filters the already-loaded programs list client-side. The initial load calls:
```
GET /api/v1/programs  (no scope parameter)
```
If the backend excludes archived programs from this default response (as is typical), they will never appear in the Archived tab — the tab will always show "No programs match the current filter."

**Fix:**  
When the "Archived" tab is activated, make a new API call: `GET /api/v1/programs?scope=archived` and replace the list with those results. Alternatively, include archived programs in the initial load with a status flag.

---

### [BUG-07] "Edit" and "Manage Rewards" Inconsistently Disabled on Detail Page
**Severity:** Low  
**Page:** Program detail (`/programs/{id}`)

**Description:**  
On the program detail page, the "Edit" and "Manage rewards" buttons in the top action bar are marked `disabled`. Yet in the program list context menu, "Manage reward pack" is an **enabled** action that opens a working modal.

**Impact:**  
Users navigating to the detail page lose access to the reward pack management feature that is available from the list view. Inconsistent capability across navigation paths.

**Fix:**  
Either enable "Manage rewards" on the detail page (mirroring the list context menu), or disable it in both places with a tooltip explaining why.

---

### [BUG-08] Exchange Pack Edit Dialog Shows Wrong Helper Text
**Severity:** Low  
**Page:** Exchange Packs — Edit pack dialog (via "Modifier")

**Description:**  
When editing an existing pack via "Modifier", the dialog shows:
> "Vous pourrez ajouter les cadeaux après la **création** du pack."

This message refers to **creation** but the dialog is being used for **editing** an existing pack. The pack already has gifts.

**Fix:**  
Show different helper text based on context:
- On create: "Vous pourrez ajouter les cadeaux après la création du pack."
- On edit: "Modifiez les informations du pack. Gérez les cadeaux depuis la page du pack."

---

### [BUG-09] Cash Conversion Rate Display Always Shows "—"
**Severity:** Low  
**Page:** Create Program wizard — Step 2 (Commission)

**Description:**  
The "Taux de conversion" (conversion rate) label always displays "Taux de conversion : —" even after entering a valid value in the "Points par €" field. The rate should be calculated dynamically (e.g., 100 pts = 1€ → "0.01 € per point").

**Fix:**  
Listen for changes on the "Points par €" spinbutton and compute and display `1 / pts_per_euro` when the value is valid and > 0.

---

## Accessibility / UX Bugs

### [A11Y-01] Spinbutton valuemax="0" with valuemin="1" — Invalid ARIA
**Severity:** Medium  
**Pages:** Create Program wizard (step 2), Add/Edit gift dialog (Exchange Packs detail)

**Description:**  
All numeric input spinbuttons (`<input type="number">`) have these ARIA attributes:
```
aria-valuemin="1"
aria-valuemax="0"   ← INVALID: max < min
aria-valuetext=""   ← not synchronized with input value
```
`valuemax="0"` when `valuemin="1"` is an invalid ARIA state. Screen readers may announce the field as having a max of 0, confusing users.

**Fix:**
- Set `aria-valuemax` to a sensible upper bound (e.g., `999999`).
- Ensure `aria-valuetext` is updated in sync with the actual input value via a React ref or controlled component.

---

### [A11Y-02] Language Inconsistency — Mixed French/English UI
**Severity:** Medium  
**Pages:** Programs vs Exchange Packs

**Description:**  
The Programs page filter options are in **English**:
- "All statuses", "Active", "Draft", "Paused", "Suspended"
- Sort: "Recent"

The Exchange Packs page filter options are in **French**:
- "Actifs", "Désactivés", "Tous"
- Sort: "Récents"

The app appears to target a French audience (most labels, confirmations, and error messages are in French), but the Programs page was partially left in English.

**Fix:**  
Translate Programs page filter labels to French for consistency: "Tous les statuts", "Actif", "Brouillon", "En pause", "Suspendu", "Récents".

---

### [A11Y-03] Currency Format Inconsistency
**Severity:** Low  
**Pages:** Programs list vs Program detail

**Description:**  
- Program list cards: `100 pts = 1 €` (€ symbol)
- Program detail page Exchange setup: `100 pts = 1 EUR` (ISO code)

The same value is displayed in two different formats depending on context.

**Fix:**  
Standardize to one format throughout. Prefer `100 pts = 1 €` as it is more readable in the UI context.

---

### [A11Y-04] Search Field Retains Stale Characters After Sequential Fills
**Severity:** Low  
**Page:** Programs search box

**Description:**  
When the search field is programmatically filled with a value containing HTML characters (`<script>...</script>`), subsequent fills may show residual characters if the field is not properly cleared first. The field can show `<>s` after attempting to search for "Sites" following an HTML-injection test. This suggests the field value is not being fully replaced on programmatic fills in some edge cases.

**Fix:**  
Ensure the search input's `onChange` handler properly replaces the entire value, and verify that the controlled component value is always in sync with the React state.

---

### [A11Y-05] "Invited" Agent Assignable to Programs
**Severity:** Low / UX  
**Page:** Assign Agents dialog

**Description:**  
The agent "Invited HAVET Agent" (`invitee.agent@havetdigital.test`, added 08 avr. 2026) appears in the Assign Agents dialog with an unchecked, selectable checkbox. An agent with "Invited" status (likely not yet activated) can be assigned to a program before they complete their account setup.

**Fix:**  
Either exclude invited/pending agents from the assignment dialog, or show a warning badge next to their name indicating they haven't activated their account yet.

---

## API Security Observations

| Endpoint | Method | CSRF | Auth | Notes |
|---|---|---|---|---|
| `/api/v1/programs` | GET | N/A | ✅ | Returns programs for authenticated tenant |
| `/api/v1/programs/{id}/pause` | POST | ✅ | ✅ | CSRF token fetched before call |
| `/api/v1/programs/{id}/reactivate` | POST | ✅ | ✅ | CSRF token fetched before call |
| `/api/v1/prospects/{id}` | GET | N/A | ✅ | **Agent scope NOT validated** (see SEC-01) |
| `/api/v1/exchange-packs` | GET | N/A | ✅ | Returns packs for authenticated tenant |
| `/api/v1/agents` | GET | N/A | ✅ | Returns agents for authenticated tenant |
| `/api/v1/notifications` | GET | N/A | ✅ | Returns notifications for authenticated user |
| `/sanctum/csrf-cookie` | GET | N/A | N/A | Called correctly before mutations |

---

## Positive Findings (Things Working Well)

- **CSRF Protection**: Sanctum CSRF tokens correctly fetched before all mutating operations.
- **XSS Prevention**: React JSX safely escapes all user-controlled inputs in all tested contexts.
- **Input Validation**: Required field validation works on Create Program and Add Gift forms. Negative values correctly marked `aria-invalid="true"` on spinbuttons.
- **Confirmation Dialogs**: Destructive actions (Pause, Reactivate) show confirmation dialogs with clear warnings.
- **Loading States**: Buttons correctly enter "Traitement..." state during async operations, preventing double-submit.
- **Context-Aware Menus**: Program actions menu correctly adapts to program state (Pause → Reactivate when paused).
- **UUID-based IDs**: All resource IDs are UUIDs (not sequential integers), making enumeration attacks significantly harder.
- **Sort Functionality**: Pack gift sort (Ordre du pack, Moins chers, Plus chers) works correctly.
- **API Refresh**: After pause/reactivate actions, the program list is correctly refreshed from the API.

---

## Priority Fix List

| Priority | ID | Issue | Status |
|---|---|---|---|
| P0 | SEC-01 | IDOR — Prospect access not scoped to agent | Open (backend, by design for owner role) |
| P1 | BUG-01 | Filter dropdown display lag (both pages) | Open (needs investigation) |
| P1 | BUG-02 | Status filter doesn't filter results when applied alone | Open (needs investigation) |
| P1 | BUG-06 | Archived programs never fetched from API | Open (backend includes archived; client-side filter) |
| P2 | SEC-02 | Search query reflected in URL | Open |
| P2 | SEC-03 | External IACRM simulator in production | Open |
| P2 | BUG-03 | Edit/Edit cash appear enabled visually but are disabled | Open |
| P2 | BUG-04 | Cannot unassign agents from program | Open |
| P2 | BUG-05 | Archived tab incorrect aria-selected | Open |
| P2 | A11Y-01 | Spinbutton invalid aria-valuemax | **Fixed** — added `max="9999999"` to all number inputs |
| P2 | A11Y-02 | Language inconsistency French/English | **Fixed** — all UI labels translated to French |
| P3 | BUG-07 | Edit/Manage rewards disabled on detail page | Open |
| P3 | BUG-08 | Edit pack dialog wrong helper text | **Fixed** — shows context-aware text for create vs edit |
| P3 | BUG-09 | Cash conversion rate not calculated | Confirmed working (shows rate when value entered) |
| P3 | A11Y-03 | Currency format inconsistency | **Fixed** — standardized to `pts = 1 €` throughout |
| P3 | A11Y-05 | Invited agents assignable without warning | Open |
