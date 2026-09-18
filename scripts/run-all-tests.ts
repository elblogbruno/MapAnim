import spawn from 'cross-spawn';

const suites = ['test', 'test:vitest', 'test:options', 'test:export', 'test:maps', 'test:route-transition'];
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

for (const suite of suites) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(npm, ['run', suite], { stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${suite} failed with exit code ${code}`)));
  });
}
