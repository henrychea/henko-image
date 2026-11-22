---
name: Henko
version: "1.0.0"
description: >-
  Henko (変更) is a cross-platform desktop image tool built with Tauri and SolidJS
  for cropping, resizing, compressing, and converting images between JPEG, PNG,
  WebP, and AVIF. The interface is a quiet Japanese workspace — washi paper,
  sumi ink, vermilion accents, and generous ma.
platforms:
  - macOS
  - Windows
  - Linux
colors:
  primary: "#C3402A"
  secondary: "#2E4A62"
  tertiary: "#7A8B5C"
  neutral: "#F4F0E6"
  surface: "#FBF8F2"
  ink: "#1E1B16"
  ink-muted: "#6B655A"
  rule: "#D9D2C3"
  dark-sumi: "#141311"
  dark-surface: "#1E1C19"
  dark-ink: "#EDE7DA"
  dark-rule: "#3A3631"
typography:
  display:
    fontFamily: "Noto Serif JP"
    fontSize: "32px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  h1:
    fontFamily: "Noto Serif JP"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0em"
  h2:
    fontFamily: "Noto Serif JP"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.01em"
  body-md:
    fontFamily: "Noto Sans JP"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0em"
  body-sm:
    fontFamily: "Noto Sans JP"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  label-caps:
    fontFamily: "Noto Sans JP"
    fontSize: "10px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.12em"
  mono:
    fontFamily: "JetBrains Mono"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
rounded:
  sm: "2px"
  md: "6px"
  lg: "10px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  "2xl": "32px"
  "3xl": "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "32px"
    border: "none"
    hover:
      backgroundColor: "#AB3825"
    active:
      backgroundColor: "#932F1F"
    disabled:
      backgroundColor: "{colors.rule}"
      textColor: "{colors.ink-muted}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "32px"
    border: "1px solid {colors.rule}"
    hover:
      backgroundColor: "{colors.neutral}"
      borderColor: "{colors.ink-muted}"
    active:
      backgroundColor: "{colors.rule}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
    border: "1px solid {colors.rule}"
    shadow: "0 1px 2px rgba(30, 27, 22, 0.04)"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    placeholderColor: "{colors.ink-muted}"
    typography: "{typography.mono}"
    rounded: "{rounded.sm}"
    padding: "6px 10px"
    height: "28px"
    border: "1px solid {colors.rule}"
    focus:
      borderColor: "{colors.primary}"
      outline: "2px solid rgba(195, 64, 42, 0.18)"
  slider:
    trackColor: "{colors.rule}"
    trackHeight: "2px"
    fillColor: "{colors.primary}"
    thumbColor: "{colors.surface}"
    thumbSize: "14px"
    thumbBorder: "2px solid {colors.primary}"
    rounded: "{rounded.full}"
    focus:
      thumbShadow: "0 0 0 4px rgba(195, 64, 42, 0.16)"
  segmented-control:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.md}"
    padding: "2px"
    height: "28px"
    border: "1px solid {colors.rule}"
    selected:
      backgroundColor: "{colors.surface}"
      textColor: "{colors.ink}"
      shadow: "0 1px 2px rgba(30, 27, 22, 0.08)"
  dropzone:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: "{spacing['3xl']}"
    border: "1px dashed {colors.rule}"
    hover:
      borderColor: "{colors.primary}"
      backgroundColor: "{colors.surface}"
    dragActive:
      borderColor: "{colors.primary}"
      borderStyle: "solid"
  thumbnail:
    backgroundColor: "{colors.neutral}"
    rounded: "{rounded.sm}"
    size: "56px"
    border: "1px solid {colors.rule}"
    selected:
      borderColor: "{colors.primary}"
      outline: "2px solid rgba(195, 64, 42, 0.20)"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
    shadow: "0 4px 16px rgba(20, 19, 17, 0.18)"
    border: "none"
---

# Henko — Design Specification

Henko (変更, "change") turns a folder of images into the size and format you need. Six controls, one canvas, nothing else. This document is the contract Stitch generates screens from: tokens in the frontmatter, rules in the prose.

## 1. Visual Theme & Atmosphere

A dim workroom, a sheet of washi, a single brush stroke. Henko should feel like a well-made tool that has been in the drawer for twenty years — not a dashboard, not a SaaS product.

- **Wabi-sabi.** Slight asymmetry is welcome; perfection looks mechanical. Rules are hairlines, corners are barely rounded, and nothing glows.
- **Ma (negative space).** The canvas is allowed to be mostly empty. Padding is generous, margins are larger than they need to be, and the layout never fills a gap just because the gap exists.
- **Washi paper.** The base neutral is warm, fibrous, off-white — paper, not #FFFFFF. Grain may appear as a 3–5% noise overlay on empty surfaces only.
- **Sumi ink.** Text is warm black, never pure black. Weight does the work; color is reserved for meaning.
- **Shu (朱) vermilion.** The seal on a scroll: one accent per view, used for the primary action and the active state. It should feel earned.
- **Ai (藍) indigo.** Secondary, functional — selected ranges, information, links, the compression "after" side.
- **Hairline rules.** 1px dividers in `rule`. No heavy borders, no drop shadows beyond a 1–2px whisper.
- **Pattern.** Asanoha or seigaiha appears only in the empty/drop state, at 4–6% ink opacity, never behind content or controls.

The mood: quiet, precise, uncluttered, slightly warm. Closer to a paper atelier than a photo editor.

## 2. Color Palette & Roles

Each color carries a name from the material world. Use the name in conversation, the token in code.

### Light

| Name | Token | Hex | Role |
|---|---|---|---|
| Shu (朱) | `colors.primary` | `#C3402A` | Vermilion seal. Primary buttons, active tab, focus ring, slider fill, crop handles. One per view. |
| Ai (藍) | `colors.secondary` | `#2E4A62` | Indigo. Informational text, links, selection tint, compression "after" pane. |
| Matcha (抹茶) | `colors.tertiary` | `#7A8B5C` | Green tea. Success, bytes-saved figures, "done" states. |
| Washi (和紙) | `colors.neutral` | `#F4F0E6` | Paper. Sidebar background, inset wells, segmented-control track, hover fill. |
| Surface | `colors.surface` | `#FBF8F2` | Card and panel faces, canvas mat, input fields. |
| Sumi (墨) | `colors.ink` | `#1E1B16` | Ink black. All primary text, icons at full strength. |
| Ink muted | `colors.ink-muted` | `#6B655A` | Secondary text, labels, placeholder, disabled glyphs. |
| Rule | `colors.rule` | `#D9D2C3` | Hairline dividers, borders, slider track, dashed dropzone outline. |

### Dark

| Name | Token | Hex | Role |
|---|---|---|---|
| Sumi dark | `colors.dark-sumi` | `#141311` | Window background. |
| Surface dark | `colors.dark-surface` | `#1E1C19` | Panels, cards, inputs. |
| Ink dark | `colors.dark-ink` | `#EDE7DA` | Primary text — warm paper, not white. |
| Rule dark | `colors.dark-rule` | `#3A3631` | Hairlines and borders. |

In dark mode, `primary`, `secondary`, and `tertiary` are used unchanged; reduce their area, not their saturation. Text on `primary` is always `surface` (light) / `dark-sumi` (dark). Never place `ink-muted` on `neutral` for body copy — that pairing is for labels only.

## 3. Typography Rules

Two Japanese families and one mono, nothing else.

- **Noto Serif JP** — display and headings only. It carries the paper-and-ink weight; using it for UI copy makes the app feel like a document.
- **Noto Sans JP** — all interface text, labels, body. 400 regular, 500 for emphasis. Never bold body copy.
- **JetBrains Mono** — numbers, dimensions, byte sizes, hex, filenames. Anything the user might compare column-to-column or copy is mono, tabular where possible.

Rules:

- `display` (32/600/1.25) is the empty-state title only. Never in a panel.
- `h1` (22/600/1.3) is screen titles; `h2` (16/600/1.4) is panel section headers.
- `body-md` (13/400/1.6) is the workhorse. `body-sm` (12/400/1.5) is metadata and helper text.
- `label-caps` (10/500/1.4, 0.12em tracking, uppercase) is for section eyebrows and segmented controls. Japanese glyphs are never letterspaced — if a label is Japanese, use `body-sm` at 500 weight instead.
- `mono` (11/400/1.5) for every measurement: `1920 × 1080`, `2.4 MB`, `−38%`.
- Line length in prose blocks stays under 70 characters. Text color is `ink`, secondary `ink-muted`; nothing is set below 11px.
- Mixing scripts: a Japanese title may be followed by an English subtitle in `label-caps`, not the reverse.

## 4. Component Stylings

**Buttons.** `button-primary` is shu with paper text — exactly one per visible region, and it is the action that moves the work forward (Export, Save). `button-ghost` is the default: transparent with a hairline border, filling with `neutral` on hover. Both are 32px tall, 6px radius, and never widen to fill a row. Destructive actions use ghost styling with shu text, not a filled red button.

**Cards.** Panels are `card`: `surface` face, 1px `rule` border, 10px radius, 16px padding, and the faintest possible shadow. Cards do not nest more than one level. A card with no content is not rendered.

**Inputs.** 28px tall, `sm` radius, mono for numeric values, sans for text. Focus is a shu border plus a 2px soft shu ring — the only place a glow is permitted. Invalid input marks the border shu and adds a `body-sm` message in shu; never a banner.

**Slider.** A 2px `rule` track with a shu fill and a 14px paper thumb ringed in shu. Hover grows the thumb ring by 2px; focus adds a 4px soft shu halo. The numeric value to the right is mono and editable.

**Segmented control.** A `neutral` track with 1px `rule` border; the selected segment lifts to `surface` with a soft shadow and switches from `ink-muted` to `ink`. Labels are `label-caps` (or `body-sm` at 500 for Japanese). Animate selection with a 150ms `ease-out` background change — no sliding pill.

**Dropzone.** Dashed `rule` outline on `neutral`, 10px radius, 48px padding, centered `body-md` copy. Hover turns the border shu; drag-active makes it solid shu and lifts the background to `surface`. Asanoha pattern sits at 5% ink behind the center mark only. This is the one place pattern is allowed.

**Thumbnail.** 56px square, `sm` radius, `neutral` fill, 1px `rule` border. Selected state is a shu border plus a 2px soft shu outline. Badges (format, processed) are `label-caps` chips pinned bottom-left, no more than two.

**Toast.** Ink slab, paper text, 6px radius, bottom-center above the status bar, 4s dwell. One line, `body-sm`, no icon unless it is an error (shu dot). Never stack more than two; replace the oldest.

## 5. Layout Principles

A desktop window, not a web page. Minimum 960 × 640; the app defaults to 1280 × 800 and remembers size and position. Below the minimum, show a single centered notice rather than reflowing.

```
┌──────────────────────────────────────────────────────────────┐
│ Top bar  48px: 変更 Henko · file/theme · Export              │
├────────────┬──────────────────────────────┬──────────────────┤
│ Batch list │  Canvas                      │  Inspector       │
│ 240px      │  flexible, centers image     │  320px           │
│            │                              │  Crop / Resize / │
│            │                              │  Compress /      │
│            │                              │  Format          │
├────────────┴──────────────────────────────┴──────────────────┤
│ Status bar 28px: 3 of 12 · 1920×1080 · WebP · −38%           │
└──────────────────────────────────────────────────────────────┘
```

- **Top bar (48px).** App mark, current folder, theme toggle, and the single primary Export action at the right. Hairline `rule` bottom border; no shadow.
- **Left panel (240px, fixed).** Batch list of thumbnails with filename and status dot. Scrolls independently. Collapsible to 0px only when a single image is loaded.
- **Center canvas (flex).** The image sits on a `neutral` mat with 24px padding, centered, never stretched past 100% of the pane. The crop overlay, split view, and rulers live here. Empty space around the image is ma — do not fill it.
- **Right panel (320px, fixed).** Tool inspector: a 4-item segmented control (Crop / Resize / Compress / Format) with the active tool's card beneath it. 16px padding, 24px gaps.
- **Status bar (28px).** Mono facts only: progress, dimensions, format, savings. `body-sm` at 11px, `ink-muted`, `rule` top border.

Dividers are 1px `rule`. Panels are separated by rules, not shadows or background contrast. Vertical rhythm comes from the spacing scale (4/8/12/16/24/32/48) — nothing in between. Responsive priority when the window narrows: canvas keeps its space, left panel collapses, right panel scrolls.

## 6. Motion

Fast, quiet, and linear-minded. Motion confirms a change; it never performs.

- **Duration.** 150ms for state changes (hover, focus, segment select, toggle). 220ms for enters and exits (toast, sheet, panel content swap). Nothing exceeds 220ms.
- **Easing.** `cubic-bezier(0.22, 0.61, 0.36, 1)` — an ease-out. No bounce, no spring, no overshoot, no elastic.
- **Ink-bleed fade.** Appearing content fades opacity 0 → 1 over 220ms while translating 4px from the direction it came (down for panels, up for toasts). Content leaving fades out in 150ms without translation. That 4px drift is the whole personality of the motion system.
- **Progress** is a 2px shu rule that fills along the status bar; it does not pulse or shimmer. For indeterminate work, a single shu segment sweeps slowly (1.6s linear), never a spinner.
- **Respect `prefers-reduced-motion`**: durations drop to 0ms, all translation is removed, and progress becomes a static filled bar.

## 7. Screens (for Stitch to generate)

### A. Empty / Drop

The first thing the user sees. `display` title 変更 with "Change your images" beneath it in `label-caps`, one sentence of `body-md` explanation, and the dropzone at 480px max width, centered in a field of ma. Asanoha pattern at 5% ink behind the dropzone only. Below it, a ghost button "Choose files…" and `body-sm` line naming the supported formats (JPEG · PNG · WebP · AVIF). No sidebar, no inspector, no status bar — just the top bar with theme toggle and a disabled Export.

### B. Workspace — Crop

Full three-pane layout. Left: batch list. Center: image on the `neutral` mat with a crop overlay — four shu corner handles (8px squares, `sm` radius), shaded `ink` at 45% outside the selection, a rule-of-thirds grid in `rule` at 30% while dragging, and mono dimension labels on the bottom-right corner. Right: inspector with the segmented control on Crop.

Controls, top to bottom in the inspector card: **Aspect presets** as a segmented control — Free · 1:1 · 4:3 · 16:9 · 9:16 — with Free selected by default; **Rotate** as two ghost icon buttons (90° left, 90° right) beside a mono degree value; **Flip** as two ghost icon buttons (horizontal, vertical); then a `body-sm` summary line `1200 × 800 px` updating live. Actions row at the card bottom: "Reset" (ghost) and "Apply crop" (primary).

### C. Resize Panel

Inspector set to Resize. Two mono inputs side by side — **W** and **H** — in px, with a lock-ratio toggle button between them (chain glyph, shu when locked, `ink-muted` when free). Below, a percent input with a slider (10–200%, default 100, step 1) that drives both fields. Then a **Fit mode** segmented control: Fit · Fill · Stretch · None. A `body-sm` line states the resulting dimensions and a `mono` line states the output area change. Primary action "Apply resize". Keep the panel under 280px tall — no scrolling in the inspector for this tool.

### D. Compress Panel

Inspector set to Compress, beside a **live split view** on the canvas: one image, a vertical shu divider at the center with a circular drag handle; the left side shows the original at full quality, the right side shows the compressed result. Both sides sit on a `neutral` mat with mono labels pinned to their top corners ("Original · 2.4 MB", "Compressed · 1.5 MB" in ai).

Inspector: a **Quality** slider 1–100 (default 80) with an editable mono number, a small format-aware helper line in `body-sm`, and a stats block — three rows, label `body-sm` on the left, mono value on the right: **Estimated size**, **Percent saved** (in matcha), and **Dimensions unchanged**. Recompute the preview on slider release, not on every tick. Primary action "Apply compression".

### E. Format Panel

Inspector set to Format. A four-segment control — **JPEG · PNG · WebP · AVIF** — full width, `label-caps`. Under it, format-specific rows appear conditionally: for JPEG, a quality number linked to the Compress quality; for WebP/AVIF, the same plus an "effort" hint in `body-sm`; for PNG, no options, just a mono line "lossless". Then a **Strip metadata** toggle (EXIF, GPS, color profile) with a `body-sm` note that orientation is preserved, and a mono line showing detected metadata fields. Primary action "Apply format".

### F. Export Sheet

A centered modal card, 480px wide, over a 45% ink scrim — the only modal in the app.

Contents in order: `h1` "Export"; **Output folder** as a mono path field with a ghost "Browse…" button; **Filename pattern** input defaulting to `{name}_{w}x{h}` with `body-sm` chips listing available tokens (`{name}`, `{w}`, `{h}`, `{format}`, `{date}`) and a live mono preview of the resolved name; **Overwrite** guard as a radio pair — "Skip existing" (default) and "Overwrite", with a `body-sm` warning line when a collision is detected. Then a 2px shu progress rule with a mono counter (`7 / 12`) and the current filename in `body-sm`.

On completion the sheet swaps contents in place over 220ms: an `h2` "12 images exported", a matcha `display`-weight figure for **total bytes saved** (`18.4 MB · 41%`), the output folder path in mono, and two actions — ghost "Show in folder" and primary "Done". Errors, if any, list under the summary in shu `body-sm` with a "Retry failed" ghost button.

### G. Settings

Reached from the top bar. A single column, 560px max, `h2` section headers with hairline rules above them.

**Appearance** — theme segmented control Light · Dark · System (default System), and an asanoha-pattern preview swatch pair showing light and dark surfaces side by side.
**Defaults** — default format, default quality, default resize fit mode, and "remember last output folder" toggle, each as a `card` row with the control on the right.
**Behavior** — strip metadata by default, open export sheet automatically when the queue finishes, and preserve window size and position.
**About** — app name in `display`-adjacent `h1`, version in mono, build target, and a plain-text line of credits. No links out, no update banner.

## 8. Do's and Don'ts

**Do**

- Use shu once per view, for the action that advances the work.
- Keep hairlines at 1px `rule` and let whitespace do the separating.
- Put every number in JetBrains Mono, and make it copyable.
- Show live consequences — dimensions, bytes, percent — next to the control that changes them.
- Let the canvas breathe; empty space is a feature and part of the design.
- Fade and drift 4px on enter, 220ms, ease-out.
- Hold the 960 × 640 floor and the 240 / flexible / 320 column split.
- Keep each inspector panel to its own tool; never show two tools' fields at once.

**Don't**

- Don't fill the space behind the image, or let a pane look "unfinished" because it is empty.
- Don't use pure black, pure white, or a gradient anywhere.
- Don't stack shadows, add glassmorphism, or blur anything but the optional scrim.
- Don't let asanoha or seigaiha appear outside the empty/drop state.
- Don't bounce, spring, overshoot, or animate longer than 220ms.
- Don't use shu for errors and hover at the same time; errors are shu text, not shu fills.
- Don't put serif type inside inspector controls or numeric fields.
- Don't wrap the workspace in modals, tabs within tabs, or a second sidebar.
- Don't show a spinner; show a progress rule or a sweep.
