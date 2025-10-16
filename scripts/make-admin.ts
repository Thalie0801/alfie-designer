import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exitCode = 1;
    throw new Error(`Environment variable ${name} is required`);
  }
  return value;
}

function requireArg(index: number, label: string): string {
  const value = process.argv[index];
  if (!value) {
    console.error(`Missing required ${label} argument.`);
    console.error('Usage: node --loader ts-node/esm scripts/make-admin.ts <email> <temp_password>');
    process.exitCode = 1;
    throw new Error(`Argument ${label} is required`);
  }
  return value;
}

async function main(): Promise<void> {
  const supabaseUrl = requireEnv('SUPABASE_URL', SUPABASE_URL);
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY);

  const email = requireArg(2, 'email');
  const password = requireArg(3, 'temporary password');

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: 'admin' },
  });

  if (error) {
    console.error('Failed to create admin user:', error.message);
    process.exitCode = 1;
    return;
  }

  const createdId = data.user?.id;

  if (!createdId) {
    console.error('Supabase did not return a user ID.');
    process.exitCode = 1;
    return;
  }

  console.log(`Admin user created with id: ${createdId}`);
}

main()
  .then(() => {
    if (!process.exitCode) {
      process.exit(0);
    }
  })
  .catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Unexpected error while creating admin user:', message);
    process.exit(1);
  });
