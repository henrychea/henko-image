import { Show } from "solid-js";
import type { JSX } from "@solidjs/web";
import type { Fit, Fmt, Theme } from "./types";
import { app, setSetting } from "./store";
import { Icon, Segmented, Slider, Switch } from "./ui";

function Section(props: { title: string; children: JSX.Element }) {
  return (
    <section class="mt-8 border-t border-rule pt-6">
      <h2 class="t-h2 mb-3">{props.title}</h2>
      {props.children}
    </section>
  );
}

function Row(props: { label: string; note?: string; children: JSX.Element }) {
  return (
    <div class="flex items-center justify-between gap-6 py-3">
      <div class="min-w-0">
        <div class="t-body">{props.label}</div>
        <Show when={props.note}>
          {(note) => <div class="t-sm text-muted">{note()}</div>}
        </Show>
      </div>
      <div class="shrink-0">{props.children}</div>
    </div>
  );
}

function Settings() {
  return (
    <main class="min-h-0 flex-1 overflow-y-auto bg-washi">
      <div class="motion-fade mx-auto max-w-[560px] px-6 py-8">
        <div class="t-h1">Settings</div>
        <div class="t-sm mt-1 text-muted">Defaults apply to images added from now on.</div>

        <Section title="Appearance">
          <Row label="Theme">
            <Segmented
              value={app.settings.theme}
              options={[
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
                { value: "system", label: "System" },
              ]}
              label="Theme"
              onChange={(value: Theme) => setSetting("theme", value)}
              class="w-[200px]"
            />
          </Row>
          <div class="mt-2 grid grid-cols-2 gap-3">
            <div class="asanoha swatch swatch-light" aria-hidden="true" />
            <div class="asanoha swatch swatch-dark" aria-hidden="true" />
          </div>
        </Section>

        <Section title="Defaults">
          <div class="card divide-y divide-rule py-0">
            <Row label="Default format">
              <Segmented
                value={app.settings.defaultFormat}
                options={[
                  { value: "jpeg", label: "JPEG" },
                  { value: "png", label: "PNG" },
                  { value: "webp", label: "WebP" },
                  { value: "avif", label: "AVIF" },
                ]}
                label="Default format"
                onChange={(value: Fmt) => setSetting("defaultFormat", value)}
                class="w-[260px]"
              />
            </Row>
            <Row label="Default quality">
              <div class="flex w-[260px] items-center gap-3">
                <div class="flex-1">
                  <Slider
                    min={1}
                    max={100}
                    value={app.settings.defaultQuality}
                    label="Default quality"
                    onInput={(value) => setSetting("defaultQuality", value)}
                  />
                </div>
                <span class="t-mono w-7 text-right">{app.settings.defaultQuality}</span>
              </div>
            </Row>
            <Row label="Default resize fit mode">
              <Segmented
                value={app.settings.defaultFit}
                options={[
                  { value: "fit", label: "Fit" },
                  { value: "fill", label: "Fill" },
                  { value: "stretch", label: "Stretch" },
                  { value: "none", label: "None" },
                ]}
                label="Default resize fit mode"
                onChange={(value: Fit) => setSetting("defaultFit", value)}
                class="w-[260px]"
              />
            </Row>
            <div class="py-1">
              <Switch
                checked={app.settings.rememberOutDir}
                onChange={(value) => setSetting("rememberOutDir", value)}
                label="Remember last output folder"
                note="Pre-fills the export folder and filename pattern next time."
              />
            </div>
          </div>
        </Section>

        <Section title="Behavior">
          <div class="card divide-y divide-rule py-0">
            <Switch
              checked={app.settings.stripByDefault}
              onChange={(value) => setSetting("stripByDefault", value)}
              label="Strip metadata by default"
              note="Orientation is applied before encoding; other metadata is dropped."
            />
            <Switch
              checked={app.settings.openSheetOnFinish}
              onChange={(value) => setSetting("openSheetOnFinish", value)}
              label="Open export sheet automatically when the queue finishes"
              note="Waits for batch work to settle before showing the sheet."
            />
            <Switch
              checked={app.settings.preserveWindow}
              onChange={(value) => setSetting("preserveWindow", value)}
              label="Preserve window size and position"
              note="Restores the last window frame on launch."
            />
          </div>
        </Section>

        <Section title="About">
          <div class="card">
            <div class="flex items-baseline justify-between">
              <div class="t-h1">変更 Henko</div>
              <div class="t-mono text-muted">v0.1.0</div>
            </div>
            <div class="t-sm mt-1 text-muted">
              A quiet desktop tool for cropping, resizing, compressing and converting images.
              Everything runs locally.
            </div>
            <div class="t-mono mt-4 text-muted">
              Build target: Tauri 2 · SolidJS 2 · Rust image
            </div>
            <div class="t-sm mt-1 text-muted">
              Crafted with Tauri, SolidJS and the Rust image crate.
            </div>
          </div>
        </Section>

        <div class="mt-8 flex items-center gap-2 border-t border-rule pt-4 text-muted">
          <Icon name="image" size={14} />
          <span class="t-sm">JPEG · PNG · WebP · AVIF</span>
        </div>
      </div>
    </main>
  );
}

export default Settings;
