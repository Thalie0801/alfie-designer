#!/usr/bin/env node

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENV_FILES = [
  path.join(__dirname, '.env.supabase'),
  path.join(__dirname, '.env'),
];
for (const envFile of ENV_FILES) {
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile });
  }
}

const DATA_EXPORT_DIR = path.join(__dirname, 'data_export');
const LOG_DIR = path.join(__dirname, 'migration_logs');
const ARTIFACTS_DIR = path.join(__dirname, 'migration_artifacts');
const SCHEMA_BACKUP_PATH = path.join(__dirname, 'schema_backup.sql');
const SUPABASE_SCHEMA_PATH = path.join(__dirname, 'scripts', 'migration', 'supabase_schema.sql');
const SCHEMA_METADATA_PATH = path.join(ARTIFACTS_DIR, 'schema_metadata.json');
const REPORT_PATH = path.join(__dirname, 'migration_report.md');

const LOVABLE_TABLES = [
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

const args = process.argv.slice(2);
const stepArg = args.find((arg) => arg.startsWith('--step='));
const requestedStep = stepArg ? stepArg.split('=')[1] : 'all';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const LOG_PATH = path.join(LOG_DIR, `migration-${timestamp}.log`);

await ensureDirectories();
await appendLog(`🚀 Alfie Designer migration started (${requestedStep}).`);

class MigrationContext {
  constructor() {
    this.lovablePool = null;
    this.supabasePool = null;
    this.supabaseServiceClient = null;
    this.metadata = null;
  }

  async log(message) {
    await appendLog(message);
  }

  async getLovablePool() {
    if (this.lovablePool) {
      return this.lovablePool;
    }

    const connectionString = process.env.LOVABLE_DATABASE_URL;
    if (!connectionString) {
      throw new Error('Missing LOVABLE_DATABASE_URL in environment.');
    }

    this.lovablePool = new Pool({ connectionString });
    this.lovablePool.on('error', (err) => {
      console.error('Lovable connection error', err);
    });
    return this.lovablePool;
  }

  async getSupabasePool() {
    if (this.supabasePool) {
      return this.supabasePool;
    }

    const connectionString = process.env.SUPABASE_DB_URL;
    if (!connectionString) {
      throw new Error('Missing SUPABASE_DB_URL in environment.');
    }

    this.supabasePool = new Pool({ connectionString });
    this.supabasePool.on('error', (err) => {
      console.error('Supabase connection error', err);
    });
    return this.supabasePool;
  }

  getSupabaseServiceClient() {
    if (this.supabaseServiceClient) {
      return this.supabaseServiceClient;
    }

    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !serviceKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment.');
    }

    this.supabaseServiceClient = createClient(url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    return this.supabaseServiceClient;
  }

  async close() {
    if (this.lovablePool) {
      await this.lovablePool.end();
    }
    if (this.supabasePool) {
      await this.supabasePool.end();
    }
  }
}

async function ensureDirectories() {
  await fsp.mkdir(DATA_EXPORT_DIR, { recursive: true });
  await fsp.mkdir(LOG_DIR, { recursive: true });
  await fsp.mkdir(ARTIFACTS_DIR, { recursive: true });
  await fsp.mkdir(path.dirname(SUPABASE_SCHEMA_PATH), { recursive: true });
}

async function appendLog(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  await fsp.appendFile(LOG_PATH, `${line}\n`, { encoding: 'utf8' });
}

function quoteIdentifier(identifier) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function parseConstraintDefinition(definition) {
  const fkMatch = definition.match(/REFERENCES\s+(?:"?([\w]+)"?\.)?"?([\w]+)"?/i);
  return fkMatch ? fkMatch[2] : null;
}

function parsePrimaryKeyColumns(definition) {
  const match = definition.match(/\(([^)]+)\)/);
  if (!match) {
    return [];
  }
  return match[1]
    .split(',')
    .map((col) => col.trim().replace(/"/g, ''));
}

function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;
  let inDollarTag = null;
  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];
    const nextTwo = sql.slice(i, i + 2);

    if (!inSingle && !inDouble && char === '-' && nextTwo === '--') {
      const newlineIndex = sql.indexOf('\n', i);
      if (newlineIndex === -1) {
        break;
      }
      current += sql.slice(i, newlineIndex + 1);
      i = newlineIndex;
      continue;
    }

    if (!inSingle && !inDouble && char === '/' && sql[i + 1] === '*') {
      const endIndex = sql.indexOf('*/', i + 2);
      if (endIndex === -1) {
        break;
      }
      current += sql.slice(i, endIndex + 2);
      i = endIndex + 1;
      continue;
    }

    if (!inDouble && char === "'" && !inDollarTag) {
      inSingle = !inSingle;
      current += char;
      continue;
    }

    if (!inSingle && char === '"' && !inDollarTag) {
      inDouble = !inDouble;
      current += char;
      continue;
    }

    if (!inSingle && !inDouble && char === '$') {
      const tagMatch = sql.slice(i).match(/^\$([\w]*)\$/);
      if (tagMatch) {
        const tag = tagMatch[1];
        if (inDollarTag === null) {
          inDollarTag = tag;
        } else if (inDollarTag === tag) {
          inDollarTag = null;
        }
      }
      current += char;
      continue;
    }

    if (char === ';' && !inSingle && !inDouble && !inDollarTag) {
      if (current.trim()) {
        statements.push(current.trim());
      }
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) {
    statements.push(current.trim());
  }
  return statements;
}

async function fetchSchemaMetadata(pool, ctx) {
  await ctx.log('Fetching tables metadata from Lovable...');
  const tablesQuery = `
    SELECT c.oid, c.relname AS table_name, obj_description(c.oid) AS comment,
           c.relrowsecurity, c.relforcerowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname;
  `;
  const { rows: tables } = await pool.query(tablesQuery);

  const metadata = {
    tables: [],
    sequences: [],
    functions: [],
  };

  for (const table of tables) {
    const columnsQuery = `
      SELECT a.attname AS column_name,
             pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
             NOT a.attnotnull AS is_nullable,
             pg_catalog.pg_get_expr(ad.adbin, ad.adrelid) AS column_default,
             col_description(a.attrelid, a.attnum) AS comment
      FROM pg_attribute a
      JOIN pg_class c ON a.attrelid = c.oid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
      WHERE n.nspname = 'public' AND c.oid = $1 AND a.attnum > 0 AND NOT a.attisdropped
      ORDER BY a.attnum;
    `;
    const { rows: columns } = await pool.query(columnsQuery, [table.oid]);

    const constraintsQuery = `
      SELECT con.conname, con.contype, pg_get_constraintdef(con.oid, true) AS definition
      FROM pg_constraint con
      WHERE con.conrelid = $1
      ORDER BY con.contype DESC, con.conname;
    `;
    const { rows: constraints } = await pool.query(constraintsQuery, [table.oid]);

    const indexesQuery = `
      SELECT ci.relname AS index_name, pg_get_indexdef(i.indexrelid) AS definition
      FROM pg_index i
      JOIN pg_class ci ON ci.oid = i.indexrelid
      WHERE i.indrelid = $1 AND NOT i.indisprimary
      ORDER BY ci.relname;
    `;
    const { rows: indexes } = await pool.query(indexesQuery, [table.oid]);

    const triggersQuery = `
      SELECT t.tgname AS trigger_name, pg_get_triggerdef(t.oid, true) AS definition
      FROM pg_trigger t
      WHERE t.tgrelid = $1 AND NOT t.tgisinternal
      ORDER BY t.tgname;
    `;
    const { rows: triggers } = await pool.query(triggersQuery, [table.oid]);

    const policiesQuery = `
      SELECT pol.polname,
             pol.polpermissive,
             pol.polcmd,
             pg_catalog.pg_get_expr(pol.polqual, pol.polrelid) AS using_clause,
             pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check,
             (
               SELECT array_agg(rol.rolname)
               FROM pg_roles rol
               WHERE rol.oid = ANY (pol.polroles)
             ) AS roles
      FROM pg_policy pol
      WHERE pol.polrelid = $1
      ORDER BY pol.polname;
    `;
    const { rows: policies } = await pool.query(policiesQuery, [table.oid]);

    metadata.tables.push({
      name: table.table_name,
      comment: table.comment,
      relrowsecurity: table.relrowsecurity,
      relforcerowsecurity: table.relforcerowsecurity,
      columns,
      constraints,
      indexes,
      triggers,
      policies,
    });
  }

  const sequencesQuery = `
    SELECT seq.relname AS sequence_name,
           pg_get_sequencedef(seq.oid) AS definition,
           tab.relname AS owning_table,
           col.attname AS owning_column
    FROM pg_class seq
    JOIN pg_namespace n ON n.oid = seq.relnamespace
    LEFT JOIN pg_depend dep ON dep.objid = seq.oid AND dep.deptype = 'a'
    LEFT JOIN pg_class tab ON tab.oid = dep.refobjid
    LEFT JOIN pg_attribute col ON col.attrelid = dep.refobjid AND col.attnum = dep.refobjsubid
    WHERE n.nspname = 'public' AND seq.relkind = 'S'
    ORDER BY seq.relname;
  `;
  const { rows: sequences } = await pool.query(sequencesQuery);
  metadata.sequences = sequences;

  const functionsQuery = `
    SELECT p.proname, pg_get_functiondef(p.oid) AS definition
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind IN ('f', 'p')
    ORDER BY p.proname;
  `;
  const { rows: functions } = await pool.query(functionsQuery);
  metadata.functions = functions;

  return metadata;
}

function buildSchemaSql(metadata) {
  const lines = [];
  lines.push('-- Schema generated by migrate_to_supabase.js');
  lines.push(`-- Generated at ${new Date().toISOString()}`);
  lines.push('SET search_path TO public;');
  lines.push('');

  if (metadata.sequences.length) {
    lines.push('-- Sequences');
    for (const sequence of metadata.sequences) {
      if (sequence.definition) {
        const seqDef = sequence.definition.trim().replace(/;$/, '');
        lines.push(`${seqDef};`);
        if (sequence.owning_table && sequence.owning_column) {
          const seqName = sequence.sequence_name;
          const tableName = sequence.owning_table;
          const columnName = sequence.owning_column;
          lines.push(
            `ALTER SEQUENCE ${quoteIdentifier(seqName)} OWNED BY ${quoteIdentifier(tableName)}.${quoteIdentifier(columnName)};`
          );
        }
        lines.push('');
      }
    }
  }

  for (const table of metadata.tables) {
    lines.push(`-- Table: ${table.name}`);
    const columnLines = table.columns.map((column) => {
      const parts = [
        `${quoteIdentifier(column.column_name)} ${column.data_type}`,
      ];
      if (column.column_default) {
        parts.push(`DEFAULT ${column.column_default}`);
      }
      if (!column.is_nullable) {
        parts.push('NOT NULL');
      }
      return `  ${parts.join(' ')}`;
    });
    const tableSql = `CREATE TABLE IF NOT EXISTS ${quoteIdentifier(table.name)} (\n${columnLines.join(',\n')}\n);`;
    lines.push(tableSql);
    if (table.comment) {
      lines.push(
        `COMMENT ON TABLE ${quoteIdentifier(table.name)} IS ${escapeSqlString(table.comment)};`
      );
    }
    for (const column of table.columns) {
      if (column.comment) {
        lines.push(
          `COMMENT ON COLUMN ${quoteIdentifier(table.name)}.${quoteIdentifier(column.column_name)} IS ${escapeSqlString(column.comment)};`
        );
      }
    }

    for (const constraint of table.constraints) {
      lines.push(`ALTER TABLE ${quoteIdentifier(table.name)} DROP CONSTRAINT IF EXISTS ${quoteIdentifier(constraint.conname)};`);
      const constraintSql = `ALTER TABLE ${quoteIdentifier(table.name)} ADD CONSTRAINT ${quoteIdentifier(constraint.conname)} ${constraint.definition};`;
      lines.push(constraintSql);
    }

    for (const index of table.indexes) {
      const indexSql = addIfNotExistsToIndex(index.definition);
      lines.push(indexSql);
    }

    if (table.relrowsecurity) {
      lines.push(`ALTER TABLE ${quoteIdentifier(table.name)} ENABLE ROW LEVEL SECURITY;`);
    }
    if (table.relforcerowsecurity) {
      lines.push(`ALTER TABLE ${quoteIdentifier(table.name)} FORCE ROW LEVEL SECURITY;`);
    }

    for (const policy of table.policies) {
      const policySql = buildPolicySql(table.name, policy);
      lines.push(policySql);
    }

    for (const trigger of table.triggers) {
      const triggerSql = trigger.definition.trim().replace(/^CREATE TRIGGER/i, 'CREATE TRIGGER');
      lines.push(`DROP TRIGGER IF EXISTS ${quoteIdentifier(trigger.trigger_name)} ON ${quoteIdentifier(table.name)};`);
      lines.push(triggerSql.endsWith(';') ? triggerSql : `${triggerSql};`);
    }

    lines.push('');
  }

  if (metadata.functions.length) {
    lines.push('-- Functions');
    for (const fn of metadata.functions) {
      const fnSql = fn.definition.replace(/^CREATE\s+FUNCTION/i, 'CREATE OR REPLACE FUNCTION');
      lines.push(fnSql.trim().endsWith(';') ? fnSql.trim() : `${fnSql.trim()};`);
      lines.push('');
    }
  }

  return `${lines.join('\n')}\n`;
}

function escapeSqlString(value) {
  if (value == null) {
    return 'NULL';
  }
  return `'${value.replace(/'/g, "''")}'`;
}

function addIfNotExistsToIndex(definition) {
  let trimmed = definition.trim().replace(/;$/, '');
  if (!/^CREATE\s+/i.test(trimmed)) {
    return trimmed;
  }
  if (/IF NOT EXISTS/i.test(trimmed)) {
    return `${trimmed};`;
  }
  if (/^CREATE\s+UNIQUE\s+INDEX/i.test(trimmed)) {
    trimmed = trimmed.replace(/^CREATE\s+UNIQUE\s+INDEX/i, 'CREATE UNIQUE INDEX IF NOT EXISTS');
  } else {
    trimmed = trimmed.replace(/^CREATE\s+INDEX/i, 'CREATE INDEX IF NOT EXISTS');
  }
  return `${trimmed};`;
}

function buildPolicySql(tableName, policy) {
  const commandMap = {
    r: 'SELECT',
    a: 'INSERT',
    w: 'UPDATE',
    d: 'DELETE',
    '*': 'ALL',
  };
  const command = commandMap[policy.polcmd] || 'ALL';
  const roles = policy.roles && policy.roles.length ? policy.roles.map((role) => quoteIdentifier(role)).join(', ') : 'PUBLIC';
  const usingClause = policy.using_clause ? ` USING (${policy.using_clause})` : '';
  const withCheck = policy.with_check ? ` WITH CHECK (${policy.with_check})` : '';
  const permissive = policy.polpermissive ? 'PERMISSIVE' : 'RESTRICTIVE';
  return `CREATE POLICY ${quoteIdentifier(policy.polname)} ON ${quoteIdentifier(tableName)} AS ${permissive} FOR ${command} TO ${roles}${usingClause}${withCheck};`;
}

async function exportData(metadata, ctx) {
  await ctx.log('Exporting data to JSON files...');
  const pool = await ctx.getLovablePool();
  for (const tableName of LOVABLE_TABLES) {
    const filePath = path.join(DATA_EXPORT_DIR, `${tableName}.json`);
    const exists = metadata.tables.some((table) => table.name === tableName);
    if (!exists) {
      await ctx.log(`Skipping missing table ${tableName}`);
      continue;
    }
    const query = `SELECT * FROM ${quoteIdentifier(tableName)} ORDER BY 1;`;
    const { rows } = await pool.query(query);
    await fsp.writeFile(filePath, JSON.stringify(rows, null, 2));
  }
}

function buildDependencyGraph(metadata) {
  const graph = new Map();
  for (const table of metadata.tables) {
    graph.set(table.name, new Set());
  }
  for (const table of metadata.tables) {
    for (const constraint of table.constraints) {
      if (constraint.contype === 'f') {
        const referencedTable = parseConstraintDefinition(constraint.definition);
        if (referencedTable && graph.has(table.name) && graph.has(referencedTable) && referencedTable !== table.name) {
          graph.get(table.name).add(referencedTable);
        }
      }
    }
  }
  return graph;
}

function resolveTableOrder(metadata) {
  const graph = buildDependencyGraph(metadata);
  const inDegree = new Map();
  for (const [table, dependencies] of graph.entries()) {
    if (!inDegree.has(table)) {
      inDegree.set(table, 0);
    }
    for (const dep of dependencies) {
      inDegree.set(dep, (inDegree.get(dep) ?? 0) + 1);
    }
  }

  const queue = [];
  for (const [table, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push(table);
    }
  }
  const order = [];
  while (queue.length) {
    const current = queue.shift();
    order.push(current);
    for (const [table, dependencies] of graph.entries()) {
      if (dependencies.has(current)) {
        const degree = inDegree.get(table) - 1;
        inDegree.set(table, degree);
        if (degree === 0) {
          queue.push(table);
        }
      }
    }
  }

  const missing = [...graph.keys()].filter((table) => !order.includes(table));
  return [...order, ...missing];
}

async function importData(metadata, ctx) {
  await ctx.log('Importing JSON data into Supabase...');
  const pool = await ctx.getSupabasePool();
  const order = resolveTableOrder(metadata);
  const tableMetaByName = new Map(metadata.tables.map((table) => [table.name, table]));

  await pool.query('BEGIN;');
  await pool.query('SET session_replication_role = replica;');
  try {
    for (const tableName of order) {
      if (!LOVABLE_TABLES.includes(tableName)) {
        continue;
      }
      const filePath = path.join(DATA_EXPORT_DIR, `${tableName}.json`);
      if (!fs.existsSync(filePath)) {
        await ctx.log(`No export found for ${tableName}, skipping.`);
        continue;
      }
      const raw = await fsp.readFile(filePath, 'utf8');
      if (!raw.trim()) {
        continue;
      }
      const records = JSON.parse(raw);
      if (!Array.isArray(records) || records.length === 0) {
        continue;
      }
      const columns = Array.from(
        records.reduce((set, record) => {
          Object.keys(record).forEach((key) => set.add(key));
          return set;
        }, new Set())
      );
      const values = [];
      const valueClauses = records.map((record, rowIndex) => {
        const placeholders = columns.map((column, columnIndex) => {
          values.push(record[column]);
          return `$${rowIndex * columns.length + columnIndex + 1}`;
        });
        return `(${placeholders.join(', ')})`;
      });
      const columnList = columns.map((column) => quoteIdentifier(column)).join(', ');

      const tableMeta = tableMetaByName.get(tableName);
      const primaryConstraint = tableMeta.constraints.find((constraint) => constraint.contype === 'p');
      const primaryColumns = primaryConstraint ? parsePrimaryKeyColumns(primaryConstraint.definition) : [];
      const conflictClause = primaryColumns.length
        ? ` ON CONFLICT (${primaryColumns.map((column) => quoteIdentifier(column)).join(', ')}) DO NOTHING`
        : '';

      const insertSql = `INSERT INTO ${quoteIdentifier(tableName)} (${columnList}) VALUES ${valueClauses.join(', ')}${conflictClause};`;
      await pool.query(insertSql, values);
      await ctx.log(`Inserted ${records.length} rows into ${tableName}.`);
    }
    await pool.query('SET session_replication_role = DEFAULT;');
    await pool.query('COMMIT;');
  } catch (error) {
    await pool.query('SET session_replication_role = DEFAULT;');
    await pool.query('ROLLBACK;');
    throw error;
  }

  await resetSequences(metadata, pool, ctx);
}

async function resetSequences(metadata, pool, ctx) {
  for (const sequence of metadata.sequences) {
    if (!sequence.owning_table || !sequence.owning_column) {
      continue;
    }
    const seqName = sequence.sequence_name;
    const tableName = sequence.owning_table;
    const columnName = sequence.owning_column;
    const query = `
      SELECT setval(
        $1,
        COALESCE((SELECT MAX(${quoteIdentifier(columnName)}) FROM ${quoteIdentifier(tableName)}), 0),
        true
      );
    `;
    const qualifiedSequence = seqName.includes('.') ? seqName : `public.${seqName}`;
    await pool.query(query, [qualifiedSequence]);
    await ctx.log(`Sequence ${seqName} synchronized.`);
  }
}

async function runSchemaStep(ctx) {
  const lovablePool = await ctx.getLovablePool();
  const metadata = await fetchSchemaMetadata(lovablePool, ctx);
  ctx.metadata = metadata;
  const schemaSql = buildSchemaSql(metadata);
  await fsp.writeFile(SCHEMA_BACKUP_PATH, schemaSql, 'utf8');
  await fsp.writeFile(SUPABASE_SCHEMA_PATH, schemaSql, 'utf8');
  await fsp.writeFile(SCHEMA_METADATA_PATH, JSON.stringify(metadata, null, 2));
  await ctx.log('Schema backup files generated. Applying schema to Supabase...');
  const supabasePool = await ctx.getSupabasePool();
  const statements = splitSqlStatements(schemaSql);
  for (const statement of statements) {
    await supabasePool.query(statement);
  }
  await ctx.log('Supabase schema synchronized.');
}

async function runDataStep(ctx) {
  let metadata = ctx.metadata;
  if (!metadata && fs.existsSync(SCHEMA_METADATA_PATH)) {
    metadata = JSON.parse(await fsp.readFile(SCHEMA_METADATA_PATH, 'utf8'));
    ctx.metadata = metadata;
  }
  if (!metadata) {
    throw new Error('Schema metadata not found. Run --step=schema first.');
  }
  await exportData(metadata, ctx);
  await importData(metadata, ctx);
}

async function configureSupabaseAuth(ctx) {
  await ctx.log('Configuring Supabase Auth settings...');
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  const url = process.env.SUPABASE_URL;
  if (!serviceKey || !url) {
    throw new Error('SUPABASE_SERVICE_KEY and SUPABASE_URL are required for auth configuration.');
  }
  const authSettingsPath = process.env.LOVABLE_AUTH_SETTINGS_FILE || path.join(__dirname, 'config', 'lovable-auth-providers.json');
  if (!fs.existsSync(authSettingsPath)) {
    throw new Error(`Auth provider configuration missing at ${authSettingsPath}.`);
  }
  const raw = await fsp.readFile(authSettingsPath, 'utf8');
  const providerConfig = JSON.parse(raw);
  const payload = buildSupabaseAuthPayload(providerConfig);

  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  };

  const response = await fetch(`${url}/auth/v1/settings`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update Supabase auth settings: ${errorText}`);
  }
  await ctx.log('Supabase Auth providers updated.');
}

function buildSupabaseAuthPayload(config) {
  return {
    site_url: config.siteUrl,
    additional_redirect_urls: config.redirectUrls ?? [],
    email: {
      enable_signup: config.email?.enabled ?? true,
      double_confirm_changes: config.email?.doubleConfirm ?? false,
      otp_expiry: config.email?.otpExpiry ?? 900,
      otp_length: config.email?.otpLength ?? 6,
    },
    sms: {
      enabled: config.sms?.enabled ?? false,
      provider: config.sms?.provider ?? 'twilio',
      twilio_account_sid: config.sms?.twilioAccountSid ?? '',
      twilio_auth_token: config.sms?.twilioAuthToken ?? '',
      twilio_messaging_service_sid: config.sms?.twilioMessagingServiceSid ?? '',
      twilio_from: config.sms?.twilioFrom ?? '',
    },
    external: Object.fromEntries(
      Object.entries(config.external ?? {}).map(([provider, settings]) => [
        provider,
        {
          enabled: settings.enabled ?? false,
          client_id: settings.clientId ?? '',
          secret: settings.secret ?? '',
        },
      ])
    ),
  };
}

async function migrateUsers(ctx) {
  await ctx.log('Migrating Lovable users to Supabase Auth...');
  const lovablePool = await ctx.getLovablePool();
  const serviceClient = ctx.getSupabaseServiceClient();

  const { rows: lovableUsers } = await lovablePool.query(`
    SELECT id, email, phone, raw_user_meta_data, raw_app_meta_data, created_at, last_sign_in_at
    FROM auth.users
    ORDER BY created_at;
  `);

  const existingUsers = await listAllSupabaseUsers(serviceClient);
  const existingEmails = new Set(existingUsers.map((user) => user.email).filter(Boolean));
  let created = 0;
  for (const user of lovableUsers) {
    if (!user.email) {
      continue;
    }
    if (existingEmails.has(user.email)) {
      continue;
    }
    const payload = {
      email: user.email,
      email_confirm: true,
      phone: user.phone ?? undefined,
      phone_confirm: Boolean(user.phone),
      user_metadata: safeJsonParse(user.raw_user_meta_data) ?? {},
      app_metadata: safeJsonParse(user.raw_app_meta_data) ?? {},
    };
    const { data, error } = await serviceClient.auth.admin.createUser(payload);
    if (error) {
      await ctx.log(`Failed to create user ${user.email}: ${error.message}`);
      continue;
    }
    existingEmails.add(user.email);
    created += 1;
    await ctx.log(`Created Supabase user ${data.user.email}.`);
  }
  await ctx.log(`User migration completed. ${created} users created.`);
}

async function listAllSupabaseUsers(serviceClient) {
  const users = [];
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data, error } = await serviceClient.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw error;
    }
    if (!data?.users?.length) {
      break;
    }
    users.push(...data.users);
    if (data.users.length < perPage) {
      break;
    }
    page += 1;
  }
  return users;
}

function safeJsonParse(value) {
  if (!value) {
    return null;
  }
  if (typeof value === 'object') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

async function runConfigStep(ctx) {
  await configureSupabaseAuth(ctx);
  await migrateUsers(ctx);
  await ctx.log('Configuration step completed.');
}

async function validateMigration(ctx) {
  await ctx.log('Validating migration results...');
  const lovablePool = await ctx.getLovablePool();
  const supabasePool = await ctx.getSupabasePool();
  const metadata = ctx.metadata || (fs.existsSync(SCHEMA_METADATA_PATH)
    ? JSON.parse(await fsp.readFile(SCHEMA_METADATA_PATH, 'utf8'))
    : await fetchSchemaMetadata(lovablePool, ctx));
  ctx.metadata = metadata;

  const rows = [];
  for (const tableName of LOVABLE_TABLES) {
    let sourceCount = 0;
    let targetCount = 0;
    let match = false;
    try {
      const sourceResult = await lovablePool.query(`SELECT COUNT(*)::bigint AS count FROM ${quoteIdentifier(tableName)};`);
      sourceCount = Number(sourceResult.rows[0]?.count ?? 0);
    } catch (error) {
      await ctx.log(`Warning: unable to count rows in Lovable table ${tableName}: ${error.message}`);
    }
    try {
      const targetResult = await supabasePool.query(`SELECT COUNT(*)::bigint AS count FROM ${quoteIdentifier(tableName)};`);
      targetCount = Number(targetResult.rows[0]?.count ?? 0);
    } catch (error) {
      await ctx.log(`Warning: unable to count rows in Supabase table ${tableName}: ${error.message}`);
    }
    match = sourceCount === targetCount;
    rows.push({ table: tableName, source: sourceCount, target: targetCount, match });
  }

  const reportLines = ['# Supabase Migration Report', '', `Généré le ${new Date().toISOString()}.`, '', '| Table | Lovable | Supabase | Statut |', '| --- | ---: | ---: | --- |'];
  for (const row of rows) {
    reportLines.push(`| ${row.table} | ${row.source} | ${row.target} | ${row.match ? '✅' : '⚠️'} |`);
  }
  await fsp.writeFile(REPORT_PATH, `${reportLines.join('\n')}\n`);
  await ctx.log('Migration report generated.');
}

async function runValidateStep(ctx) {
  await validateMigration(ctx);
}

async function runAll(ctx) {
  await runSchemaStep(ctx);
  await runDataStep(ctx);
  await runConfigStep(ctx);
  await runValidateStep(ctx);
}

async function main() {
  const ctx = new MigrationContext();
  try {
    switch (requestedStep) {
      case 'schema':
        await runSchemaStep(ctx);
        break;
      case 'data':
        await runDataStep(ctx);
        break;
      case 'config':
        await runConfigStep(ctx);
        break;
      case 'validate':
        await runValidateStep(ctx);
        break;
      case 'all':
        await runAll(ctx);
        break;
      default:
        throw new Error(`Unknown step: ${requestedStep}`);
    }
    await ctx.log('✅ Migration script completed successfully.');
  } catch (error) {
    console.error(error);
    await ctx.log(`❌ Migration script failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await ctx.close();
  }
}

await main();
