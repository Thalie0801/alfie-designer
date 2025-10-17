#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import process from 'node:process';
import path from 'node:path';
import dotenv from 'dotenv';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

const ENV_PATH = process.env.DOTENV_CONFIG_PATH || '.env.local';
dotenv.config({ path: ENV_PATH });

const requiredEnv = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
  SUPABASE_DB_URL: process.env.SUPABASE_DB_URL,
};

for (const [key, value] of Object.entries(requiredEnv)) {
  if (!value) {
    console.error(`❌ Missing environment variable: ${key}`);
    process.exitCode = 1;
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

const schemaPath = path.resolve('supabase_schema.sql');

async function applySchema(connectionString) {
  const sql = await readFile(schemaPath, 'utf8');
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    console.log('⏳ Applying SQL schema...');
    await client.query(sql);
    console.log('✅ Schema applied successfully');
  } finally {
    await client.end();
  }
}

async function ensureStorage(client) {
  const bucketId = process.env.STORAGE_BUCKET || 'assets';
  const existing = await client.storage.getBucket(bucketId);
  if (existing.error && existing.error.message.includes('not found')) {
    console.log(`ℹ️ Creating storage bucket "${bucketId}"`);
    const { error } = await client.storage.createBucket(bucketId, {
      public: false,
      fileSizeLimit: 52428800,
    });
    if (error) {
      throw new Error(`Failed to create bucket ${bucketId}: ${error.message}`);
    }
  }
}

async function configureAuth(client) {
  const siteUrl = process.env.BASE_URL || 'http://localhost:5173';
  const response = await fetch(`${requiredEnv.SUPABASE_URL}/auth/v1/settings`, {
    method: 'PATCH',
    headers: {
      apikey: requiredEnv.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${requiredEnv.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      SITE_URL: siteUrl,
      ADDITIONAL_REDIRECT_URLS: [siteUrl],
      MAILER_AUTOCONFIRM: true,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Failed to update auth settings: ${detail}`);
  }
}

async function seedReferenceData(client) {
  const tables = [
    { table: 'credit_packs', min: 4 },
    { table: 'templates', min: 4 },
  ];

  for (const entry of tables) {
    const { count, error } = await client
      .from(entry.table)
      .select('id', { count: 'exact', head: true });
    if (error) {
      throw new Error(`Failed to verify table ${entry.table}: ${error.message}`);
    }
    if ((count ?? 0) < entry.min) {
      console.warn(`⚠️ Table ${entry.table} has fewer than expected rows. Consider importing data with import_data.js.`);
    }
  }
}

async function main() {
  await applySchema(requiredEnv.SUPABASE_DB_URL);

  const supabase = createClient(requiredEnv.SUPABASE_URL, requiredEnv.SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });

  await ensureStorage(supabase);
  await configureAuth(supabase);
  await seedReferenceData(supabase);

  console.log('🎉 Supabase setup complete.');
}

main().catch((error) => {
  console.error('Setup failed:', error);
  process.exit(1);
});
