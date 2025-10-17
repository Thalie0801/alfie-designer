#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import process from 'node:process';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_URL et SUPABASE_SERVICE_KEY sont requis.');
  process.exit(1);
}

const args = new Map();
for (const arg of process.argv.slice(2)) {
  const [key, value] = arg.split('=');
  args.set(key.replace(/^--/, ''), value ?? '');
}

const dataFile = args.get('data-file');
if (!dataFile) {
  console.error('Usage: node import_data.js --data-file=./export.json');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

function chunk(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

async function importTable(table, rows) {
  console.log(`→ Import ${rows.length} rows into ${table}`);
  for (const batch of chunk(rows, 100)) {
    const { error } = await supabase.from(table).upsert(batch, { onConflict: 'id' });
    if (error) {
      throw new Error(`Failed to import ${table}: ${error.message}`);
    }
  }
}

async function main() {
  const payloadRaw = await readFile(dataFile, 'utf8');
  const payload = JSON.parse(payloadRaw);

  for (const [table, rows] of Object.entries(payload)) {
    if (!Array.isArray(rows) || rows.length === 0) {
      continue;
    }

    await importTable(table, rows);
  }

  console.log('✅ Import terminé.');
}

main().catch((error) => {
  console.error('Import failed:', error);
  process.exit(1);
});
