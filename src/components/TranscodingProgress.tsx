import React from 'react';
import { Loader2, Activity, Gauge, Clock, Sparkles, CheckCircle2 } from 'lucide-react';
import { ConversionJob } from '../types';

interface TranscodingProgressProps {
  job: ConversionJob;
}

export const TranscodingProgress: React.FC<TranscodingProgressProps> = ({ job }) => {
  const isAnalyzing = job.status === 'analyzing';

  const stages = [
    { label: 'Probing & Codec Analysis', done: job.progress >= 10, current: job.progress < 10 },
    { label: 'VP9 Multi-threaded Video Pass', done: job.progress >= 70, current: job.progress >= 10 && job.progress < 70 },
    { label: 'Web Performance Optimization', done: job.progress >= 95, current: job.progress >= 70 && job.progress < 95 },
    { label: 'WebM Container Packaging', done: job.progress >= 100, current: job.progress >= 95 },
  ];

  return (
    <div className="w-full max-w-3xl mx-auto bg-[#111114] rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              {isAnalyzing ? 'Analyzing source stream...' : 'Transcoding & Optimizing for Web...'}
            </h3>
            <p className="text-xs text-slate-400">
              Applying VP9 CRF curve with row-based multi-threading & Opus compression
            </p>
          </div>
        </div>

        <span className="text-3xl font-extrabold font-mono text-indigo-400">
          {job.progress}%
        </span>
      </div>

      {/* Animated Progress Bar */}
      <div className="space-y-2">
        <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden p-0.5 border border-slate-800">
          <div
            className="bg-indigo-500 h-full rounded-full transition-all duration-300 ease-out shadow-xs shadow-indigo-500/40"
            style={{ width: `${Math.max(5, job.progress)}%` }}
          />
        </div>
      </div>

      {/* Live Performance Telemetry Bento Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800 text-xs">
        <div>
          <span className="text-slate-500 block text-[10px] font-mono uppercase tracking-wider">Encoder FPS</span>
          <span className="font-mono font-semibold text-slate-200 flex items-center gap-1.5 mt-1">
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            <span>{job.currentFps ? `${job.currentFps} fps` : 'Calculating...'}</span>
          </span>
        </div>

        <div>
          <span className="text-slate-500 block text-[10px] font-mono uppercase tracking-wider">Speed Mult</span>
          <span className="font-mono font-semibold text-slate-200 flex items-center gap-1.5 mt-1">
            <Gauge className="w-3.5 h-3.5 text-indigo-400" />
            <span>{job.currentSpeed || 'Multi-core'}</span>
          </span>
        </div>

        <div>
          <span className="text-slate-500 block text-[10px] font-mono uppercase tracking-wider">Position</span>
          <span className="font-mono font-semibold text-slate-200 flex items-center gap-1.5 mt-1">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>{job.currentTimemark ? job.currentTimemark.split('.')[0] : '00:00:00'}</span>
          </span>
        </div>

        <div>
          <span className="text-slate-500 block text-[10px] font-mono uppercase tracking-wider">Target Profile</span>
          <span className="font-mono font-semibold text-indigo-400 flex items-center gap-1.5 mt-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>VP9 Web Ultra</span>
          </span>
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-3 pt-2 border-t border-slate-800/80">
        {stages.map((st, idx) => (
          <div key={idx} className="flex items-center gap-3 text-xs">
            {st.done ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : st.current ? (
              <div className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin shrink-0" />
            ) : (
              <div className="w-4 h-4 rounded-full bg-slate-800 border border-slate-700 shrink-0" />
            )}
            <span
              className={
                st.done
                  ? 'text-slate-300 font-medium'
                  : st.current
                  ? 'text-indigo-400 font-semibold'
                  : 'text-slate-500'
              }
            >
              {st.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

