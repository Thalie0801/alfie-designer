# Known Issues with Local Setup

## Dependency installation blocked

Running `npm install` failed because the registry returned `403 Forbidden` for the `jscodeshift` package:

```
npm error code E403
npm error 403 403 Forbidden - GET https://registry.npmjs.org/jscodeshift
```

The error was caused by the project inheriting a non-public npm registry configuration. The following changes fix the issue and make installations deterministic:

### Immediate remediation steps

1. **Force the public registry in the project**
   ```bash
   npm config get registry
   npm config set registry https://registry.npmjs.org/ --location=project
   ```
2. **Diagnose connectivity quickly**
   ```bash
   npm ping
   npm view jscodeshift dist-tags version
   npm config list
   ```
3. **Clean the workspace and reinstall**
   ```bash
   rm -rf node_modules
   npm install --no-audit --no-fund
   # or npm ci when using the committed lockfile
   ```

### Hardening the repository

- `.npmrc` at the repository root now pins the default registry to `https://registry.npmjs.org/` and disables `always-auth` so anonymous reads succeed.
- `scripts/codex/run.sh` now reuses the locally installed `jscodeshift` binary via `npx --no-install`, so no network call happens when launching the codemod.
- Le lockfile officiel pointe désormais vers `jscodeshift@0.14.0` depuis le registre npm public. Si quelqu'un bascule temporairement sur la tarball GitHub pour contourner un proxy, il faut régénérer le lockfile depuis npm avant de pousser.
- In CI, prefer running `npm ci` (with the registry explicitly set) to guarantee a clean, reproducible install.

If the 403 persists after these steps, inspect user-level `.npmrc` files or proxy environment variables for conflicting registry settings, or regenerate `package-lock.json` if it is out of date.
