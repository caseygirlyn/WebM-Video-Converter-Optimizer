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

export type OptimizationPresetType = 'auto-web' | 'hero-background' | 'high-quality' | 'target-size' | 'custom';

export interface ConversionOptions {
  preset: OptimizationPresetType;
  targetSizeMB?: number;
  crf?: number; // 15 - 50
  resolution?: 'original' | '4k' | '1440p' | '1080p' | '720p' | '480p' | '360p';
  fps?: number; // 0 (native), 24, 30, 60
  codec?: 'vp9' | 'vp8';
  audioMode?: 'opus-auto' | 'opus-high' | 'opus-voice' | 'mute';
  speedPreset?: 'realtime' | 'good' | 'best';
  startTime?: number;
  endTime?: number;
  playbackSpeed?: number;
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
  progress: number;
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

export interface SampleVideo {
  id: string;
  name: string;
  description: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
  originalSizeMB: number;
}

export interface UploadedFileState {
  fileId: string;
  filePath: string;
  filename: string;
  metadata: VideoMetadata;
  localBlobUrl?: string;
}
