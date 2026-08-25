import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import {
  probeVideo,
  startConversionJob,
  activeJobs,
  jobEmitter,
  ConversionOptions,
} from './server/videoService.js';
import { ensureSampleVideos, SAMPLE_VIDEOS } from './server/samples.js';

const app = express();
const PORT = 3000;

app.use(express.json());

const UPLOADS_DIR = path.join(process.cwd(), 'temp_uploads');
const OUTPUTS_DIR = path.join(process.cwd(), 'temp_outputs');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(OUTPUTS_DIR)) fs.mkdirSync(OUTPUTS_DIR, { recursive: true });

// Setup multer for streaming disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${uniqueSuffix}_${sanitized}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 500, // 500 MB max upload
  },
});

// Periodic cleanup of temporary files older than 2 hours
setInterval(() => {
  const now = Date.now();
  const maxAge = 2 * 60 * 60 * 1000;

  [UPLOADS_DIR, OUTPUTS_DIR].forEach((dir) => {
    try {
      if (!fs.existsSync(dir)) return;
      const files = fs.readdirSync(dir);
      files.forEach((file) => {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > maxAge) {
          fs.unlinkSync(filePath);
        }
      });
    } catch (e) {
      console.warn('Cleanup error:', e);
    }
  });
}, 30 * 60 * 1000);

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Get built-in sample videos
app.get('/api/samples', (req, res) => {
  res.json(SAMPLE_VIDEOS.map(s => ({
    id: s.id,
    name: s.name,
    description: s.description,
    duration: s.duration,
    width: s.width,
    height: s.height,
    fps: s.fps,
    originalSizeMB: s.originalSizeMB,
  })));
});

// Use a sample video as input
app.post('/api/samples/:id/use', async (req, res) => {
  const sample = SAMPLE_VIDEOS.find(s => s.id === req.params.id);
  if (!sample) {
    return res.status(404).json({ error: 'Sample video not found' });
  }

  try {
    if (!fs.existsSync(sample.filePath)) {
      await ensureSampleVideos();
    }

    const uniqueId = `sample_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const tempCopyPath = path.join(UPLOADS_DIR, `${uniqueId}_${sample.filename}`);
    fs.copyFileSync(sample.filePath, tempCopyPath);

    const metadata = await probeVideo(tempCopyPath, sample.filename);
    res.json({
      fileId: uniqueId,
      filePath: tempCopyPath,
      filename: sample.filename,
      metadata,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to prepare sample' });
  }
});

// Upload and probe video
app.post('/api/upload', upload.single('video'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No video file provided' });
  }

  try {
    const metadata = await probeVideo(req.file.path, req.file.originalname);
    res.json({
      fileId: path.basename(req.file.path),
      filePath: req.file.path,
      filename: req.file.originalname,
      metadata,
    });
  } catch (err: any) {
    // Delete invalid upload
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(400).json({ error: `Could not parse video: ${err.message}` });
  }
});

// Start conversion
app.post('/api/convert', async (req, res) => {
  const { fileId, filePath, options, filename } = req.body;

  let inputPath = filePath;
  if (!inputPath && fileId) {
    inputPath = path.join(UPLOADS_DIR, fileId);
  }

  if (!inputPath || !fs.existsSync(inputPath)) {
    return res.status(400).json({ error: 'Source video file not found or expired' });
  }

  const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const conversionOptions: ConversionOptions = options || { preset: 'auto-web' };

  const job = startConversionJob(jobId, inputPath, conversionOptions, filename || path.basename(inputPath));

  res.json({
    jobId: job.id,
    status: job.status,
    progress: job.progress,
  });
});

// Real-time Server-Sent Events (SSE) for job progress
app.get('/api/jobs/:id/events', (req, res) => {
  const jobId = req.params.id;
  const job = activeJobs.get(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send immediate current state
  res.write(`data: ${JSON.stringify(job)}\n\n`);

  const onUpdate = (updatedJob: any) => {
    res.write(`data: ${JSON.stringify(updatedJob)}\n\n`);
    if (updatedJob.status === 'completed' || updatedJob.status === 'error') {
      res.end();
    }
  };

  jobEmitter.on(`update:${jobId}`, onUpdate);

  req.on('close', () => {
    jobEmitter.removeListener(`update:${jobId}`, onUpdate);
  });
});

// Get job state (polling fallback)
app.get('/api/jobs/:id', (req, res) => {
  const job = activeJobs.get(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json(job);
});

// Stream video for preview (handles HTTP Range for smooth seeking)
function streamMediaFile(filePath: string, contentType: string, req: express.Request, res: express.Response) {
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Media not found');
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType,
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
}

// Preview converted WebM
app.get('/api/preview/:id', (req, res) => {
  const job = activeJobs.get(req.params.id);
  if (!job || !fs.existsSync(job.outputFilePath)) {
    return res.status(404).send('Converted video not found or in progress');
  }
  streamMediaFile(job.outputFilePath, 'video/webm', req, res);
});

// Preview poster thumbnail
app.get('/api/poster/:id', (req, res) => {
  const job = activeJobs.get(req.params.id);
  if (!job || !job.posterFilePath || !fs.existsSync(job.posterFilePath)) {
    return res.status(404).send('Poster not found');
  }
  res.setHeader('Content-Type', 'image/webp');
  fs.createReadStream(job.posterFilePath).pipe(res);
});

// Preview original video
app.get('/api/original-preview/:id', (req, res) => {
  const job = activeJobs.get(req.params.id);
  if (!job || !fs.existsSync(job.originalFilePath)) {
    return res.status(404).send('Original video not found');
  }
  const ext = path.extname(job.originalFilename).toLowerCase();
  let mime = 'video/mp4';
  if (ext === '.webm') mime = 'video/webm';
  if (ext === '.mov') mime = 'video/quicktime';
  if (ext === '.mkv') mime = 'video/x-matroska';
  if (ext === '.avi') mime = 'video/x-msvideo';

  streamMediaFile(job.originalFilePath, mime, req, res);
});

// Download converted WebM
app.get('/api/download/:id', (req, res) => {
  const job = activeJobs.get(req.params.id);
  if (!job || !fs.existsSync(job.outputFilePath)) {
    return res.status(404).send('Converted file not found');
  }

  const baseName = path.parse(job.originalFilename).name;
  const downloadName = `${baseName}_web_optimized.webm`;
  res.download(job.outputFilePath, downloadName);
});

async function startServer() {
  // Ensure sample videos exist in background
  ensureSampleVideos().catch(console.warn);

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`WebM Video Converter & Optimizer server running on http://localhost:${PORT}`);
  });
}

startServer();
