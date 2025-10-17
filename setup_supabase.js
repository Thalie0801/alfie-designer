#!/usr/bin/env node
import { readFile, access } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load both .env.local and default .env if available
loadEnv({ path: path.join(__dirname, '.env.local'), override: true });
loadEnv();

const REQUIRED_ENV = ['SUPABASE_SERVICE_KEY'];

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL;

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Both SUPABASE_URL and SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY must be set.');
  process.exit(1);
}

if (!SUPABASE_DB_URL) {
  console.error('SUPABASE_DB_URL is required to apply the SQL schema.');
  console.error('Format: postgresql://postgres:<db-password>@<project-ref>.supabase.co:5432/postgres');
  process.exit(1);
}

const stepArg = process.argv.find((arg) => arg.startsWith('--step='));
const requestedStep = stepArg ? stepArg.split('=')[1] : null;

const pgPool = new pg.Pool({ connectionString: SUPABASE_DB_URL });
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function applySchema() {
  const schemaPath = path.join(__dirname, 'supabase_schema.sql');
  const sql = await readFile(schemaPath, 'utf8');
  console.log(`Applying schema from ${schemaPath}...`);
  const client = await pgPool.connect();
  try {
    await client.query(sql);
    console.log('✅ Schema applied successfully.');
  } finally {
    client.release();
  }
}

async function configureAuth() {
  const configPath = path.join(__dirname, 'config', 'lovable-auth-providers.json');
  try {
    await access(configPath, fsConstants.F_OK);
  } catch {
    console.log('ℹ️  No auth provider config found, skipping auth configuration.');
    return;
  }

  const providerSettings = JSON.parse(await readFile(configPath, 'utf8'));
  const settingsUrl = new URL('/auth/v1/settings', SUPABASE_URL).toString();

  console.log('Updating Supabase Auth provider settings...');
  const response = await fetch(settingsUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify(providerSettings),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to update auth settings (${response.status}): ${body}`);
  }

  console.log('✅ Auth providers configured.');
}

async function seedDefaultTemplates() {
  const { data: templates, error } = await supabaseClient.from('templates').select('id').limit(1);
  if (error) {
    throw new Error(`Failed to query templates: ${error.message}`);
  }

  if (templates && templates.length > 0) {
    console.log('Templates already exist, skipping default seed.');
    return;
  }

  console.log('Seeding default templates...');
  const defaultsPath = path.join(__dirname, 'supabase', 'seed', 'templates.json');
  try {
    const payload = JSON.parse(await readFile(defaultsPath, 'utf8'));
    const { error: insertError } = await supabaseAdmin.from('templates').insert(payload);
    if (insertError) {
      throw insertError;
    }
    console.log('✅ Default templates inserted.');
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log('ℹ️  No default templates seed file found, skipping.');
    } else {
      throw err;
    }
  }
}

async function verifyTables() {
  const tablesToCheck = [
    'affiliate_clicks',
    'affiliate_commissions',
    'affiliate_conversions',
    'affiliate_payouts',
    'affiliates',
    'alfie_cache',
    'alfie_conversations',
    'alfie_messages',
    'brands',
    'canva_designs',
    'contact_requests',
    'counters_monthly',
    'credit_packs',
    'credit_transactions',
    'deliverable',
    'generation_logs',
    'jobs',
    'media_generations',
    'news',
    'payment_sessions',
    'posts',
    'profiles',
    'templates',
    'usage_event',
    'user_roles',
    'video_segments',
  ];

  console.log('Validating table existence and row counts...');
  const results = [];
  for (const table of tablesToCheck) {
    const { count, error } = await supabaseAdmin
      .from(table)
      .select('id', { count: 'exact', head: true });

    if (error && error.code !== 'PGRST102') {
      throw new Error(`Failed to inspect ${table}: ${error.message}`);
    }

    results.push({ table, rows: error ? 'missing' : count ?? 0 });
  }

  console.table(results);
}

async function main() {
  try {
    if (!requestedStep || requestedStep === 'schema') {
      await applySchema();
    }

    if (!requestedStep || requestedStep === 'auth') {
      await configureAuth();
    }

    if (!requestedStep || requestedStep === 'seed') {
      await seedDefaultTemplates();
    }

    if (!requestedStep || requestedStep === 'validate') {
      await verifyTables();
    }

    console.log('🎉 Supabase configuration complete.');
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exitCode = 1;
  } finally {
    await pgPool.end();
  }
}

await main();
