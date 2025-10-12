import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

export type ZipMeta = {
  altTexts?: Record<string, string>;
  captions?: { text: string; start: number; end: number }[];
};

export async function buildStructuredZip(options: {
  outDir?: string;
  brandName: string;
  format: 'image' | 'carousel' | 'reel';
  title: string;
  assetFiles?: string[];
  exportFiles?: string[];
  meta?: ZipMeta;
}) {
  const timestamp = new Date();
  const year = timestamp.getUTCFullYear();
  const month = String(timestamp.getUTCMonth() + 1).padStart(2, '0');
  const safe = (value: string) => value.replace(/[^A-Za-z0-9_-]+/g, '_').slice(0, 60);
  const root = `${year}-${month}/${safe(options.brandName)}/${safe(capitalize(options.format))}_${safe(options.title)}`;
  const outDir = options.outDir ?? '/tmp';
  const staging = path.join(outDir, `refonte_zip_${Date.now()}`);
  const rootDir = path.join(staging, root);
  const zipPath = path.join(outDir, `${safe(options.brandName)}_${safe(options.title)}.zip`);

  mkdirp(path.join(rootDir, 'assets'));
  mkdirp(path.join(rootDir, 'exports'));
  mkdirp(path.join(rootDir, 'metadata'));

  for (const filePath of options.assetFiles ?? []) {
    copyInto(filePath, path.join(rootDir, 'assets', path.basename(filePath)));
  }

  for (const filePath of options.exportFiles ?? []) {
    copyInto(filePath, path.join(rootDir, 'exports', path.basename(filePath)));
  }

  fs.writeFileSync(
    path.join(rootDir, 'metadata', 'alt_texts.json'),
    JSON.stringify(options.meta?.altTexts ?? {}, null, 2)
  );
  fs.writeFileSync(
    path.join(rootDir, 'metadata', 'captions.json'),
    JSON.stringify(options.meta?.captions ?? [], null, 2)
  );

  await runZip(staging, root, zipPath);
  cleanup(staging);

  return { zipPath, key: root };
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function mkdirp(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyInto(source: string, destination: string) {
  fs.copyFileSync(source, destination);
}

function cleanup(target: string) {
  try {
    fs.rmSync(target, { recursive: true, force: true });
  } catch {
    // noop
  }
}

function runZip(cwd: string, root: string, outZip: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn('zip', ['-r', outZip, root], { cwd });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`zip exited with code ${code ?? 'null'}`));
      }
    });
  });
}
