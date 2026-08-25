import React, { useState, useMemo } from 'react';
import {
  Zap,
  LayoutTemplate,
  Sparkles,
  Target,
  Sliders,
  Film,
  Volume2,
  VolumeX,
  Gauge,
  Scissors,
  CheckCircle2,
  ArrowRight,
  Info,
  Layers,
  Clock,
  HardDrive,
  Tv,
} from 'lucide-react';
import { VideoMetadata, ConversionOptions, OptimizationPresetType } from '../types';
import { formatBytes, formatDuration, formatBitrate } from '../utils/formatters';

interface OptimizationControlsProps {
  metadata: VideoMetadata;
  onOptionsChange: (options: ConversionOptions) => void;
  onStartConversion: (options: ConversionOptions) => void;
  isConverting: boolean;
}

export const OptimizationControls: React.FC<OptimizationControlsProps> = ({
  metadata,
  onStartConversion,
  isConverting,
}) => {
  const [preset, setPreset] = useState<OptimizationPresetType>('auto-web');
  const [targetSizeMB, setTargetSizeMB] = useState<number>(5);
  const [crf, setCrf] = useState<number>(31);
  const [resolution, setResolution] = useState<'original' | '4k' | '1440p' | '1080p' | '720p' | '480p' | '360p'>('original');
  const [fps, setFps] = useState<number>(0);
  const [codec, setCodec] = useState<'vp9' | 'vp8'>('vp9');
  const [audioMode, setAudioMode] = useState<'opus-auto' | 'opus-high' | 'opus-voice' | 'mute'>('opus-auto');
  const [speedPreset, setSpeedPreset] = useState<'realtime' | 'good' | 'best'>('good');
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(Math.round(metadata.duration));
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [generatePoster, setGeneratePoster] = useState<boolean>(true);

  // Calculate current options
  const currentOptions: ConversionOptions = useMemo(() => {
    return {
      preset,
      targetSizeMB: preset === 'target-size' ? targetSizeMB : undefined,
      crf: preset === 'custom' ? crf : preset === 'hero-background' ? 36 : preset === 'high-quality' ? 26 : 31,
      resolution: preset === 'custom' ? resolution : preset === 'auto-web' && metadata.height > 1080 ? '1080p' : resolution,
      fps: preset === 'hero-background' ? 30 : preset === 'custom' ? fps : 0,
      codec: preset === 'custom' ? codec : 'vp9',
      audioMode: preset === 'hero-background' ? 'mute' : preset === 'custom' ? audioMode : 'opus-auto',
      speedPreset,
      startTime: trimStart > 0 ? trimStart : undefined,
      endTime: trimEnd < metadata.duration ? trimEnd : undefined,
      playbackSpeed: playbackSpeed !== 1 ? playbackSpeed : undefined,
      generatePoster,
    };
  }, [
    preset,
    targetSizeMB,
    crf,
    resolution,
    fps,
    codec,
    audioMode,
    speedPreset,
    trimStart,
    trimEnd,
    metadata.duration,
    metadata.height,
    playbackSpeed,
    generatePoster,
  ]);

  // Real-time estimated size preview based on algorithms
  const estimatedSize = useMemo(() => {
    const activeDuration = Math.max(1, (trimEnd || metadata.duration) - (trimStart || 0)) / (playbackSpeed || 1);
    
    if (preset === 'target-size') {
      return {
        bytes: targetSizeMB * 1024 * 1024,
        text: `~${targetSizeMB} MB (Strict Budget)`,
        reductionPct: Math.round(((metadata.fileSize - targetSizeMB * 1024 * 1024) / metadata.fileSize) * 100),
      };
    }

    // Heuristic estimate based on VP9 CRF curve and resolution
    let effectiveCrf = preset === 'hero-background' ? 36 : preset === 'high-quality' ? 26 : preset === 'auto-web' ? 31 : crf;
    let resMultiplier = 1;

    let targetH = metadata.height;
    if (resolution === '1080p' && metadata.height > 1080) targetH = 1080;
    if (resolution === '720p' && metadata.height > 720) targetH = 720;
    if (resolution === '480p' && metadata.height > 480) targetH = 480;
    if (preset === 'auto-web' && metadata.height > 1080) targetH = 1080;

    resMultiplier = (targetH * targetH) / (metadata.height * metadata.height);

    // Baseline ~1200kbps for 1080p at CRF 31
    const baseBitrateKbps = 1400 * Math.pow(0.88, effectiveCrf - 28) * resMultiplier;
    const audioKbps = preset === 'hero-background' || audioMode === 'mute' || !metadata.hasAudio ? 0 : 80;

    const totalEstimatedBytes = Math.round(((baseBitrateKbps + audioKbps) * 1024 * activeDuration) / 8);
    const clampedEstimatedBytes = Math.min(metadata.fileSize * 0.9, Math.max(200 * 1024, totalEstimatedBytes));
    const reductionPct = Math.max(10, Math.min(96, Math.round(((metadata.fileSize - clampedEstimatedBytes) / metadata.fileSize) * 100)));

    return {
      bytes: clampedEstimatedBytes,
      text: `~${formatBytes(clampedEstimatedBytes)}`,
      reductionPct,
    };
  }, [preset, targetSizeMB, crf, resolution, audioMode, metadata, trimStart, trimEnd, playbackSpeed]);

  const handleStart = () => {
    onStartConversion(currentOptions);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Source Video Summary Card */}
      <div className="bg-[#111114] rounded-3xl p-6 border border-slate-800 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold shrink-0">
              <Film className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-100 truncate">
                {metadata.filename}
              </h2>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                <span>{metadata.format.toUpperCase()}</span>
                <span>•</span>
                <span>{metadata.videoCodec.toUpperCase()}</span>
                <span>•</span>
                <span>{metadata.aspectRatio} Aspect</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:self-center">
            <span className="px-3 py-1 bg-slate-900 border border-slate-800 text-slate-300 text-xs font-mono font-medium rounded-xl">
              {metadata.width} × {metadata.height} ({metadata.fps} fps)
            </span>
            <span className="px-3 py-1 bg-slate-900 border border-slate-800 text-slate-300 text-xs font-mono font-medium rounded-xl">
              {formatDuration(metadata.duration)}
            </span>
            <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 text-xs font-mono font-bold rounded-xl">
              {formatBytes(metadata.fileSize)}
            </span>
          </div>
        </div>

        {/* Quick Recommendation callout */}
        <div className="mt-4 flex items-start gap-3 text-xs text-slate-300 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
          <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold text-indigo-400">Web Performance Recommendation: </span>
            {metadata.height > 1080
              ? `Source is ${metadata.width}x${metadata.height} (${formatBytes(metadata.fileSize)}). Auto Web Optimizer will scale to 1080p VP9 for optimal Largest Contentful Paint (LCP) web loading.`
              : `Source is ${formatBytes(metadata.fileSize)}. Converting to WebM (VP9) will cut bandwidth by ~${estimatedSize.reductionPct}% with crisp playback across all modern browsers.`}
          </div>
        </div>
      </div>

      {/* Preset Selection Tabs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
            Select Optimization Preset
          </label>
          <span className="text-[11px] text-slate-500">VP9 2-Pass Available</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Preset 1: Auto Web */}
          <button
            id="preset-auto-web"
            type="button"
            onClick={() => setPreset('auto-web')}
            className={`relative p-4 rounded-2xl text-left border transition-all flex flex-col justify-between ${
              preset === 'auto-web'
                ? 'border-indigo-500 bg-indigo-500/10 shadow-md shadow-indigo-500/10'
                : 'border-slate-800 hover:border-slate-700 bg-[#111114]'
            }`}
          >
            {preset === 'auto-web' && (
              <span className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-indigo-500/20" />
            )}
            <div>
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-slate-100">Auto Web (CRF 31)</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Balanced VP9 Constant Rate Factor. Smart downscaling & Opus 80k audio.
              </p>
            </div>
            <div className="mt-4 pt-2.5 border-t border-slate-800/80 text-[11px] font-semibold text-indigo-400">
              Recommended for Web
            </div>
          </button>

          {/* Preset 2: Hero / Background */}
          <button
            id="preset-hero-background"
            type="button"
            onClick={() => setPreset('hero-background')}
            className={`relative p-4 rounded-2xl text-left border transition-all flex flex-col justify-between ${
              preset === 'hero-background'
                ? 'border-indigo-500 bg-indigo-500/10 shadow-md shadow-indigo-500/10'
                : 'border-slate-800 hover:border-slate-700 bg-[#111114]'
            }`}
          >
            {preset === 'hero-background' && (
              <span className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-indigo-500/20" />
            )}
            <div>
              <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center mb-3">
                <LayoutTemplate className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-slate-100">Hero / Loop</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Ultra-compressed silent video. Removes audio, clamps to 30fps for instant LCP.
              </p>
            </div>
            <div className="mt-4 pt-2.5 border-t border-slate-800/80 text-[11px] font-semibold text-teal-400">
              Muted Autoplay Video
            </div>
          </button>

          {/* Preset 3: High Quality */}
          <button
            id="preset-high-quality"
            type="button"
            onClick={() => setPreset('high-quality')}
            className={`relative p-4 rounded-2xl text-left border transition-all flex flex-col justify-between ${
              preset === 'high-quality'
                ? 'border-indigo-500 bg-indigo-500/10 shadow-md shadow-indigo-500/10'
                : 'border-slate-800 hover:border-slate-700 bg-[#111114]'
            }`}
          >
            {preset === 'high-quality' && (
              <span className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-indigo-500/20" />
            )}
            <div>
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-3">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-slate-100">High Fidelity</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                CRF 26 high clarity, preserves full dynamic range & 128k stereo Opus.
              </p>
            </div>
            <div className="mt-4 pt-2.5 border-t border-slate-800/80 text-[11px] font-semibold text-purple-400">
              Product & Design Showcase
            </div>
          </button>

          {/* Preset 4: Target Size Budget */}
          <button
            id="preset-target-size"
            type="button"
            onClick={() => setPreset('target-size')}
            className={`relative p-4 rounded-2xl text-left border transition-all flex flex-col justify-between ${
              preset === 'target-size'
                ? 'border-indigo-500 bg-indigo-500/10 shadow-md shadow-indigo-500/10'
                : 'border-slate-800 hover:border-slate-700 bg-[#111114]'
            }`}
          >
            {preset === 'target-size' && (
              <span className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-indigo-500/20" />
            )}
            <div>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
                <Target className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-slate-100">Target Budget</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Specify strict maximum file size cap (e.g. 5MB). 2-pass bitrate matching.
              </p>
            </div>
            <div className="mt-4 pt-2.5 border-t border-slate-800/80 text-[11px] font-semibold text-amber-400">
              Strict Size Limits
            </div>
          </button>
        </div>
      </div>

      {/* Target Size Config Subpanel */}
      {preset === 'target-size' && (
        <div className="bg-[#111114] p-5 rounded-3xl border border-amber-500/30 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-semibold text-amber-300">Target Maximum File Size</h4>
              <p className="text-xs text-slate-400">
                The encoder will mathematically fit the video into this budget using 2-pass VP9.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {[2, 5, 10, 25].map((mb) => (
                <button
                  key={mb}
                  id={`target-mb-btn-${mb}`}
                  type="button"
                  onClick={() => setTargetSizeMB(mb)}
                  className={`px-3 py-1 rounded-xl text-xs font-mono font-semibold border transition-all ${
                    targetSizeMB === mb
                      ? 'bg-amber-500 text-black border-amber-400'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {mb} MB
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <input
              id="target-size-range"
              type="range"
              min={1}
              max={50}
              step={1}
              value={targetSizeMB}
              onChange={(e) => setTargetSizeMB(parseFloat(e.target.value))}
              className="w-full accent-amber-500"
            />
            <span className="text-sm font-mono font-bold text-amber-400 bg-slate-900 px-3 py-1 rounded-xl border border-slate-800 min-w-[75px] text-center">
              {targetSizeMB} MB
            </span>
          </div>
        </div>
      )}

      {/* Advanced Granular Controls Toggle / Panel */}
      <div className="bg-[#111114] rounded-3xl border border-slate-800 shadow-xs overflow-hidden">
        <button
          id="custom-tuning-toggle-btn"
          type="button"
          onClick={() => setPreset(preset === 'custom' ? 'auto-web' : 'custom')}
          className="w-full p-4 sm:p-5 flex items-center justify-between hover:bg-slate-900/60 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300">
              <Sliders className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-100">
                {preset === 'custom' ? 'Custom Pro Controls (Active)' : 'Advanced Encoder Fine-Tuning'}
              </h4>
              <p className="text-xs text-slate-400">
                Adjust CRF, resolution scaling, frame rates, Opus audio & duration trimming
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-medium text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-xl border border-indigo-500/20">
            {preset === 'custom' ? 'Switch to Presets' : 'Customize'}
          </span>
        </button>

        {preset === 'custom' && (
          <div className="p-6 border-t border-slate-800 bg-slate-900/40 space-y-6">
            {/* CRF Quality Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <label htmlFor="crf-slider" className="font-semibold text-slate-200">
                  Constant Rate Factor (CRF Quality: <span className="text-indigo-400">{crf}</span>)
                </label>
                <span className="text-slate-400">
                  {crf <= 22 ? 'Lossless / Very High' : crf <= 28 ? 'High Fidelity' : crf <= 33 ? 'Optimal Web (Recommended)' : 'High Compression'}
                </span>
              </div>
              <input
                id="crf-slider"
                type="range"
                min={18}
                max={45}
                value={crf}
                onChange={(e) => setCrf(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-500"
              />
              <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                <span>18 (Highest Quality)</span>
                <span>31 (Web Standard)</span>
                <span>45 (Smallest Payload)</span>
              </div>
            </div>

            {/* Grid for Resolution, Codec, Audio & FPS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Resolution */}
              <div className="space-y-1.5">
                <label htmlFor="resolution-select" className="text-xs font-semibold text-slate-300 font-mono">
                  Resolution
                </label>
                <select
                  id="resolution-select"
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="original">Original ({metadata.width}x{metadata.height})</option>
                  <option value="1080p">1080p (Full HD Web)</option>
                  <option value="720p">720p (Fast Web)</option>
                  <option value="480p">480p (Mobile Compact)</option>
                  <option value="360p">360p (Ultra Lightweight)</option>
                </select>
              </div>

              {/* Codec */}
              <div className="space-y-1.5">
                <label htmlFor="codec-select" className="text-xs font-semibold text-slate-300 font-mono">
                  Video Codec
                </label>
                <select
                  id="codec-select"
                  value={codec}
                  onChange={(e) => setCodec(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="vp9">VP9 (Modern Web Standard)</option>
                  <option value="vp8">VP8 (Legacy Compatibility)</option>
                </select>
              </div>

              {/* FPS Limiter */}
              <div className="space-y-1.5">
                <label htmlFor="fps-select" className="text-xs font-semibold text-slate-300 font-mono">
                  Frame Rate
                </label>
                <select
                  id="fps-select"
                  value={fps}
                  onChange={(e) => setFps(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value={0}>Original ({metadata.fps} fps)</option>
                  <option value={60}>60 FPS (Smooth)</option>
                  <option value={30}>30 FPS (Web Standard)</option>
                  <option value={24}>24 FPS (Cinematic / Light)</option>
                </select>
              </div>

              {/* Audio Mode */}
              <div className="space-y-1.5">
                <label htmlFor="audio-select" className="text-xs font-semibold text-slate-300 font-mono">
                  Audio Track
                </label>
                <select
                  id="audio-select"
                  value={audioMode}
                  onChange={(e) => setAudioMode(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="opus-auto">Opus 80 kbps (Balanced)</option>
                  <option value="opus-high">Opus 128 kbps (High Fidelity)</option>
                  <option value="opus-voice">Opus 48 kbps (Voice Compact)</option>
                  <option value="mute">Mute / Remove Audio</option>
                </select>
              </div>
            </div>

            {/* Trimming & Speed */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 font-mono">
                  <Scissors className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Trim Video Duration (Seconds)</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <span className="text-[10px] text-slate-400 font-mono">Start (s)</span>
                    <input
                      id="trim-start-input"
                      type="number"
                      min={0}
                      max={trimEnd - 1}
                      step={0.5}
                      value={trimStart}
                      onChange={(e) => setTrimStart(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                    />
                  </div>
                  <span className="text-slate-500 self-end mb-2">to</span>
                  <div className="flex-1">
                    <span className="text-[10px] text-slate-400 font-mono">End (s)</span>
                    <input
                      id="trim-end-input"
                      type="number"
                      min={trimStart + 1}
                      max={Math.ceil(metadata.duration)}
                      step={0.5}
                      value={trimEnd}
                      onChange={(e) => setTrimEnd(Math.min(metadata.duration, parseFloat(e.target.value) || metadata.duration))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="playback-speed-select" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 font-mono">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Playback Speed Rate</span>
                </label>
                <select
                  id="playback-speed-select"
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 mt-3"
                >
                  <option value={0.5}>0.5x (Slow motion)</option>
                  <option value={1}>1.0x (Normal speed)</option>
                  <option value={1.25}>1.25x (Fast)</option>
                  <option value={1.5}>1.5x (Speed up)</option>
                  <option value={2}>2.0x (Timelapse)</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Live Estimated Savings & Convert Action Bento Card */}
      <div className="bg-[#111114] border border-slate-800 text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="space-y-1 text-center sm:text-left">
          <div className="flex items-center gap-2 justify-center sm:justify-start">
            <span className="text-xs font-mono font-semibold text-indigo-400 uppercase tracking-wider">
              Estimated Web Output
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              ~{estimatedSize.reductionPct}% Reduction
            </span>
          </div>
          <div className="flex items-baseline gap-3 justify-center sm:justify-start">
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-100 font-mono">
              {estimatedSize.text}
            </span>
            <span className="text-xs text-slate-500 font-mono line-through">
              {formatBytes(metadata.fileSize)}
            </span>
          </div>
        </div>

        <button
          id="start-conversion-btn"
          type="button"
          onClick={handleStart}
          disabled={isConverting}
          className="w-full sm:w-auto px-8 py-3.5 bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white rounded-full font-medium transition-all shadow-lg shadow-indigo-500/20 text-sm flex items-center justify-center gap-2 group disabled:opacity-50 disabled:pointer-events-none"
        >
          <Zap className="w-4 h-4 fill-current" />
          <span>Convert & Optimize WebM</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};
