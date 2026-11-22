import { createEffect, createMemo, createSignal, For, onSettled, Show } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import type { Crop, Item } from "./types";
import {
  app,
  current,
  mimeOf,
  compressOps,
  patchItem,
  previewKey,
  setDraftCrop,
  toast,
} from "./store";
import { formatBytes } from "./ui";

type DragMode = "move" | "nw" | "ne" | "sw" | "se";
type Size = { w: number; h: number };

const clamp = (value: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, value));

function nextRect(start: Crop, mode: DragMode, dx: number, dy: number, aspect: number | null): Crop {
  const min = 0.02;
  if (mode === "move") {
    return {
      x: clamp(start.x + dx, 0, 1 - start.w),
      y: clamp(start.y + dy, 0, 1 - start.h),
      w: start.w,
      h: start.h,
    };
  }

  let x0 = start.x;
  let y0 = start.y;
  let x1 = start.x + start.w;
  let y1 = start.y + start.h;
  if (mode.includes("w")) x0 = clamp(x0 + dx, 0, x1 - min);
  if (mode.includes("e")) x1 = clamp(x1 + dx, x0 + min, 1);
  if (mode.includes("n")) y0 = clamp(y0 + dy, 0, y1 - min);
  if (mode.includes("s")) y1 = clamp(y1 + dy, y0 + min, 1);

  let w = x1 - x0;
  let h = y1 - y0;
  if (!aspect) return { x: x0, y: y0, w, h };

  const anchorX = mode.includes("w") ? x1 : x0;
  const anchorY = mode.includes("n") ? y1 : y0;
  const maxW = mode.includes("w") ? x1 : 1 - x0;
  const maxH = mode.includes("n") ? anchorY : 1 - anchorY;
  w = Math.min(w, maxW);
  h = w / aspect;
  if (h > maxH) {
    h = maxH;
    w = h * aspect;
  }
  w = Math.min(w, maxW);
  h = w / aspect;
  if (w < min || h < min) {
    w = Math.min(Math.max(min, w), maxW);
    h = w / aspect;
  }
  return {
    x: clamp(mode.includes("w") ? anchorX - w : anchorX, 0, 1 - w),
    y: clamp(mode.includes("n") ? anchorY - h : anchorY, 0, 1 - h),
    w,
    h,
  };
}

function CropOverlay(props: {
  item: Item;
  display: Size;
  dragging: boolean;
  setDragging: (value: boolean) => void;
}) {
  const box = () => app.draft?.crop ?? { x: 0, y: 0, w: 1, h: 1 };
  const pxW = () => Math.max(1, Math.round(box().w * props.item.w));
  const pxH = () => Math.max(1, Math.round(box().h * props.item.h));

  const start = (event: PointerEvent, mode: DragMode) => {
    event.preventDefault();
    event.stopPropagation();
    const origin = { ...box() };
    const aspect = app.draft?.aspect ?? null;
    const startX = event.clientX;
    const startY = event.clientY;
    const width = props.display.w || 1;
    const height = props.display.h || 1;
    props.setDragging(true);

    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / width;
      const dy = (ev.clientY - startY) / height;
      setDraftCrop(nextRect(origin, mode, dx, dy, aspect));
    };
    const up = () => {
      props.setDragging(false);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const corners: { mode: DragMode; cursor: string }[] = [
    { mode: "nw", cursor: "nwse-resize" },
    { mode: "ne", cursor: "nesw-resize" },
    { mode: "sw", cursor: "nesw-resize" },
    { mode: "se", cursor: "nwse-resize" },
  ];

  return (
    <div class="absolute inset-0" style={{ "touch-action": "none" }}>
      <div class="absolute inset-0 overflow-hidden">
        <div
          class="absolute"
          style={{
            left: `${box().x * 100}%`,
            top: `${box().y * 100}%`,
            width: `${box().w * 100}%`,
            height: `${box().h * 100}%`,
            "box-shadow": "0 0 0 9999px rgba(30, 27, 22, 0.45)",
            cursor: "move",
          }}
          onPointerDown={(event) => start(event, "move")}
        >
          <Show when={props.dragging}>
            <div class="pointer-events-none absolute inset-0">
              <div
                class="absolute inset-y-0 left-1/3 w-px"
                style={{ background: "var(--rule)", opacity: 0.3 }}
              />
              <div
                class="absolute inset-y-0 left-2/3 w-px"
                style={{ background: "var(--rule)", opacity: 0.3 }}
              />
              <div
                class="absolute inset-x-0 top-1/3 h-px"
                style={{ background: "var(--rule)", opacity: 0.3 }}
              />
              <div
                class="absolute inset-x-0 top-2/3 h-px"
                style={{ background: "var(--rule)", opacity: 0.3 }}
              />
            </div>
          </Show>
          <div class="t-mono absolute right-1 bottom-1 rounded-sm bg-ink/75 px-1.5 py-0.5 text-[10px] text-surface">
            {pxW()} × {pxH()}
          </div>
        </div>
      </div>
      <For each={corners}>
        {(corner) => (
          <div
            class="absolute h-2 w-2 rounded-sm border border-surface bg-shu"
            style={{
              left: `${(corner.mode.includes("w") ? box().x : box().x + box().w) * 100}%`,
              top: `${(corner.mode.includes("n") ? box().y : box().y + box().h) * 100}%`,
              transform: "translate(-50%, -50%)",
              cursor: corner.cursor,
              "touch-action": "none",
            }}
            onPointerDown={(event) => start(event, corner.mode)}
          />
        )}
      </For>
    </div>
  );
}

function SplitView(props: { item: Item; display: Size }) {
  const [split, setSplit] = createSignal(50);
  let frame: HTMLElement | undefined;

  const startDrag = (event: PointerEvent) => {
    event.preventDefault();
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    const move = (ev: PointerEvent) => {
      setSplit(clamp(((ev.clientX - rect.left) / rect.width) * 100, 8, 92));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const previewUrl = () => props.item.preview?.url ?? props.item.url;

  return (
    <div class="bg-washi p-4 ring-1 ring-rule">
      <div
        ref={(el) => (frame = el)}
        class="relative select-none shadow-[0_1px_2px_rgba(30,27,22,0.08)]"
        style={{ width: `${props.display.w}px`, height: `${props.display.h}px` }}
      >
        <img
          src={previewUrl()}
          alt=""
          class="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
        <div class="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${split()}%` }}>
          <img
            src={props.item.url}
            alt=""
            class="absolute top-0 left-0 h-full object-cover"
            style={{ width: `${props.display.w}px` }}
            draggable={false}
          />
        </div>
        <div class="t-mono absolute top-1.5 left-1.5 max-w-[48%] truncate rounded-sm bg-surface/90 px-1.5 py-0.5 text-[10px] text-ink">
          Original · {formatBytes(props.item.bytes)}
        </div>
        <div class="t-mono absolute top-1.5 right-1.5 max-w-[48%] truncate rounded-sm bg-surface/90 px-1.5 py-0.5 text-[10px] text-ai">
          Compressed · {props.item.preview ? formatBytes(props.item.preview.bytes) : "—"}
        </div>
        <div class="absolute inset-y-0" style={{ left: `${split()}%` }}>
          <div class="absolute inset-y-0 -left-px w-0.5 bg-shu" />
          <button
            type="button"
            aria-label="Drag to compare"
            class="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-shu bg-surface"
            style={{ cursor: "ew-resize", "touch-action": "none" }}
            onPointerDown={startDrag}
          />
        </div>
      </div>
    </div>
  );
}

export function Canvas() {
  const item = createMemo(() => current());
  const [pane, setPane] = createSignal<Size>({ w: 900, h: 700 });
  const [dragging, setDragging] = createSignal(false);
  let paneEl: HTMLElement | undefined;

  onSettled(() => {
    if (!paneEl) return;
    const observer = new ResizeObserver(() => {
      if (paneEl) setPane({ w: paneEl.clientWidth, h: paneEl.clientHeight });
    });
    observer.observe(paneEl);
    return () => observer.disconnect();
  });

  const display = createMemo(() => {
    const it = item();
    if (!it) return { w: 0, h: 0 };
    const availableW = Math.max(80, pane().w - 96);
    const availableH = Math.max(80, pane().h - 96);
    const scale = Math.min(1, availableW / it.w, availableH / it.h);
    return { w: Math.round(it.w * scale), h: Math.round(it.h * scale) };
  });

  createEffect(
    () => {
      const it = item();
      if (!it || app.tool !== "compress") return null;
      const key = previewKey(it);
      if (it.preview?.key === key) return null;
      return {
        id: it.id,
        key,
        path: it.path,
        ops: compressOps,
        quality: it.quality,
        format: it.target,
      };
    },
    (request) => {
      if (!request) return;
      const timer = window.setTimeout(() => {
        invoke<{ bytesLen: number; data: string }>("preview", {
          path: request.path,
          ops: request.ops,
          quality: request.quality,
          format: request.format,
        })
          .then((result) => {
            patchItem(request.id, (it) => {
              it.preview = {
                key: request.key,
                bytes: result.bytesLen,
                url: `data:${mimeOf(request.format)};base64,${result.data}`,
              };
            });
          })
          .catch((err) => toast(`Preview failed: ${String(err)}`, true));
      }, 350);
      return () => window.clearTimeout(timer);
    },
  );

  return (
    <main
      ref={(el) => (paneEl = el)}
      class="relative min-w-0 flex-1 overflow-hidden border-x border-rule bg-surface"
    >
      <Show when={item()}>
        {(it) => (
          <div class="absolute inset-0 flex items-center justify-center p-6">
            <Show
              when={app.tool === "compress"}
              fallback={
                <div
                  class="relative bg-washi p-6 shadow-[0_1px_2px_rgba(30,27,22,0.06)] ring-1 ring-rule"
                  style={{
                    width: `${display().w + 48}px`,
                    height: `${display().h + 48}px`,
                  }}
                >
                  <div class="relative h-full w-full select-none">
                    <img
                      src={it().url}
                      alt=""
                      class="block h-full w-full select-none"
                      draggable={false}
                    />
                    <Show when={app.tool === "crop"}>
                      <CropOverlay
                        item={it()}
                        display={display()}
                        dragging={dragging()}
                        setDragging={setDragging}
                      />
                    </Show>
                  </div>
                </div>
              }
            >
              <SplitView item={it()} display={display()} />
            </Show>
          </div>
        )}
      </Show>
      <Show when={!item()}>
        <div class="t-sm absolute inset-0 flex items-center justify-center text-muted">
          Select an image from the queue
        </div>
      </Show>
    </main>
  );
}
