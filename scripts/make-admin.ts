import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

const PACKS = ["studio"] as const;
const usage =
  'Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node --loader ts-node/esm scripts/make-admin.ts "<EMAIL>" "<TEMP_PASSWORD>"';
const PER_PAGE = 100;

const [, , rawEmail, rawPassword] = process.argv;

const email = rawEmail?.trim() ?? '';
const password = rawPassword?.trim() ?? '';

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

const basePayload = {
  email,
  password,
  email_confirm: true,
  app_metadata: {
    role: 'admin' as const,
    packs: PACKS,
  },
};

try {
  const { data, error } = await supabase.auth.admin.createUser(basePayload);

  if (!error) {
    const userId = data.user?.id;

    if (!userId) {
      console.error('Admin user created but no user ID was returned.');
      process.exit(1);
    }

    console.log('Admin user created with ID:', userId);
    process.exit(0);
  }

  if (!isAlreadyRegisteredError(error)) {
    console.error('Failed to create admin user:', error.message);
    process.exit(1);
  }

  const existingUser = await findUserByEmail(supabase, email);

  if (!existingUser) {
    console.error(
      'User already registered but could not be retrieved via the Admin API. Please update manually from Supabase Studio.'
    );
    process.exit(1);
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
    password,
    email_confirm: true,
    app_metadata: basePayload.app_metadata,
  });

  if (updateError) {
    console.error('Failed to update existing admin user:', updateError.message);
    process.exit(1);
  }

  console.log('Admin user updated with ID:', existingUser.id);
  process.exit(0);
} catch (unknownError) {
  const errorMessage =
    unknownError instanceof Error ? unknownError.message : JSON.stringify(unknownError);
  console.error('Unexpected error while creating admin user:', errorMessage);
  process.exit(1);
}

function isAlreadyRegisteredError(error: { message: string }): boolean {
  return error.message.toLowerCase().includes('already registered');
}

async function findUserByEmail(client: SupabaseClient, emailAddress: string): Promise<User | null> {
  const normalizedEmail = emailAddress.toLowerCase();
  let page = 1;

  for (;;) {
    const { data, error } = await client.auth.admin.listUsers({
      page,
      perPage: PER_PAGE,
    });

    if (error) {
      throw error;
    }

    const users = data?.users ?? [];
    const match = users.find((user) => (user.email ?? '').toLowerCase() === normalizedEmail);

    if (match) {
      return match;
    }

    if (users.length < PER_PAGE) {
      return null;
    }

    page += 1;
  }
}
