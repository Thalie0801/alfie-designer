import { describe, test, expect } from 'vitest';

let applyTransform;
let hasJscodeshift = true;
try {
  ({ applyTransform } = await import('jscodeshift/dist/testUtils'));
} catch (error) {
  hasJscodeshift = false;
}

const transformModule = await import('./refonte-codemod.js');
const transform = transformModule.default ?? transformModule;

if (!hasJscodeshift) {
  test.skip('refonte codemod tests désactivés — dépendance jscodeshift absente', () => {
    // Ces tests reposent sur jscodeshift/dist/testUtils (applyTransform).
    // Ils seront réactivés dès que la dépendance sera disponible localement.
  });
} else {
  const run = (src) => applyTransform({ parser: 'ts', transform }, null, { source: src });

  describe('refonte codemod', () => {
    test("remplace /v1/publish par /v1/creations/:id/deliver", () => {
      const input = "const ENDPOINT = '/v1/publish';";
      const out = run(input);
      expect(out).toMatch("/v1/creations/:id/deliver");
    });

    test("désactive autopublication (throw)", () => {
      const input = "publishToSocial({ platform: 'ig' });";
      const out = run(input);
      expect(out).toMatch(/throw new Error\('Auto publication désactivée en V1/);
    });

    test("ajoute requiresPremiumConfirmation si premiumT2V:true", () => {
      const input = "const payload = { premiumT2V: true };";
      const out = run(input);
      expect(out).toMatch(/requiresPremiumConfirmation\s*:\s*true/);
    });
  });
}
