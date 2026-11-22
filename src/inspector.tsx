import { createMemo, Show } from "solid-js";
import type { Fit, Fmt } from "./types";
import {
  app,
  applyCrop,
  applyResize,
  baseDims,
  current,
  markApplied,
  previewFor,
  resizeDims,
  resetCrop,
  rotateBy,
  setAspect,
  setDraftResize,
  setQuality,
  setStrip,
  setTarget,
  setTool,
  toggleLock,
  toggleFlip,
} from "./store";
import { formatBytes, Icon, Segmented, Slider, Switch } from "./ui";

const aspectOptions = [
  { value: "free", label: "Free" },
  { value: "1:1", label: "1:1" },
  { value: "4:3", label: "4:3" },
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
];

const aspectValue: Record<string, number | null> = {
  free: null,
  "1:1": 1,
  "4:3": 4 / 3,
  "16:9": 16 / 9,
  "9:16": 9 / 16,
};

const aspects: Record<string, string> = {
  "1": "1:1",
  "1.3333333333333333": "4:3",
  "1.7777777777777777": "16:9",
  "0.5625": "9:16",
};

function CropPanel() {
  const item = createMemo(() => current());
  const cropW = () => (item() ? Math.max(1, Math.round((app.draft?.crop.w ?? 1) * item()!.w)) : 0);
  const cropH = () => (item() ? Math.max(1, Math.round((app.draft?.crop.h ?? 1) * item()!.h)) : 0);
  const aspectLabel = () => {
    const aspect = app.draft?.aspect;
    if (!aspect) return "free";
    return aspects[String(aspect)] ?? "free";
  };

  return (
    <Show when={item()}>
      {(it) => (
        <div class="card motion-down">
            <div class="t-caps mb-2 text-muted">Aspect ratio</div>
          <Segmented
            value={aspectLabel()}
            options={aspectOptions}
            label="Aspect ratio"
            onChange={(value) => setAspect(aspectValue[value])}
            class="w-full"
          />

          <div class="mt-4 flex items-center justify-between">
            <div class="t-caps text-muted">Rotate</div>
            <div class="flex items-center gap-1">
              <button
                type="button"
                class="btn btn-ghost btn-icon"
                title="Rotate 90° left"
                aria-label="Rotate 90 degrees left"
                onClick={() => rotateBy(-90)}
              >
                <Icon name="rotateLeft" />
              </button>
              <button
                type="button"
                class="btn btn-ghost btn-icon"
                title="Rotate 90° right"
                aria-label="Rotate 90 degrees right"
                onClick={() => rotateBy(90)}
              >
                <Icon name="rotateRight" />
              </button>
              <span class="t-mono w-9 text-right text-muted">{it().ops.rotate}°</span>
            </div>
          </div>

          <div class="mt-3 flex items-center justify-between">
            <div class="t-caps text-muted">Flip</div>
            <div class="flex items-center gap-1">
              <button
                type="button"
                class="btn btn-ghost btn-icon"
                title="Flip horizontal"
                aria-label="Flip horizontal"
                onClick={() => toggleFlip("h")}
              >
                <Icon name="flipH" />
              </button>
              <button
                type="button"
                class="btn btn-ghost btn-icon"
                title="Flip vertical"
                aria-label="Flip vertical"
                onClick={() => toggleFlip("v")}
              >
                <Icon name="flipV" />
              </button>
            </div>
          </div>

          <div class="mt-4 flex items-center justify-between border-t border-rule pt-3">
            <span class="t-sm text-muted">Crop size</span>
            <span class="t-mono">
              {cropW()} × {cropH()} px
            </span>
          </div>

          <div class="mt-4 flex items-center justify-between">
            <button type="button" class="btn btn-ghost" onClick={resetCrop}>
              Reset
            </button>
            <button type="button" class="btn btn-primary" onClick={applyCrop}>
              Apply crop
            </button>
          </div>
        </div>
      )}
    </Show>
  );
}

function ResizePanel() {
  const item = createMemo(() => current());
  const base = () => (item() ? baseDims(item()!) : { w: 1, h: 1 });
  const draft = () => app.draft?.resize ?? { w: base().w, h: base().h, fit: "fit" as Fit };
  const result = () => resizeDims(base(), draft());
  const areaChange = () => {
    const from = base().w * base().h;
    const to = result().w * result().h;
    const change = Math.round((1 - to / from) * 100);
    return `${change > 0 ? "−" : change < 0 ? "+" : ""}${Math.abs(change)}% area`;
  };
  const percent = () => Math.round((draft().w / base().w) * 100);

  const setPercent = (value: number) => {
    const pct = Math.min(200, Math.max(10, Math.round(value) || 10));
    setDraftResize({
      w: Math.max(1, Math.round((base().w * pct) / 100)),
      h: Math.max(1, Math.round((base().h * pct) / 100)),
    });
  };

  const setW = (value: number) => {
    const w = Math.min(20000, Math.max(1, Math.round(value) || 1));
    const h = app.lockRatio ? Math.max(1, Math.round(w / (base().w / base().h))) : draft().h;
    setDraftResize({ w, h });
  };

  const setH = (value: number) => {
    const h = Math.min(20000, Math.max(1, Math.round(value) || 1));
    const w = app.lockRatio ? Math.max(1, Math.round(h * (base().w / base().h))) : draft().w;
    setDraftResize({ w, h });
  };

  return (
    <Show when={item()}>
      <div class="card motion-down">
        <div class="flex items-end gap-2">
          <label class="min-w-0 flex-1">
            <span class="t-caps mb-1 block text-muted">Width (W)</span>
            <div class="relative">
              <input
                class="field pr-7"
                type="number"
                min="1"
                step="1"
                value={draft().w}
                onChange={(event) => setW(Number(event.currentTarget.value))}
              />
              <span class="t-mono pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-muted">
                px
              </span>
            </div>
          </label>
          <button
            type="button"
            class={["btn btn-ghost btn-icon shrink-0", app.lockRatio ? "text-shu" : "text-muted"]}
            title={app.lockRatio ? "Unlock aspect ratio" : "Lock aspect ratio"}
            aria-label="Lock aspect ratio"
            aria-pressed={app.lockRatio ? "true" : "false"}
            onClick={toggleLock}
          >
            <Icon name={app.lockRatio ? "lock" : "unlock"} />
          </button>
          <label class="min-w-0 flex-1">
            <span class="t-caps mb-1 block text-muted">Height (H)</span>
            <div class="relative">
              <input
                class="field pr-7"
                type="number"
                min="1"
                step="1"
                value={draft().h}
                onChange={(event) => setH(Number(event.currentTarget.value))}
              />
              <span class="t-mono pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-muted">
                px
              </span>
            </div>
          </label>
        </div>

        <div class="mt-4 flex items-center justify-between">
          <span class="t-caps text-muted">Scale</span>
          <div class="relative w-20">
            <input
              class="field pr-6 text-right"
              type="number"
              min="10"
              max="200"
              value={percent()}
              aria-label="Scale percentage"
              onChange={(event) => setPercent(Number(event.currentTarget.value))}
            />
            <span class="t-mono pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-muted">
              %
            </span>
          </div>
        </div>
        <Slider
          min={10}
          max={200}
          value={Math.min(200, Math.max(10, percent()))}
          label="Scale percentage"
          onInput={setPercent}
        />

        <div class="t-caps mt-4 mb-2 text-muted">Fit mode</div>
        <Segmented
          value={draft().fit}
          options={[
            { value: "fit", label: "Fit" },
            { value: "fill", label: "Fill" },
            { value: "stretch", label: "Stretch" },
            { value: "none", label: "None" },
          ]}
          label="Fit mode"
          onChange={(value) => setDraftResize({ fit: value })}
          class="w-full"
        />

        <div class="mt-4 flex items-center justify-between border-t border-rule pt-3">
          <span class="t-sm text-muted">Resulting bounds</span>
          <span class="t-mono">
            {result().w} × {result().h} px
          </span>
        </div>
        <div class="mt-1 flex items-center justify-between">
          <span class="t-sm text-muted">Output change</span>
          <span class="t-mono">{areaChange()}</span>
        </div>

        <div class="mt-4 flex justify-end">
          <button type="button" class="btn btn-primary" onClick={applyResize}>
            Apply resize
          </button>
        </div>
      </div>
    </Show>
  );
}

function CompressPanel() {
  const item = createMemo(() => current());
  const preview = () => {
    const it = item();
    return it ? previewFor(it) : null;
  };
  const helper = () => {
    const it = item();
    if (!it) return "";
    if (it.target === "png") return "PNG is lossless; quality is ignored.";
    if (it.target === "avif") return "AVIF compresses hardest and encodes slowest.";
    if (it.target === "jpeg") return "JPEG drops transparency and smooths fine detail.";
    return "Lossy WebP keeps transparency at every quality.";
  };
  const saved = () => {
    const it = item();
    const p = preview();
    if (!it || !p) return "—";
    const change = Math.round((1 - p.bytes / it.bytes) * 100);
    return `${change > 0 ? "−" : change < 0 ? "+" : ""}${Math.abs(change)}%`;
  };
  const dims = () => {
    const it = item();
    if (!it) return "";
    return `${it.w} × ${it.h} (unchanged)`;
  };

  return (
    <Show when={item()}>
      {(it) => (
        <div class="card motion-down">
            <div class="flex items-center justify-between">
            <span class="t-caps text-muted">Quality</span>
            <input
              class="field w-16 text-right"
              type="number"
              min="1"
              max="100"
              value={it().quality}
              onChange={(event) => setQuality(Number(event.currentTarget.value))}
              aria-label="Quality"
            />
          </div>
          <div class="mt-2">
            <Slider
              min={1}
              max={100}
              value={it().quality}
              label="Quality"
              onInput={(value) => setQuality(value)}
            />
          </div>
          <div class="t-sm mt-1 mb-3 text-muted">{helper()}</div>

          <div class="border-t border-rule pt-3">
            <div class="flex items-center justify-between py-1">
              <span class="t-sm text-muted">Estimated size</span>
              <span class="t-mono">
                {preview() ? formatBytes(preview()!.bytes) : "—"}
              </span>
            </div>
            <div class="flex items-center justify-between py-1">
              <span class="t-sm text-muted">Percent saved</span>
              <span class="t-mono text-matcha">{saved()}</span>
            </div>
            <div class="flex items-center justify-between py-1">
              <span class="t-sm text-muted">Dimensions</span>
              <span class="t-mono">{dims()}</span>
            </div>
          </div>

          <div class="mt-4 flex justify-end">
            <button
              type="button"
              class="btn btn-primary"
              onClick={() => markApplied(`Compression applied · ${it().target.toUpperCase()}`)}
            >
              Apply compression
            </button>
          </div>
        </div>
      )}
    </Show>
  );
}

function FormatPanel() {
  const item = createMemo(() => current());
  const formats: { value: Fmt; label: string }[] = [
    { value: "jpeg", label: "JPEG" },
    { value: "png", label: "PNG" },
    { value: "webp", label: "WebP" },
    { value: "avif", label: "AVIF" },
  ];

  return (
    <Show when={item()}>
      {(it) => (
        <div class="card motion-down">
            <div class="t-caps mb-2 text-muted">Output encoding</div>
          <Segmented
            value={it().target}
            options={formats}
            label="Output format"
            onChange={(value) => setTarget(value)}
            class="w-full"
          />

          <Show when={it().target === "png"}>
            <div class="t-mono mt-3 text-muted">lossless · quality ignored</div>
          </Show>
          <Show when={it().target !== "png"}>
            <div class="mt-3 flex items-center justify-between">
              <span class="t-caps text-muted">Compression quality</span>
              <input
                class="field w-16 text-right"
                type="number"
                min="1"
                max="100"
                value={it().quality}
                onChange={(event) => setQuality(Number(event.currentTarget.value))}
                aria-label="Compression quality"
              />
            </div>
            <Show when={it().target !== "jpeg"}>
              <div class="t-sm mt-1 text-muted">
                Encoder effort is fixed for consistent speed; quality drives the size.
              </div>
            </Show>
          </Show>

          <div class="mt-4 border-t border-rule pt-2">
            <Switch
              checked={it().strip}
              onChange={setStrip}
              label="Strip metadata"
              note="Orientation is applied; EXIF, GPS and profiles are dropped when re-encoding."
            />
            <div class="t-mono mt-1 text-muted">
              Detected: {it().meta.length ? it().meta.join(" · ") : "none"}
            </div>
          </div>

          <div class="mt-3 flex justify-end">
            <button
              type="button"
              class="btn btn-primary"
              onClick={() => markApplied(`Format applied · ${it().target.toUpperCase()}`)}
            >
              Apply format
            </button>
          </div>
        </div>
      )}
    </Show>
  );
}

export function Inspector() {
  return (
    <aside class="flex w-80 shrink-0 flex-col overflow-y-auto border-l border-rule bg-surface">
      <div class="p-4">
        <Segmented
          value={app.tool}
          options={[
            { value: "crop", label: "Crop" },
            { value: "resize", label: "Resize" },
            { value: "compress", label: "Compress" },
            { value: "format", label: "Format" },
          ]}
          label="Tool"
          onChange={setTool}
          class="w-full"
        />
      </div>
      <div class="px-4 pb-4">
        <Show when={app.tool === "crop"}>
          <CropPanel />
        </Show>
        <Show when={app.tool === "resize"}>
          <ResizePanel />
        </Show>
        <Show when={app.tool === "compress"}>
          <CompressPanel />
        </Show>
        <Show when={app.tool === "format"}>
          <FormatPanel />
        </Show>
      </div>
    </aside>
  );
}
