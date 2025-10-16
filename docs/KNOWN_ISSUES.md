# Known Issues with Local Setup

## Dependency installation blocked

Running `npm install` used to fail because the registry returned `403 Forbidden` for the `jscodeshift` package. To keep Vercel deployments green we removed `jscodeshift` from the committed dependencies—codemods now rely on `npx jscodeshift@0.15.2` when they are launched manually.

The following guidance keeps local installs predictable:

### Immediate remediation steps

1. **Force the public registry in the project**
   ```bash
   npm config get registry
   npm config set registry https://registry.npmjs.org/ --location=project
   ```
2. **Diagnose connectivity quickly**
   ```bash
   npm ping
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
- `scripts/codex/run.sh` invoque désormais `npx --yes jscodeshift@0.15.2` ; aucun paquet supplémentaire n'est requis dans `package.json` et les déploiements Vercel n'installent donc pas le codemod.
- Si vous devez exécuter les transformations dans CI, ajoutez une étape qui lance `npx --yes jscodeshift@0.15.2` avant d'appeler le script.
- In CI, prefer running `npm ci` (with the registry explicitly set) to guarantee a clean, reproducible install.

If the 403 persists after these steps, inspect user-level `.npmrc` files or proxy environment variables for conflicting registry settings, or regenerate `package-lock.json` if it is out of date.
