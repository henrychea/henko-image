import { For } from "solid-js";
import type { Status } from "./types";
import { app, selectItem } from "./store";
import { formatBytes } from "./ui";

const statusText: Record<Status, string> = {
  ready: "Ready",
  editing: "Editing",
  queued: "Queued",
  done: "Done",
};

const statusDot: Record<Status, string> = {
  ready: "bg-rule",
  editing: "bg-shu",
  queued: "bg-muted",
  done: "bg-matcha",
};

export function Batch() {
  return (
    <aside class="flex w-60 shrink-0 flex-col overflow-hidden bg-washi">
      <div class="flex h-10 shrink-0 items-center justify-between border-b border-rule px-3">
        <span class="t-caps text-muted">Queue ({app.items.length})</span>
        <span class="t-mono text-muted">
          {app.items.filter((i) => i.status === "done").length} done
        </span>
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto">
        <For each={app.items}>
          {(item) => (
            <button
              type="button"
              class={[
                "flex w-full items-center gap-2.5 border-b border-rule px-3 py-2 text-left transition-colors",
                item.id === app.selected ? "bg-surface" : "hover:bg-surface/70",
              ]}
              onClick={() => selectItem(item.id)}
            >
              <span
                class={[
                  "h-14 w-14 shrink-0 overflow-hidden rounded-sm border bg-washi",
                  item.id === app.selected
                    ? "border-shu ring-2 ring-shu/20"
                    : "border-rule",
                ]}
              >
                <img
                  src={item.url}
                  alt=""
                  class="h-full w-full object-cover"
                  draggable={false}
                />
              </span>
              <span class="min-w-0 flex-1">
                <span class="t-mono block truncate">{item.name}</span>
                <span class="t-sm flex items-center gap-1.5 text-muted">
                  <span class={["h-1.5 w-1.5 rounded-full", statusDot[item.status]]} />
                  {statusText[item.status]}
                </span>
                <span class="t-mono block text-[10px] text-muted">
                  {item.w} × {item.h} · {formatBytes(item.bytes)}
                </span>
              </span>
            </button>
          )}
        </For>
      </div>
    </aside>
  );
}
