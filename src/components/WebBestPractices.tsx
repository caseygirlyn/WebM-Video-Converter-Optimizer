import React from 'react';
import { CheckCircle, ShieldCheck, Zap } from 'lucide-react';

export const WebBestPractices: React.FC = () => {
  return (
    <div className="w-full max-w-5xl mx-auto bg-[#111114] rounded-3xl p-6 sm:p-8 border border-slate-800 space-y-6">
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
          <Zap className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-100">
            Why WebM (VP9) for Modern Web Performance?
          </h3>
          <p className="text-xs text-slate-400">
            Industry standards for Core Web Vitals (CWV) & sub-second page loads
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        {/* Item 1 */}
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-2.5">
          <div className="flex items-center gap-2 font-semibold text-slate-200">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>100% Modern Browser Support</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            WebM VP9 is natively supported in Google Chrome, Mozilla Firefox, Microsoft Edge, and Apple Safari (macOS 11+ & iOS 14.1+).
          </p>
        </div>

        {/* Item 2 */}
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-2.5">
          <div className="flex items-center gap-2 font-semibold text-slate-200">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <span>40% to 80% Smaller Than MP4</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            VP9 utilizes advanced spatial intra-prediction and 64x64 superblocks to achieve pristine visual clarity at a fraction of legacy MP4 bitrates.
          </p>
        </div>

        {/* Item 3 */}
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-2.5">
          <div className="flex items-center gap-2 font-semibold text-slate-200">
            <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>SEO & Largest Contentful Paint</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Google Lighthouse penalizes heavy video hero banners. Optimized WebM with WebP poster prevents layout shifts and delivers green 95+ PageSpeed scores.
          </p>
        </div>
      </div>
    </div>
  );
};

