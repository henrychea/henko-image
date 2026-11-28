mod pipeline;
mod upscale;

use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Mutex;

use pipeline::{Format, Ops};
use serde::{Deserialize, Serialize};
use tauri::Emitter;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Preview {
    bytes_len: usize,
    data: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExportJob {
    path: String,
    ops: Ops,
    quality: u8,
    format: Format,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ExportResult {
    path: String,
    out: String,
    status: String,
    bytes_in: u64,
    bytes_out: u64,
    error: Option<String>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ExportProgress {
    index: usize,
    total: usize,
    name: String,
    status: String,
    bytes_out: u64,
}

#[tauri::command]
async fn probe(path: String) -> Result<pipeline::Probe, String> {
    tauri::async_runtime::spawn_blocking(move || pipeline::probe(Path::new(&path)))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn preview(path: String, ops: Ops, quality: u8, format: Format) -> Result<Preview, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let image = pipeline::decode(Path::new(&path))?;
        let image = pipeline::transform(image, &ops);
        let bytes = pipeline::encode(&image, format, quality)?;
        Ok(Preview {
            bytes_len: bytes.len(),
            data: base64(&bytes),
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn export(
    app: tauri::AppHandle,
    jobs: Vec<ExportJob>,
    out_dir: String,
    pattern: String,
    overwrite: bool,
) -> Result<Vec<ExportResult>, String> {
    let dir = PathBuf::from(&out_dir);
    if !dir.is_dir() {
        return Err(format!("Output folder does not exist: {out_dir}"));
    }
    tauri::async_runtime::spawn_blocking(move || run_export(app, jobs, dir, pattern, overwrite))
        .await
        .map_err(|e| e.to_string())
}

fn run_export(
    app: tauri::AppHandle,
    jobs: Vec<ExportJob>,
    out_dir: PathBuf,
    pattern: String,
    overwrite: bool,
) -> Vec<ExportResult> {
    let total = jobs.len();
    if total == 0 {
        return Vec::new();
    }
    let next = AtomicUsize::new(0);
    let results = Mutex::new(Vec::with_capacity(total));
    let workers = total.min(4);

    std::thread::scope(|scope| {
        for _ in 0..workers {
            scope.spawn(|| loop {
                let index = next.fetch_add(1, Ordering::SeqCst);
                if index >= total {
                    break;
                }
                let job = &jobs[index];
                let source_name = Path::new(&job.path)
                    .file_name()
                    .and_then(|value| value.to_str())
                    .unwrap_or_default()
                    .to_string();
                let result = export_one(job, &out_dir, &pattern, overwrite);
                let name = if result.out.is_empty() {
                    source_name
                } else {
                    Path::new(&result.out)
                        .file_name()
                        .and_then(|value| value.to_str())
                        .unwrap_or_default()
                        .to_string()
                };
                let _ = app.emit(
                    "export-progress",
                    ExportProgress {
                        index: index + 1,
                        total,
                        name,
                        status: result.status.clone(),
                        bytes_out: result.bytes_out,
                    },
                );
                results.lock().expect("result lock").push((index, result));
            });
        }
    });

    let mut collected = results.into_inner().expect("result lock");
    collected.sort_by_key(|(index, _)| *index);
    collected.into_iter().map(|(_, result)| result).collect()
}

fn export_one(job: &ExportJob, out_dir: &Path, pattern: &str, overwrite: bool) -> ExportResult {
    let source = Path::new(&job.path);
    let bytes_in = std::fs::metadata(source)
        .map(|meta| meta.len())
        .unwrap_or(0);
    let fail = |error: String| ExportResult {
        path: job.path.clone(),
        out: String::new(),
        status: "failed".to_string(),
        bytes_in,
        bytes_out: 0,
        error: Some(error),
    };

    let image = match pipeline::decode(source) {
        Ok(image) => image,
        Err(error) => return fail(error),
    };
    let image = pipeline::transform(image, &job.ops);
    let encoded = match pipeline::encode(&image, job.format, job.quality) {
        Ok(bytes) => bytes,
        Err(error) => return fail(error),
    };
    let name = pipeline::resolve_name(pattern, source, image.width(), image.height(), job.format);
    let out = out_dir.join(name);
    let out_string = out.to_string_lossy().into_owned();

    if out.exists() && !overwrite {
        return ExportResult {
            path: job.path.clone(),
            out: out_string,
            status: "skipped".to_string(),
            bytes_in,
            bytes_out: 0,
            error: None,
        };
    }

    match std::fs::write(&out, &encoded) {
        Ok(()) => ExportResult {
            path: job.path.clone(),
            out: out_string,
            status: "written".to_string(),
            bytes_in,
            bytes_out: encoded.len() as u64,
            error: None,
        },
        Err(error) => fail(format!("Cannot write {out_string}: {error}")),
    }
}

fn base64(bytes: &[u8]) -> String {
    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity(bytes.len().div_ceil(3) * 4);
    for chunk in bytes.chunks(3) {
        let first = chunk[0] as u32;
        let second = chunk.get(1).copied().unwrap_or(0) as u32;
        let third = chunk.get(2).copied().unwrap_or(0) as u32;
        let value = (first << 16) | (second << 8) | third;
        out.push(TABLE[(value >> 18) as usize & 63] as char);
        out.push(TABLE[(value >> 12) as usize & 63] as char);
        out.push(if chunk.len() > 1 {
            TABLE[(value >> 6) as usize & 63] as char
        } else {
            '='
        });
        out.push(if chunk.len() > 2 {
            TABLE[value as usize & 63] as char
        } else {
            '='
        });
    }
    out
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![probe, preview, export])
        .run(tauri::generate_context!("tauri.conf.json"))
        .expect("failed to start Henko");
}
