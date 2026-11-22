# Henko v0.1

Cross-platform desktop image tool (Tauri 2 + SolidJS 2 + Rust): crop, resize, compress, and convert JPEG/PNG/WebP/AVIF.

## Acceptance results

| Check | Result |
| --- | --- |
| `pnpm install && pnpm build` (tsc + vite) | exit 0. 69 modules, `dist/` = 0.72 kB html, 25.84 kB css, 129.96 kB js |
| `cd src-tauri && cargo check` | exit 0 |
| `cargo clippy -- -D warnings` | exit 0 |
| `cargo test` | exit 0, 2 passed: `crop_rotate_resize_dimensions`, `encodes_every_format` |

Tests build a 40x20 RGB image in memory, crop 50% then rotate 90 then resize (stretch 5x10) and assert output dimensions, then encode to JPEG, PNG, WebP (decoded back with `image`) and AVIF (non-empty asserted; AVIF decode not available).

## Versions

| Package | Version |
| --- | --- |
| solid-js | 2.0.3 |
| @solidjs/web | 2.0.3 (required Solid 2 renderer/JSX peer) |
| vite-plugin-solid | 3.0.0-next.27 (2.x peers require solid-js ^1.7; 3.x is the Solid 2 line) |
| @solidjs/vite-plugin (transitive) | 3.0.0-next.27 |
| vite | 8.3.8 |
| typescript | 5.9.3 |
| tailwindcss / @tailwindcss/vite | 4.3.5 |
| tauri (Rust) | 2.12.7 |
| @tauri-apps/cli | 2.12.6 |
| @tauri-apps/api | 2.12.5 |
| tauri-plugin-dialog (Rust/npm) | 2.8.4 |
| tauri-plugin-opener (Rust/npm) | 2.7.3 |
| image | 0.25.10 (jpeg, png, webp, avif, rayon features) |
| webp | 0.3.1 (libwebp lossy) |
| ravif | 0.13.0 (transitive via image's avif feature) |
| serde | 1.0.229 |

Extra dependencies: `@solidjs/web` only, because Solid 2 moved the DOM renderer and JSX types there; the build does not run without it. No Rust crates beyond the requested list.

## File tree

```text
.gitignore
DESIGN.md
REPORT.md
index.html
package.json
pnpm-lock.yaml
tsconfig.json
vite.config.ts
design/
  app-icon.png
  screens/
    a-drop.png
    b-crop.png
    c-resize.png
    d-compress.png
    e-format.png
    f-export.png
    g-settings.png
src/
  app.tsx            shell, top bar, empty state, status bar, toasts, Tauri events
  batch.tsx          left queue (240px)
  canvas.tsx         canvas, crop overlay, compress split view
  export-sheet.tsx   export modal (pattern, progress, summary)
  index.tsx          render entry
  inspector.tsx      Crop / Resize / Compress / Format panels
  settings.tsx       Settings view
  store.ts           Solid store, per-image ops, settings persistence, helpers
  styles.css         Tailwind v4 theme tokens, components, asanoha, motion
  types.ts           shared types
  ui.tsx             inline SVG icons, segmented, slider, switch, sheet, formatting
src-tauri/
  Cargo.lock
  Cargo.toml
  build.rs
  tauri.conf.json
  capabilities/default.json
  icons/
    32x32.png
    128x128.png
    128x128@2x.png
    icon.icns
    icon.ico
    icon.png
  src/
    lib.rs           commands: probe, preview, export (4-thread pool + progress events)
    main.rs
    pipeline.rs      decode/orient, crop, rotate, flip, Lanczos3 resize, encode; tests
```

## Deviations and limits

- **AVIF input is not decoded.** `image` 0.25 decodes AVIF only with the `avif-native` feature, which needs an installed `dav1d` (the build failed here on missing pkg-config/dav1d). AVIF export works through `image`'s `avif` feature (ravif 0.13). JPEG, PNG, and WebP input all decode.
- **Metadata is always dropped on re-encode.** The encoders used here do not carry EXIF/GPS/ICC, so the Strip metadata toggle is a per-image preference plus a detection line (EXIF/XMP/IPTC/ICC presence); the `strip` flag is not sent to the backend. Orientation is read and applied before transforms, so rotated phone photos come out upright.
- **Compress preview ignores committed crop/resize.** `preview` is called with geometry-neutral ops so the split view compares the same frame on both sides and "Dimensions unchanged" stays true. Export still applies crop, rotate, flip, and resize.
- **The canvas shows the source orientation.** Rotate/flip affect output dimensions and the exported pixels; the canvas image is not rotated, and rotating resets the crop rect (keeps the crop overlay in source coordinates).
- **Resize panel is taller than the 280px target** (~310px with the 4-item segmented control), because every specified control is present.
- **No pre-flight collision warning** in the export sheet; collisions are resolved by the backend (Skip existing reports "skipped", Overwrite replaces).
- **Batch list does not collapse** to 0px for a single image.
- **Window size/position** is persisted through localStorage plus Tauri window APIs, not `tauri-plugin-window-state`.
- **"Open export sheet automatically when the queue finishes"** is persisted in settings but not wired; v0.1 has no background processing queue.
- **Numeric input validation clamps** instead of showing a shu error message under invalid fields.
- **Drag-and-drop expands files only.** Dropped folders are sent to `probe` and reported as unsupported.
- **Show in folder** reveals the output folder path itself with `revealItemInDir`.
- **Status bar savings** appears after a compress preview; other tools show `—`.

## Verification beyond the acceptance commands

The production bundle was also rendered in the Orca browser to check layout and Solid 2 runtime behavior: empty/drop, Settings (light and dark), and, with a temporary in-memory mock of the Tauri invoke bridge that was deleted before the final build, the Crop, Resize, Compress, Format, export form, and export summary screens. No demo or mock code remains in the tree.
