import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Film, PlayCircle, AlertCircle, Sparkles, Loader2, Zap, ArrowUpRight, HardDrive } from 'lucide-react';
import { SampleVideo, UploadedFileState } from '../types';
import { formatBytes, formatDuration } from '../utils/formatters';

interface VideoUploaderProps {
  onFileLoaded: (fileState: UploadedFileState) => void;
  isLoading: boolean;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({ onFileLoaded, isLoading }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [samples, setSamples] = useState<SampleVideo[]>([]);
  const [loadingSampleId, setLoadingSampleId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch available test samples on mount
  useEffect(() => {
    fetch('/api/samples')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setSamples(data);
        }
      })
      .catch((err) => console.warn('Could not load samples list:', err));
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    setErrorMessage(null);

    // Validate video type
    const validExtensions = ['.mp4', '.mov', '.mkv', '.avi', '.webm', '.m4v', '.ts', '.flv', '.wmv'];
    const fileName = file.name.toLowerCase();
    const isVideo = file.type.startsWith('video/') || validExtensions.some((ext) => fileName.endsWith(ext));

    if (!isVideo) {
      setErrorMessage('Please select a valid video file (.mp4, .mov, .mkv, .avi, .webm, .m4v, .ts)');
      return;
    }

    if (file.size > 500 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 500 MB limit. Please select a smaller video.');
      return;
    }

    // Upload to server
    const formData = new FormData();
    formData.append('video', file);

    const localBlobUrl = URL.createObjectURL(file);

    try {
      setUploadProgress(10);
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 90);
          setUploadProgress(percent);
        }
      });

      xhr.open('POST', '/api/upload');

      xhr.onload = () => {
        setUploadProgress(null);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            onFileLoaded({
              fileId: data.fileId,
              filePath: data.filePath,
              filename: data.filename,
              metadata: data.metadata,
              localBlobUrl,
            });
          } catch (e) {
            setErrorMessage('Failed to parse server response.');
          }
        } else {
          try {
            const errData = JSON.parse(xhr.responseText);
            setErrorMessage(errData.error || 'Upload failed.');
          } catch {
            setErrorMessage(`Upload error (status ${xhr.status})`);
          }
        }
      };

      xhr.onerror = () => {
        setUploadProgress(null);
        setErrorMessage('Network error while uploading video.');
      };

      xhr.send(formData);
    } catch (err: any) {
      setUploadProgress(null);
      setErrorMessage(err.message || 'Failed to upload video');
    }
  };

  const handleUseSample = async (sampleId: string) => {
    setErrorMessage(null);
    setLoadingSampleId(sampleId);
    try {
      const res = await fetch(`/api/samples/${sampleId}/use`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load sample video');
      }
      onFileLoaded({
        fileId: data.fileId,
        filePath: data.filePath,
        filename: data.filename,
        metadata: data.metadata,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not load sample video');
    } finally {
      setLoadingSampleId(null);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Error alert */}
      {errorMessage && (
        <div
          id="upload-error-alert"
          className="flex items-center gap-3 p-4 bg-red-950/50 border border-red-800 text-red-300 rounded-2xl text-sm"
        >
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
          <p className="flex-1 font-medium">{errorMessage}</p>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs font-bold text-red-400 hover:text-red-200"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Bento Grid Layout for Home / Upload view */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* BENTO TILE 1: Main Dropzone Area (Spans 8 cols on desktop) */}
        <div
          id="video-drop-zone"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isLoading && !uploadProgress && fileInputRef.current?.click()}
          className={`lg:col-span-8 bg-[#111114] border ${
            isDragging ? 'border-indigo-500 ring-2 ring-indigo-500/30' : 'border-slate-800 hover:border-slate-700'
          } rounded-3xl p-8 sm:p-12 flex flex-col items-center justify-center relative overflow-hidden cursor-pointer transition-all duration-300 min-h-[380px] group ${
            isLoading || uploadProgress !== null ? 'pointer-events-none opacity-80' : ''
          }`}
        >
          {/* Radial Dot Pattern */}
          <div className="absolute inset-0 bg-dot-grid opacity-30 pointer-events-none"></div>

          <input
            ref={fileInputRef}
            type="file"
            id="video-file-input"
            accept="video/*,.mp4,.mov,.mkv,.avi,.webm,.m4v,.ts"
            onChange={handleFileInput}
            className="hidden"
          />

          <div className="relative z-10 flex flex-col items-center text-center max-w-md mx-auto">
            <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-5 border border-indigo-500/20 group-hover:scale-105 group-hover:border-indigo-500/40 transition-transform">
              {uploadProgress !== null ? (
                <Loader2 className="w-9 h-9 animate-spin text-indigo-400" />
              ) : (
                <UploadCloud className="w-9 h-9 text-indigo-400" />
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-100 mb-2">
              {uploadProgress !== null
                ? `Uploading video... ${uploadProgress}%`
                : isDragging
                ? 'Drop video right here'
                : 'Drop video to optimize'}
            </h2>

            <p className="text-sm text-slate-400 max-w-sm mb-6 leading-relaxed">
              Support for MP4, MOV, MKV, AVI. Automatically converted to high-efficiency WebM with VP9 & Opus.
            </p>

            {uploadProgress !== null ? (
              <div className="w-full max-w-xs bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className="bg-indigo-500 h-full transition-all duration-300 ease-out shadow-xs"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            ) : (
              <button
                type="button"
                className="px-8 py-3 bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white rounded-full font-medium transition-all shadow-lg shadow-indigo-500/20 text-sm flex items-center gap-2 group-hover:shadow-indigo-500/30"
              >
                <span>Select Source File</span>
                <ArrowUpRight className="w-4 h-4 opacity-70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            )}

            {/* Format pills */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-8">
              {['MP4', 'MOV', 'MKV', 'AVI', 'WebM', 'M4V'].map((fmt) => (
                <span
                  key={fmt}
                  className="px-2.5 py-0.5 rounded-lg text-[11px] font-mono font-medium bg-slate-900 border border-slate-800 text-slate-400"
                >
                  {fmt}
                </span>
              ))}
              <span className="text-[11px] text-slate-500 ml-1">Up to 500 MB</span>
            </div>
          </div>
        </div>

        {/* BENTO TILE 2: Optimization Presets Preview (Spans 4 cols on desktop) */}
        <div className="lg:col-span-4 bg-[#111114] border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
                Optimization Presets
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-md border border-indigo-500/20">
                VP9 Native
              </span>
            </div>

            <div className="space-y-2.5">
              <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex justify-between items-center cursor-default">
                <div>
                  <div className="text-sm font-medium text-slate-100 flex items-center gap-1.5">
                    <span>Web Ultra-Lite (Auto)</span>
                    <span className="text-[10px] bg-indigo-500 text-black font-bold px-1.5 py-0.2 rounded">POPULAR</span>
                  </div>
                  <div className="text-xs text-indigo-300/80 mt-0.5">CRF 31 • Fast mobile LCP</div>
                </div>
                <div className="w-4 h-4 rounded-full border-4 border-indigo-500 shrink-0"></div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex justify-between items-center cursor-default">
                <div>
                  <div className="text-sm font-medium text-slate-200">Hero & Loop Background</div>
                  <div className="text-xs text-slate-500 mt-0.5">Muted • 30 FPS • Under 2 MB</div>
                </div>
                <div className="w-4 h-4 rounded-full border-2 border-slate-700 shrink-0"></div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex justify-between items-center cursor-default">
                <div>
                  <div className="text-sm font-medium text-slate-200">High Fidelity Web</div>
                  <div className="text-xs text-slate-500 mt-0.5">CRF 26 • Opus Stereo 128k</div>
                </div>
                <div className="w-4 h-4 rounded-full border-2 border-slate-700 shrink-0"></div>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-800/80">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-slate-400">Target Output Bitrate</span>
              <span className="text-indigo-400 font-mono font-medium">1,200 kbps</span>
            </div>
            <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden">
              <div className="bg-indigo-500 h-full w-[45%] rounded-full"></div>
            </div>
          </div>
        </div>

        {/* BENTO TILE 3: Highlight Performance Card (Spans 4 cols on desktop) */}
        <div className="lg:col-span-4 bg-indigo-500 rounded-3xl p-6 text-black flex flex-col justify-between min-h-[220px] shadow-lg shadow-indigo-500/10">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider opacity-70 font-mono">
                Average Compression
              </h3>
              <Zap className="w-4 h-4 text-black opacity-80" />
            </div>
            <div className="text-5xl font-extrabold tracking-tighter mt-2 font-mono">
              -84.2%
            </div>
            <p className="text-xs font-semibold mt-1 opacity-80">
              Payload reduction with VP9 & Opus stream tuning
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-black/15 p-3 rounded-2xl backdrop-blur-xs">
              <div className="text-[10px] uppercase font-bold opacity-60">Source MP4</div>
              <div className="text-base sm:text-lg font-bold font-mono">42.8 MB</div>
            </div>
            <div className="bg-black/15 p-3 rounded-2xl backdrop-blur-xs">
              <div className="text-[10px] uppercase font-bold opacity-60">Optimized WebM</div>
              <div className="text-base sm:text-lg font-bold font-mono">6.7 MB</div>
            </div>
          </div>
        </div>

        {/* BENTO TILE 4: Test Sample Clips & Recent (Spans 8 cols on desktop) */}
        <div className="lg:col-span-8 bg-[#111114] border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
                Quick Test Samples
              </h3>
            </div>
            <span className="text-xs text-slate-500">Instant one-click demo</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {samples.map((sample) => (
              <button
                key={sample.id}
                id={`sample-btn-${sample.id}`}
                onClick={() => handleUseSample(sample.id)}
                disabled={loadingSampleId !== null || isLoading}
                className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-500/5 text-left transition-all group disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-xl bg-[#111114] border border-slate-800 group-hover:border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 transition-colors">
                  {loadingSampleId === sample.id ? (
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                  ) : (
                    <PlayCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-sm font-medium text-slate-200 group-hover:text-indigo-300 truncate">
                      {sample.name}
                    </p>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/50 shrink-0">
                      {sample.width}x{sample.height}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                    {sample.description}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1 font-mono">
                    <span>{formatDuration(sample.duration)}</span>
                    <span>•</span>
                    <span>{sample.fps} FPS</span>
                    <span>•</span>
                    <span className="text-indigo-400 font-semibold">{sample.originalSizeMB} MB</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

