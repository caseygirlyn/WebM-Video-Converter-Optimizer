import React, { useEffect } from 'react';
import {
  Download,
  Image as ImageIcon,
  Smartphone,
  Wifi,
  Globe,
  Sparkles,
  Award,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ConversionJob } from '../types';
import { formatBytes, calculateSavings, estimateLoadTimeMs } from '../utils/formatters';

interface PerformanceMetricsProps {
  job: ConversionJob;
}

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ job }) => {
  const origSize = job.originalSize || 1;
  const convSize = job.convertedSize || 1;
  const savings = calculateSavings(origSize, convSize);

  // Trigger celebratory confetti when results load
  useEffect(() => {
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#818cf8', '#a855f7', '#38bdf8'],
      });
    } catch {
      // ignore
    }
  }, []);

  // Web Vitals LCP Load Time estimates
  const origLcp4G = estimateLoadTimeMs(origSize, 25);
  const convLcp4G = estimateLoadTimeMs(convSize, 25);
  const timeSaved4G = Math.max(0, origLcp4G - convLcp4G);

  const origLcp3G = estimateLoadTimeMs(origSize, 4);
  const convLcp3G = estimateLoadTimeMs(convSize, 4);
  const timeSaved3G = Math.max(0, origLcp3G - convLcp3G);

  // Bandwidth saved over 10,000 web visits
  const bandwidthSaved10kGB = Math.round(((savings.savedBytes * 10000) / (1024 * 1024 * 1024)) * 10) / 10;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Primary Savings Banner */}
      <div className="bg-[#111114] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Award className="w-3.5 h-3.5" />
              <span>Optimization Complete</span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-indigo-400 font-mono">
                -{savings.percentage}%
              </span>
              <span className="text-xl font-semibold text-slate-200">
                Smaller Payload
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-lg">
              Compressed from <span className="text-slate-200 font-mono font-semibold">{formatBytes(origSize)}</span> down to{' '}
              <span className="text-indigo-400 font-mono font-bold">{formatBytes(convSize)}</span> ({savings.multiplier} compression ratio).
            </p>
          </div>

          {/* Action Download Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            <a
              id="download-webm-btn"
              href={`/api/download/${job.id}`}
              download
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-full shadow-lg shadow-indigo-500/20 transition-all text-sm"
            >
              <Download className="w-4 h-4" />
              <span>Download WebM Video</span>
            </a>

            {job.posterFilePath && (
              <a
                id="download-poster-btn"
                href={`/api/poster/${job.id}`}
                target="_blank"
                rel="noreferrer"
                download
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-200 font-medium rounded-full border border-slate-800 transition-all text-sm font-mono"
              >
                <ImageIcon className="w-4 h-4 text-indigo-400" />
                <span>Poster WebP</span>
              </a>
            )}
          </div>
        </div>

        {/* 3 Metric Bento Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-slate-800/80">
          {/* Card 1: 4G Mobile LCP */}
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1">
              <Smartphone className="w-4 h-4 text-indigo-400" />
              <span>4G Mobile Load</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-100">
                {(convLcp4G / 1000).toFixed(2)}s
              </span>
              <span className="text-xs text-slate-500 font-mono line-through">
                {(origLcp4G / 1000).toFixed(2)}s
              </span>
            </div>
            <span className="text-xs text-emerald-400 font-mono flex items-center gap-1 mt-1">
              <span>⚡</span> {(timeSaved4G / 1000).toFixed(1)}s faster LCP render
            </span>
          </div>

          {/* Card 2: 3G Mobile LCP */}
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1">
              <Wifi className="w-4 h-4 text-teal-400" />
              <span>Slow 3G Network</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-100">
                {(convLcp3G / 1000).toFixed(2)}s
              </span>
              <span className="text-xs text-slate-500 font-mono line-through">
                {(origLcp3G / 1000).toFixed(2)}s
              </span>
            </div>
            <span className="text-xs text-teal-400 font-mono flex items-center gap-1 mt-1">
              <span>⚡</span> {(timeSaved3G / 1000).toFixed(1)}s faster delivery
            </span>
          </div>

          {/* Card 3: Bandwidth Saved per 10k users */}
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1">
              <Globe className="w-4 h-4 text-indigo-400" />
              <span>Egress / 10k Views</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-100">
                {bandwidthSaved10kGB} GB
              </span>
              <span className="text-xs text-slate-400 font-mono">saved</span>
            </div>
            <span className="text-xs text-indigo-300 font-mono mt-1 block">
              Reduces server egress costs
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

