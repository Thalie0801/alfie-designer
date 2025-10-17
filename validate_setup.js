#!/usr/bin/env node
import process from 'node:process';
import dotenv from 'dotenv';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SUPABASE_DB_URL) {
  console.error('❌ SUPABASE_URL, SUPABASE_SERVICE_KEY et SUPABASE_DB_URL sont requis.');
  process.exit(1);
}

const args = process.argv.slice(2);
const checkAuth = args.includes('--check-auth');

const REQUIRED_TABLES = [
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

async function verifyTables() {
  const client = new pg.Client({ connectionString: SUPABASE_DB_URL });
  await client.connect();
  try {
    const res = await client.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
    );
    const available = new Set(res.rows.map((row) => row.table_name));
    const missing = REQUIRED_TABLES.filter((table) => !available.has(table));
    if (missing.length > 0) {
      throw new Error(`Missing tables: ${missing.join(', ')}`);
    }
    console.log('✅ All required tables are present.');
  } finally {
    await client.end();
  }
}

async function verifySeeds(serviceClient) {
  const { count: packCount, error: packsError } = await serviceClient
    .from('credit_packs')
    .select('id', { count: 'exact', head: true });
  if (packsError) {
    throw new Error(`Unable to verify credit packs: ${packsError.message}`);
  }
  if ((packCount ?? 0) < 4) {
    console.warn('⚠️ Expected at least 4 credit packs.');
  }

  const { count: templateCount, error: templatesError } = await serviceClient
    .from('templates')
    .select('id', { count: 'exact', head: true });
  if (templatesError) {
    throw new Error(`Unable to verify templates: ${templatesError.message}`);
  }
  if ((templateCount ?? 0) < 4) {
    console.warn('⚠️ Expected at least 4 templates.');
  }
}

async function verifyAuthSettings() {
  if (!SUPABASE_ANON_KEY) {
    console.warn('⚠️ SUPABASE_ANON_KEY non défini, impossible de valider auth côté client.');
    return;
  }

  const settingsResponse = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  });

  if (!settingsResponse.ok) {
    throw new Error(`Cannot fetch auth settings: ${await settingsResponse.text()}`);
  }

  const settings = await settingsResponse.json();
  console.log('ℹ️ Auth SITE_URL:', settings.SITE_URL);

  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });

  const { error } = await anon.from('profiles').select('*').limit(1);
  if (!error) {
    console.warn('⚠️ Profiles query from anon client succeeded, verify RLS.');
  } else {
    console.log('✅ RLS for profiles is active (anon query blocked).');
  }
}

async function main() {
  await verifyTables();

  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });

  await verifySeeds(serviceClient);

  if (checkAuth) {
    await verifyAuthSettings();
  }

  console.log('🎯 Validation terminée.');
}

main().catch((error) => {
  console.error('Validation failed:', error);
  process.exit(1);
});
