import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  SplitSquareVertical,
  Columns,
  Repeat,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Film,
} from 'lucide-react';
import { ConversionJob } from '../types';
import { formatBytes, formatDuration } from '../utils/formatters';

interface ComparisonViewerProps {
  job: ConversionJob;
  originalPreviewUrl: string;
  convertedPreviewUrl: string;
}

export const ComparisonViewer: React.FC<ComparisonViewerProps> = ({
  job,
  originalPreviewUrl,
  convertedPreviewUrl,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(job.metadata?.duration || 0);
  const [viewMode, setViewMode] = useState<'slider' | 'side-by-side' | 'toggle'>('slider');
  const [activeToggle, setActiveToggle] = useState<'original' | 'converted'>('converted');
  const [sliderPosition, setSliderPosition] = useState<number>(50); // percentage 0 - 100
  const [isDraggingSlider, setIsDraggingSlider] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(1); // 1x, 1.5x, 2x

  const origVideoRef = useRef<HTMLVideoElement>(null);
  const convVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync play/pause
  const togglePlay = () => {
    if (isPlaying) {
      origVideoRef.current?.pause();
      convVideoRef.current?.pause();
      setIsPlaying(false);
    } else {
      origVideoRef.current?.play().catch(() => {});
      convVideoRef.current?.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  // Sync seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (origVideoRef.current) origVideoRef.current.currentTime = time;
    if (convVideoRef.current) convVideoRef.current.currentTime = time;
  };

  // Sync time updates
  const handleTimeUpdate = () => {
    if (convVideoRef.current) {
      setCurrentTime(convVideoRef.current.currentTime);
      if (convVideoRef.current.duration && !isNaN(convVideoRef.current.duration)) {
        setDuration(convVideoRef.current.duration);
      }
    }
  };

  // Keep both videos locked in sync if drift happens
  const handleSyncDrift = useCallback(() => {
    if (origVideoRef.current && convVideoRef.current) {
      const diff = Math.abs(origVideoRef.current.currentTime - convVideoRef.current.currentTime);
      if (diff > 0.08) {
        origVideoRef.current.currentTime = convVideoRef.current.currentTime;
      }
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(handleSyncDrift, 500);
    return () => clearInterval(interval);
  }, [handleSyncDrift]);

  // Handle slider drag
  const handleMouseDown = () => setIsDraggingSlider(true);
  const handleMouseUp = () => setIsDraggingSlider(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingSlider || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const pct = Math.round((x / rect.width) * 100);
    setSliderPosition(pct);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!containerRef.current || !e.touches[0]) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.touches[0].clientX - rect.left, rect.width));
    const pct = Math.round((x / rect.width) * 100);
    setSliderPosition(pct);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (origVideoRef.current) origVideoRef.current.playbackRate = speed;
    if (convVideoRef.current) convVideoRef.current.playbackRate = speed;
  };

  const handleMuteToggle = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (origVideoRef.current) origVideoRef.current.muted = newMuted;
    if (convVideoRef.current) convVideoRef.current.muted = newMuted;
  };

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen().catch(() => {});
      }
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      {/* Top Controls: View Mode & Quality Zoom */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#111114] p-4 rounded-3xl border border-slate-800 shadow-sm">
        {/* View Mode Selector */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-2xl border border-slate-800">
          <button
            id="view-mode-slider"
            onClick={() => setViewMode('slider')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all ${
              viewMode === 'slider'
                ? 'bg-indigo-500 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <SplitSquareVertical className="w-3.5 h-3.5" />
            <span>Split Slider</span>
          </button>

          <button
            id="view-mode-side-by-side"
            onClick={() => setViewMode('side-by-side')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all ${
              viewMode === 'side-by-side'
                ? 'bg-indigo-500 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Side-by-Side</span>
          </button>

          <button
            id="view-mode-toggle"
            onClick={() => setViewMode('toggle')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all ${
              viewMode === 'toggle'
                ? 'bg-indigo-500 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>A/B Flip</span>
          </button>
        </div>

        {/* Zoom Magnification and Playback Speed */}
        <div className="flex items-center gap-2">
          {viewMode === 'toggle' && (
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-2xl border border-slate-800 text-xs font-mono">
              <button
                onClick={() => setActiveToggle('original')}
                className={`px-2.5 py-1 rounded-xl transition-all ${
                  activeToggle === 'original' ? 'bg-amber-500 text-black font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Original ({formatBytes(job.originalSize)})
              </button>
              <button
                onClick={() => setActiveToggle('converted')}
                className={`px-2.5 py-1 rounded-xl transition-all ${
                  activeToggle === 'converted' ? 'bg-indigo-500 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                WebM ({formatBytes(job.convertedSize || 0)})
              </button>
            </div>
          )}

          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-2xl border border-slate-800 text-xs font-mono">
            <span className="text-slate-500 px-2">Zoom:</span>
            {[1, 1.5, 2].map((z) => (
              <button
                key={z}
                onClick={() => setZoomLevel(z)}
                className={`px-2 py-0.5 rounded-xl font-medium transition-all ${
                  zoomLevel === z ? 'bg-slate-800 text-indigo-400 shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {z}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Video Arena */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
        className="relative bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-800 select-none group"
        style={{ aspectRatio: '16/9' }}
      >
        {/* MODE 1: SPLIT SLIDER */}
        {viewMode === 'slider' && (
          <div className="relative w-full h-full overflow-hidden">
            {/* Background layer: Optimized WebM */}
            <div
              className="absolute inset-0 flex items-center justify-center overflow-hidden"
              style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
            >
              <video
                ref={convVideoRef}
                src={convertedPreviewUrl}
                autoPlay
                loop
                muted={isMuted}
                playsInline
                onTimeUpdate={handleTimeUpdate}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Foreground layer: Original Video clipped by slider position */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{
                clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`,
              }}
            >
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
              >
                <video
                  ref={origVideoRef}
                  src={originalPreviewUrl}
                  autoPlay
                  loop
                  muted={isMuted}
                  playsInline
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            {/* Slider Dividing Bar */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-indigo-400 shadow-2xl cursor-ew-resize z-20"
              style={{ left: `${sliderPosition}%` }}
              onMouseDown={handleMouseDown}
              onTouchStart={handleMouseDown}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-slate-900 shadow-lg border border-indigo-400/50 flex items-center justify-center text-indigo-400 cursor-ew-resize">
                <SplitSquareVertical className="w-4 h-4" />
              </div>
            </div>

            {/* In-Video Badges */}
            <div className="absolute top-4 left-4 z-10 pointer-events-none">
              <span className="px-3 py-1 bg-black/80 backdrop-blur-md text-slate-200 text-xs font-mono font-medium rounded-xl border border-slate-800 shadow-xs">
                Original ({job.metadata?.videoCodec?.toUpperCase() || 'MP4'}) • {formatBytes(job.originalSize)}
              </span>
            </div>

            <div className="absolute top-4 right-4 z-10 pointer-events-none">
              <span className="px-3 py-1 bg-indigo-950/80 backdrop-blur-md text-indigo-300 text-xs font-mono font-medium rounded-xl border border-indigo-500/30 shadow-xs flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>WebM (VP9) • {formatBytes(job.convertedSize || 0)}</span>
              </span>
            </div>
          </div>
        )}

        {/* MODE 2: SIDE BY SIDE */}
        {viewMode === 'side-by-side' && (
          <div className="grid grid-cols-2 w-full h-full bg-black divide-x divide-slate-800 overflow-hidden">
            {/* Left: Original */}
            <div className="relative flex items-center justify-center overflow-hidden">
              <video
                ref={origVideoRef}
                src={originalPreviewUrl}
                autoPlay
                loop
                muted={isMuted}
                playsInline
                className="w-full h-full object-contain"
                style={{ transform: `scale(${zoomLevel})` }}
              />
              <span className="absolute top-4 left-4 px-3 py-1 bg-black/80 backdrop-blur-md text-slate-200 text-xs font-mono font-medium rounded-xl border border-slate-800">
                Original • {formatBytes(job.originalSize)}
              </span>
            </div>

            {/* Right: Converted WebM */}
            <div className="relative flex items-center justify-center overflow-hidden">
              <video
                ref={convVideoRef}
                src={convertedPreviewUrl}
                autoPlay
                loop
                muted={isMuted}
                playsInline
                onTimeUpdate={handleTimeUpdate}
                className="w-full h-full object-contain"
                style={{ transform: `scale(${zoomLevel})` }}
              />
              <span className="absolute top-4 right-4 px-3 py-1 bg-indigo-950/80 backdrop-blur-md text-indigo-300 text-xs font-mono font-medium rounded-xl border border-indigo-500/40">
                WebM VP9 • {formatBytes(job.convertedSize || 0)}
              </span>
            </div>
          </div>
        )}

        {/* MODE 3: FLIP TOGGLE */}
        {viewMode === 'toggle' && (
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            {activeToggle === 'original' ? (
              <video
                ref={origVideoRef}
                src={originalPreviewUrl}
                autoPlay
                loop
                muted={isMuted}
                playsInline
                className="w-full h-full object-contain"
                style={{ transform: `scale(${zoomLevel})` }}
              />
            ) : (
              <video
                ref={convVideoRef}
                src={convertedPreviewUrl}
                autoPlay
                loop
                muted={isMuted}
                playsInline
                onTimeUpdate={handleTimeUpdate}
                className="w-full h-full object-contain"
                style={{ transform: `scale(${zoomLevel})` }}
              />
            )}
            <span className="absolute top-4 left-4 px-3 py-1 bg-black/80 backdrop-blur-md text-slate-200 text-xs font-mono font-medium rounded-xl border border-slate-800">
              Showing: {activeToggle === 'original' ? 'Original Video' : 'Optimized WebM'}
            </span>
          </div>
        )}

        {/* Bottom Synchronized Scrub Bar & Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent z-30 transition-opacity">
          {/* Progress Timeline Slider */}
          <div className="flex items-center gap-3 mb-2">
            <input
              id="sync-seek-slider"
              type="range"
              min={0}
              max={duration || 10}
              step={0.05}
              value={currentTime}
              onChange={handleSeek}
              className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">
              {formatDuration(currentTime)} / {formatDuration(duration)}
            </span>
          </div>

          {/* Buttons Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                id="sync-play-pause-btn"
                onClick={togglePlay}
                className="w-8 h-8 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-800 flex items-center justify-center transition-colors"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>

              <button
                id="sync-mute-btn"
                onClick={handleMuteToggle}
                className="w-8 h-8 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-800 flex items-center justify-center transition-colors"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              {/* Speed Buttons */}
              <div className="flex items-center gap-0.5 bg-slate-900/80 p-0.5 rounded-xl border border-slate-800 text-[11px] font-mono">
                {[0.5, 1, 1.5, 2].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSpeedChange(s)}
                    className={`px-2 py-0.5 rounded-lg font-medium transition-all ${
                      playbackSpeed === s ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            <button
              id="sync-fullscreen-btn"
              onClick={handleFullscreen}
              className="w-8 h-8 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-800 flex items-center justify-center transition-colors"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
