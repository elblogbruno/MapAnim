import { chromium } from 'playwright';
import { createServer } from 'vite';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

async function main() {
  console.log('🚀 Starting Route Motion Studio Headless Render Pipeline...\n');

  // Check FFmpeg
  const hasFfmpeg = await checkFfmpeg();
  if (!hasFfmpeg) {
    console.error('❌ FFmpeg is not found in PATH. Please install FFmpeg to encode video exports.');
    process.exit(1);
  }

  // Paths
  const tempFramesDir = path.join(ROOT_DIR, 'temp_render_frames');
  const outputDir = path.join(ROOT_DIR, 'exports');

  if (fs.existsSync(tempFramesDir)) {
    fs.rmSync(tempFramesDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempFramesDir, { recursive: true });
  fs.mkdirSync(outputDir, { recursive: true });

  const outputFile = path.join(outputDir, 'route66-demo.mp4');

  // 1. Start local Vite server
  console.log('📦 Starting local render server...');
  const server = await createServer({
    root: ROOT_DIR,
    server: { port: 5199 },
  });
  await server.listen();
  const address = server.httpServer?.address();
  const port = typeof address === 'object' && address ? address.port : 5199;
  const renderUrl = `http://localhost:${port}/render`;

  console.log(`🌐 Server running at ${renderUrl}`);

  // 2. Launch Playwright
  console.log('🎬 Launching Headless Chromium Browser...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-webgl', '--use-gl=angle', '--no-sandbox', '--disable-setuid-sandbox'],
  });

  const width = 1920;
  const height = 1080;
  const fps = 30;
  const duration = 12.0;
  const totalFrames = Math.round(duration * fps);

  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();
  console.log(`🧭 Navigating to render viewport (${width}x${height} @ ${fps}fps)...`);
  await page.goto(renderUrl, { waitUntil: 'domcontentloaded' });

  // Wait for map canvas to be ready
  await page.waitForSelector('#render-canvas-root', { timeout: 15000 });
  await page.waitForTimeout(1500); // Initial tile settling

  console.log(`📸 Deterministically capturing ${totalFrames} frames...`);
  const startTime = Date.now();

  for (let frame = 0; frame < totalFrames; frame++) {
    const t = frame / fps;

    // Set exact animation time
    await page.evaluate((time) => (window as any).routeRenderer?.seek(time), t);

    // Wait for map render synchronization
    await page.evaluate(async () => {
      if ((window as any).routeRenderer && (window as any).routeRenderer.waitUntilReady) {
        await (window as any).routeRenderer.waitUntilReady(500);
      }
    });

    const frameFileName = `frame_${frame.toString().padStart(6, '0')}.png`;
    const framePath = path.join(tempFramesDir, frameFileName);

    await page.screenshot({
      path: framePath,
      type: 'png',
    });

    if (frame % 30 === 0 || frame === totalFrames - 1) {
      const pct = ((frame / totalFrames) * 100).toFixed(1);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[render] Frame ${frame}/${totalFrames} (${pct}%) - Elapsed: ${elapsed}s (t = ${t.toFixed(2)}s)`);
    }
  }

  await browser.close();
  await server.close();

  // 3. Encode with FFmpeg
  console.log('\n🎞️  Encoding frames into pristine MP4 with FFmpeg (H.264 High Profile, yuv420p)...');
  await encodeVideo(tempFramesDir, outputFile, fps);

  // Clean temporary frames
  console.log('🧹 Cleaning temporary render files...');
  fs.rmSync(tempFramesDir, { recursive: true, force: true });

  console.log('\n======================================================');
  console.log('✅ VIDEO EXPORT COMPLETED SUCCESSFULLY!');
  console.log(`📁 File: ${outputFile}`);
  console.log('======================================================\n');
}

function checkFfmpeg(): Promise<boolean> {
  return new Promise(resolve => {
    const p = spawn('ffmpeg', ['-version']);
    p.on('error', () => resolve(false));
    p.on('close', code => resolve(code === 0));
  });
}

function encodeVideo(framesDir: string, outputFile: string, fps: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const inputPattern = path.join(framesDir, 'frame_%06d.png');
    const args = [
      '-y',
      '-framerate',
      fps.toString(),
      '-i',
      inputPattern,
      '-c:v',
      'libx264',
      '-profile:v',
      'high',
      '-pix_fmt',
      'yuv420p',
      '-crf',
      '18',
      '-preset',
      'fast',
      '-movflags',
      '+faststart',
      outputFile,
    ];

    const ffmpegProc = spawn('ffmpeg', args);

    ffmpegProc.stderr.on('data', data => {
      const msg = data.toString();
      if (msg.includes('frame=')) {
        process.stdout.write(`\r[ffmpeg] ${msg.trim().split('\n')[0]}`);
      }
    });

    ffmpegProc.on('close', code => {
      console.log('');
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited with code ${code}`));
    });

    ffmpegProc.on('error', err => reject(err));
  });
}

main().catch(err => {
  console.error('Fatal render error:', err);
  process.exit(1);
});
