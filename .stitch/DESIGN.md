# Design System: OpenCampus

## 1. Visual Theme & Atmosphere

OpenCampus should feel like a calm academic desk, not a chatbot showroom, not a developer console, and not a fintech dashboard. The atmosphere is steady, trustworthy, and desk-like: local-first, read-only, student-first, and structured before clever. The visual density sits in the middle: enough information to make decisions quickly, but never a wall of equal-weight cards. Motion should stay restrained and purposeful, like a drawer opening on a well-built cabinet rather than a marketing animation.

Donor order is fixed:

- **Notion = primary** for layout rhythm, information hierarchy, borders, and paper-like workbench structure
- **Claude = secondary** only for the warmth and humanity of the AI explanation lane
- **Raycast = secondary** only for the compact shell and launcher feel of the extension chrome

Never invert this donor order:

- do not make the whole product Claude-first
- do not make the whole product Raycast/Linear-first
- do not make the web surface feel like a landing page before it feels like a desk
- do not make the extension feel like a mini dashboard before it feels like a companion

## 2. Color Palette & Roles

- **Paper Canvas** (`#F5F4EE`) — Primary app background, large page wash, low-glare reading surface
- **Ivory Surface** (`#FBFAF6`) — Main cards and orientation containers
- **Pine Ink** (`#27483D`) — Primary headings, key labels, important totals
- **Slate Moss** (`#4E665E`) — Secondary body text, helper copy, muted evidence
- **Mist Border** (`#DCE8E1`) — Structural separators, panel borders, quiet dividers
- **Campus Green** (`#1F5D4B`) — Primary action color, active tabs, focus rings, trusted states
- **Copper Signal** (`#A8622A`) — Single accent for export emphasis, warnings, and step highlights
- **Soft Warning** (`#B36B2C`) — Partial or confirm-required states
- **Quiet Danger** (`#A14343`) — Honest blockers and manual-only red-zone messaging

Rules:
- Use one accent family at a time. `Copper Signal` should only appear when the interface is guiding the next meaningful action.
- Never use pure black.
- Never use neon purple, neon blue, glowing gradients, or the old teal/orange SaaS wash as the dominant atmosphere.
- Keep the background family warm-neutral and stable across extension and web.

## 3. Typography Rules

- **Display / Headings:** `Geist, "Plus Jakarta Sans", "Segoe UI", system-ui, sans-serif`
  - Tight tracking, strong but not loud, hierarchy through weight and contrast instead of giant size jumps
- **Body:** `Geist, "Plus Jakarta Sans", "Segoe UI", system-ui, sans-serif`
  - Relaxed leading, max readable line length around 65 characters
- **Mono / Data labels:** `"Geist Mono", "SFMono-Regular", "SF Mono", Consolas, monospace`
  - For timestamps, counts, compact receipts, and high-density metrics

Banned:
- `Inter`
- Generic serif stacks
- Decorative gradient headline treatments
- Oversized hero typography that makes the product feel like a landing page

## 4. Component Stylings

- **Orientation cards:** Large, softly rounded, lightly bordered, and slightly warmer than the page background. These answer: where am I, what is ready, what should I do next.
- **Decision cards:** Medium-weight containers with quiet borders and small shadow depth. Use them for focus queue, weekly load, trust summary, merge health, and AI boundary explanations.
- **Evidence cards:** Lighter weight than decision cards. Prefer border and spacing over dramatic fills.
- **Buttons:** Primary buttons use `Campus Green` with light text; secondary buttons are outlined or ghosted. No neon glows. Active state should feel tactile through a small translate and shadow reduction.
- **Badges:** Badge color must always be paired with plain language. `ready`, `partial`, `blocked`, and `manual-only` must remain readable without color alone.
- **Forms:** Labels stay above inputs. Advanced runtime controls belong in disclosure sections, not in the primary orientation layer.
- **AI panels:** AI is an explanation rail, not the visual protagonist. Show boundary and evidence first, composer second, advanced runtime controls last.

## 5. Layout Principles

Surface roles are fixed:

- **Extension sidepanel** = Raycast shell + Notion content order
- **Extension popup** = launcher-first pulse surface
- **Extension options** = trust center and authorization desk
- **Web** = broader Notion-style workbench for review, comparison, and export
- **AI lane** = Claude-like warm explanation strip, never the global protagonist

- Extension sidepanel is assistant-first:
  - Top bar
  - context + trust + readiness companion card
  - question composer
  - compact trust strip
  - collapsed detailed workspace
- Popup is launcher-first:
  - pulse summary
  - fast actions
  - one quiet note about readiness
- Options is summary-first:
  - connection summary
  - language and BFF status
  - authorization center
  - boundary disclosure
  - site overrides
  - advanced runtime controls
- Web is workbench-first:
  - orientation header
  - trust rail and AI rail within the first 1.5 screens
  - decision workspace below
  - tool rows support the workbench instead of leading the story

Hierarchy rules:
- Extension first fold should read like **1 primary card + 2 supporting blocks**, not 4 equal panels.
- Popup should look like a launcher, not a mini workbench.
- Web should feel like “sit at the desk now”, not “see a marketing hero first, then enter the desk”.
- Cluster/review/admin surfaces can be deep, but they must still preserve a clear primary vs secondary rhythm.

Responsive rules:
- Below `768px`, all multi-column sections collapse to one column.
- No horizontal scroll.
- Minimum tap target is `44px`.
- Full-height surfaces use natural content height and `min-height`, never rigid viewport trapping.

## 6. Motion & Interaction

- Default transitions: `150ms` to `180ms`
- Animate only `opacity`, `box-shadow`, `border-color`, and small `transform` shifts
- Respect `prefers-reduced-motion`
- No bouncing hero elements, spinning loaders, or decorative AI activity effects
- Lists and drawers should reveal in a calm, stepped way rather than all at once

## 7. Product Wording & Surface Rules

- Lead with:
  - structured facts
  - trust summary
  - blockers
  - next action
- Keep these ideas visible:
  - local-first
  - read-only
  - manual-only red zones stay outside the product
  - cited AI follows the workspace
- Hide these behind advanced sections unless needed:
  - provider model strings
  - custom BFF overrides
  - Switchyard controls
  - developer-facing runtime details

## 8. Anti-Patterns (Banned)

- No emojis
- No pure black
- No neon purple or blue
- No centered marketing hero shell
- No equal-weight three-card feature row as the main story
- No equal-weight panel wall in the extension first fold
- No “AI first, facts later” layout
- No empty demo-dashboard metrics with fabricated numbers
- No long settings wall that starts with technical fields
- No popup that behaves like a mini dashboard
- No extension default view that requires scrolling before the user sees context, trust, and next action
- No full-product teal/orange SaaS atmosphere
- No Claude-like chat page as the main product shell
