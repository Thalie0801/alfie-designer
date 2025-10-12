import fs from 'node:fs';
import path from 'node:path';
import archiver from 'archiver';

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
  const zipPath = path.join(outDir, `${safe(options.brandName)}_${safe(options.title)}.zip`);

  await new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', () => resolve());
    archive.on('error', reject);
    archive.pipe(output);

    for (const filePath of options.assetFiles ?? []) {
      archive.file(filePath, { name: `${root}/assets/${path.basename(filePath)}` });
    }

    for (const filePath of options.exportFiles ?? []) {
      archive.file(filePath, { name: `${root}/exports/${path.basename(filePath)}` });
    }

    const metadataDir = `${root}/metadata`;
    const altTexts = JSON.stringify(options.meta?.altTexts ?? {}, null, 2);
    const captions = JSON.stringify(options.meta?.captions ?? [], null, 2);
    archive.append(altTexts, { name: `${metadataDir}/alt_texts.json` });
    archive.append(captions, { name: `${metadataDir}/captions.json` });

    archive.finalize();
  });

  return { zipPath, key: root };
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
