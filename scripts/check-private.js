#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const args = new Set(process.argv.slice(2));
const strict = args.has('--strict');
const jsonOutput = args.has('--json');

const projectRoot = process.cwd();
const lockPath = join(projectRoot, 'package-lock.json');
const pkgPath = join(projectRoot, 'package.json');

const suspiciousHostPatterns = [
  /npm\.pkg\.github\.com/i,
  /packages\.github\.com/i,
  /\.azurewebsites\.net/i,
  /pkgs\.dev\.azure\.com/i,
  /artifactory/i,
  /verdaccio/i,
  /nexus/i,
  /gitlab\.com/i,
  /\.internal/i,
  /localhost/i,
  /127\.0\.0\.1/,
  /0\.0\.0\.0/,
];

const githubPackageHosts = [/npm\.pkg\.github\.com/i, /packages\.github\.com/i];
const npmHosts = [/npmjs\.org/i];

const allowedHosts = new Set([
  'registry.npmjs.org',
  'codeload.github.com',
  'github.com',
  'raw.githubusercontent.com',
]);

const publicScopes = new Set([
  '@eslint',
  '@hookform',
  '@radix-ui',
  '@supabase',
  '@tailwindcss',
  '@tanstack',
  '@types',
  '@vitejs',
  '@typescript-eslint',
  '@alloc',
  '@babel',
  '@esbuild',
  '@eslint-community',
  '@floating-ui',
  '@humanfs',
  '@humanwhocodes',
  '@isaacs',
  '@jridgewell',
  '@nodelib',
  '@pkgjs',
  '@remix-run',
  '@rolldown',
  '@rollup',
  '@swc',
]);

function normalisePackageName(key, meta) {
  if (meta?.name) {
    return meta.name;
  }
  if (!key) {
    return null;
  }
  if (key.startsWith('node_modules/')) {
    const segments = key
      .split('node_modules/')
      .map((segment) => segment.replace(/^\/+|\/+$/g, ''))
      .filter(Boolean);
    if (segments.length) {
      return segments[segments.length - 1];
    }
  }
  return key;
}

function extractScope(pkgName) {
  if (typeof pkgName !== 'string') {
    return null;
  }
  if (pkgName.startsWith('@')) {
    return pkgName.split('/')[0];
  }
  return null;
}

function analyseUrl(raw, pkgName) {
  const info = {
    suspicious: false,
    host: undefined,
    reason: undefined,
    requiresReadPackagesToken: false,
    requiresNpmToken: false,
  };

  if (typeof raw !== 'string' || raw.length === 0) {
    return info;
  }

  const scope = extractScope(pkgName);

  if (raw.startsWith('git+')) {
    const cleaned = raw.slice(4);
    try {
      const parsed = new URL(cleaned);
      info.host = parsed.host;
      if (allowedHosts.has(parsed.host) && parsed.protocol === 'https:') {
        return info;
      }
      info.suspicious = true;
      info.reason = `git transport via ${parsed.protocol || 'unknown protocol'}`;
      return info;
    } catch (error) {
      info.suspicious = true;
      info.host = raw;
      info.reason = 'git protocol (unparsable URL)';
      return info;
    }
  }

  try {
    const parsed = new URL(raw);
    const host = parsed.host;
    const protocol = parsed.protocol;
    info.host = host;
    if (!['http:', 'https:'].includes(protocol)) {
      info.suspicious = true;
      info.reason = `protocol ${protocol}`;
      return info;
    }

    const matchesPattern = suspiciousHostPatterns.some((pattern) => pattern.test(host) || pattern.test(raw));
    const requiresReadPackagesToken = githubPackageHosts.some((pattern) => pattern.test(host));
    const requiresNpmRegistryToken = !requiresReadPackagesToken && npmHosts.some((pattern) => pattern.test(host));

    if (requiresReadPackagesToken) {
      info.requiresReadPackagesToken = true;
    }

    if (host === 'registry.npmjs.org') {
      if (scope && !publicScopes.has(scope)) {
        info.requiresNpmToken = true;
      }
      return info;
    }

    if (allowedHosts.has(host)) {
      if (requiresNpmRegistryToken) {
        info.requiresNpmToken = true;
      }
      return info;
    }

    if (requiresNpmRegistryToken) {
      info.requiresNpmToken = true;
    }

    if (matchesPattern || requiresReadPackagesToken || requiresNpmRegistryToken) {
      info.suspicious = true;
      info.reason = matchesPattern ? 'matched private registry pattern' : 'non-default registry host';
      return info;
    }

    info.suspicious = true;
    info.reason = 'unrecognised registry host';
    return info;
  } catch (error) {
    info.suspicious = true;
    info.host = raw;
    info.reason = 'unparsable URL';
    return info;
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

const result = {
  lockfilePresent: existsSync(lockPath),
  privateUrls: [],
  scopedDependencies: [],
  needsNpmToken: false,
  needsReadPackagesToken: false,
};

if (existsSync(pkgPath)) {
  const pkg = readJson(pkgPath);
  const depGroups = [pkg.dependencies, pkg.devDependencies, pkg.optionalDependencies, pkg.peerDependencies];
  const scopes = new Set();
  for (const group of depGroups) {
    if (!group) continue;
    for (const name of Object.keys(group)) {
      if (name.startsWith('@') && name.includes('/')) {
        scopes.add(name.split('/')[0]);
      }
    }
  }
  result.scopedDependencies = Array.from(scopes).sort();
}

if (result.lockfilePresent) {
  const lock = readJson(lockPath);
  const packages = lock.packages || {};
  for (const [pkgKey, meta] of Object.entries(packages)) {
    if (!meta || typeof meta !== 'object') continue;
    const pkgName = normalisePackageName(pkgKey, meta);
    const { resolved, registry } = meta;
    const resolvedInfo = analyseUrl(resolved, pkgName);
    result.needsReadPackagesToken ||= resolvedInfo.requiresReadPackagesToken || false;
    result.needsNpmToken ||= resolvedInfo.requiresNpmToken || false;
    if (resolvedInfo.suspicious) {
      result.privateUrls.push({
        name: pkgName || pkgKey || '(root)',
        type: 'resolved',
        url: resolved,
        host: resolvedInfo.host,
        reason: resolvedInfo.reason,
      });
    }
    const registryInfo = analyseUrl(registry, pkgName);
    result.needsReadPackagesToken ||= registryInfo.requiresReadPackagesToken || false;
    result.needsNpmToken ||= registryInfo.requiresNpmToken || false;
    if (registryInfo.suspicious) {
      result.privateUrls.push({
        name: pkgName || pkgKey || '(root)',
        type: 'registry',
        url: registry,
        host: registryInfo.host,
        reason: registryInfo.reason,
      });
    }
  }

  if (Array.isArray(lock.dependencies)) {
    for (const dep of lock.dependencies) {
      const pkgName = normalisePackageName(dep?.name, dep);
      const depInfo = analyseUrl(dep?.resolved, pkgName);
      result.needsReadPackagesToken ||= depInfo.requiresReadPackagesToken || false;
      result.needsNpmToken ||= depInfo.requiresNpmToken || false;
      if (depInfo.suspicious) {
        result.privateUrls.push({
          name: pkgName || dep?.name,
          type: 'resolved',
          url: dep?.resolved,
          host: depInfo.host,
          reason: depInfo.reason,
        });
      }
    }
  }
}

const hasPrivate = result.privateUrls.length > 0;

if (jsonOutput) {
  process.stdout.write(
    JSON.stringify({
      ...result,
      hasPrivate,
    }) + '\n'
  );
} else {
  if (result.scopedDependencies.length) {
    console.log('Scoped dependency scopes detected:', result.scopedDependencies.join(', '));
  } else {
    console.log('No scoped dependencies detected.');
  }

  if (hasPrivate) {
    console.error('Potential private registry URLs detected in package-lock.json:');
    for (const entry of result.privateUrls) {
      console.error(`- ${entry.name ?? '(unknown)'} [${entry.type}]: ${entry.url}`);
      if (entry.reason) {
        console.error(`  ↳ reason: ${entry.reason}`);
      }
    }
  } else if (result.lockfilePresent) {
    console.log('No private registry URLs detected in package-lock.json.');
  } else {
    console.warn('No package-lock.json found; skipping private registry scan.');
  }

  if (result.needsNpmToken) {
    console.error('\nOne or more scoped packages resolved from registry.npmjs.org are not whitelisted as public.');
    console.error('Provide NPM_TOKEN (npmjs.com automation token) for CI or regenerate the lockfile without private scopes.');
  }

  if (result.needsReadPackagesToken) {
    console.error('\nPackages resolved from GitHub Packages detected.');
    console.error('Provide READ_PACKAGES_TOKEN (PAT with read:packages) or adjust the registry configuration.');
  }
}

if (strict && (hasPrivate || result.needsNpmToken || result.needsReadPackagesToken)) {
  console.error('\nStrict mode: private registries or authentication requirements detected.');
  if (hasPrivate) {
    console.error('- Non-public registry URLs present in the lockfile.');
  }
  if (result.needsNpmToken) {
    console.error('- Scoped packages require NPM_TOKEN for registry.npmjs.org.');
  }
  if (result.needsReadPackagesToken) {
    console.error('- GitHub Packages scopes require READ_PACKAGES_TOKEN.');
  }
  console.error('Provide the appropriate token(s) or regenerate package-lock.json to remove private scopes before retrying.');
  process.exit(1);
}

process.exit(0);

