import { createStore } from "solid-js";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import type {
  Crop,
  Draft,
  ExportJob,
  Fit,
  Fmt,
  Item,
  Ops,
  Probe,
  Resize,
  Settings,
  Tool,
  Upscale,
} from "./types";

const SETTINGS_KEY = "henko.settings";
export const MAX_UPSCALE_DIM = 16384;
export const defaultUpscale: Upscale = { scale: 2, method: "clean", denoise: 35, sharpen: 25 };

const defaults: Settings = {
  theme: "system",
  defaultFormat: "webp",
  defaultQuality: 80,
  defaultFit: "fit",
  rememberOutDir: true,
  stripByDefault: true,
  openSheetOnFinish: false,
  preserveWindow: true,
  outDir: "",
  pattern: "{name}_{w}x{h}",
};

function loadSettings(): Settings {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") };
  } catch {
    return { ...defaults };
  }
}

export type AppState = {
  items: Item[];
  selected: string | null;
  tool: Tool;
  view: "workspace" | "settings";
  settings: Settings;
  draft: Draft | null;
  lockRatio: boolean;
  dragActive: boolean;
  sheetOpen: boolean;
  export: { done: number; total: number; name: string } | null;
  toast: { msg: string; error: boolean; id: number } | null;
};

export const [app, setApp] = createStore<AppState>({
  items: [],
  selected: null,
  tool: "crop",
  view: "workspace",
  settings: loadSettings(),
  draft: null,
  lockRatio: true,
  dragActive: false,
  sheetOpen: false,
  export: null,
  toast: null,
});

export function current(): Item | null {
  return app.items.find((i) => i.id === app.selected) ?? null;
}

export function patchItem(id: string, fn: (item: Item) => void) {
  setApp((s) => {
    const item = s.items.find((i) => i.id === id);
    if (item) fn(item);
  });
}

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  setApp((s) => {
    s.settings[key] = value;
  });
}

export function baseDims(item: Item) {
  let w = item.w;
  let h = item.h;
  const crop = item.ops.crop;
  if (crop) {
    w = Math.max(1, Math.round(crop.w * w));
    h = Math.max(1, Math.round(crop.h * h));
  }
  if (item.ops.rotate === 90 || item.ops.rotate === 270) {
    [w, h] = [h, w];
  }
  return { w, h };
}

export function resizeDims(base: { w: number; h: number }, resize: Resize) {
  let { w, h } = base;
  if (resize.fit === "none") return { w, h };
  const ar = w / h;
  if (resize.fit === "stretch") {
    w = resize.w;
    h = resize.h;
  } else if (resize.fit === "fit") {
    if (resize.w / resize.h > ar) {
      h = resize.h;
      w = Math.max(1, Math.round(h * ar));
    } else {
      w = resize.w;
      h = Math.max(1, Math.round(w / ar));
    }
  } else if (resize.w / resize.h < ar) {
    h = resize.h;
    w = Math.max(1, Math.round(h * ar));
  } else {
    w = resize.w;
    h = Math.max(1, Math.round(w / ar));
  }
  return { w: Math.max(1, w), h: Math.max(1, h) };
}

export function upscaleDims(base: { w: number; h: number }, scale: number) {
  const factor = Number.isFinite(scale) ? Math.min(4, Math.max(1, scale)) : 1;
  let w = Math.max(1, Math.round(base.w * factor));
  let h = Math.max(1, Math.round(base.h * factor));
  const longest = Math.max(w, h);
  if (longest > MAX_UPSCALE_DIM) {
    const ratio = MAX_UPSCALE_DIM / longest;
    w = Math.max(1, Math.round(w * ratio));
    h = Math.max(1, Math.round(h * ratio));
  }
  return { w, h };
}

export function outDims(item: Item) {
  const base = baseDims(item);
  const scaled = item.ops.upscale ? upscaleDims(base, item.ops.upscale.scale) : base;
  if (!item.ops.resize) return scaled;
  return resizeDims(scaled, item.ops.resize);
}

export const compressOps: Ops = {
  crop: null,
  rotate: 0,
  flipH: false,
  flipV: false,
  upscale: null,
  resize: null,
};

export function previewKey(item: Item) {
  return `${item.id}|${item.quality}|${item.target}`;
}

export function previewFor(item: Item) {
  return item.preview?.key === previewKey(item) ? item.preview : null;
}

export function upscalePreviewKey(item: Item) {
  const upscale = app.draft?.id === item.id ? app.draft.upscale : item.ops.upscale;
  if (!upscale) return null;
  const denoise = upscale.method === "pixel" ? 0 : upscale.denoise;
  const sharpen = upscale.method === "pixel" ? 0 : upscale.sharpen;
  return `${item.id}|${upscale.scale}|${upscale.method}|${denoise}|${sharpen}`;
}

export function upscalePreviewFor(item: Item) {
  const key = upscalePreviewKey(item);
  return key !== null && item.upscalePreview?.key === key ? item.upscalePreview : null;
}

export function extOf(format: Fmt) {
  return format === "jpeg" ? "jpg" : format;
}

export function mimeOf(format: Fmt) {
  return `image/${format === "jpeg" ? "jpeg" : format}`;
}

export function stemOf(name: string) {
  return name.replace(/\.[^.]+$/, "");
}

export function resolvePattern(pattern: string, item: Item, w: number, h: number, format: Fmt) {
  const date = new Date().toISOString().slice(0, 10);
  const base = (pattern || "{name}_{w}x{h}")
    .replace(/\{name\}/g, stemOf(item.name))
    .replace(/\{w\}/g, String(w))
    .replace(/\{h\}/g, String(h))
    .replace(/\{format\}/g, format)
    .replace(/\{date\}/g, date);
  return `${base}.${extOf(format)}`;
}

export function opsPayload(ops: Ops): Ops {
  return {
    crop: ops.crop ? { x: ops.crop.x, y: ops.crop.y, w: ops.crop.w, h: ops.crop.h } : null,
    rotate: ops.rotate,
    flipH: ops.flipH,
    flipV: ops.flipV,
    upscale: ops.upscale
      ? {
          scale: ops.upscale.scale,
          method: ops.upscale.method,
          denoise: ops.upscale.denoise,
          sharpen: ops.upscale.sharpen,
        }
      : null,
    resize: ops.resize ? { w: ops.resize.w, h: ops.resize.h, fit: ops.resize.fit } : null,
  };
}

export function exportJob(item: Item): ExportJob {
  return {
    path: item.path,
    ops: opsPayload(item.ops),
    quality: item.quality,
    format: item.target,
  };
}

function makeDraft(item: Item, fit: Fit): Draft {
  const base = baseDims(item);
  return {
    id: item.id,
    crop: item.ops.crop ? { ...item.ops.crop } : { x: 0, y: 0, w: 1, h: 1 },
    aspect: null,
    resize: item.ops.resize ? { ...item.ops.resize } : { w: base.w, h: base.h, fit },
    upscale: item.ops.upscale ? { ...item.ops.upscale } : { ...defaultUpscale },
  };
}

export function selectItem(id: string) {
  setApp((s) => {
    s.selected = id;
    const item = s.items.find((i) => i.id === id);
    s.draft = item ? makeDraft(item, s.settings.defaultFit) : null;
  });
}

export function removeItem(id: string) {
  if (app.export) return;
  setApp((s) => {
    const index = s.items.findIndex((i) => i.id === id);
    if (index < 0) return;
    s.items.splice(index, 1);
    if (s.selected !== id) return;
    const next = s.items[Math.min(index, s.items.length - 1)];
    if (!next) {
      s.selected = null;
      s.draft = null;
      s.sheetOpen = false;
      return;
    }
    s.selected = next.id;
    s.draft = makeDraft(next, s.settings.defaultFit);
  });
}

export function clearItems() {
  if (app.export) return;
  setApp((s) => {
    s.items = [];
    s.selected = null;
    s.draft = null;
    s.sheetOpen = false;
  });
}

export function openSheet() {
  setApp((s) => {
    s.sheetOpen = true;
  });
}

export function closeSheet() {
  setApp((s) => {
    s.sheetOpen = false;
  });
}

export function toggleLock() {
  setApp((s) => {
    s.lockRatio = !s.lockRatio;
  });
}

export function setTool(tool: Tool) {
  setApp((s) => {
    s.tool = tool;
  });
}

let toastTimer: number | undefined;

export function toast(msg: string, error = false) {
  window.clearTimeout(toastTimer);
  setApp((s) => {
    s.toast = { msg, error, id: Date.now() };
  });
  toastTimer = window.setTimeout(() => {
    setApp((s) => {
      s.toast = null;
    });
  }, 4000);
}

function fileName(path: string) {
  return path.split(/[\\/]/).pop() || path;
}

function dirName(path: string) {
  const cut = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return cut > 0 ? path.slice(0, cut) : "";
}

export async function addPaths(paths: string[]) {
  const known = new Set(app.items.map((i) => i.path));
  for (const path of paths) {
    if (known.has(path)) continue;
    try {
      const probe = await invoke<Probe>("probe", { path });
      const item: Item = {
        id: crypto.randomUUID(),
        path,
        name: fileName(path),
        w: probe.w,
        h: probe.h,
        bytes: probe.bytes,
        srcFormat: probe.format,
        url: convertFileSrc(path),
        meta: probe.meta,
        ops: { crop: null, rotate: 0, flipH: false, flipV: false, upscale: null, resize: null },
        quality: app.settings.defaultQuality,
        target: app.settings.defaultFormat,
        strip: app.settings.stripByDefault,
        status: "ready",
        preview: null,
        upscalePreview: null,
        outBytes: probe.bytes,
      };
      setApp((s) => {
        s.items.push(item);
        if (!s.selected) {
          s.selected = item.id;
          s.draft = makeDraft(item, s.settings.defaultFit);
        }
        if (!s.settings.outDir) s.settings.outDir = dirName(path);
      });
      known.add(path);
    } catch (err) {
      toast(`${fileName(path)}: ${String(err)}`, true);
    }
  }
}

export function applyCrop() {
  const draft = app.draft;
  if (!draft) return;
  const crop: Crop = { ...draft.crop };
  const full = crop.x < 0.001 && crop.y < 0.001 && crop.w > 0.999 && crop.h > 0.999;
  setApp((s) => {
    const item = s.items.find((i) => i.id === s.selected);
    if (!item) return;
    item.ops.crop = full ? null : crop;
    item.status = "editing";
    s.draft = makeDraft(item, s.settings.defaultFit);
  });
  toast("Crop applied");
}

export function resetCrop() {
  setApp((s) => {
    const item = s.items.find((i) => i.id === s.selected);
    if (!item) return;
    item.ops.crop = null;
    item.ops.rotate = 0;
    item.ops.flipH = false;
    item.ops.flipV = false;
    item.status = "ready";
    s.draft = makeDraft(item, s.settings.defaultFit);
  });
}

export function rotateBy(delta: number) {
  setApp((s) => {
    const item = s.items.find((i) => i.id === s.selected);
    if (!item) return;
    item.ops.rotate = (item.ops.rotate + delta + 360) % 360;
    item.ops.crop = null;
    item.status = "editing";
    s.draft = makeDraft(item, s.settings.defaultFit);
  });
}

export function toggleFlip(axis: "h" | "v") {
  const item = current();
  if (!item) return;
  patchItem(item.id, (it) => {
    if (axis === "h") it.ops.flipH = !it.ops.flipH;
    else it.ops.flipV = !it.ops.flipV;
    it.status = "editing";
  });
}

export function setAspect(aspect: number | null) {
  const item = current();
  if (!item || !app.draft) return;
  setApp((s) => {
    if (!s.draft) return;
    s.draft.aspect = aspect;
    if (!aspect) return;
    const imageAspect = item.w / item.h;
    let w = 1;
    let h = 1;
    if (aspect > imageAspect) h = imageAspect / aspect;
    else w = aspect / imageAspect;
    s.draft.crop = { x: (1 - w) / 2, y: (1 - h) / 2, w, h };
  });
}

export function setDraftCrop(crop: Crop) {
  setApp((s) => {
    if (s.draft) s.draft.crop = crop;
  });
}

export function setDraftResize(resize: Partial<{ w: number; h: number; fit: Fit }>) {
  setApp((s) => {
    if (!s.draft) return;
    if (resize.w !== undefined) s.draft.resize.w = resize.w;
    if (resize.h !== undefined) s.draft.resize.h = resize.h;
    if (resize.fit !== undefined) s.draft.resize.fit = resize.fit;
  });
}

export function setDraftUpscale(upscale: Partial<Upscale>) {
  setApp((s) => {
    if (!s.draft) return;
    if (upscale.scale !== undefined) s.draft.upscale.scale = upscale.scale;
    if (upscale.method !== undefined) s.draft.upscale.method = upscale.method;
    if (upscale.denoise !== undefined) s.draft.upscale.denoise = upscale.denoise;
    if (upscale.sharpen !== undefined) s.draft.upscale.sharpen = upscale.sharpen;
  });
}

export function applyUpscale() {
  const item = current();
  if (!item || !app.draft) return;
  patchItem(item.id, (it) => {
    const draft = app.draft!.upscale;
    const pure = draft.method === "pixel";
    it.ops.upscale = {
      scale: draft.scale,
      method: draft.method,
      denoise: pure ? 0 : draft.denoise,
      sharpen: pure ? 0 : draft.sharpen,
    };
    it.status = "editing";
  });
  toast("Upscale applied");
}

export function resetUpscale() {
  const item = current();
  if (!item) return;
  patchItem(item.id, (it) => {
    it.ops.upscale = null;
    const untouched =
      it.ops.crop === null &&
      it.ops.rotate === 0 &&
      !it.ops.flipH &&
      !it.ops.flipV &&
      it.ops.resize === null;
    it.status = untouched ? "ready" : "editing";
  });
  toast("Upscale reset");
}

export function applyResize() {
  const item = current();
  if (!item || !app.draft) return;
  patchItem(item.id, (it) => {
    it.ops.resize = { ...app.draft!.resize };
    it.status = "editing";
  });
  toast("Resize applied");
}

export function setQuality(value: number) {
  const item = current();
  if (!item) return;
  patchItem(item.id, (it) => {
    it.quality = Math.min(100, Math.max(1, Math.round(value)));
  });
}

export function setTarget(format: Fmt) {
  const item = current();
  if (!item) return;
  patchItem(item.id, (it) => {
    it.target = format;
  });
}

export function setStrip(value: boolean) {
  const item = current();
  if (!item) return;
  patchItem(item.id, (it) => {
    it.strip = value;
  });
}

export function markApplied(message: string) {
  const item = current();
  if (!item) return;
  patchItem(item.id, (it) => {
    it.status = "editing";
  });
  toast(message);
}

export function statusAfterExport(results: { path: string; status: string; bytesOut: number }[]) {
  setApp((s) => {
    for (const res of results) {
      const item = s.items.find((i) => i.path === res.path);
      if (!item) continue;
      if (res.status === "written") {
        item.status = "done";
        item.outBytes = res.bytesOut;
      } else if (res.status === "failed") {
        item.status = "ready";
      }
    }
    s.export = null;
  });
}
