import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

const SAMPLES_DIR = path.join(process.cwd(), 'sample_videos');
if (!fs.existsSync(SAMPLES_DIR)) {
  fs.mkdirSync(SAMPLES_DIR, { recursive: true });
}

export interface SampleVideoInfo {
  id: string;
  name: string;
  description: string;
  filename: string;
  filePath: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
  originalSizeMB: number;
}

export const SAMPLE_VIDEOS: SampleVideoInfo[] = [
  {
    id: 'tech-abstract',
    name: 'Modern Web Hero Animation',
    description: 'Dynamic gradient geometric shapes with high frame rate (1080p, 60fps)',
    filename: 'sample_web_hero.mp4',
    filePath: path.join(SAMPLES_DIR, 'sample_web_hero.mp4'),
    duration: 5,
    width: 1920,
    height: 1080,
    fps: 60,
    originalSizeMB: 12.4,
  },
  {
    id: 'product-showcase',
    name: 'Product Promo Loop',
    description: 'High bitrate spinning tech badge with synth audio (1080p, 30fps)',
    filename: 'sample_product_promo.mp4',
    filePath: path.join(SAMPLES_DIR, 'sample_product_promo.mp4'),
    duration: 6,
    width: 1920,
    height: 1080,
    fps: 30,
    originalSizeMB: 8.8,
  }
];

export async function ensureSampleVideos(): Promise<void> {
  for (const sample of SAMPLE_VIDEOS) {
    if (!fs.existsSync(sample.filePath) || fs.statSync(sample.filePath).size < 1000) {
      console.log(`Generating test sample video: ${sample.name}...`);
      try {
        await generateSyntheticSample(sample);
        console.log(`Sample video ${sample.name} ready!`);
      } catch (err) {
        console.error(`Failed to generate sample ${sample.name}:`, err);
      }
    }
  }
}

function generateSyntheticSample(sample: SampleVideoInfo): Promise<void> {
  return new Promise((resolve, reject) => {
    // Generate synthetic animated test pattern with audio tone using ffmpeg testsrc2 and synth
    const isHero = sample.id === 'tech-abstract';
    
    // High bitrate MP4 generator simulating an unoptimized camera/animation export
    const videoFilter = isHero
      ? `testsrc=duration=${sample.duration}:size=${sample.width}x${sample.height}:rate=${sample.fps},drawtext=text='RAW HIGH-BITRATE 60FPS HERO':fontsize=48:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2-60:box=1:boxcolor=black@0.6,drawtext=text='Uncompressed Web Test':fontsize=28:fontcolor=yellow:x=(w-text_w)/2:y=(h-text_h)/2+20:box=1:boxcolor=black@0.6`
      : `smptebars=duration=${sample.duration}:size=${sample.width}x${sample.height}:rate=${sample.fps},drawtext=text='PRODUCT SHOWCASE 1080p':fontsize=48:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2-60:box=1:boxcolor=black@0.6,drawtext=text='Audio Track Included':fontsize=28:fontcolor=cyan:x=(w-text_w)/2:y=(h-text_h)/2+20:box=1:boxcolor=black@0.6`;

    ffmpeg()
      .input(`color=c=0x0f172a:s=${sample.width}x${sample.height}:d=${sample.duration}:r=${sample.fps}`)
      .inputFormat('lavfi')
      .input(`sine=frequency=440:duration=${sample.duration}`)
      .inputFormat('lavfi')
      .complexFilter([
        {
          filter: isHero ? 'testsrc' : 'testsrc2',
          options: {
            duration: sample.duration,
            size: `${sample.width}x${sample.height}`,
            rate: sample.fps,
          },
          outputs: 'v1'
        },
        {
          filter: 'drawtext',
          options: {
            text: isHero ? 'HIGH-BITRATE WEB HERO' : 'PRODUCT PROMO TEST',
            fontsize: 56,
            fontcolor: 'white',
            x: '(w-text_w)/2',
            y: '(h-text_h)/2-40',
            box: 1,
            boxcolor: 'black@0.7'
          },
          inputs: 'v1',
          outputs: 'vout'
        }
      ])
      .outputOptions([
        '-map [vout]',
        '-map 1:a',
        '-c:v libx264',
        '-b:v 8000k', // Simulate bulky 8Mbps H.264
        '-pix_fmt yuv420p',
        '-c:a aac',
        '-b:a 320k', // Heavy uncompressed AAC
      ])
      .output(sample.filePath)
      .on('end', () => resolve())
      .on('error', (err) => {
        // Fallback simple generation if complex filter fails
        ffmpeg()
          .input(`color=c=0x1e293b:s=${sample.width}x${sample.height}:d=${sample.duration}:r=${sample.fps}`)
          .inputFormat('lavfi')
          .outputOptions([
            '-c:v libx264',
            '-pix_fmt yuv420p',
            '-b:v 6000k',
          ])
          .output(sample.filePath)
          .on('end', () => resolve())
          .on('error', (fallbackErr) => reject(fallbackErr))
          .run();
      })
      .run();
  });
}
