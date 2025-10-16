import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

async function ensureIndexEntry() {
  const indexPath = resolve(process.cwd(), 'index.html');
  const html = await readFile(indexPath, 'utf8');

  if (!html.includes('src="/src/main.tsx"')) {
    throw new Error('index.html must import /src/main.tsx as the root entry point.');
  }
}

async function ensureVercelConfig() {
  const vercelPath = resolve(process.cwd(), 'vercel.json');
  const configRaw = await readFile(vercelPath, 'utf8');

  if (configRaw.includes('"outputDirectory"')) {
    throw new Error('vercel.json must not define an outputDirectory.');
  }
}

async function main() {
  await Promise.all([ensureIndexEntry(), ensureVercelConfig()]);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
