use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

use image::imageops::FilterType;
use image::metadata::Orientation;
use image::{
    DynamicImage, ExtendedColorType, ImageDecoder, ImageEncoder, ImageFormat, ImageReader,
};
use serde::{Deserialize, Serialize};

use crate::upscale::{self, Upscale};

#[derive(Debug, Clone, Copy, Default, Deserialize)]
pub struct Crop {
    pub x: f32,
    pub y: f32,
    pub w: f32,
    pub h: f32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
pub enum Fit {
    #[serde(rename = "fit")]
    Contain,
    #[serde(rename = "fill")]
    Cover,
    #[serde(rename = "stretch")]
    Stretch,
    #[serde(rename = "none")]
    None,
}

#[derive(Debug, Clone, Copy, Deserialize)]
pub struct Resize {
    pub w: u32,
    pub h: u32,
    pub fit: Fit,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Format {
    Jpeg,
    Png,
    Webp,
    Avif,
}

impl Format {
    pub fn ext(self) -> &'static str {
        match self {
            Self::Jpeg => "jpg",
            Self::Png => "png",
            Self::Webp => "webp",
            Self::Avif => "avif",
        }
    }

    pub fn token(self) -> &'static str {
        match self {
            Self::Jpeg => "jpeg",
            Self::Png => "png",
            Self::Webp => "webp",
            Self::Avif => "avif",
        }
    }
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Ops {
    pub crop: Option<Crop>,
    pub rotate: u16,
    pub flip_h: bool,
    pub flip_v: bool,
    #[serde(default)]
    pub upscale: Option<Upscale>,
    pub resize: Option<Resize>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Probe {
    pub w: u32,
    pub h: u32,
    pub bytes: u64,
    pub format: String,
    pub meta: Vec<String>,
}

pub fn probe(path: &Path) -> Result<Probe, String> {
    let bytes = std::fs::metadata(path)
        .map_err(|e| format!("Cannot read {}: {e}", path.display()))?
        .len();
    let reader = ImageReader::open(path)
        .map_err(|e| format!("Cannot open {}: {e}", path.display()))?
        .with_guessed_format()
        .map_err(|e| format!("Cannot read {}: {e}", path.display()))?;
    let format = reader
        .format()
        .ok_or_else(|| format!("Unknown image format: {}", path.display()))?;
    let mut decoder = reader
        .into_decoder()
        .map_err(|e| format!("Unsupported image {}: {e}", path.display()))?;

    let (mut w, mut h) = decoder.dimensions();
    let orientation = decoder.orientation().unwrap_or(Orientation::NoTransforms);
    if matches!(
        orientation,
        Orientation::Rotate90
            | Orientation::Rotate270
            | Orientation::Rotate90FlipH
            | Orientation::Rotate270FlipH
    ) {
        std::mem::swap(&mut w, &mut h);
    }

    let mut meta = Vec::new();
    if decoder
        .exif_metadata()
        .map_err(|e| format!("Cannot read metadata: {e}"))?
        .is_some()
    {
        meta.push("EXIF".to_string());
    }
    if decoder
        .xmp_metadata()
        .map_err(|e| format!("Cannot read metadata: {e}"))?
        .is_some()
    {
        meta.push("XMP".to_string());
    }
    if decoder
        .iptc_metadata()
        .map_err(|e| format!("Cannot read metadata: {e}"))?
        .is_some()
    {
        meta.push("IPTC".to_string());
    }
    if decoder
        .icc_profile()
        .map_err(|e| format!("Cannot read profile: {e}"))?
        .is_some()
    {
        meta.push("ICC profile".to_string());
    }

    Ok(Probe {
        w,
        h,
        bytes,
        format: format_name(format),
        meta,
    })
}

fn format_name(format: ImageFormat) -> String {
    match format {
        ImageFormat::Jpeg => "jpeg".to_string(),
        ImageFormat::Png => "png".to_string(),
        ImageFormat::WebP => "webp".to_string(),
        ImageFormat::Avif => "avif".to_string(),
        other => format!("{other:?}").to_lowercase(),
    }
}

pub fn decode(path: &Path) -> Result<DynamicImage, String> {
    let mut decoder = ImageReader::open(path)
        .map_err(|e| format!("Cannot open {}: {e}", path.display()))?
        .with_guessed_format()
        .map_err(|e| format!("Cannot read {}: {e}", path.display()))?
        .into_decoder()
        .map_err(|e| format!("Unsupported image {}: {e}", path.display()))?;
    let orientation = decoder.orientation().unwrap_or(Orientation::NoTransforms);
    let mut image = DynamicImage::from_decoder(decoder)
        .map_err(|e| format!("Cannot decode {}: {e}", path.display()))?;
    image.apply_orientation(orientation);
    Ok(image)
}

pub fn transform(image: DynamicImage, ops: &Ops) -> DynamicImage {
    let mut image = image;

    if let Some(crop) = ops.crop {
        let (width, height) = (image.width(), image.height());
        let x = (crop.x.clamp(0.0, 1.0) * width as f32).round() as u32;
        let y = (crop.y.clamp(0.0, 1.0) * height as f32).round() as u32;
        let x = x.min(width.saturating_sub(1));
        let y = y.min(height.saturating_sub(1));
        let crop_w = ((crop.w.clamp(0.0, 1.0) * width as f32).round() as u32)
            .max(1)
            .min(width - x);
        let crop_h = ((crop.h.clamp(0.0, 1.0) * height as f32).round() as u32)
            .max(1)
            .min(height - y);
        image = image.crop_imm(x, y, crop_w, crop_h);
    }

    image = match ops.rotate % 360 {
        90 => image.rotate90(),
        180 => image.rotate180(),
        270 => image.rotate270(),
        _ => image,
    };

    if ops.flip_h {
        image = image.fliph();
    }
    if ops.flip_v {
        image = image.flipv();
    }

    if let Some(upscale) = ops.upscale {
        image = upscale::apply(&image, &upscale);
    }

    if let Some(resize) = ops.resize {
        let (width, height) = resize_target(image.width(), image.height(), &resize);
        if resize.fit != Fit::None {
            image = image.resize_exact(width, height, FilterType::Lanczos3);
        }
    }

    image
}

fn resize_target(width: u32, height: u32, resize: &Resize) -> (u32, u32) {
    if resize.fit == Fit::None {
        return (width, height);
    }
    let target_w = resize.w.max(1);
    let target_h = resize.h.max(1);
    let aspect = width as f64 / height as f64;
    let target_aspect = target_w as f64 / target_h as f64;
    match resize.fit {
        Fit::Stretch => (target_w, target_h),
        Fit::Contain => {
            if target_aspect > aspect {
                (round_dim(target_h as f64 * aspect), target_h)
            } else {
                (target_w, round_dim(target_w as f64 / aspect))
            }
        }
        Fit::Cover => {
            if target_aspect < aspect {
                (round_dim(target_h as f64 * aspect), target_h)
            } else {
                (target_w, round_dim(target_w as f64 / aspect))
            }
        }
        Fit::None => (width, height),
    }
}

fn round_dim(value: f64) -> u32 {
    (value.round() as u32).max(1)
}

pub fn encode(image: &DynamicImage, format: Format, quality: u8) -> Result<Vec<u8>, String> {
    let quality = quality.clamp(1, 100);
    let (width, height) = (image.width(), image.height());
    let mut out = Vec::new();

    match format {
        Format::Jpeg => {
            image::codecs::jpeg::JpegEncoder::new_with_quality(&mut out, quality)
                .write_image(
                    image.to_rgb8().as_raw(),
                    width,
                    height,
                    ExtendedColorType::Rgb8,
                )
                .map_err(|e| format!("JPEG encode failed: {e}"))?;
        }
        Format::Png => {
            image::codecs::png::PngEncoder::new(&mut out)
                .write_image(
                    image.to_rgba8().as_raw(),
                    width,
                    height,
                    ExtendedColorType::Rgba8,
                )
                .map_err(|e| format!("PNG encode failed: {e}"))?;
        }
        Format::Webp => {
            let rgba = image.to_rgba8();
            let encoded =
                webp::Encoder::from_rgba(rgba.as_raw(), width, height).encode(quality as f32);
            out.extend_from_slice(&encoded);
        }
        Format::Avif => {
            image::codecs::avif::AvifEncoder::new_with_speed_quality(&mut out, 6, quality)
                .write_image(
                    image.to_rgba8().as_raw(),
                    width,
                    height,
                    ExtendedColorType::Rgba8,
                )
                .map_err(|e| format!("AVIF encode failed: {e}"))?;
        }
    }

    Ok(out)
}

pub fn resolve_name(pattern: &str, source: &Path, w: u32, h: u32, format: Format) -> String {
    let stem = source
        .file_stem()
        .and_then(|name| name.to_str())
        .unwrap_or("image");
    let date = today();
    let resolved = pattern
        .replace("{name}", stem)
        .replace("{w}", &w.to_string())
        .replace("{h}", &h.to_string())
        .replace("{format}", format.token())
        .replace("{date}", &date);
    let cleaned: String = resolved
        .chars()
        .map(|c| {
            if matches!(c, '/' | '\\' | '\0') {
                '_'
            } else {
                c
            }
        })
        .collect();
    let base = cleaned.trim().trim_matches('.').to_string();
    let base = if base.is_empty() {
        format!("{stem}_{w}x{h}")
    } else {
        base
    };
    format!("{base}.{}", format.ext())
}

fn today() -> String {
    let days = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|elapsed| (elapsed.as_secs() / 86_400) as i64)
        .unwrap_or(0);
    let z = days + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1_460 + doe / 36_524 - doe / 146_096) / 365;
    let year = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = doy - (153 * mp + 2) / 5 + 1;
    let month = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = if month <= 2 { year + 1 } else { year };
    format!("{year:04}-{month:02}-{day:02}")
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::{GenericImageView, Rgb, RgbImage};

    fn sample() -> DynamicImage {
        DynamicImage::ImageRgb8(RgbImage::from_pixel(40, 20, Rgb([120, 60, 30])))
    }

    fn sample_ops() -> Ops {
        Ops {
            crop: Some(Crop {
                x: 0.25,
                y: 0.25,
                w: 0.5,
                h: 0.5,
            }),
            rotate: 90,
            flip_h: true,
            flip_v: false,
            upscale: None,
            resize: Some(Resize {
                w: 5,
                h: 10,
                fit: Fit::Stretch,
            }),
        }
    }

    #[test]
    fn crop_rotate_resize_dimensions() {
        let output = transform(sample(), &sample_ops());
        assert_eq!(output.dimensions(), (5, 10));
    }

    #[test]
    fn upscale_runs_before_resize() {
        let mut ops = sample_ops();
        ops.resize = None;
        ops.upscale = Some(Upscale {
            scale: 2.0,
            method: crate::upscale::UpscaleMethod::Clean,
            denoise: 20,
            sharpen: 10,
        });
        let output = transform(sample(), &ops);
        assert_eq!(output.dimensions(), (20, 40));

        let mut ordered = ops;
        ordered.resize = Some(Resize {
            w: 5,
            h: 10,
            fit: Fit::Stretch,
        });
        let resized = transform(sample(), &ordered);
        assert_eq!(resized.dimensions(), (5, 10));
    }

    #[test]
    fn encodes_every_format() {
        let output = transform(sample(), &sample_ops());
        for (format, image_format) in [
            (Format::Jpeg, ImageFormat::Jpeg),
            (Format::Png, ImageFormat::Png),
            (Format::Webp, ImageFormat::WebP),
        ] {
            let bytes = encode(&output, format, 80).expect("encode");
            assert!(!bytes.is_empty());
            let decoded = image::load_from_memory_with_format(&bytes, image_format)
                .expect("decode encoded image");
            assert_eq!(decoded.dimensions(), (5, 10));
        }
        let avif = encode(&output, Format::Avif, 80).expect("encode avif");
        assert!(!avif.is_empty());
    }
}
