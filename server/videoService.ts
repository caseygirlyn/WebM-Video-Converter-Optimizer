import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import { EventEmitter } from 'events';

// Set binary paths
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

if (ffprobeStatic && ffprobeStatic.path) {
  ffmpeg.setFfprobePath(ffprobeStatic.path);
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  aspectRatio: string;
  fps: number;
  format: string;
  videoCodec: string;
  audioCodec?: string;
  audioChannels?: number;
  audioSampleRate?: number;
  bitrate: number;
  fileSize: number;
  hasAudio: boolean;
  filename: string;
}

export interface ConversionOptions {
  preset: 'auto-web' | 'hero-background' | 'high-quality' | 'target-size' | 'custom';
  targetSizeMB?: number;
  crf?: number; // 15 - 50 (lower is higher quality, default 31-33 for web)
  resolution?: 'original' | '4k' | '1440p' | '1080p' | '720p' | '480p' | '360p';
  fps?: number; // 0 = native, 24, 30, 60
  codec?: 'vp9' | 'vp8'; // vp9 standard for modern web
  audioMode?: 'opus-auto' | 'opus-high' | 'opus-voice' | 'mute';
  speedPreset?: 'realtime' | 'good' | 'best';
  startTime?: number; // seconds
  endTime?: number; // seconds
  playbackSpeed?: number; // 0.5, 1, 1.25, 1.5, 2
  generatePoster?: boolean;
}

export interface ConversionJob {
  id: string;
  originalFilename: string;
  originalFilePath: string;
  outputFilePath: string;
  posterFilePath?: string;
  originalSize: number;
  convertedSize?: number;
  status: 'queued' | 'analyzing' | 'transcoding' | 'completed' | 'error';
  progress: number; // 0 - 100
  currentFps?: number;
  currentSpeed?: string;
  currentTimemark?: string;
  targetSizeEstimatedMB?: number;
  metadata?: VideoMetadata;
  options: ConversionOptions;
  error?: string;
  createdAt: number;
  completedAt?: number;
}

export const jobEmitter = new EventEmitter();
export const activeJobs = new Map<string, ConversionJob>();

const UPLOADS_DIR = path.join(process.cwd(), 'temp_uploads');
const OUTPUTS_DIR = path.join(process.cwd(), 'temp_outputs');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(OUTPUTS_DIR)) fs.mkdirSync(OUTPUTS_DIR, { recursive: true });

export async function probeVideo(filePath: string, originalName?: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        return reject(new Error(`Failed to probe video: ${err.message}`));
      }

      const format = metadata.format;
      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

      const width = videoStream?.width || 1920;
      const height = videoStream?.height || 1080;
      const duration = format.duration ? parseFloat(format.duration.toString()) : (videoStream?.duration ? parseFloat(videoStream.duration.toString()) : 0);
      
      // Calculate FPS
      let fps = 30;
      if (videoStream?.r_frame_rate) {
        const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
        if (num && den) fps = Math.round((num / den) * 100) / 100;
      }

      // Aspect ratio
      const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
      const divisor = gcd(width, height);
      const aspectW = Math.round(width / divisor);
      const aspectH = Math.round(height / divisor);
      const aspectRatio = (aspectW > 0 && aspectH > 0 && aspectW < 50) ? `${aspectW}:${aspectH}` : `${(width / height).toFixed(2)}:1`;

      const stats = fs.statSync(filePath);
      const fileSize = stats.size;
      const bitrate = format.bit_rate ? parseInt(format.bit_rate.toString(), 10) : Math.round((fileSize * 8) / (duration || 1));

      resolve({
        duration,
        width,
        height,
        aspectRatio,
        fps,
        format: format.format_name || 'unknown',
        videoCodec: videoStream?.codec_name || 'unknown',
        audioCodec: audioStream?.codec_name,
        audioChannels: audioStream?.channels,
        audioSampleRate: audioStream?.sample_rate,
        bitrate,
        fileSize,
        hasAudio: !!audioStream,
        filename: originalName || path.basename(filePath),
      });
    });
  });
}

export function calculateResolutionScale(target: string | undefined, origW: number, origH: number): { width: number; height: number; scaleFilter?: string } {
  if (!target || target === 'original') {
    // Keep even dimensions (VP9 requires even width/height)
    const w = origW % 2 === 0 ? origW : origW - 1;
    const h = origH % 2 === 0 ? origH : origH - 1;
    return { width: w, height: h };
  }

  const targetHeights: Record<string, number> = {
    '4k': 2160,
    '1440p': 1440,
    '1080p': 1080,
    '720p': 720,
    '480p': 480,
    '360p': 360,
  };

  const targetH = targetHeights[target];
  if (!targetH || origH <= targetH) {
    // Do not upscale if original is smaller
    const w = origW % 2 === 0 ? origW : origW - 1;
    const h = origH % 2 === 0 ? origH : origH - 1;
    return { width: w, height: h };
  }

  const ratio = origW / origH;
  let newHeight = targetH;
  let newWidth = Math.round(newHeight * ratio);
  
  // Make even
  if (newWidth % 2 !== 0) newWidth -= 1;
  if (newHeight % 2 !== 0) newHeight -= 1;

  return {
    width: newWidth,
    height: newHeight,
    scaleFilter: `scale=${newWidth}:${newHeight}:flags=lanczos`,
  };
}

export function startConversionJob(jobId: string, inputPath: string, options: ConversionOptions, originalFilename: string): ConversionJob {
  const outputFilename = `${jobId}_optimized.webm`;
  const posterFilename = `${jobId}_poster.webp`;
  const outputPath = path.join(OUTPUTS_DIR, outputFilename);
  const posterPath = path.join(OUTPUTS_DIR, posterFilename);

  const stats = fs.statSync(inputPath);

  const job: ConversionJob = {
    id: jobId,
    originalFilename,
    originalFilePath: inputPath,
    outputFilePath: outputPath,
    posterFilePath: posterPath,
    originalSize: stats.size,
    status: 'queued',
    progress: 0,
    options,
    createdAt: Date.now(),
  };

  activeJobs.set(jobId, job);
  jobEmitter.emit(`update:${jobId}`, job);

  // Run in background
  executeConversion(job).catch(err => {
    console.error(`Conversion error for job ${jobId}:`, err);
    job.status = 'error';
    job.error = err.message || 'Video encoding failed';
    jobEmitter.emit(`update:${jobId}`, job);
  });

  return job;
}

async function executeConversion(job: ConversionJob): Promise<void> {
  job.status = 'analyzing';
  job.progress = 5;
  jobEmitter.emit(`update:${job.id}`, job);

  const metadata = await probeVideo(job.originalFilePath, job.originalFilename);
  job.metadata = metadata;

  // Generate poster thumbnail early
  try {
    await new Promise<void>((resolve, reject) => {
      const takeAt = Math.min(1, metadata.duration > 2 ? 1 : metadata.duration * 0.2);
      ffmpeg(job.originalFilePath)
        .seekInput(takeAt)
        .frames(1)
        .outputOptions(['-vcodec libwebp', '-quality 85'])
        .output(job.posterFilePath!)
        .on('end', () => resolve())
        .on('error', (err) => {
          console.warn('Poster generation warning:', err.message);
          resolve(); // don't fail conversion if poster fails
        })
        .run();
    });
  } catch (e) {
    console.warn('Could not generate poster:', e);
  }

  job.status = 'transcoding';
  job.progress = 10;
  jobEmitter.emit(`update:${job.id}`, job);

  const opts = job.options;
  const command = ffmpeg(job.originalFilePath);

  // Time trimming
  if (typeof opts.startTime === 'number' && opts.startTime > 0) {
    command.setStartTime(opts.startTime);
  }
  if (typeof opts.endTime === 'number' && opts.endTime > 0 && opts.endTime > (opts.startTime || 0)) {
    const duration = opts.endTime - (opts.startTime || 0);
    command.setDuration(duration);
  }

  // Codec selection
  const isVp8 = opts.codec === 'vp8';
  command.videoCodec(isVp8 ? 'libvpx' : 'libvpx-vp9');

  // Video Filter chain (Scaling, FPS, Speed)
  const videoFilters: string[] = [];
  const audioFilters: string[] = [];

  // Resolution handling
  let targetRes = opts.resolution;
  if (opts.preset === 'auto-web' && (!targetRes || targetRes === 'original')) {
    // If auto-web and resolution is >1080p, scale down to 1080p for optimal web performance
    if (metadata.height > 1080) {
      targetRes = '1080p';
    }
  } else if (opts.preset === 'hero-background') {
    // Background videos work best capped at 1080p or 720p
    if (metadata.height > 1080) {
      targetRes = '1080p';
    }
  }

  const { scaleFilter } = calculateResolutionScale(targetRes, metadata.width, metadata.height);
  if (scaleFilter) {
    videoFilters.push(scaleFilter);
  }

  // FPS clamping
  let targetFps = opts.fps;
  if (opts.preset === 'hero-background' && (!targetFps || targetFps > 30)) {
    targetFps = 30; // clamp hero bg to 30fps for smooth web animation at half data
  }
  if (targetFps && targetFps > 0) {
    videoFilters.push(`fps=${targetFps}`);
  }

  // Playback speed
  if (opts.playbackSpeed && opts.playbackSpeed !== 1) {
    const pts = 1 / opts.playbackSpeed;
    videoFilters.push(`setpts=${pts}*PTS`);
    if (opts.playbackSpeed >= 0.5 && opts.playbackSpeed <= 2.0) {
      audioFilters.push(`atempo=${opts.playbackSpeed}`);
    }
  }

  if (videoFilters.length > 0) {
    command.videoFilters(videoFilters);
  }

  // Output options & CRF tuning
  const outputOptions: string[] = [
    '-f webm',
    '-map_metadata -1', // Strip unneeded EXIF camera metadata to reduce bytes
  ];

  // Configure Audio
  const isMute = opts.audioMode === 'mute' || opts.preset === 'hero-background' || !metadata.hasAudio;
  if (isMute) {
    command.noAudio();
  } else {
    command.audioCodec('libopus');
    let audioBitrate = '96k';
    if (opts.audioMode === 'opus-high' || opts.preset === 'high-quality') {
      audioBitrate = '128k';
    } else if (opts.audioMode === 'opus-voice') {
      audioBitrate = '48k';
    } else if (opts.preset === 'auto-web') {
      audioBitrate = '80k';
    }
    command.audioBitrate(audioBitrate);
    if (audioFilters.length > 0) {
      command.audioFilters(audioFilters);
    }
  }

  // Configure Quality / Bitrate / Preset
  if (opts.preset === 'target-size' && opts.targetSizeMB && opts.targetSizeMB > 0) {
    // 2-pass target size calculation: Total bits = TargetMB * 8 * 1024 * 1024
    const totalDuration = (opts.endTime && opts.startTime ? opts.endTime - opts.startTime : metadata.duration) || 10;
    const targetTotalBits = opts.targetSizeMB * 8 * 1024 * 1024 * 0.95; // 5% safety margin for container overhead
    const audioBits = isMute ? 0 : 80 * 1024 * totalDuration;
    const videoBits = Math.max(100 * 1024 * totalDuration, targetTotalBits - audioBits);
    const targetVideoBitrateKbps = Math.max(50, Math.round(videoBits / totalDuration / 1024));

    outputOptions.push(
      `-b:v ${targetVideoBitrateKbps}k`,
      `-minrate ${Math.round(targetVideoBitrateKbps * 0.5)}k`,
      `-maxrate ${Math.round(targetVideoBitrateKbps * 1.4)}k`,
      `-deadline ${opts.speedPreset === 'best' ? 'good' : 'realtime'}`,
      `-cpu-used ${opts.speedPreset === 'best' ? '2' : '4'}`
    );
  } else {
    // Constant Quality (CRF) Mode
    let crf = 32; // Default smart web CRF
    if (typeof opts.crf === 'number') {
      crf = opts.crf;
    } else if (opts.preset === 'hero-background') {
      crf = 36; // Higher compression for background
    } else if (opts.preset === 'high-quality') {
      crf = 26; // High fidelity
    } else if (opts.preset === 'auto-web') {
      crf = 31; // Balanced high-efficiency web
    }

    // VP9 uses -crf and -b:v 0 for pure constant quality
    if (!isVp8) {
      outputOptions.push(
        `-crf ${crf}`,
        '-b:v 0',
        `-deadline ${opts.speedPreset === 'best' ? 'good' : 'realtime'}`,
        `-cpu-used ${opts.speedPreset === 'best' ? '2' : '4'}`,
        '-row-mt 1', // Enable row-based multi-threading for fast encoding
        '-tile-columns 2',
        '-frame-parallel 1',
        '-auto-alt-ref 1',
        '-lag-in-frames 25'
      );
    } else {
      // VP8
      outputOptions.push(
        `-crf ${crf}`,
        `-b:v 1500k`,
        `-deadline ${opts.speedPreset === 'best' ? 'good' : 'realtime'}`,
        `-cpu-used ${opts.speedPreset === 'best' ? '2' : '4'}`
      );
    }
  }

  command.outputOptions(outputOptions);
  command.output(job.outputFilePath);

  // Total duration for progress calculation
  const effectiveDuration = (opts.endTime && opts.startTime ? opts.endTime - opts.startTime : metadata.duration) || 1;

  command.on('start', (cmdLine) => {
    console.log(`FFmpeg started for job ${job.id}:`, cmdLine);
  });

  command.on('progress', (progress) => {
    let pct = 10;
    if (progress.timemark) {
      const parts = progress.timemark.split(':');
      if (parts.length === 3) {
        const secs = parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
        const calcPct = Math.min(95, Math.max(10, Math.round((secs / effectiveDuration) * 85) + 10));
        pct = calcPct;
      }
    } else if (progress.percent) {
      pct = Math.min(95, Math.max(10, Math.round(progress.percent * 0.85) + 10));
    }

    job.progress = pct;
    job.currentFps = progress.currentFps;
    const speedVal = (progress as any).currentSpeed;
    job.currentSpeed = speedVal ? `${speedVal}x` : undefined;
    job.currentTimemark = progress.timemark;
    jobEmitter.emit(`update:${job.id}`, job);
  });

  return new Promise<void>((resolve, reject) => {
    command.on('end', () => {
      try {
        const outStats = fs.statSync(job.outputFilePath);
        job.convertedSize = outStats.size;
        job.status = 'completed';
        job.progress = 100;
        job.completedAt = Date.now();
        jobEmitter.emit(`update:${job.id}`, job);
        resolve();
      } catch (err: any) {
        reject(new Error(`Failed to verify output file: ${err.message}`));
      }
    });

    command.on('error', (err, stdout, stderr) => {
      console.error(`FFmpeg error on job ${job.id}:`, err.message, stderr);
      job.status = 'error';
      job.error = `Conversion failed: ${err.message}`;
      jobEmitter.emit(`update:${job.id}`, job);
      reject(err);
    });

    command.run();
  });
}
