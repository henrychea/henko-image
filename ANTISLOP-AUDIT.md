# Antislop audit: Henko UI and copy

antislop active: after (inferred from dispatch: read-only audit, no saved preference at `~/.config/antislop/settings.json`).

Scope: `src/*.tsx`, `src/styles.css`, `index.html`, `src-tauri/src/*.rs`, judged against `DESIGN.md` and the antislop core, antislop-ui, antislop-copywriting, antislop-human and antislop-code rules. Read-only: nothing was edited except this file. Nothing was run or clicked (see Method).

**35 findings: 8 high, 12 med, 15 low.** The shell is well above the slop floor: hand-drawn 16px icon set (not Lucide), a documented palette with one accent, a radius and shadow scale that is actually followed, and copy that names real controls instead of marketing. What fails is a different axis: the modal, the crop overlay and the focus rings are unusable without a mouse, three dark-mode pairs drop to 1.8:1, and two panels print numbers that are not true.

## Ranked findings

| # | Sev | Location | Rule | Finding and fix |
|---|---|---|---|---|
| 1 | high | `src/ui.tsx:133-149` | R-26, R-32, R-39 | Export sheet has no `role="dialog"`, no `aria-modal`, no Escape handler, no focus trap and no focus return, so keyboard and screen-reader users can tab into the workspace behind the scrim. Add `role="dialog" aria-modal="true" aria-labelledby`, a `keydown` Escape listener, focus to the first control on open, a Tab cycle inside the sheet, and focus back to Export on close. |
| 2 | high | `src/canvas.tsx:69-168` | R-32 | Crop box and all four corner handles are `div` + `onPointerDown`, with no role, no `tabindex` and no keyboard path, so cropping is impossible without a pointer. Make each handle a `<button>` with `aria-label` ("Crop handle top left"), add arrow keys to nudge and Shift+arrow to resize, and keep the drag math in `nextRect`. |
| 3 | high | `src/inspector.tsx:284-341`, `src/store.ts:130-140` | R-38, C-5, R-17 | The Compress panel reports the unedited image: preview is built from `compressOps` (crop null, rotate 0, resize null), `previewKey` ignores ops, and `dims()` hardcodes "(unchanged)", so after Apply crop or Apply resize "Estimated size", "Percent saved" and "Dimensions" describe an export that will not happen. Send the item's real ops, add them to `previewKey`, and report `outDims(item)` with a real compared-to-original label. |
| 4 | high | `index.html:6-11` | R-40, C-5 | The Google Fonts stylesheet is a render-blocking third-party request in `<head>`, in an app whose UI says "Processed locally, never uploaded", and it fails offline on a desktop tool. Vendor the woff2 files into `src/assets/fonts` with `@font-face` and `font-display: swap`, or at minimum `media="print" onload` swap so first paint does not wait on Google. |
| 5 | high | `src/styles.css:39`, `src/canvas.tsx:216`, `src/export-sheet.tsx:216,267,270` | R-25, R-34 | Dark theme text misses AA: `--color-ai` on dark surface is 1.84:1 (the "Compressed" label is invisible), `--color-shu` error text is 3.31:1, and the `.btn-primary` label (`--surface` on shu) is 3.31:1 at 13px. Add dark-only text tokens (`--ai-text`, `--shu-text`, `--on-shu`) around #A8BFD4, #E06A50 and #F6F1E6, and use them for any text role while keeping the raw hues for fills and rules. |
| 6 | high | `src/styles.css:163-165,264-266,310-316` | R-32, R-25 | Focus indicators fail the 3:1 non-text bar in both themes: the 35% shu outline renders at 1.67:1 on light surface and 1.42:1 on dark, and the 16% slider halo at 1.25:1 and 1.14:1, so `:focus-visible` is effectively invisible. Use a solid `--color-shu` 2px outline on buttons and segments, a solid shu ring on the slider thumb, and keep the soft halo as a second layer only. |
| 7 | high | `src/settings.tsx:120-125` | R-26, R-36 | "Open export sheet automatically when the queue finishes" writes a setting nothing reads: `openSheetOnFinish` appears only in `settings.tsx`, `store.ts:26` and `types.ts:54`, so the toggle silently does nothing and its note claims behavior that does not exist. Wire it in `statusAfterExport` or delete the row plus both fields. |
| 8 | high | `src/app.tsx:147,153,155,181`, `src/inspector.tsx:299,340`, `src/canvas.tsx:217` | R-02 | The em dash (U+2014) is used as the empty-value glyph in the status bar and the compress stats. Render `n/a` in the mono cells instead (an en dash swaps one banned shortcut for another). |
| 9 | med | `src/app.tsx:110-121` | R-26 | The dropzone is a `div` with `hover:border-shu hover:bg-surface` and no click handler: it advertises a click and does nothing. Make it a `<button type="button">` that opens the file dialog (drag and drop keeps working), or keep the hover styles only under `app.dragActive`. |
| 10 | med | `src/store.ts:253-282` | R-27 | Dropping 200 files gives no feedback: `addPaths` awaits `probe` per file with no pending state, so the empty screen sits unchanged for seconds and a second drop is not distinguishable from a failed one. Add a "Reading 3 of 12" line in the queue header and disable Export while probing. |
| 11 | med | `src/canvas.tsx:222-231` | R-32, R-26 | The split-view handle is a focusable `<button aria-label="Drag to compare">` that only answers pointer events, so Enter, Space and arrows do nothing on a focused control. Add ArrowLeft/ArrowRight to move the split by 2% and a key to recentre at 50%, or replace it with `<input type="range">` bound to `split()`. |
| 12 | med | `src/app.tsx:193-210` | R-39, R-27 | Toasts are unannounced: no `role="status"` or `aria-live`, so the only feedback for "Crop applied" and every error is visual. Add `role="status" aria-live="polite"` (assertive for `error`) on the toast container and keep the dot as decoration. |
| 13 | med | `src/inspector.tsx:345` | R-25 | "Percent saved" sets 11px mono in `--color-matcha` on light surface: 3.49:1, below 4.5. Darken the text role (about #5F6E45) or set that figure in `--ink` and reserve matcha for the 32px summary where 3:1 applies. |
| 14 | med | `src/styles.css:219,244`, `src/ui.tsx:118` | R-25 (1.4.11) | Component boundaries use `--rule` at 1.42:1 against surface, under the 3:1 non-text bar, so the input, the segmented track and the switch track have no findable edge. Use `--muted` (5.45:1 light, 5.57:1 dark) for control borders and keep `--rule` for dividers. |
| 15 | med | `src/styles.css:71-76` | R-39 | `button:disabled` sets `cursor: default`, so disabled Export and the disabled sheet buttons read as inert text rather than unavailable actions. Change to `cursor: not-allowed` and mirror it for a disabled control's label. |
| 16 | med | `src/styles.css:39` | R-37, R-31 | Dark `--muted: #9a9385` has no counterpart in `DESIGN.md`, which defines only dark-sumi, dark-surface, dark-ink and dark-rule, so the code ships a token the contract does not own and cannot review. Add `dark-ink-muted: #9A9385` to the frontmatter and the Dark table, or derive it from `dark-ink`. |
| 17 | med | `src/export-sheet.tsx:168-190` | R-39 | The conflict radios sit in a plain `div` under a `t-caps` caption: no `fieldset`/`legend`, no `role="radiogroup"`, so the pair has no accessible group name. Wrap in `<fieldset>` with a `<legend class="t-caps">Conflict resolution</legend>`. |
| 18 | med | `src/export-sheet.tsx:116`, `src/settings.tsx:44`, `src/app.tsx:103` | R-39 | The document has no `<h1>`: every screen title is a `div` with `t-h1`/`t-display`, and the sheet title is an `h2` with nothing above it. Render each view's visible title as `<h1>` and keep `h2` for panel and section headers. |
| 19 | med | `src/app.tsx:166-170`, `src/export-sheet.tsx:200-204` | R-25 | The 2px progress fill is `--color-shu` on a `--rule` track: 2.33:1 in dark, so the fill is hard to locate against its own track. Darken the dark track (for example `color-mix(in srgb, var(--rule), var(--ink) 25%)`) until the fill clears 3:1. |
| 20 | med | `src/batch.tsx:61`, `src/canvas.tsx:146,213,216` | R-06, R-31 | `text-[10px]` overrides `t-mono` (11px) in four places, below the contract's "nothing is set below 11px". Drop the override or add a documented `mono-xs` token to `DESIGN.md` so the deviation is a decision. |
| 21 | low | `src/types.ts:5`, `src/batch.tsx:16` | R-31, C-3 | The `"queued"` status and its `bg-muted` dot are dead: nothing ever sets `queued`, so two branches exist for a state that cannot happen. Remove them, or set the status when `run()` queues jobs. |
| 22 | low | `src/store.ts:422` | C-3, R-17 | `outBytes` is written on every successful export and never rendered, while the status bar shows the input bytes in its place. Show the output figure or delete the field. |
| 23 | low | `src/styles.css:398-400,434-441` | R-19 | `.sweep` and its keyframes are unused dead CSS, and the infinite loop it defines is what R-19 forbids the moment it does ship. Delete both, or use it for the indeterminate progress bar `DESIGN.md` §6 asks for. |
| 24 | low | `src/batch.tsx:14` | R-25 | The "Ready" status dot is `bg-rule` at 1.42:1, effectively invisible next to the label that carries the meaning. Use `--muted` for the dot or drop the dot for that state. |
| 25 | low | `src/settings.tsx:51-53` | R-07 | The asanoha pattern appears in the Appearance swatch, but `DESIGN.md` §1 says the pattern appears only in the empty/drop state while §7G asks for exactly this swatch. Resolve the contradiction in the contract, then keep one of the two. |
| 26 | low | `src/app.tsx:113-118` | R-27 | `dragActive` styling renders only on the Empty screen, so dropping onto an open workspace gives no highlight and no confirmation until thumbnails appear. Apply the same border treatment to the canvas pane, or toast "3 images added". |
| 27 | low | `src/inspector.tsx:135-137` | R-15 | "Reset" in the crop panel also clears rotate, flip and the aspect lock, which the label does not say. Rename to "Reset transform". |
| 28 | low | `src/export-sheet.tsx:250-256` | R-17 | When an export grows, the summary reads "0 B · -12%" because `formatBytes(Math.max(0, ...))` clamps the byte figure while the percent stays negative. Show "+12% larger" or hide the saved figure when the delta is not a saving. |
| 29 | low | `src/styles.css:151,201-203` | R-03 | Buttons are 32px and icon buttons 28px, under R-03's 44px tap floor. `DESIGN.md` §4 mandates 32px and Henko is a desktop window with a 960px minimum, so this is an owner call under R-37: confirm the desktop exemption, or raise icon buttons to 32px on touch-capable platforms. |
| 30 | low | `src/batch.tsx:48`, `src/canvas.tsx:198,205,316` | R-27 | A thumbnail, split-view image or canvas image that fails to load shows a broken `<img>` with no message. Add an `onError` fallback ("Could not read this file") in those four places. |
| 31 | low | `src/batch.tsx:26-30` | C-3 | The queue header shows "Queue (12)" and "12 done" side by side: the same count twice in one 40px strip. Keep the total and move "done" into the status bar. |
| 32 | low | `src/settings.tsx:149` | R-16 | "Crafted with Tauri, SolidJS and the Rust image crate." is the generic readme sign-off and repeats line 146 one row earlier. Delete it. |
| 33 | low | `src/app.tsx:270` | R-27 | "Desktop events are unavailable" names no cause and no next step. Use "Drag and drop needs the desktop window. Use Choose files instead." |
| 34 | low | `src/canvas.tsx:341` | R-27 | "Select an image from the queue" names the state but not the way out. Add the action: "Select an image from the queue, or drop files to add more." |
| 35 | low | `src/inspector.tsx:408` | R-16 | "Encoder effort is fixed for consistent speed; quality drives the size" is an unmeasured speed claim inside a control hint. Use "Encoder effort is fixed. Quality is the only size lever." |

## Contrast table

Ratios computed with the antislop-human `contrast-check.py` formula. Alpha rings were blended against their backdrop before measuring. AA needs 4.5:1 for normal text, 3:1 for large text and for non-text UI (WCAG 1.4.11).

### Light theme (`:root`, `DESIGN.md` Light)

| Pair (foreground on background) | Where | Ratio | Normal AA | Large AA | Non-text |
|---|---|---|---|---|---|
| ink `#1E1B16` on washi `#F4F0E6` | body text | 15.08 | pass | pass | pass |
| ink `#1E1B16` on surface `#FBF8F2` | panels | 16.19 | pass | pass | pass |
| muted `#6B655A` on washi | queue, status bar | 5.08 | pass | pass | pass |
| muted `#6B655A` on surface | helper text | 5.45 | pass | pass | pass |
| surface on shu `#C3402A` | `.btn-primary` label | 4.85 | pass | pass | pass |
| shu on surface | error text | 4.85 | pass | pass | pass |
| shu on washi | error text on queue bg | 4.51 | pass | pass | pass |
| ai `#2E4A62` on surface | "Compressed" label | 8.72 | pass | pass | pass |
| matcha `#7A8B5C` on surface | "Percent saved", 11px | 3.49 | **FAIL** | pass | pass |
| matcha on washi | meta figures | 3.25 | **FAIL** | pass | pass |
| muted on rule `#D9D2C3` | disabled button label | 3.84 | fail (exempt) | pass | pass |
| rule on surface | dividers, input borders | 1.42 | fail | fail | **FAIL** |
| shu on rule | progress fill on track | 3.41 | fail | pass | pass |
| surface on ink | toast | 16.19 | pass | pass | pass |
| 35% shu ring on surface | `:focus-visible` outline | 1.67 | fail | fail | **FAIL** |
| 16% shu halo on surface | slider focus | 1.25 | fail | fail | **FAIL** |

### Dark theme (`[data-theme="dark"]`, `DESIGN.md` Dark)

| Pair (foreground on background) | Where | Ratio | Normal AA | Large AA | Non-text |
|---|---|---|---|---|---|
| ink `#EDE7DA` on washi `#141311` | body text | 15.07 | pass | pass | pass |
| ink `#EDE7DA` on surface `#1E1C19` | panels | 13.80 | pass | pass | pass |
| muted `#9A9385` on washi | queue, status bar | 6.09 | pass | pass | pass |
| muted `#9A9385` on surface | helper text | 5.57 | pass | pass | pass |
| surface on shu | `.btn-primary` label | 3.31 | **FAIL** | pass | pass |
| shu on surface | error text, "failed" rows | 3.31 | **FAIL** | pass | pass |
| shu on washi | error text on queue bg | 3.61 | **FAIL** | pass | pass |
| ai `#2E4A62` on surface | "Compressed" label | 1.84 | **FAIL** | **FAIL** | **FAIL** |
| ai on surface/90 over washi | "Compressed" chip | 1.86 | **FAIL** | **FAIL** | **FAIL** |
| matcha `#7A8B5C` on surface | "Percent saved", 11px | 4.59 | pass | pass | pass |
| muted on rule `#3A3631` | disabled button label | 3.93 | fail (exempt) | pass | pass |
| rule on surface | dividers, input borders | 1.42 | fail | fail | **FAIL** |
| shu on rule | progress fill on track | 2.33 | fail | fail | **FAIL** |
| surface on ink | toast | 13.80 | pass | pass | pass |
| 35% shu ring on surface | `:focus-visible` outline | 1.42 | fail | fail | **FAIL** |
| 16% shu halo on surface | slider focus | 1.14 | fail | fail | **FAIL** |

Failures to fix, in order: the six dark-mode pairs (`ai`, `shu` text, primary label, progress fill), the four focus rings, `matcha` on light surface, and `rule` as a control boundary in both themes. `muted` on `rule` only appears on disabled controls, which WCAG 1.4.3 exempts; it is listed for completeness, not as work.

## Copy strings that read as generic AI copy

| String | Location | Why it reads generic | Replacement |
|---|---|---|---|
| "Crafted with Tauri, SolidJS and the Rust image crate." | `src/settings.tsx:149` | The "Crafted with" sign-off is the default readme footer, and it repeats the build-target line one row above | Delete; keep line 146 |
| "Build target: Tauri 2 · SolidJS 2 · Rust image" | `src/settings.tsx:146` | "Rust image" is not a thing a reader recognizes | "Tauri 2 · SolidJS 2 · Rust image 0.25" |
| "Everything runs locally." | `src/settings.tsx:143` | Third statement of a claim already made twice, and one request does leave the app (the font CDN) | "Images never leave this machine." |
| "Processed locally, never uploaded" | `src/app.tsx:120` | Same claim as the line above and the Empty paragraph | Keep this one, delete the other two |
| "Encoder effort is fixed for consistent speed; quality drives the size." | `src/inspector.tsx:408` | Implementation apology written as a performance claim nobody measured | "Encoder effort is fixed. Quality is the only size lever." |
| "Waits for batch work to settle before showing the sheet." | `src/settings.tsx:124` | Describes behavior that does not exist (see finding 7) | Delete with the row |
| "Desktop events are unavailable" | `src/app.tsx:270` | Names no cause and no next step | "Drag and drop needs the desktop window. Use Choose files instead." |
| "Reset" | `src/inspector.tsx:135` | Understates scope: it also clears rotate, flip and aspect | "Reset transform" |
| "Select an image from the queue" | `src/canvas.tsx:341` | States the condition, not the action | "Select an image from the queue, or drop files to add more." |
| "Change your images" | `src/app.tsx:104` | Reads like a tagline, but `DESIGN.md` §7A mandates it verbatim | Keep (contract copy, not agent copy) |
| "Estimated size" | `src/inspector.tsx:337` | Word "Estimated" is honest: it is the actual preview encode | Keep |

No fabricated statistics, testimonials, avatars, filler names or ghost navigation were found. Every CTA names a real action ("Export 12 images", "Apply crop", "Show in folder", "Retry failed", "Choose files"), which is the part this build does better than most.

## Comment hygiene (`src/`, `src-tauri/src/`)

Zero comments exist in either tree, so there is nothing to strip: no banner separators, no restated signatures, no step narration, no vague TODOs, no emoji, no end markers. The antislop-code checklist passes vacuously.

Two spots would earn one line each if comments are added later, and neither is a finding today: the `0 0 0 9999px` box-shadow that draws the crop scrim in `src/canvas.tsx:121`, and the 350ms debounce before the preview invoke in `src/canvas.tsx:292`.

## What passes (checked, no finding)

- **R-04 icons:** a hand-drawn 16px path set in `src/ui.tsx:5-37`, not Lucide and not sparkle/robot vocabulary, with `aria-hidden` on the svg.
- **R-29 palette, R-11 radius, R-12 shadow, R-13 glow, R-10 glass:** one accent (shu) per view, a real 2/6/10 radius scale, card shadow at 1px, glow only on focus, no backdrop blur anywhere.
- **R-19 motion:** 150ms state changes and 220ms enters with a 4px drift, exactly the `DESIGN.md` §6 numbers, and `prefers-reduced-motion` zeroes durations.
- **R-21, R-34:** a real theme toggle with System default and a `matchMedia` listener, and both swatches render (the dark text tokens are the defect, not the mechanism).
- **R-30, R-20:** the washi/sumi/shu identity with Hairline rules is not a Linear or Vercel clone; swapping the name would not make it generic.
- **R-06:** Noto Serif JP for display, Noto Sans JP for UI, JetBrains Mono for every figure, each with a written reason in `DESIGN.md` §3.
- **R-17, R-18, R-38:** no invented users, logos, uptimes or deltas; empty states are empty.
- **R-33:** no patch scripts, no string-replacement helpers; the theme is real CSS with a data attribute.
- **R-24:** no navigation exists, so no dead links exist.
- **R-15:** CTAs are specific to the action throughout.

## Method and limits

- Code inspection only. No dev server, no build, no commit, per the task rules, so **R-35 was not executed** and no click-through is claimed. Findings marked functional come from reading the data flow, not from observing the app.
- Contrast ratios were computed, not eyeballed, using the antislop-human formula; alpha values were composited over their actual backdrop first, which is why the focus rings measure far below the 3:1 bar rather than looking acceptable.
- Not audited: `DESIGN.md` and `REPORT.md` prose (documents, not UI; `DESIGN.md` contains 37 em dashes itself and `REPORT.md` one, so any sentence transplanted from them into the UI needs R-02 cleanup first), the reference PNGs in `design/`, and the Rust pipeline beyond comment hygiene.
- Repo state: `master` has no commits, so the entire tree is untracked. This file is one more untracked entry, not a diff against a baseline.
