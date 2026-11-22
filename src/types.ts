export type Tool = "crop" | "resize" | "compress" | "format";
export type Fmt = "jpeg" | "png" | "webp" | "avif";
export type Fit = "fit" | "fill" | "stretch" | "none";
export type Theme = "light" | "dark" | "system";
export type Status = "ready" | "editing" | "queued" | "done";

export type Crop = { x: number; y: number; w: number; h: number };
export type Resize = { w: number; h: number; fit: Fit };

export type Ops = {
  crop: Crop | null;
  rotate: number;
  flipH: boolean;
  flipV: boolean;
  resize: Resize | null;
};

export type Probe = {
  w: number;
  h: number;
  bytes: number;
  format: string;
  meta: string[];
};

export type Preview = { key: string; bytes: number; url: string };

export type Item = {
  id: string;
  path: string;
  name: string;
  w: number;
  h: number;
  bytes: number;
  srcFormat: string;
  url: string;
  meta: string[];
  ops: Ops;
  quality: number;
  target: Fmt;
  strip: boolean;
  status: Status;
  preview: Preview | null;
  outBytes: number;
};

export type Settings = {
  theme: Theme;
  defaultFormat: Fmt;
  defaultQuality: number;
  defaultFit: Fit;
  rememberOutDir: boolean;
  stripByDefault: boolean;
  openSheetOnFinish: boolean;
  preserveWindow: boolean;
  outDir: string;
  pattern: string;
};

export type ExportJob = {
  path: string;
  ops: Ops;
  quality: number;
  format: Fmt;
};

export type ExportResult = {
  path: string;
  out: string;
  status: "written" | "skipped" | "failed";
  bytesIn: number;
  bytesOut: number;
  error: string | null;
};

export type Progress = {
  index: number;
  total: number;
  name: string;
  status: string;
  bytesOut: number;
};

export type Draft = { id: string; crop: Crop; aspect: number | null; resize: Resize };
