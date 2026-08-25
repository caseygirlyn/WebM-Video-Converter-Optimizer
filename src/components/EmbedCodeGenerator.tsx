import React, { useState, useMemo } from 'react';
import { Code, Copy, Check, Terminal, ExternalLink } from 'lucide-react';
import { ConversionJob } from '../types';
import { generateHtmlSnippet } from '../utils/formatters';

interface EmbedCodeGeneratorProps {
  job: ConversionJob;
}

export const EmbedCodeGenerator: React.FC<EmbedCodeGeneratorProps> = ({ job }) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [autoplay, setAutoplay] = useState<boolean>(true);
  const [loop, setLoop] = useState<boolean>(true);
  const [muted, setMuted] = useState<boolean>(true);
  const [playsInline, setPlaysInline] = useState<boolean>(true);
  const [preload, setPreload] = useState<'metadata' | 'auto' | 'none'>('metadata');
  const [responsive, setResponsive] = useState<boolean>(true);
  const [codeFormat, setCodeFormat] = useState<'html' | 'react' | 'tailwind'>('html');

  const videoUrl = `/api/preview/${job.id}`;
  const posterUrl = `/api/poster/${job.id}`;

  const generatedCode = useMemo(() => {
    if (codeFormat === 'react') {
      return `<div className="${responsive ? 'relative w-full aspect-video rounded-xl overflow-hidden' : ''}">
  <video
    ${autoplay ? 'autoPlay\n    ' : ''}${loop ? 'loop\n    ' : ''}${muted ? 'muted\n    ' : ''}${playsInline ? 'playsInline\n    ' : ''}preload="${preload}"
    poster="${posterUrl}"
    className="${responsive ? 'w-full h-full object-cover' : 'w-full h-auto'}"
  >
    <source src="${videoUrl}" type="video/webm; codecs=vp9" />
    <p>Your browser does not support HTML5 WebM video.</p>
  </video>
</div>`;
    }

    if (codeFormat === 'tailwind') {
      return `<div class="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-900">
  <video
    ${autoplay ? 'autoplay ' : ''}${loop ? 'loop ' : ''}${muted ? 'muted ' : ''}${playsInline ? 'playsinline ' : ''}preload="${preload}"
    poster="${posterUrl}"
    class="w-full h-full object-cover"
  >
    <source src="${videoUrl}" type="video/webm; codecs=vp9">
  </video>
</div>`;
    }

    return generateHtmlSnippet(videoUrl, posterUrl, {
      autoplay,
      loop,
      muted,
      playsInline,
      preload,
      responsive,
    });
  }, [codeFormat, autoplay, loop, muted, playsInline, preload, responsive, videoUrl, posterUrl]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-5xl mx-auto bg-[#111114] rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Code className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              Embeddable HTML5 Video Snippet
            </h3>
            <p className="text-xs text-slate-400">
              Ready-to-use markup with poster image, preload metadata & smooth looping
            </p>
          </div>
        </div>

        {/* Format Selector */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-2xl border border-slate-800 text-xs font-mono">
          {(['html', 'react', 'tailwind'] as const).map((fmt) => (
            <button
              key={fmt}
              id={`format-btn-${fmt}`}
              onClick={() => setCodeFormat(fmt)}
              className={`px-3 py-1 rounded-xl uppercase transition-all ${
                codeFormat === fmt
                  ? 'bg-indigo-500 text-white font-medium shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {fmt}
            </button>
          ))}
        </div>
      </div>

      {/* Attribute Toggles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
        <label className="flex items-center gap-2 bg-slate-900/60 p-3 rounded-2xl border border-slate-800 cursor-pointer hover:bg-slate-900 transition-colors">
          <input
            id="toggle-autoplay"
            type="checkbox"
            checked={autoplay}
            onChange={(e) => setAutoplay(e.target.checked)}
            className="accent-indigo-500 rounded"
          />
          <span className="font-mono font-medium text-slate-300">Autoplay</span>
        </label>

        <label className="flex items-center gap-2 bg-slate-900/60 p-3 rounded-2xl border border-slate-800 cursor-pointer hover:bg-slate-900 transition-colors">
          <input
            id="toggle-loop"
            type="checkbox"
            checked={loop}
            onChange={(e) => setLoop(e.target.checked)}
            className="accent-indigo-500 rounded"
          />
          <span className="font-mono font-medium text-slate-300">Loop</span>
        </label>

        <label className="flex items-center gap-2 bg-slate-900/60 p-3 rounded-2xl border border-slate-800 cursor-pointer hover:bg-slate-900 transition-colors">
          <input
            id="toggle-muted"
            type="checkbox"
            checked={muted}
            onChange={(e) => setMuted(e.target.checked)}
            className="accent-indigo-500 rounded"
          />
          <span className="font-mono font-medium text-slate-300">Muted</span>
        </label>

        <label className="flex items-center gap-2 bg-slate-900/60 p-3 rounded-2xl border border-slate-800 cursor-pointer hover:bg-slate-900 transition-colors">
          <input
            id="toggle-playsinline"
            type="checkbox"
            checked={playsInline}
            onChange={(e) => setPlaysInline(e.target.checked)}
            className="accent-indigo-500 rounded"
          />
          <span className="font-mono font-medium text-slate-300">PlaysInline</span>
        </label>

        <label className="flex items-center gap-2 bg-slate-900/60 p-3 rounded-2xl border border-slate-800 cursor-pointer hover:bg-slate-900 transition-colors">
          <input
            id="toggle-responsive"
            type="checkbox"
            checked={responsive}
            onChange={(e) => setResponsive(e.target.checked)}
            className="accent-indigo-500 rounded"
          />
          <span className="font-mono font-medium text-slate-300">Aspect Box</span>
        </label>

        <div className="flex items-center gap-2 bg-slate-900/60 p-2.5 rounded-2xl border border-slate-800">
          <span className="text-[11px] text-slate-500 pl-1 font-mono font-medium">Preload:</span>
          <select
            id="select-preload"
            value={preload}
            onChange={(e) => setPreload(e.target.value as any)}
            className="bg-slate-900 text-slate-200 text-[11px] font-mono rounded-xl px-2 py-1 border border-slate-800 focus:outline-hidden"
          >
            <option value="metadata">Metadata</option>
            <option value="auto">Auto</option>
            <option value="none">None</option>
          </select>
        </div>
      </div>

      {/* Code Block Container */}
      <div className="relative bg-black rounded-2xl p-5 sm:p-6 text-slate-100 font-mono text-xs overflow-x-auto border border-slate-800 shadow-inner">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-slate-400">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-mono text-slate-400">Web-Optimized Code</span>
          </div>

          <button
            id="copy-snippet-btn"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full text-xs font-medium transition-all shadow-md shadow-indigo-500/20"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Snippet</span>
              </>
            )}
          </button>
        </div>

        <pre className="text-indigo-300 leading-relaxed overflow-x-auto whitespace-pre font-mono">
          {generatedCode}
        </pre>
      </div>
    </div>
  );
};
