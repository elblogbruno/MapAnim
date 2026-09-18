import { createServer } from 'vite';
import { spawn } from 'child_process';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { createRoute66Project } from '../src/core/project/route66Demo';

const ffprobe = (file: string) => new Promise<any>((resolve, reject) => {
  const child = spawn('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name,pix_fmt,width,height,r_frame_rate', '-of', 'json', file]);
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.on('error', reject);
  child.on('close', code => code === 0 ? resolve(JSON.parse(output).streams[0]) : reject(new Error(`ffprobe exited with ${code}`)));
});

const server = await createServer({ server: { port: 5197 } });
const tempDir = await mkdtemp(path.join(os.tmpdir(), 'mapanim-export-test-'));

try {
  await server.listen();
  const project = createRoute66Project();
  project.video.duration = 0.2;

  for (const preset of ['h264', 'prores', 'overlay'] as const) {
    const response = await fetch('http://localhost:5197/api/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project, preset, resolution: '720p', fps: 24 }),
    });
    if (!response.ok) throw new Error(`${preset}: ${await response.text()}`);

    const file = path.join(tempDir, `${preset}.${preset === 'h264' ? 'mp4' : 'mov'}`);
    await writeFile(file, Buffer.from(await response.arrayBuffer()));
    const stream = await ffprobe(file);
    if (stream.width !== 1280 || stream.height !== 720 || stream.r_frame_rate !== '24/1') throw new Error(`${preset}: wrong dimensions or FPS`);
    if (preset === 'h264' ? stream.codec_name !== 'h264' : stream.codec_name !== 'prores') throw new Error(`${preset}: wrong codec`);
    if (preset === 'overlay' && !stream.pix_fmt.startsWith('yuva')) throw new Error('overlay: alpha channel missing');
    console.log(`✓ ${preset}: ${stream.codec_name} ${stream.pix_fmt} ${stream.width}x${stream.height}@24`);
  }
} finally {
  await server.close();
  await rm(tempDir, { recursive: true, force: true });
}
