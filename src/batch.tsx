import { For } from "solid-js";
import type { Status } from "./types";
import { app, clearItems, removeItem, selectItem } from "./store";
import { formatBytes, Icon } from "./ui";

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
  const exporting = () => app.export !== null;

  return (
    <aside class="flex w-60 shrink-0 flex-col overflow-hidden bg-washi">
      <div class="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-rule px-3">
        <span class="t-caps shrink-0 text-muted">Queue ({app.items.length})</span>
        <div class="flex min-w-0 items-center gap-2">
          <span class="t-mono shrink-0 text-muted">
            {app.items.filter((i) => i.status === "done").length} done
          </span>
          <button
            type="button"
            class="t-sm shrink-0 text-muted transition-colors hover:text-shu disabled:hover:text-muted"
            disabled={exporting() || app.items.length === 0}
            onClick={clearItems}
          >
            Clear
          </button>
        </div>
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto">
        <For each={app.items}>
          {(item) => (
            <div
              class={[
                "group flex items-stretch border-b border-rule transition-colors",
                item.id === app.selected ? "bg-surface" : "hover:bg-surface/70",
              ]}
            >
              <button
                type="button"
                class="flex min-w-0 flex-1 items-center gap-2.5 py-2 pr-1 pl-3 text-left"
                onClick={() => selectItem(item.id)}
              >
                <span
                  class={[
                    "h-14 w-14 shrink-0 overflow-hidden rounded-sm border bg-washi",
                    item.id === app.selected ? "border-shu ring-2 ring-shu/20" : "border-rule",
                  ]}
                >
                  <img src={item.url} alt="" class="h-full w-full object-cover" draggable={false} />
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
              <button
                type="button"
                class={[
                  "my-2 mr-1.5 flex h-6 w-6 shrink-0 items-center justify-center self-start rounded-md text-muted transition-colors hover:text-shu",
                  exporting()
                    ? "opacity-0"
                    : item.id === app.selected
                      ? "opacity-60 hover:opacity-100 focus-visible:opacity-100"
                      : "opacity-0 focus-visible:opacity-100 group-hover:opacity-100",
                ]}
                aria-label={`Remove ${item.name}`}
                title="Remove from queue"
                disabled={exporting()}
                onClick={() => removeItem(item.id)}
              >
                <Icon name="close" size={12} />
              </button>
            </div>
          )}
        </For>
      </div>
    </aside>
  );
}
