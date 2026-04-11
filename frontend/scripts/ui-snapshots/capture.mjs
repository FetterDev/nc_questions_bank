import { spawn } from 'node:child_process';
import process from 'node:process';
import { resetLatestSnapshotsDir } from './shared.mjs';

const rootDir = process.cwd();
const port = Number(process.env.UI_SNAP_PORT ?? 4173);

function runPlaywrightUpdate() {
  return new Promise((resolve, reject) => {
    const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const child = spawn(
      command,
      ['playwright', 'test', '--update-snapshots'],
      {
        cwd: rootDir,
        stdio: 'inherit',
        env: {
          ...process.env,
          UI_SNAP_PORT: String(port),
          UI_SNAP_TARGET: 'latest',
        },
      },
    );

    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`playwright test --update-snapshots exited with code ${code ?? 'null'}`));
    });
  });
}

async function run() {
  await resetLatestSnapshotsDir(rootDir);
  await runPlaywrightUpdate();
  process.stdout.write(`Saved screenshots to ${rootDir}/Docs/Snapshots/latest\n`);
}

run().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
