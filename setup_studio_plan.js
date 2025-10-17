#!/usr/bin/env node
import process from 'node:process';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const TARGET_EMAIL = process.argv[2] || 'b2494709@gmail.com';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

async function ensureAuthUser(email) {
  const { data: list, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) {
    throw new Error(`Failed to list users: ${error.message}`);
  }

  const existing = list?.users?.find((user) => user.email?.toLowerCase() === email.toLowerCase());
  if (existing) {
    return existing;
  }

  const { data, error: createError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
  });

  if (createError) {
    throw new Error(`Failed to create auth user: ${createError.message}`);
  }

  return data.user;
}

async function grantStudioPlan(user) {
  const profilePayload = {
    email: user.email,
    plan: 'studio',
    quota_visuals_per_month: 1000,
    quota_brands: -1,
    quota_videos: 100,
    quota_woofs: 1000,
    updated_at: new Date().toISOString(),
  };

  const { error: upsertError } = await supabase
    .from('profiles')
    .upsert({ id: user.id, ...profilePayload }, { onConflict: 'id' });

  if (upsertError) {
    throw new Error(`Failed to upsert profile: ${upsertError.message}`);
  }

  const { error: roleError } = await supabase
    .from('user_roles')
    .upsert({ user_id: user.id, role: 'admin' }, { onConflict: 'user_id,role' });

  if (roleError) {
    throw new Error(`Failed to grant admin role: ${roleError.message}`);
  }

  const { error: ledgerError } = await supabase
    .from('credit_transactions')
    .insert({
      user_id: user.id,
      transaction_type: 'plan-credit',
      amount: 500,
      action: 'studio-plan-grant',
    });

  if (ledgerError) {
    console.warn('⚠️ Unable to insert credit transaction:', ledgerError.message);
  }
}

async function main() {
  console.log(`ℹ️ Ensuring Studio plan for ${TARGET_EMAIL}`);
  const authUser = await ensureAuthUser(TARGET_EMAIL);
  await grantStudioPlan(authUser);
  console.log('✅ Studio plan configured.');
}

main().catch((error) => {
  console.error('Failed to configure Studio plan:', error);
  process.exit(1);
});
