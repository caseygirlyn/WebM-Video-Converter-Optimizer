import React from 'react';
import { RefreshCw, Zap } from 'lucide-react';

interface HeaderProps {
  onReset?: () => void;
  hasActiveFile?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onReset, hasActiveFile }) => {
  return (
    <header className="w-full border-b border-slate-800/80 bg-[#09090B]/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-black text-sm shadow-md shadow-indigo-500/20">
            V
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-slate-100 font-mono">
                VELOCITY<span className="text-indigo-400">.WEBM</span>
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                VP9 v2.4
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden md:block">
              High-performance WebM video transcoding & LCP optimizer
            </p>
          </div>
        </div>

        {/* Right Status & Actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden lg:flex items-center gap-4 text-xs font-medium uppercase tracking-widest text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-slate-400">GPU Acceleration On</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              <span className="text-slate-400">Multi-threaded</span>
            </span>
          </div>

          {hasActiveFile && onReset && (
            <button
              id="header-new-video-btn"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-900 border border-slate-700/80 rounded-xl hover:bg-slate-800 hover:border-slate-600 transition-all shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
              <span>New Video</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

