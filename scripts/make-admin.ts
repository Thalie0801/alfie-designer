import { createClient } from '@supabase/supabase-js';

const PACKS = ["studio"] as const;
const usage =
  'Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node --loader ts-node/esm scripts/make-admin.ts "<EMAIL>" "<TEMP_PASSWORD>"';

const [, , email, password] = process.argv;

if (!email || !password) {
  console.error(usage);
  process.exit(1);
}

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_URL) {
  console.error('Missing SUPABASE_URL environment variable.');
  process.exit(1);
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

try {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: {
      role: 'admin',
      packs: PACKS,
    },
  });

  if (error) {
    console.error('Failed to create admin user:', error.message);
    process.exit(1);
  }

  const userId = data.user?.id;

  if (!userId) {
    console.error('Admin user created but no user ID was returned.');
    process.exit(1);
  }

  console.log('Admin user created with ID:', userId);
  process.exit(0);
} catch (unknownError) {
  const errorMessage =
    unknownError instanceof Error ? unknownError.message : JSON.stringify(unknownError);
  console.error('Unexpected error while creating admin user:', errorMessage);
  process.exit(1);
}
