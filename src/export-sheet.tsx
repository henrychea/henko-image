import { createMemo, createSignal, For, Show } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import type { ExportJob, ExportResult } from "./types";
import {
  app,
  closeSheet,
  current,
  exportJob,
  outDims,
  resolvePattern,
  setApp,
  setSetting,
  statusAfterExport,
} from "./store";
import { formatBytes, Icon, Sheet } from "./ui";

const tokens = ["{name}", "{w}", "{h}", "{format}", "{date}"];

export function ExportSheet() {
  const [phase, setPhase] = createSignal<"form" | "running" | "done">("form");
  const [results, setResults] = createSignal<ExportResult[]>([]);
  const [overwrite, setOverwrite] = createSignal(false);
  const [outDir, setOutDir] = createSignal(app.settings.outDir);
  const [pattern, setPattern] = createSignal(app.settings.pattern);
  const [error, setError] = createSignal<string | null>(null);
  const [lastJobs, setLastJobs] = createSignal<ExportJob[]>([]);

  const sample = createMemo(() => current() ?? app.items[0]);
  const previewName = createMemo(() => {
    const item = sample();
    if (!item) return "";
    const dims = outDims(item);
    return resolvePattern(pattern(), item, dims.w, dims.h, item.target);
  });

  const written = () => results().filter((result) => result.status === "written");
  const failed = () => results().filter((result) => result.status === "failed");
  const skipped = () => results().filter((result) => result.status === "skipped");
  const bytesIn = () => written().reduce((sum, result) => sum + result.bytesIn, 0);
  const bytesOut = () => written().reduce((sum, result) => sum + result.bytesOut, 0);
  const savedPercent = () =>
    bytesIn() ? Math.round((1 - bytesOut() / bytesIn()) * 100) : 0;
  const progress = () => {
    const state = app.export;
    if (!state) return 0;
    return Math.round((state.done / Math.max(1, state.total)) * 100);
  };

  async function browse() {
    const dir = await open({ directory: true, defaultPath: outDir() || undefined });
    if (typeof dir === "string") setOutDir(dir);
  }

  function mergeResults(next: ExportResult[]) {
    setResults((prev) => {
      const map = new Map(prev.map((result) => [result.path, result]));
      for (const result of next) map.set(result.path, result);
      return [...map.values()];
    });
  }

  async function run(jobs: ExportJob[]) {
    if (!jobs.length) return;
    if (!outDir()) {
      setError("Choose an output folder first.");
      return;
    }
    setError(null);
    setLastJobs(jobs);
    setPhase("running");
    setApp((s) => {
      s.export = { done: 0, total: jobs.length, name: "" };
    });
    try {
      const next = await invoke<ExportResult[]>("export", {
        jobs,
        outDir: outDir(),
        pattern: pattern(),
        overwrite: overwrite(),
      });
      mergeResults(next);
      setPhase("done");
      if (app.settings.rememberOutDir) {
        setSetting("outDir", outDir());
        setSetting("pattern", pattern());
      }
      statusAfterExport(next);
    } catch (err) {
      setError(String(err));
      setPhase("form");
      setApp((s) => {
        s.export = null;
      });
    }
  }

  function start() {
    void run(app.items.map(exportJob));
  }

  function retry() {
    const paths = new Set(failed().map((result) => result.path));
    void run(lastJobs().filter((job) => paths.has(job.path)));
  }

  function close() {
    if (phase() === "running") return;
    closeSheet();
  }

  return (
    <Sheet onClose={close}>
      <div class="flex items-center justify-between border-b border-rule px-4 py-3">
        <h2 class="t-h1">Export</h2>
        <button
          type="button"
          class="btn btn-ghost btn-icon"
          aria-label="Close export"
          onClick={close}
          disabled={phase() === "running"}
        >
          <Icon name="close" size={14} />
        </button>
      </div>

      <Show when={phase() !== "done"}>
        <div class="space-y-4 px-4 py-4">
          <div>
            <div class="t-caps mb-2 text-muted">Output folder</div>
            <div class="flex items-center gap-2">
              <input class="field min-w-0 flex-1" readonly value={outDir()} aria-label="Output folder" />
              <button type="button" class="btn btn-ghost shrink-0" onClick={browse}>
                Browse…
              </button>
            </div>
          </div>

          <div>
            <div class="t-caps mb-2 text-muted">Filename pattern</div>
            <input
              class="field"
              value={pattern()}
              aria-label="Filename pattern"
              onInput={(event) => setPattern(event.currentTarget.value)}
            />
            <div class="mt-2 flex flex-wrap gap-1.5">
              <For each={tokens}>
                {(token) => (
                  <button
                    type="button"
                    class="t-mono rounded-sm border border-rule px-1.5 py-0.5 text-muted transition-colors hover:border-shu hover:text-ink"
                    onClick={() => setPattern(pattern() + token)}
                  >
                    {token}
                  </button>
                )}
              </For>
            </div>
            <div class="mt-2 flex items-center justify-between gap-2 rounded-sm border border-rule bg-washi px-2 py-1">
              <span class="t-sm shrink-0 text-muted">Preview</span>
              <span class="t-mono truncate">{previewName()}</span>
            </div>
          </div>

          <div>
            <div class="t-caps mb-2 text-muted">Conflict resolution</div>
            <div class="flex items-center gap-5">
              <label class="t-body flex items-center gap-2">
                <input
                  type="radio"
                  name="conflict"
                  class="accent-[var(--color-shu)]"
                  checked={!overwrite()}
                  onChange={() => setOverwrite(false)}
                />
                Skip existing
              </label>
              <label class="t-body flex items-center gap-2">
                <input
                  type="radio"
                  name="conflict"
                  class="accent-[var(--color-shu)]"
                  checked={overwrite()}
                  onChange={() => setOverwrite(true)}
                />
                Overwrite
              </label>
            </div>
            <Show when={overwrite()}>
              <div class="t-sm mt-1 text-muted">
                Files with the same name in the output folder will be replaced.
              </div>
            </Show>
          </div>

          <Show when={phase() === "running"}>
            <div>
              <div class="h-0.5 w-full bg-rule">
                <div
                  class="h-full bg-shu transition-[width] duration-150"
                  style={{ width: `${progress()}%` }}
                />
              </div>
              <div class="mt-2 flex items-center justify-between gap-3">
                <span class="t-sm truncate text-muted">{app.export?.name || "Preparing…"}</span>
                <span class="t-mono shrink-0">
                  {app.export?.done ?? 0} / {app.export?.total ?? app.items.length}
                </span>
              </div>
            </div>
          </Show>

          <Show when={error()}>
            <div class="t-sm text-shu">{error()}</div>
          </Show>
        </div>

        <div class="flex items-center justify-end gap-2 border-t border-rule px-4 py-3">
          <button
            type="button"
            class="btn btn-ghost"
            onClick={close}
            disabled={phase() === "running"}
          >
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-primary"
            onClick={start}
            disabled={phase() === "running" || app.items.length === 0}
          >
            Export {app.items.length} images
          </button>
        </div>
      </Show>

      <Show when={phase() === "done"}>
        <div class="space-y-4 px-4 py-4 motion-fade">
          <div>
            <div class="t-h2">
              {written().length} {written().length === 1 ? "image" : "images"} exported
            </div>
            <Show when={skipped().length > 0}>
              <div class="t-sm text-muted">{skipped().length} skipped (already existed)</div>
            </Show>
          </div>

          <Show when={written().length > 0}>
            <div>
              <div class="t-caps mb-1 text-muted">Total bytes saved</div>
              <div class="t-display text-matcha">
                {formatBytes(Math.max(0, bytesIn() - bytesOut()))} · {savedPercent()}%
              </div>
            </div>
          </Show>

          <div>
            <div class="t-caps mb-1 text-muted">Output folder</div>
            <div class="t-mono break-all">{outDir()}</div>
          </div>

          <Show when={failed().length > 0}>
            <div class="rounded-sm border border-rule p-2">
              <div class="t-sm mb-1 text-shu">{failed().length} failed</div>
              <For each={failed()}>
                {(result) => (
                  <div class="t-sm text-shu">
                    {result.path.split(/[\\/]/).pop()}: {result.error ?? "unknown error"}
                  </div>
                )}
              </For>
              <button type="button" class="btn btn-ghost mt-2" onClick={retry}>
                Retry failed
              </button>
            </div>
          </Show>

          <div class="flex items-center justify-between gap-2">
            <button
              type="button"
              class="btn btn-ghost"
              onClick={() => revealItemInDir(outDir())}
            >
              <Icon name="folder" size={14} />
              Show in folder
            </button>
            <button type="button" class="btn btn-primary" onClick={close}>
              Done
            </button>
          </div>
        </div>
      </Show>
    </Sheet>
  );
}
