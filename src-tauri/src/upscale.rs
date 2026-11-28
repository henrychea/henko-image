use std::ops::Range;

use image::imageops::FilterType;
use image::{DynamicImage, Rgba, RgbaImage};
use serde::Deserialize;

pub const MAX_UPSCALE_DIM: u32 = 16384;

const OVERHANG: f32 = 0.15;
const RING_SIZE: usize = 5;
const CORING: f32 = 2.5;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum UpscaleMethod {
    Clean,
    Sharp,
    Pixel,
}

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Upscale {
    pub scale: f32,
    pub method: UpscaleMethod,
    pub denoise: u8,
    pub sharpen: u8,
}

#[derive(Clone, Copy)]
struct Planes<'a> {
    y: &'a [u8],
    cb: &'a [u8],
    cr: &'a [u8],
}

struct PlanesMut<'a> {
    y: &'a mut [u8],
    cb: &'a mut [u8],
    cr: &'a mut [u8],
}

#[derive(Clone, Copy)]
struct Lut<'a> {
    spatial: &'a [u32; RING_SIZE * RING_SIZE],
    range_y: &'a [u32; 256],
    range_c: &'a [u32; 256],
}

pub fn target_dims(width: u32, height: u32, scale: f32) -> (u32, u32) {
    let scale = if scale.is_finite() {
        scale.clamp(1.0, 4.0) as f64
    } else {
        1.0
    };
    let mut w = (width.max(1) as f64 * scale).round().max(1.0);
    let mut h = (height.max(1) as f64 * scale).round().max(1.0);
    let longest = w.max(h);
    if longest > MAX_UPSCALE_DIM as f64 {
        let ratio = MAX_UPSCALE_DIM as f64 / longest;
        w = (w * ratio).round().max(1.0);
        h = (h * ratio).round().max(1.0);
    }
    (w as u32, h as u32)
}

pub fn apply(image: &DynamicImage, upscale: &Upscale) -> DynamicImage {
    let source = image.to_rgba8();
    let pure = upscale.method == UpscaleMethod::Pixel;
    let mut rgba = if upscale.denoise > 0 && !pure {
        denoise(&source, upscale.denoise)
    } else {
        source
    };

    let (width, height) = target_dims(rgba.width(), rgba.height(), upscale.scale);
    if (width, height) != rgba.dimensions() {
        rgba = match upscale.method {
            UpscaleMethod::Pixel => {
                image::imageops::resize(&rgba, width, height, FilterType::Nearest)
            }
            UpscaleMethod::Clean => {
                image::imageops::resize(&rgba, width, height, FilterType::CatmullRom)
            }
            UpscaleMethod::Sharp => {
                let resized = image::imageops::resize(&rgba, width, height, FilterType::Lanczos3);
                clamp_ringing(&rgba, &resized)
            }
        };
    }

    if upscale.sharpen > 0 && !pure {
        rgba = unsharp(&rgba, upscale.sharpen);
    }

    DynamicImage::ImageRgba8(rgba)
}

fn clamp_ringing(source: &RgbaImage, resized: &RgbaImage) -> RgbaImage {
    let (source_w, source_h) = source.dimensions();
    let (width, height) = resized.dimensions();
    let ratio_x = source_w as f32 / width as f32;
    let ratio_y = source_h as f32 / height as f32;
    let mut out = resized.clone();

    for (y, row) in out.rows_mut().enumerate() {
        let sy = ((y as f32 + 0.5) * ratio_y - 0.5).max(0.0) as u32;
        let y0 = sy.min(source_h.saturating_sub(1));
        let y1 = (y0 + 1).min(source_h.saturating_sub(1));
        for (x, pixel) in row.enumerate() {
            let sx = ((x as f32 + 0.5) * ratio_x - 0.5).max(0.0) as u32;
            let x0 = sx.min(source_w.saturating_sub(1));
            let x1 = (x0 + 1).min(source_w.saturating_sub(1));
            let taps = [
                source.get_pixel(x0, y0),
                source.get_pixel(x1, y0),
                source.get_pixel(x0, y1),
                source.get_pixel(x1, y1),
            ];
            for channel in 0..3 {
                let mut lo = u8::MAX;
                let mut hi = u8::MIN;
                for tap in taps {
                    lo = lo.min(tap[channel]);
                    hi = hi.max(tap[channel]);
                }
                let value = pixel[channel] as f32;
                let lo_f = lo as f32;
                let hi_f = hi as f32;
                let kept = if value < lo_f {
                    lo_f - (lo_f - value) * OVERHANG
                } else if value > hi_f {
                    hi_f + (value - hi_f) * OVERHANG
                } else {
                    value
                };
                pixel[channel] = kept.round().clamp(0.0, 255.0) as u8;
            }
        }
    }

    out
}

fn denoise(source: &RgbaImage, strength: u8) -> RgbaImage {
    let (width, height) = source.dimensions();
    if width == 0 || height == 0 {
        return source.clone();
    }
    let (y, cb, cr) = split_ycbcr(source);
    let level = strength.min(100) as f32 / 100.0;
    let sigma_y = 4.0 + level * 12.0;
    let spatial = spatial_lut(1.7);
    let range_y = range_lut(sigma_y);
    let range_c = range_lut(sigma_y * 2.4);

    let mut out_y = vec![0u8; y.len()];
    let mut out_cb = vec![0u8; y.len()];
    let mut out_cr = vec![0u8; y.len()];

    let planes = Planes {
        y: &y,
        cb: &cb,
        cr: &cr,
    };
    let lut = Lut {
        spatial: &spatial,
        range_y: &range_y,
        range_c: &range_c,
    };
    let bands = band_count(height);
    let rows_per_band = height.div_ceil(bands);
    let chunk_len = rows_per_band as usize * width as usize;

    std::thread::scope(|scope| {
        let iterator = out_y
            .chunks_mut(chunk_len)
            .zip(out_cb.chunks_mut(chunk_len))
            .zip(out_cr.chunks_mut(chunk_len))
            .enumerate();
        for (index, ((band_y, band_cb), band_cr)) in iterator {
            let start = (index as u32 * rows_per_band).min(height);
            let end = start + rows_per_band.min(height - start);
            let out = PlanesMut {
                y: band_y,
                cb: band_cb,
                cr: band_cr,
            };
            scope.spawn(move || filter_rows(planes, lut, (width, height), start..end, out));
        }
    });

    merge_ycbcr(&out_y, &out_cb, &out_cr, source)
}

fn band_count(height: u32) -> u32 {
    if height < 64 {
        return 1;
    }
    std::thread::available_parallelism()
        .map(|value| value.get() as u32)
        .unwrap_or(1)
        .clamp(1, 16)
}

fn spatial_lut(sigma: f32) -> [u32; RING_SIZE * RING_SIZE] {
    let mut lut = [0u32; RING_SIZE * RING_SIZE];
    let denom = 2.0 * sigma * sigma;
    for (index, slot) in lut.iter_mut().enumerate() {
        let dx = (index % RING_SIZE) as f32 - 2.0;
        let dy = (index / RING_SIZE) as f32 - 2.0;
        *slot = ((-(dx * dx + dy * dy) / denom).exp() * 1024.0).round() as u32;
    }
    lut
}

fn range_lut(sigma: f32) -> [u32; 256] {
    let mut lut = [0u32; 256];
    let denom = 2.0 * sigma * sigma;
    for (diff, slot) in lut.iter_mut().enumerate() {
        let distance = diff as f32;
        *slot = ((-(distance * distance) / denom).exp() * 256.0).round() as u32;
    }
    lut
}

fn filter_rows(planes: Planes, lut: Lut, size: (u32, u32), rows: Range<u32>, out: PlanesMut) {
    let (width, height) = size;
    let max_x = width as i32 - 1;
    let max_y = height as i32 - 1;
    let stride = width as usize;
    let first_row = rows.start;

    for row in rows {
        let base = row as usize * stride;
        let band_base = (row - first_row) as usize * stride;
        for x in 0..stride {
            let index = base + x;
            let band_index = band_base + x;
            let center_y = planes.y[index] as i32;
            let center_cb = planes.cb[index] as i32;
            let center_cr = planes.cr[index] as i32;
            let mut acc_y = 0u64;
            let mut acc_cb = 0u64;
            let mut acc_cr = 0u64;
            let mut weight_y = 0u64;
            let mut weight_cb = 0u64;
            let mut weight_cr = 0u64;

            for (tap, spatial) in lut.spatial.iter().enumerate() {
                let tx = (x as i32 + (tap % RING_SIZE) as i32 - 2).clamp(0, max_x) as usize;
                let ty = (row as i32 + (tap / RING_SIZE) as i32 - 2).clamp(0, max_y) as usize;
                let sample = ty * stride + tx;
                let spatial = *spatial as u64;
                let wy = spatial
                    * lut.range_y[(planes.y[sample] as i32 - center_y).unsigned_abs() as usize]
                        as u64;
                let wcb = spatial
                    * lut.range_c[(planes.cb[sample] as i32 - center_cb).unsigned_abs() as usize]
                        as u64;
                let wcr = spatial
                    * lut.range_c[(planes.cr[sample] as i32 - center_cr).unsigned_abs() as usize]
                        as u64;
                acc_y += wy * planes.y[sample] as u64;
                acc_cb += wcb * planes.cb[sample] as u64;
                acc_cr += wcr * planes.cr[sample] as u64;
                weight_y += wy;
                weight_cb += wcb;
                weight_cr += wcr;
            }

            out.y[band_index] = ((acc_y + weight_y / 2) / weight_y) as u8;
            out.cb[band_index] = ((acc_cb + weight_cb / 2) / weight_cb) as u8;
            out.cr[band_index] = ((acc_cr + weight_cr / 2) / weight_cr) as u8;
        }
    }
}

fn split_ycbcr(source: &RgbaImage) -> (Vec<u8>, Vec<u8>, Vec<u8>) {
    let mut y = Vec::with_capacity(source.len() / 4);
    let mut cb = Vec::with_capacity(source.len() / 4);
    let mut cr = Vec::with_capacity(source.len() / 4);
    for pixel in source.pixels() {
        let r = pixel[0] as i32;
        let g = pixel[1] as i32;
        let b = pixel[2] as i32;
        y.push(((77 * r + 150 * g + 29 * b) >> 8).clamp(0, 255) as u8);
        let blue = ((-43 * r - 85 * g + 128 * b) >> 8).clamp(-128, 127);
        let red = ((128 * r - 107 * g - 21 * b) >> 8).clamp(-128, 127);
        cb.push((blue + 128) as u8);
        cr.push((red + 128) as u8);
    }
    (y, cb, cr)
}

fn merge_ycbcr(y: &[u8], cb: &[u8], cr: &[u8], source: &RgbaImage) -> RgbaImage {
    let (width, height) = source.dimensions();
    let mut out = RgbaImage::new(width, height);
    let alpha = source.as_raw();
    for (index, pixel) in out.pixels_mut().enumerate() {
        let luma = y[index] as i32;
        let blue = cb[index] as i32 - 128;
        let red = cr[index] as i32 - 128;
        let r = (luma + ((359 * red) >> 8)).clamp(0, 255) as u8;
        let g = (luma - ((88 * blue + 183 * red) >> 8)).clamp(0, 255) as u8;
        let b = (luma + ((454 * blue) >> 8)).clamp(0, 255) as u8;
        *pixel = Rgba([r, g, b, alpha[index * 4 + 3]]);
    }
    out
}

fn luma_plane(source: &RgbaImage) -> Vec<u8> {
    source
        .pixels()
        .map(|pixel| {
            let r = pixel[0] as i32;
            let g = pixel[1] as i32;
            let b = pixel[2] as i32;
            ((77 * r + 150 * g + 29 * b) >> 8).clamp(0, 255) as u8
        })
        .collect()
}

fn blur_luma(luma: &[u8], width: usize, height: usize) -> Vec<u8> {
    const KERNEL: [u32; RING_SIZE] = [1, 4, 6, 4, 1];
    let mut horizontal = vec![0u16; luma.len()];
    for row in 0..height {
        let base = row * width;
        for x in 0..width {
            let mut sum = 0u32;
            for (tap, weight) in KERNEL.iter().enumerate() {
                let sx = (x as i32 + tap as i32 - 2).clamp(0, width as i32 - 1) as usize;
                sum += *weight * luma[base + sx] as u32;
            }
            horizontal[base + x] = sum as u16;
        }
    }
    let mut out = vec![0u8; luma.len()];
    for row in 0..height {
        for x in 0..width {
            let mut sum = 0u32;
            for (tap, weight) in KERNEL.iter().enumerate() {
                let sy = (row as i32 + tap as i32 - 2).clamp(0, height as i32 - 1) as usize;
                sum += *weight * horizontal[sy * width + x] as u32;
            }
            out[row * width + x] = (sum >> 8).min(255) as u8;
        }
    }
    out
}

fn unsharp(source: &RgbaImage, strength: u8) -> RgbaImage {
    let (width, height) = source.dimensions();
    if width == 0 || height == 0 {
        return source.clone();
    }
    let luma = luma_plane(source);
    let blur = blur_luma(&luma, width as usize, height as usize);
    let amount = strength.min(100) as f32 / 100.0 * 0.8;
    let mut out = source.clone();

    for (index, pixel) in out.pixels_mut().enumerate() {
        let detail = luma[index] as f32 - blur[index] as f32;
        if detail.abs() < CORING {
            continue;
        }
        let delta = (detail * amount).clamp(-48.0, 48.0).round() as i32;
        for channel in 0..3 {
            let value = pixel[channel] as i32 + delta;
            pixel[channel] = value.clamp(0, 255) as u8;
        }
    }

    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::GenericImageView;

    fn noise_image(width: u32, height: u32) -> RgbaImage {
        let mut image = RgbaImage::new(width, height);
        let mut seed = 0x9e37u32;
        for (x, _y, pixel) in image.enumerate_pixels_mut() {
            seed = seed.wrapping_mul(1_664_525).wrapping_add(1_013_904_223);
            let jitter = ((seed >> 24) % 25) as i32 - 12;
            let base = if x < width / 2 { 60 } else { 200 };
            let value = (base + jitter).clamp(0, 255) as u8;
            *pixel = Rgba([value, value, value, 200]);
        }
        image
    }

    fn ops(method: UpscaleMethod, denoise: u8, sharpen: u8) -> Upscale {
        Upscale {
            scale: 2.0,
            method,
            denoise,
            sharpen,
        }
    }

    fn region_stats(image: &RgbaImage, x0: u32, x1: u32, y0: u32, y1: u32) -> (f32, f32) {
        let mut sum = 0f32;
        let mut sum_sq = 0f32;
        let mut count = 0f32;
        for y in y0..y1 {
            for x in x0..x1 {
                let value = image.get_pixel(x, y)[0] as f32;
                sum += value;
                sum_sq += value * value;
                count += 1.0;
            }
        }
        let mean = sum / count;
        let variance = (sum_sq / count - mean * mean).max(0.0);
        (mean, variance.sqrt())
    }

    #[test]
    fn target_dims_scales_and_caps() {
        assert_eq!(target_dims(100, 50, 1.5), (150, 75));
        assert_eq!(target_dims(100, 50, 2.0), (200, 100));
        assert_eq!(target_dims(100, 50, 3.0), (300, 150));
        assert_eq!(target_dims(100, 50, 4.0), (400, 200));
        assert_eq!(target_dims(100, 50, 0.25), (100, 50));
        assert_eq!(target_dims(100, 50, 12.0), (400, 200));
        assert_eq!(target_dims(8000, 4000, 4.0), (MAX_UPSCALE_DIM, 8192));
        assert_eq!(
            target_dims(5000, 5000, 4.0),
            (MAX_UPSCALE_DIM, MAX_UPSCALE_DIM)
        );
        assert_eq!(target_dims(1, 1, 1.0), (1, 1));
        assert_eq!(target_dims(16384, 8192, 1.0), (MAX_UPSCALE_DIM, 8192));
    }

    #[test]
    fn every_method_hits_target_dims_and_keeps_alpha() {
        let source = noise_image(48, 40);
        for method in [
            UpscaleMethod::Clean,
            UpscaleMethod::Sharp,
            UpscaleMethod::Pixel,
        ] {
            let output = apply(
                &DynamicImage::ImageRgba8(source.clone()),
                &ops(method, 45, 40),
            );
            assert_eq!(output.dimensions(), (96, 80));
            let rgba = output.to_rgba8();
            assert!(rgba.pixels().all(|pixel| pixel[3] == 200));
        }
    }

    #[test]
    fn denoise_smooths_flat_noise_and_keeps_edges() {
        let source = noise_image(64, 64);
        let (_, before_left) = region_stats(&source, 4, 28, 4, 60);
        let (_, before_right) = region_stats(&source, 36, 60, 4, 60);
        let plain = apply(
            &DynamicImage::ImageRgba8(source.clone()),
            &ops(UpscaleMethod::Clean, 0, 0),
        );
        let cleaned = apply(
            &DynamicImage::ImageRgba8(source),
            &Upscale {
                scale: 1.0,
                method: UpscaleMethod::Clean,
                denoise: 80,
                sharpen: 0,
            },
        );
        let flat = plain.to_rgba8();
        let smooth = cleaned.to_rgba8();
        let (_, plain_left) = region_stats(&flat, 4, 28, 4, 60);
        let (_, smooth_left) = region_stats(&smooth, 4, 28, 4, 60);
        let (mean_left, _) = region_stats(&smooth, 4, 28, 4, 60);
        let (mean_right, _) = region_stats(&smooth, 46, 60, 4, 60);

        assert!(before_left > 4.0 && before_right > 4.0);
        assert!(
            smooth_left < plain_left * 0.6,
            "noise {smooth_left} vs {plain_left}"
        );
        assert!(
            mean_right - mean_left > 120.0,
            "edge contrast {}",
            mean_right - mean_left
        );
        assert!(smooth.pixels().all(|pixel| pixel[3] == 200));
    }

    #[test]
    fn denoise_keeps_flat_color_faithful() {
        let source = RgbaImage::from_pixel(32, 32, Rgba([200, 120, 60, 255]));
        let output = apply(
            &DynamicImage::ImageRgba8(source),
            &Upscale {
                scale: 1.0,
                method: UpscaleMethod::Clean,
                denoise: 60,
                sharpen: 50,
            },
        )
        .to_rgba8();
        for pixel in output.pixels() {
            assert!(pixel[0].abs_diff(200) <= 2);
            assert!(pixel[1].abs_diff(120) <= 2);
            assert!(pixel[2].abs_diff(60) <= 2);
            assert_eq!(pixel[3], 255);
        }
    }

    #[test]
    fn sharpening_and_pixel_upscale_hold_color() {
        let mut source = RgbaImage::new(8, 8);
        for (x, _y, pixel) in source.enumerate_pixels_mut() {
            let value = if x < 4 { 30 } else { 220 };
            *pixel = Rgba([value, value, value, 255]);
        }
        let pixelated = apply(
            &DynamicImage::ImageRgba8(source.clone()),
            &ops(UpscaleMethod::Pixel, 80, 90),
        )
        .to_rgba8();
        assert_eq!(pixelated.dimensions(), (16, 16));
        for (x, y, pixel) in source.enumerate_pixels() {
            let mapped = pixelated.get_pixel(x * 2 + 1, y * 2 + 1);
            assert_eq!(mapped[0], pixel[0]);
            assert_eq!(mapped[1], pixel[1]);
            assert_eq!(mapped[2], pixel[2]);
            assert_eq!(mapped[3], 255);
        }

        let sharpened = apply(
            &DynamicImage::ImageRgba8(source),
            &ops(UpscaleMethod::Sharp, 30, 90),
        )
        .to_rgba8();
        assert_eq!(sharpened.dimensions(), (16, 16));
        assert!(sharpened.pixels().all(|pixel| pixel[3] == 255));
        let (mean_left, _) = region_stats(&sharpened, 0, 7, 0, 16);
        let (mean_right, _) = region_stats(&sharpened, 9, 16, 0, 16);
        assert!(
            mean_right > mean_left + 100.0,
            "means {mean_left} {mean_right}"
        );
    }
}
