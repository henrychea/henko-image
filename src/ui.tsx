import { For, Show } from "solid-js";
import type { JSX } from "@solidjs/web";
import { Portal } from "@solidjs/web";

const paths: Record<string, string> = {
  upload:
    "M8 10.5V2.6M8 2.6 5 5.6M8 2.6l3 3M2.6 9.6v3a1 1 0 0 0 1 1h8.8a1 1 0 0 0 1-1v-3",
  folder:
    "M2 4.6A1.6 1.6 0 0 1 3.6 3h2.1l1.4 1.6h5.3A1.6 1.6 0 0 1 14 6.2v5.2a1.6 1.6 0 0 1-1.6 1.6H3.6A1.6 1.6 0 0 1 2 11.4V4.6Z",
  export:
    "M8 2.4v7.8m0-7.8L5.2 5.2M8 2.4l2.8 2.8M2.8 9.6v3A1.4 1.4 0 0 0 4.2 14h7.6a1.4 1.4 0 0 0 1.4-1.4v-3",
  gear: "M8 5.5A2.5 2.5 0 1 0 8 10.5 2.5 2.5 0 0 0 8 5.5Zm5.4 2.5c0-.4 0-.7-.1-1l1.2-.9-1.3-2.2-1.4.5c-.5-.4-1-.7-1.6-.9l-.2-1.5H7l-.2 1.5c-.6.2-1.1.5-1.6.9l-1.4-.5-1.3 2.2 1.2.9a5 5 0 0 0 0 2l-1.2.9 1.3 2.2 1.4-.5c.5.4 1 .7 1.6.9l.2 1.5h3l.2-1.5c.6-.2 1.1-.5 1.6-.9l1.4.5 1.3-2.2-1.2-.9c.1-.3.1-.6.1-1Z",
  rotateLeft: "M3.2 8a4.8 4.8 0 1 0 1.5-3.5M3 2.6v2.9h2.9",
  rotateRight: "M12.8 8a4.8 4.8 0 1 1-1.5-3.5M13 2.6v2.9H10.1",
  flipH: "M8 1.8v12.4M2.4 5.2v5.6l3.6-2.8-3.6-2.8Zm11.2 0v5.6l-3.6-2.8 3.6-2.8Z",
  flipV: "M1.8 8h12.4M5.2 2.4h5.6L8 6 5.2 2.4Zm0 11.2h5.6L8 10l-2.8 3.6Z",
  lock: "M5.2 7V5.2a2.8 2.8 0 0 1 5.6 0V7M4 7h8v6.4H4Z",
  unlock: "M5.2 7V5.2a2.8 2.8 0 0 1 5.4-1M4 7h8v6.4H4Z",
  close: "M3.4 3.4l9.2 9.2M12.6 3.4l-9.2 9.2",
  back: "M10 3.2 5.2 8 10 12.8",
  check: "M3 8.4 6.4 11.8 13 4.6",
  image: "M2 3.4h12v9.2H2zM2 10.2 5.6 7l3 2.6L11 7.4l3 2.8",
  warning: "M8 2.2 14 13H2L8 2.2Zm0 4v3.2m0 2v.6",
  plus: "M8 3v10M3 8h10",
  minus: "M3 8h10",
  chevron: "M6.4 4.2 10.2 8l-3.8 3.8",
};

export function Icon(props: { name: keyof typeof paths | string; size?: number; class?: string }) {
  return (
    <svg
      width={props.size ?? 16}
      height={props.size ?? 16}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      stroke-width="1.2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={props.class}
      aria-hidden="true"
    >
      <path d={paths[props.name]} />
    </svg>
  );
}

export function Segmented<T extends string>(props: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
  class?: string;
}) {
  return (
    <div class={["seg", props.class]} role="group" aria-label={props.label}>
      <For each={props.options}>
        {(option) => (
          <button
            type="button"
            aria-pressed={props.value === option.value ? "true" : "false"}
            onClick={() => props.onChange(option.value)}
          >
            {option.label}
          </button>
        )}
      </For>
    </div>
  );
}

export function Slider(props: {
  min: number;
  max: number;
  value: number;
  label: string;
  onInput: (value: number) => void;
  onChange?: (value: number) => void;
}) {
  const fill = () => ((props.value - props.min) / (props.max - props.min)) * 100;
  return (
    <input
      type="range"
      class="slider"
      min={props.min}
      max={props.max}
      step="1"
      value={props.value}
      aria-label={props.label}
      style={{ "--fill": `${fill()}%` }}
      onInput={(event) => props.onInput(Number(event.currentTarget.value))}
      onChange={(event) => props.onChange?.(Number(event.currentTarget.value))}
    />
  );
}

export function Switch(props: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  note?: string;
}) {
  return (
    <div class="flex items-start justify-between gap-4 py-2">
      <div class="min-w-0">
        <div class="t-body">{props.label}</div>
        <Show when={props.note}>
          {(note) => <div class="t-sm text-muted">{note()}</div>}
        </Show>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={props.checked ? "true" : "false"}
        aria-label={props.label}
        class={[
          "relative mt-1 h-4 w-7 shrink-0 rounded-full border transition-colors",
          props.checked ? "border-shu bg-shu" : "border-rule bg-washi",
        ]}
        onClick={() => props.onChange(!props.checked)}
      >
        <span
          class={[
            "absolute top-[2px] h-2 w-2 rounded-full bg-surface transition-[left]",
            props.checked ? "left-[14px]" : "left-[3px]",
          ]}
        />
      </button>
    </div>
  );
}

export function Sheet(props: { children: JSX.Element; onClose: () => void }) {
  return (
    <Portal mount={document.body}>
      <div class="fixed inset-0 z-40 flex items-center justify-center">
        <button
          type="button"
          aria-label="Close"
          class="absolute inset-0"
          style={{ background: "color-mix(in srgb, var(--ink) 45%, transparent)" }}
          onClick={props.onClose}
        />
        <div class="motion-down relative w-[480px] max-w-[92vw] rounded-lg border border-rule bg-surface shadow-[0_24px_64px_rgba(20,19,17,0.24)]">
          {props.children}
        </div>
      </div>
    </Portal>
  );
}

export function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const power = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** power;
  const digits = power === 0 || value >= 100 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[power]}`;
}

export function percent(base: number, next: number) {
  if (!base) return "0%";
  const change = Math.round((1 - next / base) * 100);
  return `${change > 0 ? "−" : change < 0 ? "+" : ""}${Math.abs(change)}%`;
}
