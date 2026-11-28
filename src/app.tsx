import { createEffect, onSettled, Show } from "solid-js";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { getCurrentWindow, LogicalPosition, LogicalSize } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import type { Progress, Theme } from "./types";
import {
  addPaths,
  app,
  current,
  openSheet,
  outDims,
  previewFor,
  setApp,
  setSetting,
  toast,
} from "./store";
import { Batch } from "./batch";
import { Canvas } from "./canvas";
import { ExportSheet } from "./export-sheet";
import { Inspector } from "./inspector";
import Settings from "./settings";
import { Icon, Segmented, formatBytes, percent } from "./ui";

function TopBar() {
  const folder = () => {
    const item = current();
    if (!item) return "";
    const cut = Math.max(item.path.lastIndexOf("/"), item.path.lastIndexOf("\\"));
    return cut > 0 ? item.path.slice(0, cut) : "";
  };

  const toggleSettings = () => {
    setApp((s) => {
      s.view = s.view === "settings" ? "workspace" : "settings";
    });
  };

  return (
    <header class="flex h-12 shrink-0 items-center gap-4 border-b border-rule bg-surface px-4">
      <div class="flex items-baseline gap-2">
        <span class="font-serif text-[15px] leading-none font-semibold">変更</span>
        <span class="t-h2 leading-none">Henko</span>
      </div>
      <Show when={folder()}>
        <span class="t-mono min-w-0 truncate text-muted">{folder()}</span>
      </Show>

      <div class="ml-auto flex shrink-0 items-center gap-2">
        <Show when={app.view === "settings"}>
          <button type="button" class="btn btn-ghost" onClick={toggleSettings}>
            <Icon name="back" size={14} />
            Back
          </button>
        </Show>
        <Segmented
          value={app.settings.theme}
          options={[
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
            { value: "system", label: "System" },
          ]}
          label="Theme"
          onChange={(value: Theme) => setSetting("theme", value)}
          class="w-[168px]"
        />
        <button
          type="button"
          class="btn btn-ghost btn-icon"
          title="Settings"
          aria-label="Settings"
          onClick={toggleSettings}
        >
          <Icon name="gear" />
        </button>
        <button
          type="button"
          class="btn btn-primary"
          disabled={app.items.length === 0}
          onClick={openSheet}
        >
          <Icon name="export" size={14} />
          Export
        </button>
      </div>
    </header>
  );
}

function Empty() {
  const choose = async () => {
    const files = await open({
      multiple: true,
      filters: [{ name: "Images", extensions: ["jpg", "jpeg", "png", "webp", "avif"] }],
    });
    if (Array.isArray(files)) await addPaths(files);
    else if (typeof files === "string") await addPaths([files]);
  };

  return (
    <main class="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-surface">
      <div class="motion-fade flex w-[480px] max-w-[80vw] flex-col items-center text-center">
        <div class="t-display">変更</div>
        <div class="t-caps mt-2 text-muted">Change your images</div>
        <p class="t-body mt-4 max-w-[400px] text-muted">
          Crop, resize, upscale, compress and convert images into the size and format you need,
          entirely on this machine.
        </p>

        <div
          class={[
            "asanoha mt-8 flex h-[220px] w-full flex-col items-center justify-center rounded-lg border border-dashed px-12 transition-colors",
            app.dragActive
              ? "border-solid border-shu bg-surface"
              : "border-rule bg-washi hover:border-shu hover:bg-surface",
          ]}
        >
          <Icon name="upload" size={24} class="text-muted" />
          <div class="t-body mt-3">Drag and drop your images here</div>
          <div class="t-sm text-muted">Processed locally, never uploaded</div>
        </div>

        <button type="button" class="btn btn-ghost mt-6" onClick={choose}>
          <Icon name="folder" size={14} />
          Choose files…
        </button>
        <div class="t-sm mt-3 text-muted">JPEG · PNG · WebP · AVIF</div>
      </div>
    </main>
  );
}

function Workspace() {
  return (
    <div class="flex min-h-0 flex-1">
      <Batch />
      <Canvas />
      <Inspector />
    </div>
  );
}

function StatusBar() {
  const index = () => app.items.findIndex((item) => item.id === app.selected) + 1;
  const dims = () => {
    const item = current();
    if (!item) return "—";
    const size = outDims(item);
    return `${size.w} × ${size.h}`;
  };
  const saved = () => {
    const item = current();
    if (!item) return "—";
    const preview = previewFor(item);
    return preview ? percent(item.bytes, preview.bytes) : "—";
  };
  const progress = () => {
    const state = app.export;
    if (!state) return 0;
    return Math.round((state.done / Math.max(1, state.total)) * 100);
  };

  return (
    <footer class="relative flex h-7 shrink-0 items-center gap-2 border-t border-rule bg-surface px-4">
      <Show when={app.export}>
        <div class="absolute inset-x-0 top-0 h-0.5 bg-rule">
          <div
            class="h-full bg-shu transition-[width] duration-150"
            style={{ width: `${progress()}%` }}
          />
        </div>
      </Show>
      <span class="t-mono text-muted">
        {app.export
          ? `Exporting ${app.export.done} / ${app.export.total}`
          : `${index()} of ${app.items.length}`}
      </span>
      <span class="t-mono text-muted">·</span>
      <span class="t-mono text-muted">{dims()}</span>
      <span class="t-mono text-muted">·</span>
      <span class="t-mono text-muted">{current()?.target.toUpperCase() ?? "—"}</span>
      <span class="t-mono text-muted">·</span>
      <span class="t-mono text-muted">{saved()}</span>
      <Show when={current()}>
        {(item) => (
          <span class="t-mono ml-auto text-muted">{formatBytes(item().bytes)}</span>
        )}
      </Show>
    </footer>
  );
}

function ToastHost() {
  return (
    <Show when={app.toast}>
      {(toastValue) => (
        <div class="pointer-events-none fixed bottom-9 left-1/2 z-50 -translate-x-1/2">
          <div class="toast motion-up flex items-center gap-2">
            <Show when={toastValue().error}>
              <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-shu" />
            </Show>
            {toastValue().msg}
          </div>
        </div>
      )}
    </Show>
  );
}

export default function App() {
  createEffect(
    () => app.settings.theme,
    (theme) => {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const apply = () => {
        document.documentElement.dataset.theme =
          theme === "system" ? (media.matches ? "dark" : "light") : theme;
      };
      apply();
      if (theme !== "system") return;
      media.addEventListener("change", apply);
      return () => media.removeEventListener("change", apply);
    },
  );

  createEffect(
    () =>
      JSON.stringify({
        ...app.settings,
        outDir: app.settings.rememberOutDir ? app.settings.outDir : "",
      }),
    (json) => localStorage.setItem("henko.settings", json),
  );

  onSettled(() => {
    let disposed = false;
    const cleanups: (() => void)[] = [];

    (async () => {
      try {
        const unlistenDrop = await getCurrentWebview().onDragDropEvent((event) => {
          if (event.payload.type === "enter" || event.payload.type === "over") {
            setApp((s) => {
              s.dragActive = true;
            });
          } else if (event.payload.type === "leave") {
            setApp((s) => {
              s.dragActive = false;
            });
          } else if (event.payload.type === "drop") {
            setApp((s) => {
              s.dragActive = false;
            });
            void addPaths(event.payload.paths);
          }
        });
        if (disposed) unlistenDrop();
        else cleanups.push(unlistenDrop);

        const unlistenProgress = await listen<Progress>("export-progress", (event) => {
          setApp((s) => {
            if (!s.export) return;
            s.export.done = Math.max(s.export.done, event.payload.index);
            s.export.name = event.payload.name;
          });
        });
        if (disposed) unlistenProgress();
        else cleanups.push(unlistenProgress);
      } catch {
        toast("Desktop events are unavailable", true);
      }
    })();

    return () => {
      disposed = true;
      for (const cleanup of cleanups) cleanup();
    };
  });

  onSettled(() => {
    try {
      const win = getCurrentWindow();
      let timer: number | undefined;
      const save = () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(async () => {
          if (!app.settings.preserveWindow) return;
          try {
            const position = await win.outerPosition();
            const size = await win.innerSize();
            const factor = await win.scaleFactor();
            localStorage.setItem(
              "henko.window",
              JSON.stringify({
                x: position.x / factor,
                y: position.y / factor,
                w: size.width / factor,
                h: size.height / factor,
              }),
            );
          } catch {
            return;
          }
        }, 400);
      };

      const forgetFrame = () => localStorage.removeItem("henko.window");

      if (app.settings.preserveWindow) {
        try {
          const saved = JSON.parse(localStorage.getItem("henko.window") || "null");
          if (saved) {
            win.setSize(new LogicalSize(saved.w, saved.h)).catch(forgetFrame);
            win.setPosition(new LogicalPosition(saved.x, saved.y)).catch(forgetFrame);
          }
        } catch {
          forgetFrame();
        }
      }

      const unlisteners: Promise<() => void>[] = [
        win.onResized(save),
        win.onMoved(save),
      ];

      return () => {
        window.clearTimeout(timer);
        for (const pending of unlisteners) void pending.then((off) => off());
      };
    } catch {
      return;
    }
  });

  return (
    <div class="flex h-full flex-col bg-washi text-ink">
      <TopBar />
      <Show
        when={app.view === "settings"}
        fallback={
          <Show when={app.items.length > 0} fallback={<Empty />}>
            <Workspace />
          </Show>
        }
      >
        <Settings />
      </Show>
      <Show when={app.view === "workspace" && app.items.length > 0}>
        <StatusBar />
      </Show>
      <Show when={app.sheetOpen}>
        <ExportSheet />
      </Show>
      <ToastHost />
    </div>
  );
}
