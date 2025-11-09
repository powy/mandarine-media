# Web Navigation Review

## Scope
- App: `apps/web`
- Components: header, context, routing, and dynamic showcase navigation
- Date: 2025-10-28T06:22:59Z

## Key Findings

### Fragmented Menu Coverage
- The header menu draws exclusively from active screen descriptions provided by `AppContext`, excluding the "home" screen and any static routes such as `/films`, `/dramas`, or `/tv-shows`. As a result, registered routes are unreachable via the primary navigation.
- Reference: `apps/web/src/AppContext.tsx:35-72`, `apps/web/src/components/Header.tsx:24-77`, `apps/web/src/MainContent.tsx:24-27`.

### Loading State Causes Error Flash
- While the screen list query is pending, the header returns `null`, which leaves `TopScreen` without the context data it expects. The screen then renders its fallback error state before the fetch resolves, producing a brief but jarring "Screen not found" message.
- Reference: `apps/web/src/components/Header.tsx:16-18`, `apps/web/src/screens/TopScreen.tsx:13-22`.

### Missing Link Semantics
- Menu entries are implemented as plain `<button>` elements keyed by array index. They lack anchor semantics, accessible `aria-current` indicators, and stable keys tied to item IDs. This hampers keyboard navigation and screen-reader feedback.
- Reference: `apps/web/src/components/Header.tsx:67-76`.

### Rough Edges in Data Handling
- Navigation data is capped to the first 10 active screens, there is no fallback when the list is empty, and debug logging remains active. These details signal the navigation layer is still in a provisional state.
- Reference: `apps/web/src/AppContext.tsx:22-66`.

## Recommendations
1. Consolidate the menu source of truth: include the home screen (or equivalent) and align additional routes with the router configuration so navigation coverage is complete.
2. Replace the menu `<button>` elements with `NavLink` (or `Link`) components, add `aria-current`, and key each item by its stable ID.
3. Provide a deterministic loading experience by showing a skeleton/placeholder while screen data is fetched instead of triggering error states.
4. Remove arbitrary fetch limits or implement pagination, and strip console logging from production builds.

## Suggested Follow-Up
- Validate any changes with end-to-end navigation smoke tests to confirm routes remain reachable and protected.
- Coordinate with the design team to ensure any future dynamic screen titles map cleanly to UX copy requirements.