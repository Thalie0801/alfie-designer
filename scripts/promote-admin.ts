import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

const DEFAULT_PACKS = ['studio'] as const;
const usage =
  'Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node --loader ts-node/esm scripts/promote-admin.ts "<EMAIL>" ["pack1","pack2",...]';

const [, , rawEmail, rawPacks] = process.argv;
const email = rawEmail?.trim() ?? '';

if (!email) {
  console.error(usage);
  process.exit(1);
}

let packs: readonly string[] = DEFAULT_PACKS;

if (rawPacks) {
  try {
    const parsed = JSON.parse(rawPacks) as unknown;

    if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== 'string')) {
      throw new Error('PACKS must be a JSON array of strings.');
    }

    packs = Object.freeze(parsed.slice());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to parse PACKS argument:', message);
    process.exit(1);
  }
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
  const existingUser = await findUserByEmail(supabase, email);

  if (!existingUser) {
    console.error('User not found. Please ensure the email address is correct.');
    process.exit(1);
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
    email_confirm: true,
    app_metadata: {
      role: 'admin',
      packs,
    },
  });

  if (updateError) {
    console.error('Failed to promote user to admin:', updateError.message);
    process.exit(1);
  }

  console.log('User promoted to admin with packs', JSON.stringify(packs), 'ID:', existingUser.id);
  process.exit(0);
} catch (unknownError) {
  const errorMessage =
    unknownError instanceof Error ? unknownError.message : JSON.stringify(unknownError);
  console.error('Unexpected error while promoting admin user:', errorMessage);
  process.exit(1);
}

async function findUserByEmail(client: SupabaseClient, emailAddress: string): Promise<User | null> {
  const normalizedEmail = emailAddress.toLowerCase();
  const perPage = 100;
  let page = 1;

  for (;;) {
    const { data, error } = await client.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw error;
    }

    const users = data?.users ?? [];
    const match = users.find((user) => (user.email ?? '').toLowerCase() === normalizedEmail);

    if (match) {
      return match;
    }

    if (users.length < perPage) {
      return null;
    }

    page += 1;
  }
}
