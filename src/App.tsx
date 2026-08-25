import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { VideoUploader } from './components/VideoUploader';
import { OptimizationControls } from './components/OptimizationControls';
import { TranscodingProgress } from './components/TranscodingProgress';
import { ComparisonViewer } from './components/ComparisonViewer';
import { PerformanceMetrics } from './components/PerformanceMetrics';
import { EmbedCodeGenerator } from './components/EmbedCodeGenerator';
import { WebBestPractices } from './components/WebBestPractices';
import {
  UploadedFileState,
  ConversionOptions,
  ConversionJob,
} from './types';
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';

export default function App() {
  const [uploadedFile, setUploadedFile] = useState<UploadedFileState | null>(null);
  const [conversionJob, setConversionJob] = useState<ConversionJob | null>(null);
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const sseRef = useRef<EventSource | null>(null);

  // Clean up SSE connection on unmount
  useEffect(() => {
    return () => {
      if (sseRef.current) {
        sseRef.current.close();
      }
    };
  }, []);

  const handleFileLoaded = (fileState: UploadedFileState) => {
    setUploadedFile(fileState);
    setConversionJob(null);
    setGeneralError(null);
  };

  const handleStartConversion = async (options: ConversionOptions) => {
    if (!uploadedFile) return;

    setIsConverting(true);
    setGeneralError(null);

    try {
      const res = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: uploadedFile.fileId,
          filePath: uploadedFile.filePath,
          filename: uploadedFile.filename,
          options,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start conversion');
      }

      const initialJob: ConversionJob = {
        id: data.jobId,
        originalFilename: uploadedFile.filename,
        originalFilePath: uploadedFile.filePath,
        outputFilePath: '',
        originalSize: uploadedFile.metadata.fileSize,
        status: data.status || 'queued',
        progress: data.progress || 0,
        options,
        metadata: uploadedFile.metadata,
        createdAt: Date.now(),
      };

      setConversionJob(initialJob);

      // Listen to SSE progress updates
      if (sseRef.current) {
        sseRef.current.close();
      }

      const eventSource = new EventSource(`/api/jobs/${data.jobId}/events`);
      sseRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const updatedJob: ConversionJob = JSON.parse(event.data);
          setConversionJob(updatedJob);

          if (updatedJob.status === 'completed') {
            setIsConverting(false);
            eventSource.close();
          } else if (updatedJob.status === 'error') {
            setIsConverting(false);
            setGeneralError(updatedJob.error || 'Conversion encountered an error');
            eventSource.close();
          }
        } catch (e) {
          console.warn('Error parsing SSE event data:', e);
        }
      };

      eventSource.onerror = () => {
        // Fallback polling if SSE drops
        eventSource.close();
        pollJobStatus(data.jobId);
      };
    } catch (err: any) {
      setIsConverting(false);
      setGeneralError(err.message || 'Could not initiate video conversion');
    }
  };

  const pollJobStatus = async (jobId: string) => {
    const check = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (res.ok) {
          const job: ConversionJob = await res.json();
          setConversionJob(job);
          if (job.status === 'completed') {
            setIsConverting(false);
            return;
          }
          if (job.status === 'error') {
            setIsConverting(false);
            setGeneralError(job.error || 'Conversion failed');
            return;
          }
        }
        setTimeout(check, 1000);
      } catch {
        setIsConverting(false);
      }
    };
    check();
  };

  const handleReset = () => {
    if (sseRef.current) {
      sseRef.current.close();
    }
    setUploadedFile(null);
    setConversionJob(null);
    setIsConverting(false);
    setGeneralError(null);
  };

  const handleReconfigure = () => {
    setConversionJob(null);
    setIsConverting(false);
  };

  const isCompleted = conversionJob && conversionJob.status === 'completed';
  const isInProgress = conversionJob && (conversionJob.status === 'queued' || conversionJob.status === 'analyzing' || conversionJob.status === 'transcoding');

  return (
    <div className="min-h-screen bg-[#09090B] text-slate-100 flex flex-col font-sans antialiased bg-dot-grid">
      {/* Header */}
      <Header
        onReset={handleReset}
        hasActiveFile={!!uploadedFile}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* General Error Banner */}
        {generalError && (
          <div className="max-w-4xl mx-auto flex items-center gap-3 p-4 bg-red-950/60 border border-red-800 text-red-300 rounded-2xl text-sm shadow-md">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
            <div className="flex-1 font-medium">{generalError}</div>
            <button
              onClick={() => setGeneralError(null)}
              className="text-xs font-bold text-red-400 hover:text-red-300 px-2 py-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* STEP 1: Video Uploader (When no video is uploaded) */}
        {!uploadedFile && (
          <div className="space-y-8 py-4">
            <VideoUploader
              onFileLoaded={handleFileLoaded}
              isLoading={isConverting}
            />
            <WebBestPractices />
          </div>
        )}

        {/* STEP 2: Configure Optimization Settings */}
        {uploadedFile && !isInProgress && !isCompleted && (
          <div className="space-y-6">
            <div className="flex items-center justify-between max-w-4xl mx-auto">
              <button
                id="back-to-upload-btn"
                onClick={handleReset}
                className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-slate-400 hover:text-slate-200 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Choose a different video</span>
              </button>
            </div>

            <OptimizationControls
              metadata={uploadedFile.metadata}
              onOptionsChange={() => {}}
              onStartConversion={handleStartConversion}
              isConverting={isConverting}
            />
          </div>
        )}

        {/* STEP 3: Transcoding Progress */}
        {isInProgress && conversionJob && (
          <div className="py-8">
            <TranscodingProgress job={conversionJob} />
          </div>
        )}

        {/* STEP 4: Results & Comparison */}
        {isCompleted && conversionJob && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Top Navigation & Action Row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 max-w-5xl mx-auto">
              <button
                id="reconfigure-btn"
                onClick={handleReconfigure}
                className="inline-flex items-center gap-2 text-xs font-mono font-medium text-slate-300 hover:text-white bg-slate-900 px-4 py-2.5 rounded-full border border-slate-800 shadow-sm hover:bg-slate-800 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                <span>Re-encode with Different Preset</span>
              </button>

              <button
                id="new-video-bottom-btn"
                onClick={handleReset}
                className="inline-flex items-center gap-2 text-xs font-mono font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-4 py-2.5 rounded-full border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors"
              >
                <span>Upload Another Video</span>
              </button>
            </div>

            {/* Performance Impact Metrics Banner */}
            <PerformanceMetrics job={conversionJob} />

            {/* Interactive Side-by-Side / Diff Comparison Viewer */}
            <div className="space-y-3">
              <div className="max-w-5xl mx-auto flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-100">
                  Visual Fidelity & Compression Diff
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  Drag the slider to compare original vs. WebM output
                </span>
              </div>

              <ComparisonViewer
                job={conversionJob}
                originalPreviewUrl={uploadedFile?.localBlobUrl || `/api/original-preview/${conversionJob.id}`}
                convertedPreviewUrl={`/api/preview/${conversionJob.id}`}
              />
            </div>

            {/* Embed Code Generator Snippet */}
            <EmbedCodeGenerator job={conversionJob} />

            {/* Web Performance Best Practices */}
            <WebBestPractices />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-800/80 bg-[#111114] py-6 mt-12 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>WebM Video Converter & Web Optimizer • VP9 / Opus Web Engine</span>
          <span className="text-slate-600">
            Optimized for Google Core Web Vitals (CWV) & Largest Contentful Paint (LCP)
          </span>
        </div>
      </footer>
    </div>
  );
}
