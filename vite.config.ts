import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { createReadStream } from 'fs';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import os from 'os';
import { spawn } from 'child_process';
import { getRenderDimensions } from './src/core/project/video';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function videoRenderApi(): Plugin {
  let rendering = false;
  let activeChild: any = null;
  let currentRenderStatus = {
    rendering: false,
    stage: 'idle',
    frame: 0,
    totalFrames: 0,
    percent: 0,
    message: '',
    error: null as string | null,
  };

  const middleware = async (req: any, res: any, next: () => void) => {
    // 1. Status Polling Endpoint
    if (req.url === '/api/render/status' && req.method === 'GET') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify(currentRenderStatus));
    }

    // 2. Cancellation Endpoint
    if (req.url === '/api/render/cancel' && req.method === 'POST') {
      if (activeChild) {
        try {
          activeChild.kill('SIGTERM');
        } catch {}
        activeChild = null;
      }
      rendering = false;
      currentRenderStatus = {
        rendering: false,
        stage: 'idle',
        frame: 0,
        totalFrames: 0,
        percent: 0,
        message: 'Render cancelled.',
        error: null,
      };
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ ok: true }));
    }

    // 3. Render Execution Endpoint
    if (req.url !== '/api/render' || req.method !== 'POST') return next();
    if (rendering) {
      res.statusCode = 409;
      return res.end('Another render is already running.');
    }

    let tempDir = '';
    try {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 10_000_000) throw new Error('Project is too large.');
      }

      const { project, preset, resolution, fps } = JSON.parse(body);
      if (!project?.video || !project?.route || !['h264', 'prores', 'overlay'].includes(preset)) {
        throw new Error('Invalid render request.');
      }
      if (![24, 25, 30, 60].includes(fps) || !['720p', '1080p', '4k'].includes(resolution)) {
        throw new Error('Unsupported resolution or frame rate.');
      }

      const { width, height } = getRenderDimensions(project.video.width, project.video.height, resolution, project.video.aspectRatio);
      const extension = preset === 'h264' ? 'mp4' : 'mov';

      tempDir = await mkdtemp(path.join(os.tmpdir(), 'mapanim-render-'));
      const projectFile = path.join(tempDir, 'project.json');
      const outputFile = path.join(tempDir, `render.${extension}`);
      await writeFile(projectFile, JSON.stringify(project));

      rendering = true;
      const expectedTotalFrames = Math.round(project.video.duration * fps);
      currentRenderStatus = {
        rendering: true,
        stage: 'starting',
        frame: 0,
        totalFrames: expectedTotalFrames,
        percent: 2,
        message: `Starting ${resolution.toUpperCase()} render (${expectedTotalFrames} frames)...`,
        error: null,
      };

      const cli = path.join(__dirname, 'node_modules', 'tsx', 'dist', 'cli.mjs');
      const child = spawn(process.execPath, [
        cli,
        path.join(__dirname, 'scripts', 'render-video.ts'),
        '--project', projectFile,
        '--output', outputFile,
        '--width', String(width),
        '--height', String(height),
        '--fps', String(fps),
        '--preset', preset,
      ], { cwd: __dirname });

      activeChild = child;

      let log = '';
      let stdoutBuffer = '';
      child.stdout.on('data', chunk => {
        const text = chunk.toString();
        log = (log + text).slice(-8000);
        stdoutBuffer += text;
        const lines = stdoutBuffer.split('\n');
        stdoutBuffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('{"type":"progress"') || trimmed.startsWith('{"type": "progress"')) {
            try {
              const data = JSON.parse(trimmed);
              currentRenderStatus = {
                rendering: true,
                stage: data.stage || 'capturing',
                frame: data.frame ?? currentRenderStatus.frame,
                totalFrames: data.totalFrames || expectedTotalFrames,
                percent: data.percent ?? currentRenderStatus.percent,
                message: data.message || `Frame ${data.frame}/${data.totalFrames}`,
                error: null,
              };
            } catch {}
          }
        }
      });
      child.stderr.on('data', chunk => { log = (log + chunk).slice(-8000); });

      const code = await new Promise<number | null>((resolve, reject) => {
        child.on('close', resolve);
        child.on('error', reject);
      });
      activeChild = null;
      rendering = false;
      if (code !== 0) throw new Error(log || `Renderer exited with code ${code}`);

      currentRenderStatus = {
        rendering: false,
        stage: 'done',
        frame: currentRenderStatus.totalFrames,
        totalFrames: currentRenderStatus.totalFrames,
        percent: 100,
        message: 'Render complete!',
        error: null,
      };

      res.statusCode = 200;
      res.setHeader('Content-Type', preset === 'h264' ? 'video/mp4' : 'video/quicktime');
      res.setHeader('Content-Disposition', `attachment; filename="route-motion.${extension}"`);
      const stream = createReadStream(outputFile);
      stream.pipe(res);
      stream.on('close', () => rm(tempDir, { recursive: true, force: true }));
      tempDir = '';
    } catch (error) {
      activeChild = null;
      rendering = false;
      const errorMessage = error instanceof Error ? error.message : 'Render failed.';
      currentRenderStatus = {
        rendering: false,
        stage: 'error',
        frame: currentRenderStatus.frame,
        totalFrames: currentRenderStatus.totalFrames,
        percent: 0,
        message: 'Render failed',
        error: errorMessage,
      };
      res.statusCode = 400;
      res.end(errorMessage);
    } finally {
      activeChild = null;
      if (tempDir) await rm(tempDir, { recursive: true, force: true });
    }
  };

  return {
    name: 'video-render-api',
    configureServer(server) { server.middlewares.use(middleware); },
    configurePreviewServer(server) { server.middlewares.use(middleware); },
  };
}

export default defineConfig({
  plugins: [react(), videoRenderApi()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api/ollama': {
        target: 'http://127.0.0.1:11434',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ollama/, ''),
      },
    },
  },
  optimizeDeps: {
    include: ['maplibre-gl', '@turf/turf', 'lucide-react', 'clsx', 'tailwind-merge', 'zustand', 'idb-keyval'],
  },
});
