import { mkdtempSync, cpSync, mkdirSync, readFileSync, rmSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(__dirname);
const packageDir = join(repoRoot, 'packages', 'mcp-server');
const packageJson = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'));
const version = packageJson.version;
const bundleName = `campus-copilot-mcp-${version}.mcpb`;
const explicitOutput = process.argv[2];
const outputPath = explicitOutput ? resolve(explicitOutput) : join(repoRoot, bundleName);
const tempRoot = mkdtempSync(join(tmpdir(), 'campus-copilot-mcpb-'));
const stagedDistDir = join(tempRoot, 'dist');
const stagedBin = join(stagedDistDir, 'bin.mjs');
const stagedManifest = join(tempRoot, 'manifest.json');
const epochSeconds = 1704067200;
const epochDate = new Date(epochSeconds * 1000);

mkdirSync(stagedDistDir, { recursive: true });
cpSync(join(packageDir, 'dist', 'bin.mjs'), stagedBin);
cpSync(join(packageDir, 'mcpb.manifest.json'), stagedManifest);
utimesSync(stagedBin, epochDate, epochDate);
utimesSync(stagedManifest, epochDate, epochDate);

execFileSync('zip', ['-X', '-q', outputPath, 'dist/bin.mjs', 'manifest.json'], {
  cwd: tempRoot,
  stdio: 'inherit',
});

const hash = crypto.createHash('sha256').update(readFileSync(outputPath)).digest('hex');
console.log(JSON.stringify({ outputPath, sha256: hash }, null, 2));

rmSync(tempRoot, { recursive: true, force: true });
