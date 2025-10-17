#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.join(__dirname, '.env.local'), override: true });
loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_KEY must be configured.');
  process.exit(1);
}

const dataArg = process.argv.find((arg) => arg.startsWith('--data-file='));
if (!dataArg) {
  console.error('Usage: node import_data.js --data-file=./data_export.json');
  process.exit(1);
}

const dataFile = path.resolve(__dirname, dataArg.split('=')[1]);

const TABLE_ORDER = [
  'profiles',
  'user_roles',
  'brands',
  'templates',
  'posts',
  'jobs',
  'credit_packs',
  'credit_transactions',
  'affiliates',
  'affiliate_clicks',
  'affiliate_conversions',
  'affiliate_commissions',
  'affiliate_payouts',
  'alfie_conversations',
  'alfie_messages',
  'alfie_cache',
  'canva_designs',
  'contact_requests',
  'counters_monthly',
  'deliverable',
  'usage_event',
  'media_generations',
  'video_segments',
  'generation_logs',
  'news',
  'payment_sessions',
];

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function importData() {
  const payload = JSON.parse(await readFile(dataFile, 'utf8'));
  if (Array.isArray(payload)) {
    throw new Error('Data file must be an object where keys are table names.');
  }

  for (const table of TABLE_ORDER) {
    const rows = payload[table];
    if (!rows || rows.length === 0) {
      continue;
    }

    console.log(`Importing ${rows.length} rows into ${table}...`);
    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await supabase.from(table).insert(chunk, { returning: 'minimal' });
      if (error) {
        throw new Error(`Failed to import ${table} chunk starting at index ${i}: ${error.message}`);
      }
    }
  }

  console.log('✅ Data import complete.');
}

importData().catch((error) => {
  console.error('❌ Import failed:', error);
  process.exit(1);
});
