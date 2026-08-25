export function formatBytes(bytes: number, decimals = 2): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds === null) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}:${remMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
}

export function formatBitrate(bitrateBps: number): string {
  if (!bitrateBps) return 'Auto';
  if (bitrateBps >= 1000000) {
    return `${(bitrateBps / 1000000).toFixed(2)} Mbps`;
  }
  return `${Math.round(bitrateBps / 1000)} kbps`;
}

export function calculateSavings(originalBytes: number, convertedBytes: number): {
  savedBytes: number;
  percentage: number;
  multiplier: string;
} {
  if (!originalBytes || !convertedBytes) {
    return { savedBytes: 0, percentage: 0, multiplier: '1.0x' };
  }
  const saved = Math.max(0, originalBytes - convertedBytes);
  const pct = Math.min(99.9, Math.max(0, ((originalBytes - convertedBytes) / originalBytes) * 100));
  const mult = (originalBytes / convertedBytes).toFixed(1);
  return {
    savedBytes: saved,
    percentage: Math.round(pct * 10) / 10,
    multiplier: `${mult}x`,
  };
}

export function estimateLoadTimeMs(bytes: number, speedMbps: number): number {
  const bits = bytes * 8;
  const speedBps = speedMbps * 1000000;
  return Math.round((bits / speedBps) * 1000);
}

export function generateHtmlSnippet(
  videoUrl: string,
  posterUrl?: string,
  config?: {
    autoplay?: boolean;
    loop?: boolean;
    muted?: boolean;
    playsInline?: boolean;
    preload?: 'metadata' | 'auto' | 'none';
    responsive?: boolean;
  }
): string {
  const {
    autoplay = true,
    loop = true,
    muted = true,
    playsInline = true,
    preload = 'metadata',
    responsive = true,
  } = config || {};

  const attrs: string[] = [];
  if (autoplay) attrs.push('autoplay');
  if (loop) attrs.push('loop');
  if (muted) attrs.push('muted');
  if (playsInline) attrs.push('playsinline');
  attrs.push(`preload="${preload}"`);
  if (posterUrl) attrs.push(`poster="${posterUrl}"`);

  if (responsive) {
    return `<div style="position: relative; width: 100%; aspect-ratio: 16/9; overflow: hidden; border-radius: 12px;">
  <video
    ${attrs.join(' ')}
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;"
  >
    <source src="${videoUrl}" type="video/webm; codecs=vp9">
    <!-- Fallback message for older legacy browsers -->
    <p>Your browser does not support HTML5 WebM video.</p>
  </video>
</div>`;
  }

  return `<video
  ${attrs.join('\n  ')}
  width="100%"
  height="auto"
>
  <source src="${videoUrl}" type="video/webm; codecs=vp9">
  <p>Your browser does not support HTML5 WebM video.</p>
</video>`;
}
