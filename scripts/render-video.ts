import { chromium } from 'playwright';
import { createServer } from 'vite';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
type RenderPreset = 'h264' | 'prores' | 'overlay';

async function main() {
  const args = process.argv.slice(2);
  let projectPath = '';
  let outputFile = path.join(ROOT_DIR, 'exports', 'render_output.mp4');
  let widthOverride = 0;
  let heightOverride = 0;
  let fpsOverride = 0;
  let preset: RenderPreset = 'h264';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--project' && args[i + 1]) {
      projectPath = path.resolve(process.cwd(), args[i + 1]);
    } else if (args[i] === '--output' && args[i + 1]) {
      outputFile = path.resolve(process.cwd(), args[i + 1]);
    } else if (args[i] === '--width' && args[i + 1]) {
      widthOverride = Number(args[++i]);
    } else if (args[i] === '--height' && args[i + 1]) {
      heightOverride = Number(args[++i]);
    } else if (args[i] === '--fps' && args[i + 1]) {
      fpsOverride = Number(args[++i]);
    } else if (args[i] === '--preset' && ['h264', 'prores', 'overlay'].includes(args[i + 1])) {
      preset = args[++i] as RenderPreset;
    }
  }

  let projectData = null;
  if (projectPath && fs.existsSync(projectPath)) {
    projectData = JSON.parse(fs.readFileSync(projectPath, 'utf8'));
    console.log(`📄 Loaded custom project: ${projectPath}`);
  }

  const tempFramesDir = path.join(ROOT_DIR, `temp_render_frames_${Date.now()}_${process.pid}`);
  if (fs.existsSync(tempFramesDir)) fs.rmSync(tempFramesDir, { recursive: true, force: true });
  fs.mkdirSync(tempFramesDir, { recursive: true });
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });

  const cleanup = () => {
    try {
      if (fs.existsSync(tempFramesDir)) fs.rmSync(tempFramesDir, { recursive: true, force: true });
    } catch {}
  };
  process.on('SIGINT', () => { cleanup(); process.exit(1); });
  process.on('SIGTERM', () => { cleanup(); process.exit(1); });

  console.log('📦 Starting render server...');
  const server = await createServer({
    root: ROOT_DIR,
    server: { port: 5198, strictPort: false },
  });
  await server.listen();
  const address = server.httpServer?.address();
  const port = typeof address === 'object' && address ? address.port : 5198;

  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-webgl', '--use-gl=angle', '--no-sandbox'],
  });

  let width = widthOverride || projectData?.video?.width || 1920;
  let height = heightOverride || projectData?.video?.height || 1080;
  if (!widthOverride && !heightOverride && projectData?.video?.aspectRatio === '9:16' && width > height) {
    const temp = width;
    width = height;
    height = temp;
  }
  const fps = fpsOverride || projectData?.video?.fps || 30;
  const duration = projectData?.video?.duration || 12.0;
  const totalFrames = Math.round(duration * fps);
  if (projectData) {
    projectData.video = { ...projectData.video, width, height, fps };
  }

  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();

  await page.goto(`http://localhost:${port}/render${preset === 'overlay' ? '?transparent=1' : ''}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#render-canvas-root', { timeout: 15000 });

  if (projectData) {
    await page.evaluate((p) => {
      if ((window as any).routeRenderer) {
        (window as any).routeRenderer.loadProject(p);
      }
    }, projectData);
  }

  await page.waitForTimeout(2000);

  const frameExt = preset === 'overlay' ? 'png' : 'jpg';
  const screenshotType = preset === 'overlay' ? 'png' : 'jpeg';
  const screenshotQuality = preset === 'overlay' ? undefined : 95;

  console.log(`📸 Rendering ${totalFrames} frames...`);
  console.log(JSON.stringify({
    type: 'progress',
    stage: 'capturing',
    frame: 0,
    totalFrames,
    percent: 5,
    message: `Synthesizing ${totalFrames} frames...`,
  }));

  const startTime = Date.now();

  for (let frame = 0; frame < totalFrames; frame++) {
    const t = frame / fps;
    await page.evaluate(async (time) => {
      const r = (window as any).routeRenderer;
      if (r?.seek) await r.seek(time);
      if (r?.waitUntilReady) await r.waitUntilReady(300);
    }, t);

    const frameFileName = `frame_${frame.toString().padStart(6, '0')}.${frameExt}`;
    await page.screenshot({
      path: path.join(tempFramesDir, frameFileName),
      type: screenshotType as any,
      quality: screenshotQuality,
      omitBackground: preset === 'overlay',
    });

    const currentFrame = frame + 1;
    const capturePercent = Math.min(92, Math.round(5 + (currentFrame / totalFrames) * 87));
    const elapsedSec = (Date.now() - startTime) / 1000;
    const fpsSpeed = currentFrame / Math.max(0.1, elapsedSec);
    const remainingFrames = totalFrames - currentFrame;
    const remainingSec = Math.round(remainingFrames / Math.max(0.1, fpsSpeed));
    const remainingText = remainingSec > 60
      ? `~${Math.ceil(remainingSec / 60)} min`
      : `~${remainingSec}s`;

    console.log(JSON.stringify({
      type: 'progress',
      stage: 'capturing',
      frame: currentFrame,
      totalFrames,
      percent: capturePercent,
      message: `Frame ${currentFrame}/${totalFrames} (${Math.round((currentFrame / totalFrames) * 100)}%) • ${remainingText}`,
    }));
  }

  await browser.close();
  await server.close();

  // FFmpeg encode
  console.log('🎞️  Encoding video with FFmpeg...');
  console.log(JSON.stringify({
    type: 'progress',
    stage: 'encoding',
    frame: totalFrames,
    totalFrames,
    percent: 94,
    message: `Encoding ${preset === 'h264' ? 'H.264 MP4' : 'ProRes MOV'} with FFmpeg...`,
  }));

  const inputPattern = path.join(tempFramesDir, `frame_%06d.${frameExt}`);
  await new Promise<void>((resolve, reject) => {
    const codecArgs = preset === 'h264'
      ? ['-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'veryfast', '-movflags', '+faststart']
      : ['-c:v', 'prores_ks', '-profile:v', preset === 'overlay' ? '4' : '3', '-pix_fmt', preset === 'overlay' ? 'yuva444p10le' : 'yuv422p10le'];
    const p = spawn('ffmpeg', [
      '-y',
      '-framerate',
      fps.toString(),
      '-i',
      inputPattern,
      ...codecArgs,
      outputFile,
    ]);
    p.on('close', code => (code === 0 ? resolve() : reject(new Error(`FFmpeg exit code ${code}`))));
    p.on('error', reject);
  });

  cleanup();
  console.log(`✅ Saved: ${outputFile}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
