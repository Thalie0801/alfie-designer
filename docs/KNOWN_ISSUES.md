# Known Issues with Local Setup

## Dependency installation blocked

Historically, `npm install` could fail with `403 Forbidden` errors when fetching `jscodeshift`:

```
npm error code E403
npm error 403 403 Forbidden - GET https://registry.npmjs.org/jscodeshift
```

This tooling dependency is no longer part of the production install path. The lockfile was regenerated without `jscodeshift`, and the codemod scripts were disabled so that platform builds (including Vercel) only install first-party dependencies.

> **Tip:** the Lovable sandbox blocks outbound npm requests, so expect 403s if you try to run `npm install` there. Trigger the GitHub Actions workflow (Node 20 → `npm ci` → `npm run build`) or rely on Vercel builds when you need a clean dependency install.

If a custom codemod is needed locally, install `jscodeshift` ad-hoc (for example with `npm install --global jscodeshift`) and run it manually. Keeping it outside the committed dependency graph prevents regressions on hosted CI/CD where the npm registry may intermittently deny access.
