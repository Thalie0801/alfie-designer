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

function analyseUrl(raw) {
  if (typeof raw !== 'string' || raw.length === 0) {
    return { suspicious: false };
  }

  if (raw.startsWith('git+')) {
    const cleaned = raw.slice(4);
    try {
      const parsed = new URL(cleaned);
      if (allowedHosts.has(parsed.host) && parsed.protocol === 'https:') {
        return { suspicious: false, host: parsed.host };
      }
      return { suspicious: true, host: parsed.host, reason: `git transport via ${parsed.protocol || 'unknown protocol'}` };
    } catch (error) {
      return { suspicious: true, host: raw, reason: 'git protocol (unparsable URL)' };
    }
  }

  try {
    const parsed = new URL(raw);
    const host = parsed.host;
    const protocol = parsed.protocol;
    if (!['http:', 'https:'].includes(protocol)) {
      return { suspicious: true, host, reason: `protocol ${protocol}` };
    }
    if (allowedHosts.has(host)) {
      return { suspicious: false, host };
    }
    if (host === 'registry.npmjs.org') {
      return { suspicious: false, host };
    }

    const matchesPattern = suspiciousHostPatterns.some((pattern) => pattern.test(host) || pattern.test(raw));
    const requiresReadPackagesToken = githubPackageHosts.some((pattern) => pattern.test(host));
    const requiresNpmToken = !requiresReadPackagesToken && npmHosts.some((pattern) => pattern.test(host));

    if (matchesPattern || requiresReadPackagesToken || requiresNpmToken) {
      return {
        suspicious: true,
        host,
        reason: matchesPattern ? 'matched private registry pattern' : 'non-default registry host',
        requiresReadPackagesToken,
        requiresNpmToken,
      };
    }

    return { suspicious: true, host, reason: 'unrecognised registry host' };
  } catch (error) {
    return { suspicious: true, host: raw, reason: 'unparsable URL' };
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
  for (const [pkgName, meta] of Object.entries(packages)) {
    if (!meta || typeof meta !== 'object') continue;
    const { resolved, registry } = meta;
    const resolvedInfo = analyseUrl(resolved);
    if (resolvedInfo.suspicious) {
      result.privateUrls.push({
        name: pkgName || '(root)',
        type: 'resolved',
        url: resolved,
        host: resolvedInfo.host,
        reason: resolvedInfo.reason,
      });
      result.needsReadPackagesToken ||= resolvedInfo.requiresReadPackagesToken || false;
      result.needsNpmToken ||= resolvedInfo.requiresNpmToken || false;
    }
    const registryInfo = analyseUrl(registry);
    if (registryInfo.suspicious) {
      result.privateUrls.push({
        name: pkgName || '(root)',
        type: 'registry',
        url: registry,
        host: registryInfo.host,
        reason: registryInfo.reason,
      });
      result.needsReadPackagesToken ||= registryInfo.requiresReadPackagesToken || false;
      result.needsNpmToken ||= registryInfo.requiresNpmToken || false;
    }
  }

  if (Array.isArray(lock.dependencies)) {
    for (const dep of lock.dependencies) {
      const depInfo = analyseUrl(dep?.resolved);
      if (depInfo.suspicious) {
        result.privateUrls.push({
          name: dep?.name,
          type: 'resolved',
          url: dep?.resolved,
          host: depInfo.host,
          reason: depInfo.reason,
        });
        result.needsReadPackagesToken ||= depInfo.requiresReadPackagesToken || false;
        result.needsNpmToken ||= depInfo.requiresNpmToken || false;
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
}

if (hasPrivate && strict) {
  console.error('\nThis project references at least one non-public registry. ' +
    'Provide the appropriate authentication token or regenerate package-lock.json to remove private URLs.');
  process.exit(1);
}

process.exit(0);

