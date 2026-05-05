# UI System Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh the Vue/Vuetify UI into a calmer, more modern enterprise interface without changing user flows, API contracts, or copy.

**Architecture:** Keep the current component structure. Apply the redesign through foundation tokens, Vuetify theme tokens, shared UI primitives, shell CSS, and only targeted feature CSS where old visual assumptions leak through.

**Tech Stack:** Vue 3, Vite, Vuetify 3, CSS custom properties, TypeScript.

---

### Task 1: Foundation Tokens

**Files:**
- Modify: `frontend/src/styles/foundation/tokens.css`
- Modify: `frontend/src/theme/theme-tokens.ts`
- Modify: `frontend/src/theme/vuetify-light-theme.ts`
- Modify: `frontend/src/theme/button-state-map.ts`

- [ ] Replace the warm paper/ivory palette with neutral light surfaces, teal action color, and accessible semantic status colors.
- [ ] Reduce radii to an enterprise scale: panel/card radius 8px, controls 8px, chips 6px.
- [ ] Remove decorative button gradients; use solid primary and subtle secondary states.
- [ ] Keep existing token names where possible to avoid broad component rewrites.

### Task 2: Shared Primitives

**Files:**
- Modify: `frontend/src/styles/foundation/base.css`
- Modify: `frontend/src/styles/layout/primitives.css`
- Modify: `frontend/src/styles/ui/primitives.css`
- Modify: `frontend/src/styles/vendors/vuetify.css`

- [ ] Make panels white or near-white with crisp borders and low shadows.
- [ ] Make form fields white with clearer border/focus states.
- [ ] Make table headers neutral and rows denser.
- [ ] Remove negative letter spacing from headings touched by the redesign.

### Task 3: Shell And Mobile Density

**Files:**
- Modify: `frontend/src/styles/layout/shell.css`

- [ ] Reduce sidebar width and padding.
- [ ] Make nav active/hover states clearer.
- [ ] On mobile, collapse the vertical nav footprint into a horizontal scrollable nav.
- [ ] Keep account controls intact.

### Task 4: Feature CSS Cleanup

**Files:**
- Modify only if needed: `frontend/src/styles/features/*.css`

- [ ] Replace old warm-card assumptions where the new tokens produce low contrast or excessive softness.
- [ ] Keep layout and UX decisions unchanged.

### Task 5: Verification

**Commands:**
- `npm run build` from `frontend`
- `npm run ui:snap` from `frontend`

- [ ] Build must pass.
- [ ] Snapshot run should produce updated screenshots. Known risk: training scenarios may still fail on the existing `Backend Core` option timeout.
